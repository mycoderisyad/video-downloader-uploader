// Global variables
let downloadJobs = new Map();
let uploadJobs = new Map();
let currentDownloadJob = null;
let currentUploadJob = null;
let batchJobs = new Map();
let settings = {
    darkMode: false,
    defaultQuality: 'best',
    defaultDownloadMode: 'server',
    enableNotifications: true,
    enableSounds: true,
    platforms: {
        youtube: true,
        vimeo: true,
        facebook: true,
        instagram: true
    }
};

// API Base URL
const API_BASE = window.location.origin;

// DOM Elements
const downloadForm = document.getElementById('downloadForm');
const uploadForm = document.getElementById('uploadForm');
const batchDownloadForm = document.getElementById('batchDownloadForm');
const batchUploadForm = document.getElementById('batchUploadForm');
const progressSection = document.getElementById('progressSection');
const authSection = document.getElementById('authSection');
const authenticateBtn = document.getElementById('authenticateBtn');
const downloadJobSelect = document.getElementById('downloadJobSelect');
const jobsList = document.getElementById('jobsList');
const darkModeToggle = document.getElementById('darkModeToggle');
const previewModal = document.getElementById('previewModal');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOM Content Loaded - Starting app initialization');
    
    // Show immediate feedback
    const body = document.body;
    if (body) {
        console.log('✅ Body element found');
    } else {
        console.error('❌ Body element not found');
    }
    
    try {
        // Check if all required elements exist
        const requiredElements = [
            'downloadForm', 'uploadForm', 'batchDownloadForm', 'batchUploadForm',
            'progressSection', 'authSection', 'authenticateBtn', 'downloadJobSelect',
            'jobsList', 'darkModeToggle', 'previewModal', 'dropZone', 'fileInput'
        ];
        
        console.log('🔍 Checking required elements...');
        const missingElements = requiredElements.filter(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`⚠️ Missing element: ${id}`);
                return true;
            }
            return false;
        });
        
        if (missingElements.length > 0) {
            console.error('❌ Missing required elements:', missingElements);
            // Don't return, continue with partial initialization
        }
        
        console.log('📋 Initializing app...');
        await initializeApp();
        console.log('✅ App initialized');
        
        console.log('🎯 Setting up event listeners...');
        setupEventListeners();
        console.log('✅ Event listeners setup');
        
        console.log('⚙️ Loading settings...');
        loadSettings();
        console.log('✅ Settings loaded');
        
        console.log('🌙 Setting up dark mode...');
        setupDarkMode();
        console.log('✅ Dark mode setup');
        
        console.log('📑 Setting up tab navigation...');
        setupTabNavigation();
        console.log('✅ Tab navigation setup');
        
        console.log('📁 Setting up drag and drop...');
        setupDragAndDrop();
        console.log('✅ Drag and drop setup');
        
        console.log('🎉 App fully initialized!');
        
        // Application loaded successfully - no toast needed
        // setTimeout(() => {
        //     showToast('Aplikasi berhasil dimuat!', 'success');
        // }, 1000);
        
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        console.error('Error stack:', error.stack);
        showToast('Failed to initialize app: ' + error.message, 'error');
    }
});

async function initializeApp() {
    // Check URL parameters for auth callback
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    
    if (authStatus === 'success') {
        showToast('YouTube authentication successful!', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
        const errorMessage = urlParams.get('message');
        showToast('YouTube authentication failed: ' + (errorMessage || 'Unknown error'), 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    loadJobsFromStorage();
    updateJobsList();
    updateDownloadJobSelect();
    updateBatchVideoList();
    requestNotificationPermission();
    
    // Check auth status (async)
    await checkAuthStatus();
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    try {
        // Forms
        if (downloadForm) {
            downloadForm.addEventListener('submit', handleDownload);
            console.log('✅ Download form listener added');
        }
        if (uploadForm) {
            uploadForm.addEventListener('submit', handleUpload);
            console.log('✅ Upload form listener added');
        }
        if (batchDownloadForm) {
            batchDownloadForm.addEventListener('submit', handleBatchDownload);
            console.log('✅ Batch download form listener added');
        }
        if (batchUploadForm) {
            batchUploadForm.addEventListener('submit', handleBatchUpload);
            console.log('✅ Batch upload form listener added');
        }
        
        // Buttons
        if (authenticateBtn) {
            authenticateBtn.addEventListener('click', initiateYouTubeAuth);
            console.log('✅ Authenticate button listener added');
        }
        
        const disconnectBtn = document.getElementById('disconnectBtn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', disconnectYouTube);
            console.log('✅ Disconnect button listener added');
        }
        
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', handlePreview);
            console.log('✅ Preview button listener added');
        }
        
        const saveCredentialsBtn = document.getElementById('saveCredentialsBtn');
        if (saveCredentialsBtn) {
            saveCredentialsBtn.addEventListener('click', saveCredentials);
            console.log('✅ Save credentials button listener added');
        }
        
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveSettings);
            console.log('✅ Save settings button listener added');
        }
        
        // History management
        const exportHistoryBtn = document.getElementById('exportHistoryBtn');
        if (exportHistoryBtn) {
            exportHistoryBtn.addEventListener('click', exportHistory);
        }
        

        
        const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
        if (clearAllHistoryBtn) {
            clearAllHistoryBtn.addEventListener('click', clearAllHistory);
        }
        
        // Modal controls
        const closePreview = document.getElementById('closePreview');
        if (closePreview) {
            closePreview.addEventListener('click', () => {
                if (previewModal) previewModal.classList.add('hidden');
            });
            console.log('✅ Close preview listener added');
        }
        
        const hideProgressBtn = document.getElementById('hideProgress');
        if (hideProgressBtn) {
            hideProgressBtn.addEventListener('click', hideProgress);
        }
        

        
        // History filters
        const historyFilter = document.getElementById('historyFilter');
        if (historyFilter) {
            historyFilter.addEventListener('change', filterHistory);
            console.log('✅ History type filter listener added');
        }
        
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', filterHistory);
            console.log('✅ Status filter listener added');
        }
        
        const historySearch = document.getElementById('historySearch');
        if (historySearch) {
            historySearch.addEventListener('input', filterHistory);
            console.log('✅ History search listener added');
        }
        
        // Auto-update progress
        setInterval(updateProgress, 2000);
        
        console.log('✅ All event listeners setup completed');
    } catch (error) {
        console.error('❌ Error setting up event listeners:', error);
        showToast('Failed to setup event listeners: ' + error.message, 'error');
    }
}

function setupDarkMode() {
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Load saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.documentElement.classList.add('dark');
        settings.darkMode = true;
    }
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    settings.darkMode = !settings.darkMode;
    localStorage.setItem('darkMode', settings.darkMode);
    saveSettings();
}

function setupTabNavigation() {
    console.log('Setting up tab navigation...');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('Found tab buttons:', tabButtons.length);
    console.log('Found tab contents:', tabContents.length);
    
    tabButtons.forEach((button, index) => {
        console.log(`Setting up tab button ${index}:`, button.getAttribute('data-tab'));
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = button.getAttribute('data-tab');
            console.log('Tab clicked:', targetTab);
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            
            const targetContent = document.getElementById(targetTab + 'Tab');
            if (targetContent) {
                targetContent.classList.add('active');
                console.log('✅ Tab switched to:', targetTab);
            } else {
                console.error('❌ Target tab content not found:', targetTab + 'Tab');
            }
        });
    });
    
    console.log('✅ Tab navigation setup completed');
}

function setupDragAndDrop() {
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        handleFileUpload(files);
    });
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFileUpload(files);
    });
}

async function handleDownload(e) {
    e.preventDefault();
    
    const url = document.getElementById('videoUrl').value;
    const title = document.getElementById('videoTitle').value;
    const quality = document.getElementById('quality').value;
    const downloadMode = document.getElementById('downloadMode').value;
    const downloaderChoice = document.getElementById('downloaderChoice').value;
    
    if (!url) {
        showToast('Video URL is required', 'error');
        return;
    }
    
    try {
        setButtonLoading('downloadBtn', true);
        
        const response = await fetch(`${API_BASE}/api/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, title, quality, downloadMode, downloaderChoice })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentDownloadJob = data.jobId;
            downloadJobs.set(data.jobId, {
                id: data.jobId,
                url,
                title: title || 'Untitled',
                quality,
                downloadMode,
                status: data.status,
                progress: 0,
                type: 'download',
                timestamp: new Date().toISOString()
            });
            
            saveJobsToStorage();
            showProgress('Download Video', 'starting', 0);
            
            // Show platform-specific messages
            const platform = detectPlatform(url);
            if (downloadMode === 'direct') {
                if (platform === 'youtube') {
                    showToast('⚠️ YouTube Direct Download: Mungkin gagal karena bot detection. Gunakan Server Download untuk hasil terbaik.', 'warning');
                } else if (platform === 'instagram' || platform === 'facebook') {
                    showToast('ℹ️ Menggunakan Gallery-dl untuk platform sosial media - hasil lebih baik!', 'info');
                } else {
                    // showToast('Download started!', 'success'); // Removed debug notification
                }
            } else {
                // showToast('Download started!', 'success'); // Removed debug notification
            }
            
            // Reset form
            downloadForm.reset();
            updateDownloadJobSelect();
        } else {
            showToast(data.message || 'Error starting download', 'error');
        }
    } catch (error) {
        console.error('Download error:', error);
        showToast('Error connecting to server', 'error');
    } finally {
        setButtonLoading('downloadBtn', false);
    }
}

async function handleBatchDownload(e) {
    e.preventDefault();
    
    const urls = document.getElementById('batchUrls').value.split('\n').filter(url => url.trim());
    const quality = document.getElementById('batchQuality').value;
    const downloadMode = document.getElementById('batchDownloadMode').value;
    
    if (urls.length === 0) {
        showToast('Please enter at least one URL', 'error');
        return;
    }
    
    try {
        setButtonLoading('batchDownloadBtn', true);
        
        const batchId = generateId();
        const batchJob = {
            id: batchId,
            type: 'batch-download',
            urls: urls,
            quality,
            downloadMode,
            status: 'starting',
            progress: 0,
            completed: 0,
            total: urls.length,
            timestamp: new Date().toISOString(),
            jobs: []
        };
        
        batchJobs.set(batchId, batchJob);
        
        // Start individual downloads
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i].trim();
            if (url) {
                const response = await fetch(`${API_BASE}/api/download`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        url, 
                        title: `Batch ${i + 1}`, 
                        quality, 
                        downloadMode,
                        batchId 
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    batchJob.jobs.push(data.jobId);
                    downloadJobs.set(data.jobId, {
                        id: data.jobId,
                        url,
                        title: `Batch ${i + 1}`,
                        quality,
                        downloadMode,
                        status: data.status,
                        progress: 0,
                        type: 'download',
                        batchId: batchId,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        saveJobsToStorage();
        showProgress('Batch Download', 'starting', 0);
        showToast(`Batch download started for ${urls.length} videos!`, 'success');
        
        // Reset form
        batchDownloadForm.reset();
        updateDownloadJobSelect();
        
    } catch (error) {
        console.error('Batch download error:', error);
        showToast('Error starting batch download', 'error');
    } finally {
        setButtonLoading('batchDownloadBtn', false);
    }
}

async function handleUpload(e) {
    e.preventDefault();
    
    const jobId = document.getElementById('downloadJobSelect').value;
    const title = document.getElementById('youtubeTitle').value;
    const description = document.getElementById('youtubeDescription').value;
    const privacy = document.getElementById('privacy').value;
    const category = document.getElementById('category').value;
    const tagsInput = document.getElementById('youtubeTags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
    
    if (!jobId) {
        showToast('Please select a downloaded video', 'error');
        return;
    }
    
    if (!title) {
        showToast('YouTube title is required', 'error');
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
                privacy,
                category
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
                category,
                status: data.status,
                progress: 0,
                type: 'upload',
                timestamp: new Date().toISOString()
            });
            
            saveJobsToStorage();
            showProgress('Upload to YouTube', 'starting', 0);
            showToast('YouTube upload started!', 'success');
            
            // Reset form
            uploadForm.reset();
        } else {
            if (data.requireAuth) {
                showAuthSection();
            }
            showToast(data.message || 'Error starting upload', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Error connecting to server', 'error');
    } finally {
        setButtonLoading('uploadBtn', false);
    }
}

async function handleBatchUpload(e) {
    e.preventDefault();
    
    const selectedVideos = Array.from(document.querySelectorAll('#batchVideoList input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    const privacy = document.getElementById('batchPrivacy').value;
    const defaultTags = document.getElementById('batchTags').value;
    
    if (selectedVideos.length === 0) {
        showToast('Please select at least one video', 'error');
        return;
    }
    
    try {
        setButtonLoading('batchUploadBtn', true);
        
        const batchId = generateId();
        const batchJob = {
            id: batchId,
            type: 'batch-upload',
            videos: selectedVideos,
            privacy,
            defaultTags,
            status: 'starting',
            progress: 0,
            completed: 0,
            total: selectedVideos.length,
            timestamp: new Date().toISOString(),
            jobs: []
        };
        
        batchJobs.set(batchId, batchJob);
        
        // Start individual uploads
        for (const jobId of selectedVideos) {
            const downloadJob = downloadJobs.get(jobId);
            if (downloadJob) {
                const response = await fetch(`${API_BASE}/api/upload-youtube`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jobId,
                        title: downloadJob.title,
                        description: `Batch uploaded video: ${downloadJob.title}`,
                        tags: defaultTags ? defaultTags.split(',').map(tag => tag.trim()) : [],
                        privacy,
                        category: '22',
                        batchId
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    batchJob.jobs.push(data.uploadJobId);
                    uploadJobs.set(data.uploadJobId, {
                        id: data.uploadJobId,
                        downloadJobId: jobId,
                        title: downloadJob.title,
                        description: `Batch uploaded video: ${downloadJob.title}`,
                        privacy,
                        status: data.status,
                        progress: 0,
                        type: 'upload',
                        batchId: batchId,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        saveJobsToStorage();
        showProgress('Batch Upload', 'starting', 0);
        showToast(`Batch upload started for ${selectedVideos.length} videos!`, 'success');
        
        // Reset form
        batchUploadForm.reset();
        updateBatchVideoList();
        
    } catch (error) {
        console.error('Batch upload error:', error);
        showToast('Error starting batch upload', 'error');
    } finally {
        setButtonLoading('batchUploadBtn', false);
    }
}

async function handlePreview() {
    const url = document.getElementById('videoUrl').value;
    
    if (!url) {
        showToast('Please enter a video URL first', 'error');
        return;
    }
    
    previewModal.classList.remove('hidden');
    document.getElementById('previewContent').innerHTML = `
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading preview...</p>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('previewContent').innerHTML = `
                <div class="space-y-4">
                    <div class="aspect-video bg-black rounded-lg overflow-hidden">
                        <video class="video-preview w-full h-full" controls>
                            <source src="${data.previewUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <div class="text-left">
                        <h4 class="font-bold text-lg mb-2">${data.title || 'Video Preview'}</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div>Duration: ${data.duration || 'Unknown'}</div>
                            <div>Quality: ${data.quality || 'Unknown'}</div>
                            <div>Size: ${data.size || 'Unknown'}</div>
                            <div>Format: ${data.format || 'Unknown'}</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Auto-fill title if empty
            if (data.title && !document.getElementById('videoTitle').value) {
                document.getElementById('videoTitle').value = data.title;
            }
        } else {
            document.getElementById('previewContent').innerHTML = `
                <div class="text-center text-red-600 dark:text-red-400">
                    <i class="bi bi-exclamation-triangle text-4xl mb-4"></i>
                    <p>Unable to load preview</p>
                    <p class="text-sm mt-2">${data.message || 'Unknown error'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Preview error:', error);
        document.getElementById('previewContent').innerHTML = `
            <div class="text-center text-red-600 dark:text-red-400">
                <i class="bi bi-exclamation-triangle text-4xl mb-4"></i>
                <p>Error loading preview</p>
                <p class="text-sm mt-2">Please check your connection and try again</p>
            </div>
        `;
    }
}

function handleFileUpload(files) {
    const validFiles = files.filter(file => file.type.startsWith('video/'));
    
    if (validFiles.length === 0) {
        showToast('Please select valid video files', 'error');
        return;
    }
    
    showToast(`${validFiles.length} video file(s) selected for upload`, 'success');
    
    // Here you would implement the file upload logic
    // For now, we'll just show the files in the batch upload list
    validFiles.forEach(file => {
        const jobId = generateId();
        downloadJobs.set(jobId, {
            id: jobId,
            title: file.name,
            status: 'completed',
            progress: 100,
            type: 'file-upload',
            file: file,
            timestamp: new Date().toISOString()
        });
    });
    
    saveJobsToStorage();
    updateDownloadJobSelect();
    updateBatchVideoList();
}

async function initiateYouTubeAuth() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/youtube`);
        const data = await response.json();
        
        if (data.success) {
            // Open auth URL in new window
            const authWindow = window.open(data.authUrl, 'youtube-auth', 'width=600,height=600');
            
            // Monitor the auth window
            const checkClosed = setInterval(() => {
                if (authWindow.closed) {
                    clearInterval(checkClosed);
                    // Check auth status after window closes
                    setTimeout(async () => {
                        const isAuthenticated = await checkAuthStatus();
                        if (isAuthenticated) {
                            showToast('YouTube authentication successful!', 'success');
                        } else {
                            showToast('Authentication was not completed. Please try again.', 'warning');
                        }
                    }, 1000);
                }
            }, 1000);
            
        } else {
            if (data.requireCredentials) {
                showToast('Please save your YouTube credentials in Settings first', 'warning');
            } else {
                showToast(data.message || 'Error initiating authentication', 'error');
            }
        }
    } catch (error) {
        console.error('Auth error:', error);
        showToast('Error connecting to server', 'error');
    }
}

async function disconnectYouTube() {
    if (!confirm('Are you sure you want to disconnect from YouTube? You will need to authenticate again to upload videos.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/disconnect`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateConnectionStatus(false);
            showToast('Successfully disconnected from YouTube', 'success');
        } else {
            showToast(data.message || 'Error disconnecting', 'error');
        }
    } catch (error) {
        console.error('Disconnect error:', error);
        // Even if server request fails, update UI to disconnected state
        updateConnectionStatus(false);
        showToast('Disconnected from YouTube', 'success');
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
    if (progressSection) {
        progressSection.style.display = 'none';
    }
    const videoResult = document.getElementById('videoResult');
    if (videoResult) {
        videoResult.style.display = 'none';
    }
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
    div.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4 border border-gray-200 dark:border-gray-700';
    div.setAttribute('data-job-id', job.id); // Add data attribute for easier identification
    
    const typeIcon = job.type === 'download' ? 'bi-download' : 'bi-upload';
    const typeText = job.type === 'download' ? 'Download' : 'Upload';
    const statusBadgeClass = getStatusBadgeClass(job.status);
    
    // Create unique IDs for buttons
    const downloadBtnId = `download-btn-${job.id}`;
    const deleteBtnId = `delete-btn-${job.id}`;
    
    // Direct download button for completed downloads
    const directDownloadBtn = (job.type === 'download' && job.status === 'completed') 
        ? `<button id="${downloadBtnId}" class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg mr-2">
             <i class="bi bi-download"></i> Download
           </button>` 
        : '';
    
    // YouTube link for completed uploads
    const youtubeBtn = (job.type === 'upload' && job.status === 'completed' && (job.youtubeUrl || job.videoId)) 
        ? `<a href="${job.youtubeUrl || `https://www.youtube.com/watch?v=${job.videoId}`}" target="_blank" class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg mr-2 inline-block">
             <i class="bi bi-youtube"></i> View on YouTube
           </a>` 
        : '';
    
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-grow">
                <h6 class="font-semibold text-lg mb-2 flex items-center">
                    <i class="bi ${typeIcon} mr-2 text-primary-600"></i> 
                    ${typeText}: ${job.title || 'Untitled'}
                </h6>
                <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>ID: <span class="font-mono">${job.id.substring(0, 8)}...</span></div>
                    ${job.url ? `<div>URL: <span class="break-all">${job.url.length > 60 ? job.url.substring(0, 60) + '...' : job.url}</span></div>` : ''}
                    ${job.startTime ? `<div>Started: ${formatDate(job.startTime)}</div>` : ''}
                    ${job.fileSize ? `<div>Size: ${formatBytes(job.fileSize)}</div>` : ''}
                </div>
            </div>
            <div class="text-right">
                <div class="mb-2">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass}">
                        ${job.status.toUpperCase()}
                    </span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Progress: ${Math.round(job.progress || 0)}%
                </div>
                <div class="flex flex-col space-y-2">
                    ${directDownloadBtn}
                    ${youtubeBtn}
                    <button id="${deleteBtnId}" class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
        ${job.error ? `<div class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="text-red-800 dark:text-red-200 text-sm">
                <i class="bi bi-exclamation-triangle mr-2"></i>Error: ${job.error}
            </div>
        </div>` : ''}
    `;
    
    // Add event listeners after element is created
    setTimeout(() => {
        // Download button event listener
        const downloadBtn = document.getElementById(downloadBtnId);
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔽 Download button clicked for job:', job.id);
                downloadJobFile(job.id);
            });
        }
        
        // Delete button event listener
        const deleteBtn = document.getElementById(deleteBtnId);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🗑️ Delete button clicked for job:', job.id);
                deleteJob(job.id, job.type);
            });
        }
    }, 100);
    
    return div;
}

function showAuthSection() {
    authSection.style.display = 'block';
}

function hideAuthSection() {
    authSection.style.display = 'none';
}

async function checkAuthStatus() {
    try {
        // Check server auth status
        const response = await fetch(`${API_BASE}/api/auth/status`);
        const data = await response.json();
        
        updateConnectionStatus(data.authenticated, data.userInfo);
        
        return data.authenticated;
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateConnectionStatus(false);
        return false;
    }
}

function updateConnectionStatus(isConnected, userInfo = null) {
    const statusContainer = document.getElementById('connectionStatus');
    const authenticateBtn = document.getElementById('authenticateBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const authStatus = document.getElementById('authStatus');
    
    if (isConnected) {
        // Show connected status
        statusContainer.innerHTML = `
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div class="flex items-start">
                    <i class="bi bi-check-circle-fill text-green-600 mr-3 mt-1"></i>
                    <div class="flex-grow">
                        <h4 class="font-medium text-green-800 dark:text-green-200">Connected to YouTube</h4>
                        <p class="text-sm text-green-700 dark:text-green-300 mt-1">
                            ${userInfo ? `Logged in as: ${userInfo.email || userInfo.name || 'YouTube User'}` : 'Authentication successful. You can now upload videos to YouTube.'}
                        </p>
                        <p class="text-xs text-green-600 dark:text-green-400 mt-2">
                            <i class="bi bi-shield-check mr-1"></i>
                            Connection will persist until manually disconnected
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Hide authenticate button, show disconnect button
        authenticateBtn.style.display = 'none';
        disconnectBtn.style.display = 'flex';
        authStatus.textContent = 'Ready to upload videos';
        authStatus.className = 'text-center text-sm text-green-600 dark:text-green-400';
        
        // Store auth status per session
        localStorage.setItem('youtube_auth_completed', 'true');
        localStorage.setItem('youtube_auth_time', new Date().toISOString());
        
        // Store session info if available
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        if (sessionId) {
            localStorage.setItem('youtube_session_id', sessionId);
        }
        
    } else {
        // Show disconnected status
        statusContainer.innerHTML = `
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div class="flex items-start">
                    <i class="bi bi-exclamation-triangle text-yellow-600 mr-3 mt-1"></i>
                    <div>
                        <h4 class="font-medium text-yellow-800 dark:text-yellow-200">Authentication Required</h4>
                        <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            To upload videos to YouTube, you need to authenticate with your Google account.
                        </p>
                        <p class="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                            <i class="bi bi-info-circle mr-1"></i>
                            Your login will be saved and persist across browser sessions
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Show authenticate button, hide disconnect button
        authenticateBtn.style.display = 'flex';
        disconnectBtn.style.display = 'none';
        authStatus.textContent = 'Not connected';
        authStatus.className = 'text-center text-sm text-gray-600 dark:text-gray-400';
        
        // Clear auth status
        localStorage.removeItem('youtube_auth_completed');
        localStorage.removeItem('youtube_auth_time');
        localStorage.removeItem('youtube_session_id');
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

function showToast(message, type = 'info') {
    console.log('Showing toast:', message, type);
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('❌ Toast container not found');
        // Fallback to alert if toast container is missing
        alert(message);
        return;
    }
    
    const toastId = 'toast-' + Date.now();
    
    const typeClasses = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-white',
        info: 'bg-blue-500 text-white'
    };
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `${typeClasses[type]} px-6 py-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 flex items-center justify-between max-w-sm`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="removeToast('${toastId}')" class="ml-4 text-white hover:text-gray-200">
            <i class="bi bi-x-lg"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        removeToast(toastId);
    }, 5000);
    
    console.log('✅ Toast shown successfully');
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

// Additional functions for new features
async function updateProgress() {
    const allJobs = [...downloadJobs.values(), ...uploadJobs.values()];
    const activeJobs = allJobs.filter(job => 
        job.status === 'downloading' || job.status === 'uploading' || job.status === 'starting'
    );
    
    if (activeJobs.length === 0) {
        if (currentDownloadJob || currentUploadJob) {
            hideProgress();
            currentDownloadJob = null;
            currentUploadJob = null;
        }
        return;
    }
    
    // Update individual job progress
    for (const job of activeJobs) {
        try {
            const endpoint = job.type === 'download' ? 'download-status' : 'upload-status';
            const response = await fetch(`${API_BASE}/api/${endpoint}/${job.id}`);
            const data = await response.json();
            
            if (data.success) {
                job.status = data.job.status;
                job.progress = data.job.progress;
                job.error = data.job.error;
                job.speed = data.job.speed;
                job.eta = data.job.eta;
                job.fileSize = data.job.fileSize;
                
                // Update additional job data from server
                if (data.job.youtubeUrl) {
                    job.youtubeUrl = data.job.youtubeUrl;
                }
                if (data.job.videoId) {
                    job.videoId = data.job.videoId;
                }
                if (data.job.directDownloadUrl) {
                    job.directDownloadUrl = data.job.directDownloadUrl;
                }
                if (data.job.isDirectDownload !== undefined) {
                    job.isDirectDownload = data.job.isDirectDownload;
                }
                
                // Update job in the appropriate map
                if (job.type === 'download') {
                    downloadJobs.set(job.id, job);
                } else if (job.type === 'upload') {
                    uploadJobs.set(job.id, job);
                }
                
                // Handle direct download completion
                if (job.type === 'download' && job.downloadMode === 'direct' && 
                    job.status === 'completed' && !job.directDownloadTriggered) {
                    job.directDownloadTriggered = true;
                    console.log('🔽 Triggering direct download for job:', job.id);
                    console.log('Job details:', job);
                    
                    // Trigger direct download from server (processed file)
                    setTimeout(() => {
                        console.log('Downloading processed file from server...');
                        downloadJobFile(job.id);
                    }, 1000);
                }
                
                // Update batch job progress
                if (job.batchId) {
                    updateBatchProgress(job.batchId);
                }
            }
        } catch (error) {
            console.error(`Error updating job ${job.id}:`, error);
        }
    }
    
    // Update UI
    const currentJob = activeJobs[0]; // Show progress for first active job
    if (currentJob) {
        updateProgressUI(currentJob);
    }
    
    saveJobsToStorage();
    updateJobsList();
    updateDownloadJobSelect();
    
    // Check for completed jobs and show notifications
    checkCompletedJobs();
}

function updateBatchProgress(batchId) {
    const batchJob = batchJobs.get(batchId);
    if (!batchJob) return;
    
    const jobs = batchJob.jobs.map(jobId => 
        downloadJobs.get(jobId) || uploadJobs.get(jobId)
    ).filter(Boolean);
    
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const errorJobs = jobs.filter(job => job.status === 'error');
    
    batchJob.completed = completedJobs.length;
    batchJob.errors = errorJobs.length;
    batchJob.progress = (completedJobs.length / jobs.length) * 100;
    
    if (completedJobs.length + errorJobs.length === jobs.length) {
        batchJob.status = errorJobs.length > 0 ? 'completed-with-errors' : 'completed';
        showToast(`Batch job completed: ${completedJobs.length}/${jobs.length} successful`, 
                  errorJobs.length > 0 ? 'warning' : 'success');
    }
}

function updateProgressUI(job) {
    if (!progressSection.style.display || progressSection.style.display === 'none') {
        showProgress(job.type === 'download' ? 'Downloading' : 'Uploading', job.status, job.progress);
    }
    
    document.getElementById('progressPercent').textContent = `${Math.round(job.progress)}%`;
    document.getElementById('progressBar').style.width = `${job.progress}%`;
    document.getElementById('progressStatus').textContent = job.status;
    document.getElementById('progressMessage').textContent = getStatusMessage(job.status, job.progress);
    
    // Update speedometer
    if (job.speed) {
        const speedMBs = job.speed / (1024 * 1024);
        document.getElementById('speedValue').textContent = speedMBs.toFixed(1);
        updateSpeedometer(speedMBs);
    }
    
    // Update stats
    if (job.eta) {
        document.getElementById('etaTime').textContent = formatTime(job.eta);
    }
    if (job.fileSize) {
        document.getElementById('fileSize').textContent = formatBytes(job.fileSize);
    }
    
    // Update status badge color
    const statusBadge = document.getElementById('progressStatus');
    statusBadge.className = `px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`;
}

function updateSpeedometer(speedMBs) {
    const maxSpeed = 50; // MB/s
    const percentage = Math.min(speedMBs / maxSpeed, 1) * 100;
    const needle = document.getElementById('speedometerNeedle');
    
    if (needle) {
        needle.style.background = `conic-gradient(from 0deg, transparent 0%, #3b82f6 ${percentage}%, transparent ${percentage}%)`;
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'starting':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'downloading':
        case 'uploading':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'completed':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'error':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
}

function updateBatchVideoList() {
    const container = document.getElementById('batchVideoList');
    if (!container) return;
    
    const completedJobs = Array.from(downloadJobs.values()).filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No completed downloads available</p>';
        return;
    }
    
    container.innerHTML = completedJobs.map(job => `
        <label class="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            <input type="checkbox" value="${job.id}" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-3">
            <div class="flex-1">
                <div class="font-medium">${job.title}</div>
                <div class="text-sm text-gray-500">${job.quality || 'Unknown'} • ${formatDate(job.timestamp)}</div>
            </div>
        </label>
    `).join('');
}

function selectAllVideos() {
    const checkboxes = document.querySelectorAll('#batchVideoList input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
    
    const button = document.getElementById('selectAllVideos');
    if (button) {
        button.textContent = allChecked ? 'Select All Completed Downloads' : 'Deselect All';
    }
}

function filterHistory() {
    console.log('🔍 Filtering history...');
    
    const typeFilter = document.getElementById('historyFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    
    console.log('Filter criteria:', { typeFilter, statusFilter, searchTerm });
    
    const jobsList = document.getElementById('jobsList');
    if (!jobsList) return;
    
    // Get all jobs
    const allJobs = [
        ...Array.from(downloadJobs.values()).map(job => ({ ...job, type: 'download' })),
        ...Array.from(uploadJobs.values()).map(job => ({ ...job, type: 'upload' })),
        ...Array.from(batchJobs.values()).map(job => ({ ...job, type: job.type || 'batch' }))
    ];
    
    // Apply filters
    let filteredJobs = allJobs.filter(job => {
        // Type filter
        if (typeFilter !== 'all') {
            if (typeFilter === 'download' && job.type !== 'download') return false;
            if (typeFilter === 'upload' && job.type !== 'upload') return false;
            if (typeFilter === 'batch' && !job.type.includes('batch')) return false;
        }
        
        // Status filter
        if (statusFilter !== 'all' && job.status !== statusFilter) return false;
        
        // Search filter
        if (searchTerm && !job.title?.toLowerCase().includes(searchTerm) && 
            !job.url?.toLowerCase().includes(searchTerm)) return false;
        
        return true;
    });
    
    console.log(`Filtered ${filteredJobs.length} jobs from ${allJobs.length} total`);
    
    // Sort by start time (newest first)
    filteredJobs.sort((a, b) => {
        const timeA = new Date(a.startTime || 0);
        const timeB = new Date(b.startTime || 0);
        return timeB - timeA;
    });
    
    // Clear and populate jobs list
    jobsList.innerHTML = '';
    
    if (filteredJobs.length === 0) {
        jobsList.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <i class="bi bi-inbox text-4xl mb-4"></i>
                <p>No jobs found matching your criteria</p>
            </div>
        `;
        return;
    }
    
    // Create job elements
    filteredJobs.forEach(job => {
        const jobElement = createJobElement(job);
        if (jobElement) {
            jobsList.appendChild(jobElement);
        }
    });
    
    console.log('✅ History filtered and updated');
}

function exportHistory() {
    const allJobs = [
        ...Array.from(downloadJobs.values()),
        ...Array.from(uploadJobs.values()),
        ...Array.from(batchJobs.values())
    ];
    
    const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        jobs: allJobs
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-downloader-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('History exported successfully!', 'success');
}



async function clearAllHistory() {
    if (!confirm('Are you sure you want to clear all history and delete all files from server? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Call server API to clear all files
        const response = await fetch(`${API_BASE}/api/clear-all`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear local storage
            downloadJobs.clear();
            uploadJobs.clear();
            batchJobs.clear();
            
            localStorage.removeItem('downloadJobs');
            localStorage.removeItem('uploadJobs');
            localStorage.removeItem('batchJobs');
            
            updateJobsList();
            updateDownloadJobSelect();
            updateBatchVideoList();
            
            showToast(`All history cleared! ${data.deletedCount} files deleted from server.`, 'success');
        } else {
            showToast(data.message || 'Error clearing history', 'error');
        }
    } catch (error) {
        console.error('Error clearing all history:', error);
        
        // Fallback to local clear only
        downloadJobs.clear();
        uploadJobs.clear();
        batchJobs.clear();
        
        localStorage.removeItem('downloadJobs');
        localStorage.removeItem('uploadJobs');
        localStorage.removeItem('batchJobs');
        
        updateJobsList();
        updateDownloadJobSelect();
        updateBatchVideoList();
        
        showToast('History cleared locally (server cleanup failed)', 'warning');
    }
}

async function saveCredentials() {
    const clientId = document.getElementById('clientId').value;
    const clientSecret = document.getElementById('clientSecret').value;
    const redirectUri = document.getElementById('redirectUri').value;
    
    if (!clientId || !clientSecret || !redirectUri) {
        showToast('Please enter Client ID, Client Secret, and Redirect URI', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/save-credentials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clientId, clientSecret, redirectUri })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Credentials saved successfully!', 'success');
        } else {
            showToast(data.message || 'Error saving credentials', 'error');
        }
    } catch (error) {
        console.error('Save credentials error:', error);
        showToast('Error connecting to server', 'error');
    }
}

function saveSettings() {
    settings.defaultQuality = document.getElementById('defaultQuality')?.value || 'best';
    settings.defaultDownloadMode = document.getElementById('defaultDownloadMode')?.value || 'server';
    settings.enableNotifications = document.getElementById('enableNotifications')?.checked || false;
    settings.enableSounds = document.getElementById('enableSounds')?.checked || false;
    
    settings.platforms = {
        youtube: document.getElementById('enableYoutube')?.checked || false,
        vimeo: document.getElementById('enableVimeo')?.checked || false,
        facebook: document.getElementById('enableFacebook')?.checked || false,
        instagram: document.getElementById('enableInstagram')?.checked || false
    };
    
    localStorage.setItem('appSettings', JSON.stringify(settings));
    showToast('Settings saved successfully!', 'success');
}

function loadSettings() {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
        
        // Apply settings to UI
        if (document.getElementById('defaultQuality')) {
            document.getElementById('defaultQuality').value = settings.defaultQuality;
        }
        if (document.getElementById('defaultDownloadMode')) {
            document.getElementById('defaultDownloadMode').value = settings.defaultDownloadMode;
        }
        if (document.getElementById('enableNotifications')) {
            document.getElementById('enableNotifications').checked = settings.enableNotifications;
        }
        if (document.getElementById('enableSounds')) {
            document.getElementById('enableSounds').checked = settings.enableSounds;
        }
        
        // Platform settings
        Object.keys(settings.platforms).forEach(platform => {
            const checkbox = document.getElementById(`enable${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
            if (checkbox) {
                checkbox.checked = settings.platforms[platform];
            }
        });
    }
}

function checkCompletedJobs() {
    const allJobs = [...downloadJobs.values(), ...uploadJobs.values()];
    
    allJobs.forEach(job => {
        if (job.status === 'completed' && !job.notified) {
            job.notified = true;
            
            if (settings.enableNotifications) {
                showNotification(
                    `${job.type === 'download' ? 'Download' : 'Upload'} Completed`,
                    `${job.title} has been processed successfully`
                );
            }
            
            if (settings.enableSounds) {
                playNotificationSound();
            }
        }
    });
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/favicon.ico'
        });
    }
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

// Make removeToast globally accessible
window.removeToast = removeToast;

// Global functions for job management
window.deleteJob = async function(jobId, jobType) {
    console.log('🗑️ deleteJob called with:', { jobId, jobType });
    
    // First check if job exists locally
    const job = downloadJobs.get(jobId) || uploadJobs.get(jobId) || batchJobs.get(jobId);
    if (!job) {
        console.log('Job not found locally, removing from UI');
        // Remove the job element from UI if it exists
        const jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
        if (jobElement) {
            jobElement.remove();
        }
        showToast('Job sudah tidak ada', 'warning');
        return;
    }
    
    if (!confirm('Apakah Anda yakin ingin menghapus job ini? File yang sudah didownload juga akan dihapus.')) {
        console.log('Delete cancelled by user');
        return;
    }
    
    try {
        console.log('Sending delete request to server...');
        
        // Delete from server
        const response = await fetch(`${API_BASE}/api/cleanup/${jobId}`, {
            method: 'DELETE'
        });
        
        console.log('Server response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Server response data:', data);
            
            // Remove from local storage regardless of server response
            let deleted = false;
            if (downloadJobs.has(jobId)) {
                deleted = downloadJobs.delete(jobId);
                console.log('Deleted from downloadJobs:', deleted);
            }
            if (uploadJobs.has(jobId)) {
                deleted = uploadJobs.delete(jobId);
                console.log('Deleted from uploadJobs:', deleted);
            }
            if (batchJobs.has(jobId)) {
                deleted = batchJobs.delete(jobId);
                console.log('Deleted from batchJobs:', deleted);
            }
            
            saveJobsToStorage();
            filterHistory(); // Use filterHistory instead of updateJobsList
            updateDownloadJobSelect();
            
            showToast('Job berhasil dihapus!', 'success');
            console.log('✅ Job deleted successfully');
        } else {
            // Even if server fails, remove from local storage
            downloadJobs.delete(jobId);
            uploadJobs.delete(jobId);
            batchJobs.delete(jobId);
            
            saveJobsToStorage();
            filterHistory();
            updateDownloadJobSelect();
            
            showToast('Job dihapus dari local (server error)', 'warning');
        }
    } catch (error) {
        console.error('❌ Error deleting job:', error);
        
        // Fallback: remove from local storage anyway
        downloadJobs.delete(jobId);
        uploadJobs.delete(jobId);
        batchJobs.delete(jobId);
        
        saveJobsToStorage();
        filterHistory();
        updateDownloadJobSelect();
        
        showToast('Job dihapus dari local (network error)', 'warning');
    }
};

window.downloadJobFile = async function(jobId) {
    console.log('🔽 downloadJobFile called with jobId:', jobId);
    
    try {
        // Get job details from all possible sources
        const job = downloadJobs.get(jobId) || uploadJobs.get(jobId) || batchJobs.get(jobId);
        console.log('Job details:', job);
        
        if (!job) {
            console.log('Job not found locally, checking server...');
            
            // Try to get job status from server
            try {
                const response = await fetch(`${API_BASE}/api/download-status/${jobId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.job) {
                        console.log('Job found on server:', data.job);
                        // Update local storage with server data
                        const serverJob = {
                            ...data.job,
                            id: jobId,
                            type: 'download'
                        };
                        downloadJobs.set(jobId, serverJob);
                        saveJobsToStorage();
                        
                        // Continue with download
                        if (serverJob.status !== 'completed') {
                            showToast('Job belum selesai!', 'warning');
                            return;
                        }
                    } else {
                        showToast('Job tidak ditemukan di server!', 'error');
                        return;
                    }
                } else {
                    showToast('Job tidak ditemukan!', 'error');
                    return;
                }
            } catch (serverError) {
                console.error('Error checking server:', serverError);
                showToast('Job tidak ditemukan!', 'error');
                return;
            }
        }
        
        if (job.status !== 'completed') {
            showToast('Job belum selesai!', 'warning');
            return;
        }
        
        showToast('Memulai download file...', 'info');
        
        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = `${API_BASE}/api/download-file/${jobId}`;
        link.download = job.title ? `${job.title}.mp4` : 'video.mp4';
        link.target = '_blank';
        document.body.appendChild(link);
        
        console.log('Triggering download with URL:', link.href);
        link.click();
        
        document.body.removeChild(link);
        
        showToast('Download dimulai!', 'success');
    } catch (error) {
        console.error('Error downloading file:', error);
        showToast('Error download file: ' + error.message, 'error');
    }
};

// Test functions - for debugging (disabled in production)
window.testApp = function() {
    console.log('🧪 Testing app functionality...');
    
    // Test toast - disabled in production
    console.log('Testing toast...');
    // showToast('Test toast berhasil!', 'success');
    
    // Test tab navigation
    console.log('Testing tab navigation...');
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log('Found tab buttons:', tabButtons.length);
    
    // Test form elements
    console.log('Testing form elements...');
    const downloadForm = document.getElementById('downloadForm');
    console.log('Download form found:', !!downloadForm);
    
    const videoUrl = document.getElementById('videoUrl');
    console.log('Video URL input found:', !!videoUrl);
    
    // Test dark mode toggle
    console.log('Testing dark mode...');
    const darkModeToggle = document.getElementById('darkModeToggle');
    console.log('Dark mode toggle found:', !!darkModeToggle);
    
    // Test global functions
    console.log('Testing global functions...');
    console.log('deleteJob function:', typeof window.deleteJob);
    console.log('downloadJobFile function:', typeof window.downloadJobFile);
    
    // Test jobs data
    console.log('Download jobs count:', downloadJobs.size);
    console.log('Upload jobs count:', uploadJobs.size);
    
    console.log('✅ Test completed - check console for results');
};

// Test delete function specifically
window.testDelete = function() {
    console.log('🗑️ Testing delete functionality...');
    
    // Check if there are any jobs to delete
    if (downloadJobs.size === 0 && uploadJobs.size === 0) {
        console.log('No jobs found to test delete');
        // showToast('No jobs found to test delete', 'warning');
        return;
    }
    
    // Get first job for testing
    const firstDownloadJob = downloadJobs.values().next().value;
    const firstUploadJob = uploadJobs.values().next().value;
    
    if (firstDownloadJob) {
        console.log('Found download job for testing:', firstDownloadJob.id);
        console.log('Job details:', firstDownloadJob);
        
        // Test delete function
        console.log('Testing deleteJob function...');
        if (typeof window.deleteJob === 'function') {
            console.log('✅ deleteJob function exists');
        } else {
            console.error('❌ deleteJob function not found');
        }
    }
    
    if (firstUploadJob) {
        console.log('Found upload job for testing:', firstUploadJob.id);
        console.log('Job details:', firstUploadJob);
    }
    
    console.log('✅ Delete test completed - check console for results');
};

// Test download function specifically
window.testDownload = function() {
    console.log('🔽 Testing download functionality...');
    
    // Check if there are any completed jobs to download
    const completedJobs = Array.from(downloadJobs.values()).filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) {
        console.log('No completed jobs found to test download');
        // showToast('No completed jobs found to test download', 'warning');
        return;
    }
    
    const firstCompletedJob = completedJobs[0];
    console.log('Found completed job for testing:', firstCompletedJob.id);
    console.log('Job details:', firstCompletedJob);
    
    // Test download function
    console.log('Testing downloadJobFile function...');
    if (typeof window.downloadJobFile === 'function') {
        console.log('✅ downloadJobFile function exists');
        
        // Test the function
        console.log('Calling downloadJobFile...');
        window.downloadJobFile(firstCompletedJob.id);
    } else {
        console.error('❌ downloadJobFile function not found');
    }
    
    console.log('✅ Download test completed - check console for results');
};

// Test button clicks
window.testButtons = function() {
    console.log('🔘 Testing button functionality...');
    
    // Find all delete buttons
    const deleteButtons = document.querySelectorAll('button[onclick*="deleteJob"]');
    console.log('Found delete buttons:', deleteButtons.length);
    
    // Find all download buttons
    const downloadButtons = document.querySelectorAll('button[onclick*="downloadJobFile"]');
    console.log('Found download buttons:', downloadButtons.length);
    
    if (deleteButtons.length > 0) {
        console.log('First delete button onclick:', deleteButtons[0].getAttribute('onclick'));
    }
    
    if (downloadButtons.length > 0) {
        console.log('First download button onclick:', downloadButtons[0].getAttribute('onclick'));
    }
    
    console.log('✅ Button test completed - check console for results');
};

// Auto-test disabled in production
// setTimeout(() => {
//     if (window.testApp) {
//         console.log('🔧 Running auto-test...');
//         window.testApp();
//     }
// }, 2000);

// Utility functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function detectPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'youtube';
    } else if (url.includes('instagram.com')) {
        return 'instagram';
    } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
        return 'facebook';
    } else if (url.includes('vimeo.com')) {
        return 'vimeo';
    } else if (url.includes('tiktok.com')) {
        return 'tiktok';
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
        return 'twitter';
    }
    return 'other';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
} 