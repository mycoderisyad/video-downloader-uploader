// Global variables
let downloadJobs = new Map();
let uploadJobs = new Map();
let currentDownloadJob = null;
let currentUploadJob = null;

// API Base URL
const API_BASE = window.location.origin;

// DOM Elements
const downloadForm = document.getElementById('downloadForm');
const uploadForm = document.getElementById('uploadForm');
const progressSection = document.getElementById('progressSection');
const authSection = document.getElementById('authSection');
const authenticateBtn = document.getElementById('authenticateBtn');
const downloadJobSelect = document.getElementById('downloadJobSelect');
const jobsList = document.getElementById('jobsList');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

function initializeApp() {
    // Check URL parameters for auth callback
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    
    if (authStatus === 'success') {
        showAlert('YouTube authentication berhasil!', 'success');
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
        showAlert('YouTube authentication gagal. Silakan coba lagi.', 'danger');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    loadJobsFromStorage();
    updateJobsList();
    updateDownloadJobSelect();
}

function setupEventListeners() {
    // Download form
    downloadForm.addEventListener('submit', handleDownload);
    
    // Upload form
    uploadForm.addEventListener('submit', handleUpload);
    
    // Authentication button
    authenticateBtn.addEventListener('click', initiateYouTubeAuth);
    
    // Auto-update progress
    setInterval(updateProgress, 2000);
}

async function handleDownload(e) {
    e.preventDefault();
    
    const url = document.getElementById('videoUrl').value;
    const title = document.getElementById('videoTitle').value;
    const quality = document.getElementById('quality').value;
    
    if (!url) {
        showAlert('URL video diperlukan', 'danger');
        return;
    }
    
    try {
        setButtonLoading('downloadBtn', true);
        
        const response = await fetch(`${API_BASE}/api/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, title, quality })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentDownloadJob = data.jobId;
            downloadJobs.set(data.jobId, {
                id: data.jobId,
                url,
                title: title || 'Untitled',
                quality,
                status: data.status,
                progress: 0,
                type: 'download'
            });
            
            saveJobsToStorage();
            showProgress('Download Video', 'starting', 0);
            showAlert('Download dimulai!', 'success');
            
            // Reset form
            downloadForm.reset();
        } else {
            showAlert(data.message || 'Error memulai download', 'danger');
        }
    } catch (error) {
        console.error('Download error:', error);
        showAlert('Error menghubungi server', 'danger');
    } finally {
        setButtonLoading('downloadBtn', false);
    }
}

async function handleUpload(e) {
    e.preventDefault();
    
    const jobId = document.getElementById('downloadJobSelect').value;
    const title = document.getElementById('youtubeTitle').value;
    const description = document.getElementById('youtubeDescription').value;
    const privacy = document.getElementById('privacy').value;
    const tagsInput = document.getElementById('youtubeTags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
    
    if (!jobId) {
        showAlert('Pilih video yang sudah didownload', 'danger');
        return;
    }
    
    if (!title) {
        showAlert('Judul YouTube diperlukan', 'danger');
        return;
    }
    
    try {
        setButtonLoading('uploadBtn', true);
        
        const response = await fetch(`${API_BASE}/api/upload-youtube`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jobId,
                title,
                description,
                tags,
                privacy
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUploadJob = data.uploadJobId;
            uploadJobs.set(data.uploadJobId, {
                id: data.uploadJobId,
                downloadJobId: jobId,
                title,
                description,
                privacy,
                status: data.status,
                progress: 0,
                type: 'upload'
            });
            
            saveJobsToStorage();
            showProgress('Upload ke YouTube', 'starting', 0);
            showAlert('Upload ke YouTube dimulai!', 'success');
            
            // Reset form
            uploadForm.reset();
        } else {
            if (data.requireAuth) {
                showAuthSection();
            }
            showAlert(data.message || 'Error memulai upload', 'danger');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('Error menghubungi server', 'danger');
    } finally {
        setButtonLoading('uploadBtn', false);
    }
}

async function initiateYouTubeAuth() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/youtube`);
        const data = await response.json();
        
        if (data.success) {
            window.location.href = data.authUrl;
        } else {
            showAlert(data.message || 'Error initiating authentication', 'danger');
        }
    } catch (error) {
        console.error('Auth error:', error);
        showAlert('Error menghubungi server', 'danger');
    }
}

async function updateProgress() {
    // Update download progress
    if (currentDownloadJob) {
        try {
            const response = await fetch(`${API_BASE}/api/download-status/${currentDownloadJob}`);
            const data = await response.json();
            
            if (data.success) {
                const job = data.job;
                downloadJobs.set(currentDownloadJob, {
                    ...downloadJobs.get(currentDownloadJob),
                    status: job.status,
                    progress: job.progress,
                    error: job.error
                });
                
                saveJobsToStorage();
                
                if (currentDownloadJob && (job.status === 'downloading' || job.status === 'starting')) {
                    showProgress('Download Video', job.status, job.progress, job.error);
                } else if (job.status === 'completed') {
                    showProgress('Download Video', job.status, job.progress);
                    currentDownloadJob = null;
                    updateDownloadJobSelect();
                    setTimeout(() => hideProgress(), 3000);
                } else if (job.status === 'error') {
                    showProgress('Download Video', job.status, job.progress, job.error);
                    currentDownloadJob = null;
                    setTimeout(() => hideProgress(), 5000);
                }
            }
        } catch (error) {
            console.error('Error fetching download status:', error);
        }
    }
    
    // Update upload progress
    if (currentUploadJob) {
        try {
            const response = await fetch(`${API_BASE}/api/upload-status/${currentUploadJob}`);
            const data = await response.json();
            
            if (data.success) {
                const job = data.job;
                uploadJobs.set(currentUploadJob, {
                    ...uploadJobs.get(currentUploadJob),
                    status: job.status,
                    progress: job.progress,
                    error: job.error,
                    videoId: job.videoId,
                    videoUrl: job.videoUrl
                });
                
                saveJobsToStorage();
                
                if (currentUploadJob && (job.status === 'uploading' || job.status === 'starting')) {
                    showProgress('Upload ke YouTube', job.status, job.progress, job.error);
                } else if (job.status === 'completed') {
                    showProgress('Upload ke YouTube', job.status, job.progress);
                    showVideoResult(job.videoUrl);
                    currentUploadJob = null;
                } else if (job.status === 'error') {
                    showProgress('Upload ke YouTube', job.status, job.progress, job.error);
                    currentUploadJob = null;
                    setTimeout(() => hideProgress(), 5000);
                }
            }
        } catch (error) {
            console.error('Error fetching upload status:', error);
        }
    }
    
    updateJobsList();
}

function showProgress(title, status, progress, error = null) {
    progressSection.style.display = 'block';
    document.getElementById('progressTitle').textContent = title;
    
    const statusElement = document.getElementById('progressStatus');
    statusElement.textContent = status;
    statusElement.className = `status-badge status-${status}`;
    
    document.getElementById('progressPercent').textContent = `${progress}%`;
    
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progress}%`;
    
    // Set progress bar color based on status
    progressBar.className = 'progress-bar';
    if (status === 'completed') {
        progressBar.classList.add('bg-success');
    } else if (status === 'error') {
        progressBar.classList.add('bg-danger');
    } else {
        progressBar.classList.add('bg-primary');
    }
    
    const messageElement = document.getElementById('progressMessage');
    if (error) {
        messageElement.textContent = `Error: ${error}`;
        messageElement.className = 'mt-2 text-danger';
    } else {
        messageElement.textContent = getStatusMessage(status, progress);
        messageElement.className = 'mt-2 text-muted';
    }
    
    // Scroll to progress section
    progressSection.scrollIntoView({ behavior: 'smooth' });
}

function hideProgress() {
    progressSection.style.display = 'none';
    document.getElementById('videoResult').style.display = 'none';
}

function showVideoResult(videoUrl) {
    const videoResult = document.getElementById('videoResult');
    const youtubeLink = document.getElementById('youtubeLink');
    
    youtubeLink.href = videoUrl;
    videoResult.style.display = 'block';
}

function getStatusMessage(status, progress) {
    switch (status) {
        case 'starting':
            return 'Memulai proses...';
        case 'downloading':
            return `Downloading video... ${progress}%`;
        case 'uploading':
            return `Uploading ke YouTube... ${progress}%`;
        case 'completed':
            return 'Proses selesai!';
        case 'error':
            return 'Terjadi error dalam proses';
        default:
            return '';
    }
}

function updateDownloadJobSelect() {
    const select = downloadJobSelect;
    const currentValue = select.value;
    
    // Clear existing options except first
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Add completed download jobs
    for (const [jobId, job] of downloadJobs) {
        if (job.status === 'completed') {
            const option = document.createElement('option');
            option.value = jobId;
            option.textContent = job.title || `Video ${jobId.substring(0, 8)}`;
            select.appendChild(option);
        }
    }
    
    // Restore selected value if it still exists
    if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
}

function updateJobsList() {
    const container = jobsList;
    container.innerHTML = '';
    
    const allJobs = [...downloadJobs.values(), ...uploadJobs.values()];
    
    if (allJobs.length === 0) {
        container.innerHTML = '<p class="text-muted">Belum ada jobs yang dijalankan.</p>';
        return;
    }
    
    // Sort jobs by timestamp (newest first)
    allJobs.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
    
    allJobs.forEach(job => {
        const jobElement = createJobElement(job);
        container.appendChild(jobElement);
    });
}

function createJobElement(job) {
    const div = document.createElement('div');
    div.className = 'job-item fade-in';
    
    const typeIcon = job.type === 'download' ? 'bi-download' : 'bi-upload';
    const typeText = job.type === 'download' ? 'Download' : 'Upload';
    
    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
                <h6 class="mb-1">
                    <i class="bi ${typeIcon}"></i> ${typeText}: ${job.title}
                </h6>
                <small class="text-muted">ID: ${job.id.substring(0, 8)}...</small>
                ${job.url ? `<br><small class="text-muted">URL: ${job.url.substring(0, 50)}...</small>` : ''}
            </div>
            <div class="text-end">
                <span class="status-badge status-${job.status}">${job.status}</span>
                <br>
                <small class="text-muted">${job.progress}%</small>
                ${job.videoUrl ? `<br><a href="${job.videoUrl}" target="_blank" class="btn btn-sm btn-outline-success mt-1"><i class="bi bi-play-btn"></i> YouTube</a>` : ''}
            </div>
        </div>
        ${job.error ? `<div class="mt-2 text-danger small">Error: ${job.error}</div>` : ''}
    `;
    
    return div;
}

function showAuthSection() {
    authSection.style.display = 'block';
}

function hideAuthSection() {
    authSection.style.display = 'none';
}

async function checkAuthStatus() {
    // This is a simple check - in production you might want to verify token validity
    const hasAuth = localStorage.getItem('youtube_auth_completed') === 'true';
    
    if (!hasAuth) {
        // Don't show auth section immediately, only when needed
        // showAuthSection();
    } else {
        hideAuthSection();
    }
}

function setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    const originalText = button.textContent;
    
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.getAttribute('data-original-html') || originalText;
    }
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-toast');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-toast position-fixed fade-in`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <span class="flex-grow-1">${message}</span>
            <button type="button" class="btn-close ms-2" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function saveJobsToStorage() {
    try {
        localStorage.setItem('downloadJobs', JSON.stringify([...downloadJobs]));
        localStorage.setItem('uploadJobs', JSON.stringify([...uploadJobs]));
    } catch (error) {
        console.error('Error saving jobs to storage:', error);
    }
}

function loadJobsFromStorage() {
    try {
        const savedDownloadJobs = localStorage.getItem('downloadJobs');
        const savedUploadJobs = localStorage.getItem('uploadJobs');
        
        if (savedDownloadJobs) {
            downloadJobs = new Map(JSON.parse(savedDownloadJobs));
        }
        
        if (savedUploadJobs) {
            uploadJobs = new Map(JSON.parse(savedUploadJobs));
        }
    } catch (error) {
        console.error('Error loading jobs from storage:', error);
        downloadJobs = new Map();
        uploadJobs = new Map();
    }
}

// Cleanup old jobs from storage periodically
setInterval(() => {
    const now = new Date();
    let cleaned = false;
    
    // Clean up download jobs older than 7 days
    for (const [jobId, job] of downloadJobs) {
        if (job.startTime) {
            const jobTime = new Date(job.startTime);
            const daysDiff = (now - jobTime) / (1000 * 60 * 60 * 24);
            if (daysDiff > 7) {
                downloadJobs.delete(jobId);
                cleaned = true;
            }
        }
    }
    
    // Clean up upload jobs older than 7 days
    for (const [jobId, job] of uploadJobs) {
        if (job.startTime) {
            const jobTime = new Date(job.startTime);
            const daysDiff = (now - jobTime) / (1000 * 60 * 60 * 24);
            if (daysDiff > 7) {
                uploadJobs.delete(jobId);
                cleaned = true;
            }
        }
    }
    
    if (cleaned) {
        saveJobsToStorage();
        updateJobsList();
        updateDownloadJobSelect();
    }
}, 60 * 60 * 1000); // Run every hour 