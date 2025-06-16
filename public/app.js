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
    console.log('🚀 Initializing app...');
    
    try {
        // Load settings first
        loadSettings();
        console.log('✅ Settings loaded');
        
        // Load jobs from storage
        loadJobsFromStorage();
        console.log('✅ Jobs loaded from storage');
        
        // Clean up invalid jobs
        cleanupInvalidJobs();
        console.log('✅ Invalid jobs cleaned up');
        
        // Setup event listeners
        setupEventListeners();
        console.log('✅ Event listeners setup');
        
        // Setup dark mode
        setupDarkMode();
        console.log('✅ Dark mode setup');
        
        // Setup tab navigation
        setupTabNavigation();
        console.log('✅ Tab navigation setup');
        
        // Setup drag and drop
        setupDragAndDrop();
        console.log('✅ Drag and drop setup');
        
        // Update UI
        updateJobsList();
        updateDownloadJobSelect();
        updateBatchVideoList();
        console.log('✅ UI updated');
        
        // Check auth status
        console.log('🔍 Checking initial auth status...');
        await checkAuthStatus();
        
        // Update credentials status
        updateCredentialsStatus(hasLocalCredentials());
        console.log('✅ Credentials status updated');
        
        // Restore active tab (with delay to ensure DOM is ready)
        setTimeout(() => {
            restoreActiveTab();
            console.log('✅ Active tab restored');
        }, 200);
        
        // Request notification permission
        requestNotificationPermission();
        console.log('✅ Notification permission requested');
        
        console.log('🎉 App initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        showToast('Error initializing app: ' + error.message, 'error');
    }
}

// Enhanced tab restoration with better timing and fallback
function restoreActiveTab() {
    // Multiple attempts with increasing delays
    const attemptRestore = (attempt = 1) => {
        const savedTab = localStorage.getItem('activeTab') || 'download';
        console.log(`Attempt ${attempt}: Restoring tab:`, savedTab);
        
        const tabButton = document.querySelector(`[data-tab="${savedTab}"]`);
        if (tabButton) {
            console.log('Found tab button, clicking:', tabButton);
            tabButton.click();
            return true;
        } else {
            console.error('Tab button not found for:', savedTab);
            
            // Try again with increasing delay
            if (attempt < 5) {
                setTimeout(() => attemptRestore(attempt + 1), attempt * 200);
            } else {
                // Final fallback to download tab
                console.log('Final fallback to download tab');
                const downloadTab = document.querySelector('[data-tab="download"]');
                if (downloadTab) {
                    downloadTab.click();
                } else {
                    console.error('Even download tab not found!');
                }
            }
            return false;
        }
    };
    
    // Start first attempt after DOM is ready
    setTimeout(() => attemptRestore(), 100);
}

function saveActiveTab(tabName) {
    localStorage.setItem('activeTab', tabName);
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
        
        // Upload via link form
        const uploadViaLinkForm = document.getElementById('uploadViaLinkForm');
        if (uploadViaLinkForm) {
            uploadViaLinkForm.addEventListener('submit', handleUploadViaLink);
            console.log('✅ Upload via link form listener added');
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
                
                // Update UI based on tab
                if (targetTab === 'upload') {
                    updateDownloadJobSelect();
                    updateBatchVideoList();
                    console.log('✅ Upload tab UI updated');
                } else if (targetTab === 'history') {
                    updateJobsList();
                    console.log('✅ History tab UI updated');
                }
                
                // Save active tab
                saveActiveTab(targetTab);
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
    
    let url = document.getElementById('videoUrl').value;
    const quality = document.getElementById('quality').value;
    const downloadMode = document.getElementById('downloadMode').value;
    
    if (!url) {
        showToast('Please enter a video URL', 'error');
        return;
    }
    
    // Clean URL
    const originalUrl = url;
    url = url.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '');
    
    if (originalUrl !== url) {
        document.getElementById('videoUrl').value = url;
        showToast('URL cleaned automatically', 'info');
    }
    
    try {
        setButtonLoading('downloadBtn', true);
        
        const response = await fetch(`${API_BASE}/api/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                quality,
                downloadMode
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store job info
            downloadJobs.set(data.jobId, {
                id: data.jobId,
                url,
                title: data.title || 'Unknown Title',
                quality,
                downloadMode,
                status: data.status,
                progress: 0,
                type: 'download',
                timestamp: new Date().toISOString()
            });
            
            currentDownloadJob = data.jobId;
            
            saveJobsToStorage();
            showProgress('Download Video', 'starting', 0);
            showInlineProgress('download');
            
            // Update inline progress immediately
            updateInlineProgress('download', downloadJobs.get(data.jobId));
            
            // Show platform-specific messages
            if (data.platform === 'youtube') {
                showToast('YouTube download started! This may take a few minutes.', 'success');
            } else if (data.platform === 'instagram') {
                showToast('Instagram download started!', 'success');
            } else if (data.platform === 'tiktok') {
                showToast('TikTok download started!', 'success');
            } else {
                showToast('Download started!', 'success');
            }
            
            // Reset form
            document.getElementById('downloadForm').reset();
            
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
    
    const urlsRaw = document.getElementById('batchUrls').value.split('\n');
    // Clean each URL and filter out empty ones
    const urls = urlsRaw.map(url => {
        const cleaned = url.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '');
        return cleaned;
    }).filter(url => url);
    
    // Update the textarea with cleaned URLs if any changes were made
    const cleanedUrlsText = urls.join('\n');
    const originalText = document.getElementById('batchUrls').value;
    if (originalText !== cleanedUrlsText) {
        document.getElementById('batchUrls').value = cleanedUrlsText;
        showToast('URL batch dibersihkan otomatis (spasi dihapus)', 'info');
    }
    
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
        document.getElementById('batchDownloadForm').reset();
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
    
    if (!jobId) {
        showToast('Please select a completed download first', 'error');
        updateDownloadJobSelect(); // Refresh the list
        return;
    }
    
    if (!title.trim()) {
        showToast('Please enter a video title', 'error');
        return;
    }
    
    // Check auth status first
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) {
        showToast('YouTube authentication required. Please authenticate first.', 'error');
        showAuthSection();
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
                downloadJobId: jobId, // Send as downloadJobId to match backend
                title: title.trim(),
                description: description.trim(),
                tags: [],
                privacy,
                category
            })
        });
        
        const data = await response.json();
        console.log('Upload response:', data);
        
        if (data.success) {
            // Use uploadJobId from server response, fallback to jobId
            const uploadJobId = data.uploadJobId || data.jobId;
            console.log('Upload job ID:', uploadJobId);
            
            // Store upload job info
            uploadJobs.set(uploadJobId, {
                id: uploadJobId,
                downloadJobId: jobId,
                title: title.trim(),
                description: description.trim(),
                privacy,
                category,
                status: data.status || 'starting',
                progress: 0,
                type: 'upload',
                timestamp: new Date().toISOString()
            });
            
            currentUploadJob = uploadJobId;
            
            saveJobsToStorage();
            showProgress('Upload to YouTube', 'starting', 0);
            showToast('YouTube upload started!', 'success');
            showInlineProgress('upload');
            
            // Update inline progress immediately
            updateInlineProgress('upload', uploadJobs.get(uploadJobId));
            
            // Reset form
            document.getElementById('uploadForm').reset();
        } else {
            if (data.requireAuth) {
                showAuthSection();
                showToast('Authentication required. Please authenticate with YouTube first.', 'warning');
            } else if (data.message && data.message.includes('authentication')) {
                // Show authentication error with refresh option
                showAuthErrorWithRefresh(data.message);
            } else if (data.message && (data.message.includes('quota') || data.message.includes('limit') || data.message.includes('exceeded'))) {
                // Show quota error with helpful information
                showQuotaError(data.message);
            } else {
                showToast(data.message || 'Error starting upload', 'error');
            }
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
    
    // Check auth status first
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) {
        showToast('YouTube authentication required. Please authenticate first.', 'error');
        showAuthSection();
        return;
    }
    
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
                        downloadJobId: jobId, // Send as downloadJobId to match backend
                        title: downloadJob.title,
                        description: `Batch uploaded video: ${downloadJob.title}`,
                        tags: defaultTags ? defaultTags.split(',').map(tag => tag.trim()) : [],
                        privacy,
                        category: '22',
                        batchId
                    })
                });
                
                const data = await response.json();
                console.log('Batch upload response for job', jobId, ':', data);
                
                if (data.success) {
                    const uploadJobId = data.uploadJobId || data.jobId;
                    batchJob.jobs.push(uploadJobId);
                    uploadJobs.set(uploadJobId, {
                        id: uploadJobId,
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
        document.getElementById('batchUploadForm').reset();
        updateBatchVideoList();
        
    } catch (error) {
        console.error('Batch upload error:', error);
        showToast('Error starting batch upload', 'error');
    } finally {
        setButtonLoading('batchUploadBtn', false);
    }
}

async function handleUploadViaLink(e) {
    e.preventDefault();
    
    const url = document.getElementById('directUploadUrl').value;
    const title = document.getElementById('directUploadTitle').value;
    const description = document.getElementById('directUploadDescription').value;
    const quality = document.getElementById('directUploadQuality').value;
    const privacy = document.getElementById('directUploadPrivacy').value;
    const tags = document.getElementById('directUploadTags').value;
    
    if (!url) {
        showToast('Please enter a video URL', 'error');
        return;
    }
    
    if (!title.trim()) {
        showToast('Please enter a video title', 'error');
        return;
    }
    
    // Check auth status first
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) {
        showToast('YouTube authentication required. Please authenticate first.', 'error');
        showAuthSection();
        return;
    }
    
    try {
        setButtonLoading('directUploadBtn', true);
        
        const response = await fetch(`${API_BASE}/api/upload-via-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url.trim(),
                title: title.trim(),
                description: description.trim(),
                quality,
                privacy,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                category: '22' // People & Blogs
            })
        });
        
        const data = await response.json();
        console.log('Direct upload response:', data);
        
        if (data.success) {
            const directUploadJobId = data.uploadJobId || data.jobId;
            console.log('Direct upload job ID:', directUploadJobId);
            
            // Store direct upload job info
            uploadJobs.set(directUploadJobId, {
                id: directUploadJobId,
                url: url.trim(),
                title: title.trim(),
                description: description.trim(),
                quality,
                privacy,
                status: data.status || 'downloading',
                progress: 0,
                type: 'direct-upload',
                phase: 'download',
                timestamp: new Date().toISOString()
            });
            
            currentUploadJob = directUploadJobId;
            
            saveJobsToStorage();
            showProgress('Direct Upload', 'downloading', 0);
            showToast('Direct upload started! Downloading video first...', 'success');
            showDirectUploadProgress();
            
            // Update inline progress immediately
            updateDirectUploadProgress(uploadJobs.get(directUploadJobId));
            
            // Reset form
            document.getElementById('uploadViaLinkForm').reset();
        } else {
            if (data.requireAuth) {
                showAuthSection();
                showToast('Authentication required. Please authenticate with YouTube first.', 'warning');
            } else if (data.message && data.message.includes('authentication')) {
                showAuthErrorWithRefresh(data.message);
            } else if (data.message && (data.message.includes('quota') || data.message.includes('limit') || data.message.includes('exceeded'))) {
                showQuotaError(data.message);
            } else {
                showToast(data.message || 'Error starting direct upload', 'error');
            }
        }
    } catch (error) {
        console.error('Direct upload error:', error);
        showToast('Error connecting to server', 'error');
    } finally {
        setButtonLoading('directUploadBtn', false);
    }
}

async function handlePreview() {
    let url = document.getElementById('videoUrl').value;
    
    if (!url) {
        showToast('Please enter a video URL first', 'error');
        return;
    }
    
    // Clean and normalize URL - remove accidental spaces and normalize
    const originalUrl = url;
    url = url.trim();
    url = url.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
    url = url.replace(/\s+/g, ''); // Remove any internal spaces
    
    // Update the input field if URL was cleaned
    if (originalUrl !== url) {
        document.getElementById('videoUrl').value = url;
        showToast('URL dibersihkan otomatis (spasi dihapus)', 'info');
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

// Enhanced auth window monitoring with better detection
async function initiateYouTubeAuth() {
    try {
        // Get local credentials first
        const localCreds = getLocalCredentials();
        
        const requestBody = localCreds ? {
            clientId: localCreds.clientId,
            clientSecret: localCreds.clientSecret,
            redirectUri: localCreds.redirectUri
        } : {};
        
        const response = await fetch(`${API_BASE}/api/auth/youtube`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Open auth window
            const authWindow = window.open(data.authUrl, 'youtube-auth', 'width=600,height=600,scrollbars=yes,resizable=yes');
            
            // Enhanced monitoring with multiple detection methods
            let authCompleted = false;
            let checkCount = 0;
            const maxChecks = 300; // 5 minutes max
            
            const checkAuth = setInterval(async () => {
                checkCount++;
                
                try {
                    // Check if window is closed
                    if (authWindow.closed) {
                        clearInterval(checkAuth);
                        if (!authCompleted) {
                            // Give a moment for any pending auth to complete
                            setTimeout(async () => {
                                const isAuthenticated = await checkAuthStatus();
                                if (isAuthenticated) {
                                    authCompleted = true;
                                    showToast('YouTube authentication successful!', 'success');
                                } else {
                                    showToast('Authentication window was closed. Please try again.', 'warning');
                                }
                            }, 2000); // Increased delay
                        }
                        return;
                    }
                    
                    // Periodically check auth status even if window is open
                    if (checkCount % 5 === 0) { // Every 5 seconds
                        const isAuthenticated = await checkAuthStatus();
                        if (isAuthenticated && !authCompleted) {
                            authCompleted = true;
                            clearInterval(checkAuth);
                            authWindow.close();
                            showToast('YouTube authentication successful!', 'success');
                            return;
                        }
                    }
                    
                } catch (error) {
                    console.error('Auth monitoring error:', error);
                }
                
                // Timeout after max checks
                if (checkCount >= maxChecks) {
                    clearInterval(checkAuth);
                    if (!authWindow.closed) {
                        authWindow.close();
                    }
                    if (!authCompleted) {
                        showToast('Authentication timeout. Please try again.', 'warning');
                    }
                }
            }, 1000);
            
        } else {
            showToast(data.message || 'Error initiating authentication', 'error');
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

async function refreshYouTubeAuth() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Authentication refreshed successfully!', 'success');
            // Check auth status to update UI
            await checkAuthStatus();
            return true;
        } else {
            if (data.requireAuth) {
                showToast('Authentication expired. Please re-authenticate.', 'warning');
                updateConnectionStatus(false);
                showAuthSection();
            } else {
                showToast(data.message || 'Error refreshing authentication', 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('Refresh auth error:', error);
        showToast('Error connecting to server', 'error');
        return false;
    }
}

function showAuthErrorWithRefresh(message) {
    // Create custom toast with refresh button
    const toastId = `toast-${Date.now()}`;
    const toastContainer = document.getElementById('toastContainer');
    
    const toastElement = document.createElement('div');
    toastElement.id = toastId;
    toastElement.className = `
        fixed top-4 right-4 bg-yellow-50 dark:bg-yellow-900/90 border border-yellow-200 dark:border-yellow-700 
        text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg shadow-lg max-w-md z-50
        transform transition-all duration-300 translate-x-full opacity-0
    `;
    
    toastElement.innerHTML = `
        <div class="flex items-start">
            <i class="bi bi-exclamation-triangle text-yellow-500 mr-3 mt-0.5"></i>
            <div class="flex-1">
                <p class="font-medium">Authentication Error</p>
                <p class="text-sm mt-1">${message}</p>
                <div class="mt-3 flex space-x-2">
                    <button onclick="refreshYouTubeAuth().then(success => { if (success) removeToast('${toastId}'); })" 
                            class="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded">
                        <i class="bi bi-arrow-clockwise mr-1"></i>Refresh Auth
                    </button>
                    <button onclick="initiateYouTubeAuth(); removeToast('${toastId}')" 
                            class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">
                        <i class="bi bi-key mr-1"></i>Re-authenticate
                    </button>
                </div>
            </div>
            <button onclick="removeToast('${toastId}')" class="ml-2 text-yellow-400 hover:text-yellow-600">
                <i class="bi bi-x text-lg"></i>
            </button>
        </div>
    `;
    
    toastContainer.appendChild(toastElement);
    
    // Animate in
    setTimeout(() => {
        toastElement.classList.remove('translate-x-full', 'opacity-0');
    }, 100);
    
    // Auto remove after 15 seconds (longer for this important message)
    setTimeout(() => {
        removeToast(toastId);
    }, 15000);
}

// Enhanced progress updates with better error handling
async function updateProgress() {
    try {
        // Get all active jobs and filter out invalid ones
        const allJobs = [...downloadJobs.values(), ...uploadJobs.values()];
        const activeJobs = allJobs.filter(job => 
            job && job.id && typeof job.id === 'string' && 
            (job.status === 'downloading' || job.status === 'uploading' || job.status === 'starting')
        );
        
        // Update each active job
        for (const job of activeJobs) {
            try {
                const endpoint = job.type === 'download' ? 'download-status' : 'upload-status';
                const response = await fetch(`${API_BASE}/api/${endpoint}/${job.id}`);
                
                if (!response.ok) {
                    console.warn(`Failed to fetch status for job ${job.id}: ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                
                if (data.success && data.job) {
                    // Update job properties
                    const updatedJob = data.job;
                    job.status = updatedJob.status;
                    job.progress = updatedJob.progress || 0;
                    job.error = updatedJob.error;
                    job.speed = updatedJob.speed;
                    job.eta = updatedJob.eta;
                    job.fileSize = updatedJob.fileSize;
                    
                    // Update additional properties
                    if (updatedJob.youtubeUrl) job.youtubeUrl = updatedJob.youtubeUrl;
                    if (updatedJob.videoId) job.videoId = updatedJob.videoId;
                    if (updatedJob.directDownloadUrl) job.directDownloadUrl = updatedJob.directDownloadUrl;
                    if (updatedJob.isDirectDownload !== undefined) job.isDirectDownload = updatedJob.isDirectDownload;
                    
                    // Update job in the appropriate map
                    if (job.type === 'download') {
                        downloadJobs.set(job.id, job);
                        // Always update inline progress for downloads
                        updateInlineProgress('download', job);
                    } else if (job.type === 'upload') {
                        uploadJobs.set(job.id, job);
                        // Always update inline progress for uploads
                        updateInlineProgress('upload', job);
                    } else if (job.type === 'direct-upload') {
                        uploadJobs.set(job.id, job);
                        // Update direct upload progress
                        updateDirectUploadProgress(job);
                    }
                    
                    // Handle direct download completion
                    if (job.type === 'download' && job.downloadMode === 'direct' && 
                        job.status === 'completed' && !job.directDownloadTriggered) {
                        job.directDownloadTriggered = true;
                        console.log('🔽 Triggering direct download for job:', job.id);
                        
                        setTimeout(() => {
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
        
        // Update main progress UI if there are active jobs
        if (activeJobs.length > 0) {
            const currentJob = activeJobs[0];
            updateProgressUI(currentJob);
        } else {
            // Hide main progress if no active jobs
            if (currentDownloadJob || currentUploadJob) {
                hideProgress();
                currentDownloadJob = null;
                currentUploadJob = null;
            }
        }
        
        // Save and update UI
        saveJobsToStorage();
        updateJobsList();
        updateDownloadJobSelect();
        checkCompletedJobs();
        
    } catch (error) {
        console.error('Error in updateProgress:', error);
    }
}

// Enhanced inline progress with better visibility and error handling
function updateInlineProgress(type, job) {
    try {
        const progressDiv = document.getElementById(`${type}Progress`);
        const percentSpan = document.getElementById(`${type}Percent`);
        const progressBar = document.getElementById(`${type}ProgressBar`);
        const statusDiv = document.getElementById(`${type}Status`);
        
        if (!progressDiv || !job) {
            console.warn(`Progress elements not found for type: ${type}`);
            return;
        }
        
        // Always show progress for active jobs
        if (job.status === 'downloading' || job.status === 'uploading' || job.status === 'starting') {
            progressDiv.classList.remove('hidden');
            
            const progress = Math.max(0, Math.min(100, job.progress || 0));
            percentSpan.textContent = `${Math.round(progress)}%`;
            progressBar.style.width = `${progress}%`;
            
            // Build detailed status text
            let statusText = job.status.charAt(0).toUpperCase() + job.status.slice(1);
            
            if (job.speed && job.speed > 0) {
                statusText += ` • ${formatBytes(job.speed)}/s`;
            }
            
            if (job.eta && job.eta > 0) {
                statusText += ` • ETA: ${formatTime(job.eta)}`;
            }
            
            if (job.fileSize && job.fileSize > 0) {
                statusText += ` • Size: ${formatBytes(job.fileSize)}`;
            }
            
            statusDiv.textContent = statusText;
            
            // Reset error styling
            progressBar.classList.remove('bg-red-600');
            progressBar.classList.add('bg-blue-600');
            
        } else if (job.status === 'completed') {
            // Show completion briefly
            percentSpan.textContent = '100%';
            progressBar.style.width = '100%';
            progressBar.classList.remove('bg-red-600');
            progressBar.classList.add('bg-green-600');
            statusDiv.textContent = 'Completed successfully!';
            
            setTimeout(() => {
                hideInlineProgress(type);
            }, 5000); // Show completion for 5 seconds
            
        } else if (job.status === 'error') {
            // Show error state
            progressBar.classList.remove('bg-blue-600', 'bg-green-600');
            progressBar.classList.add('bg-red-600');
            statusDiv.textContent = `Error: ${job.error || 'Unknown error'}`;
            
            setTimeout(() => {
                hideInlineProgress(type);
            }, 8000); // Show error for 8 seconds
        }
        
    } catch (error) {
        console.error(`Error updating inline progress for ${type}:`, error);
    }
}

// Enhanced show inline progress with better initialization
function showInlineProgress(type) {
    try {
        const progressDiv = document.getElementById(`${type}Progress`);
        if (progressDiv) {
            progressDiv.classList.remove('hidden');
            
            // Initialize progress elements
            const percentSpan = document.getElementById(`${type}Percent`);
            const progressBar = document.getElementById(`${type}ProgressBar`);
            const statusDiv = document.getElementById(`${type}Status`);
            
            if (percentSpan) percentSpan.textContent = '0%';
            if (progressBar) {
                progressBar.style.width = '0%';
                progressBar.classList.remove('bg-red-600', 'bg-green-600');
                progressBar.classList.add('bg-blue-600');
            }
            if (statusDiv) statusDiv.textContent = 'Starting...';
            
            console.log(`✅ Inline progress shown for ${type}`);
        } else {
            console.error(`❌ Progress div not found for ${type}`);
        }
    } catch (error) {
        console.error(`Error showing inline progress for ${type}:`, error);
    }
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
    
    // Filter out invalid jobs
    const validJobs = allJobs.filter(job => job && job.id && typeof job.id === 'string');
    
    if (validJobs.length === 0) {
        container.innerHTML = '<p class="text-muted">Belum ada jobs yang dijalankan.</p>';
        return;
    }
    
    // Sort jobs by timestamp (newest first)
    validJobs.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
    
    validJobs.forEach(job => {
        const jobElement = createJobElement(job);
        if (jobElement) { // Only append if element was created successfully
            container.appendChild(jobElement);
        }
    });
}

function createJobElement(job) {
    // Validate job object
    if (!job || !job.id || typeof job.id !== 'string') {
        console.warn('Invalid job passed to createJobElement:', job);
        return null;
    }
    
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
        console.log('🔍 Checking YouTube auth status...');
        
        // Get local credentials to send with request
        const localCreds = getLocalCredentials();
        const requestBody = localCreds ? {
            clientId: localCreds.clientId,
            clientSecret: localCreds.clientSecret,
            redirectUri: localCreds.redirectUri
        } : {};
        
        const response = await fetch(`${API_BASE}/api/auth/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        
        console.log('Auth status response:', data);
        
        if (data.success) {
            // Handle both 'authenticated' and 'isAuthenticated' properties for compatibility
            const isAuth = data.isAuthenticated || data.authenticated || false;
            updateConnectionStatus(isAuth, data.userInfo);
            console.log('✅ Auth status updated:', isAuth);
            return isAuth;
        } else {
            console.log('❌ Auth status check failed:', data.message);
            updateConnectionStatus(false);
            return false;
        }
    } catch (error) {
        console.error('❌ Error checking auth status:', error);
        updateConnectionStatus(false);
        return false;
    }
}

function updateConnectionStatus(isConnected, userInfo = null) {
    console.log('🔄 Updating connection status:', isConnected, userInfo);
    
    const statusDiv = document.getElementById('connectionStatus');
    const authenticateBtn = document.getElementById('authenticateBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const uploadSection = document.getElementById('uploadSection');
    
    if (!statusDiv) {
        console.error('❌ Connection status div not found');
        return;
    }
    
    if (isConnected) {
        // Connected state
        statusDiv.innerHTML = `
            <div class="flex items-center text-green-600 dark:text-green-400">
                <i class="bi bi-check-circle-fill mr-2"></i>
                <span>Connected to YouTube</span>
                ${userInfo ? `<span class="ml-2 text-sm text-gray-500">(${userInfo.name || userInfo.email || 'User'})</span>` : ''}
            </div>
        `;
        
        if (authenticateBtn) {
            authenticateBtn.style.display = 'none';
        }
        if (disconnectBtn) {
            disconnectBtn.style.display = 'inline-flex';
        }
        if (uploadSection) {
            uploadSection.classList.remove('opacity-50', 'pointer-events-none');
        }
        
        hideAuthSection();
        console.log('✅ UI updated for connected state');
        
    } else {
        // Disconnected state
        statusDiv.innerHTML = `
            <div class="flex items-center text-red-600 dark:text-red-400">
                <i class="bi bi-x-circle-fill mr-2"></i>
                <span>Not connected to YouTube</span>
            </div>
        `;
        
        if (authenticateBtn) {
            authenticateBtn.style.display = 'inline-flex';
        }
        if (disconnectBtn) {
            disconnectBtn.style.display = 'none';
        }
        if (uploadSection) {
            uploadSection.classList.add('opacity-50', 'pointer-events-none');
        }
        
        showAuthSection();
        console.log('✅ UI updated for disconnected state');
    }
}

function setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-arrow-clockwise animate-spin mr-2"></i>Loading...';
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        // Restore original text based on button ID
        const originalTexts = {
            'downloadBtn': '<i class="bi bi-download mr-2"></i>Download Video',
            'uploadBtn': '<i class="bi bi-upload mr-2"></i>Upload to YouTube',
            'batchDownloadBtn': '<i class="bi bi-download mr-2"></i>Download All',
            'batchUploadBtn': '<i class="bi bi-upload mr-2"></i>Upload All',
            'previewBtn': '<i class="bi bi-play-circle mr-2"></i>Preview Video'
        };
        button.innerHTML = originalTexts[buttonId] || 'Submit';
    }
}

// Auto-reset loading buttons after job completion
function resetButtonsOnJobComplete(jobId) {
    const job = downloadJobs.get(jobId) || uploadJobs.get(jobId);
    if (!job) return;
    
    if (job.status === 'completed' || job.status === 'error') {
        // Reset download button if this was current download job
        if (currentDownloadJob === jobId) {
            setButtonLoading('downloadBtn', false);
            hideInlineProgress('download');
            currentDownloadJob = null;
        }
        
        // Reset upload button if this was current upload job
        if (currentUploadJob === jobId) {
            setButtonLoading('uploadBtn', false);
            hideInlineProgress('upload');
            currentUploadJob = null;
        }
        
        // Reset preview button
        setButtonLoading('previewBtn', false);
    }
}

function hideInlineProgress(type) {
    const progressDiv = document.getElementById(`${type}Progress`);
    if (progressDiv) {
        progressDiv.classList.add('hidden');
    }
}

function showDirectUploadProgress() {
    const progressElement = document.getElementById('directUploadProgress');
    if (progressElement) {
        progressElement.classList.remove('hidden');
        console.log('✅ Direct upload progress shown');
    }
}

function hideDirectUploadProgress() {
    const progressElement = document.getElementById('directUploadProgress');
    if (progressElement) {
        progressElement.classList.add('hidden');
    }
}

function updateDirectUploadProgress(job) {
    if (!job) return;
    
    const phaseElement = document.getElementById('directUploadPhase');
    const percentElement = document.getElementById('directUploadPercent');
    const progressBar = document.getElementById('directUploadProgressBar');
    const statusElement = document.getElementById('directUploadStatus');
    
    if (phaseElement && percentElement && progressBar && statusElement) {
        // Update phase text
        if (job.status === 'downloading' || job.phase === 'download') {
            phaseElement.textContent = 'Downloading video...';
        } else if (job.status === 'uploading' || job.phase === 'upload') {
            phaseElement.textContent = 'Uploading to YouTube...';
        } else if (job.status === 'completed') {
            phaseElement.textContent = 'Upload completed!';
        } else if (job.status === 'error') {
            phaseElement.textContent = 'Upload failed';
        }
        
        // Update progress
        const progress = Math.round(job.progress || 0);
        percentElement.textContent = `${progress}%`;
        progressBar.style.width = `${progress}%`;
        
        // Update status
        if (job.status === 'downloading') {
            statusElement.textContent = 'Downloading video from source...';
        } else if (job.status === 'uploading') {
            statusElement.textContent = 'Uploading video to YouTube...';
        } else if (job.status === 'completed') {
            statusElement.textContent = 'Video successfully uploaded to YouTube!';
            setTimeout(() => hideDirectUploadProgress(), 3000);
        } else if (job.status === 'error') {
            statusElement.textContent = job.error || 'Upload failed';
            setTimeout(() => hideDirectUploadProgress(), 5000);
        }
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
            const jobs = new Map(JSON.parse(savedDownloadJobs));
            downloadJobs = new Map();
            // Only load valid jobs
            for (const [id, job] of jobs) {
                if (job && job.id && typeof job.id === 'string') {
                    downloadJobs.set(id, job);
                } else {
                    console.warn('Skipping invalid download job:', job);
                }
            }
        }
        
        if (savedUploadJobs) {
            const jobs = new Map(JSON.parse(savedUploadJobs));
            uploadJobs = new Map();
            // Only load valid jobs
            for (const [id, job] of jobs) {
                if (job && job.id && typeof job.id === 'string') {
                    uploadJobs.set(id, job);
                } else {
                    console.warn('Skipping invalid upload job:', job);
                }
            }
        }
        
        console.log('✅ Jobs loaded from storage - Download:', downloadJobs.size, 'Upload:', uploadJobs.size);
        
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
    const clientId = document.getElementById('clientId').value.trim();
    const clientSecret = document.getElementById('clientSecret').value.trim();
    const redirectUri = document.getElementById('redirectUri').value.trim();
    
    if (!clientId || !clientSecret || !redirectUri) {
        showToast('Please fill in all credential fields', 'error');
        return;
    }
    
    // Validate Client ID format
    if (!clientId.includes('.googleusercontent.com')) {
        showToast('Invalid Client ID format. Should end with .googleusercontent.com', 'error');
        return;
    }
    
    try {
        // Save credentials locally only
        const credentials = saveCredentialsLocally(clientId, clientSecret, redirectUri);
        
        showToast('Credentials saved locally and securely!', 'success');
        
        // Update UI to show credentials are saved
        updateCredentialsStatus(true);
        
        // Clear form for security
        document.getElementById('clientId').value = '';
        document.getElementById('clientSecret').value = '';
        
    } catch (error) {
        console.error('Error saving credentials:', error);
        showToast('Error saving credentials locally', 'error');
    }
}

function updateCredentialsStatus(hasCreds) {
    const statusDiv = document.getElementById('credentialsStatus') || createCredentialsStatusDiv();
    
    if (hasCreds) {
        const creds = getLocalCredentials();
        statusDiv.innerHTML = `
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div class="flex items-center">
                    <i class="bi bi-shield-check text-green-600 mr-2"></i>
                    <div class="flex-grow">
                        <span class="text-sm font-medium text-green-800 dark:text-green-200">Credentials Saved Locally</span>
                        <p class="text-xs text-green-600 dark:text-green-400">
                            Saved: ${new Date(creds.savedAt).toLocaleDateString()}
                        </p>
                    </div>
                    <button onclick="clearLocalCredentials(); updateCredentialsStatus(false);" 
                            class="text-red-600 hover:text-red-800 text-sm">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    } else {
        statusDiv.innerHTML = `
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div class="flex items-center">
                    <i class="bi bi-exclamation-triangle text-yellow-600 mr-2"></i>
                    <span class="text-sm text-yellow-800 dark:text-yellow-200">No credentials saved</span>
                </div>
            </div>
        `;
    }
}

function createCredentialsStatusDiv() {
    const authSection = document.getElementById('authSection');
    const statusDiv = document.createElement('div');
    statusDiv.id = 'credentialsStatus';
    statusDiv.className = 'mb-4';
    authSection.insertBefore(statusDiv, authSection.firstChild);
    return statusDiv;
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

function showQuotaError(message) {
    const quotaInfo = `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="bi bi-exclamation-triangle text-yellow-400 text-xl"></i>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-yellow-800">YouTube API Quota Terlampaui</h3>
                    <div class="mt-2 text-sm text-yellow-700">
                        <p><strong>Masalah:</strong> ${message}</p>
                        <div class="mt-3">
                            <p><strong>Informasi Quota YouTube:</strong></p>
                            <ul class="list-disc ml-5 mt-1">
                                <li>Default quota: 10,000 units per hari</li>
                                <li>Upload video: 1,600 units per upload</li>
                                <li>Maksimal upload: ~6 video per hari</li>
                                <li>Quota reset: Setiap hari pada 00:00 UTC</li>
                            </ul>
                        </div>
                        <div class="mt-3">
                            <p><strong>Solusi:</strong></p>
                            <ul class="list-disc ml-5 mt-1">
                                <li>Tunggu hingga quota reset besok</li>
                                <li>Atau request quota extension dari Google Cloud Console</li>
                                <li>Cek quota usage di: <a href="https://console.cloud.google.com" target="_blank" class="text-blue-600 hover:text-blue-800">Google API Console</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showToast('YouTube API quota terlampaui. Lihat detail di atas.', 'error');
    
    // Insert quota info into upload section
    const uploadTab = document.getElementById('uploadTab');
    if (uploadTab) {
        const existingQuotaInfo = uploadTab.querySelector('.quota-error-info');
        if (existingQuotaInfo) {
            existingQuotaInfo.remove();
        }
        
        const quotaDiv = document.createElement('div');
        quotaDiv.className = 'quota-error-info';
        quotaDiv.innerHTML = quotaInfo;
        uploadTab.insertBefore(quotaDiv, uploadTab.firstChild);
        
        // Auto remove after 30 seconds
        setTimeout(() => {
            if (quotaDiv && quotaDiv.parentNode) {
                quotaDiv.remove();
            }
        }, 30000);
    }
}

// Local credential storage functions
function saveCredentialsLocally(clientId, clientSecret, redirectUri) {
    const credentials = {
        clientId,
        clientSecret,
        redirectUri,
        savedAt: new Date().toISOString()
    };
    
    // Encrypt credentials before storing (simple base64 for now, can be enhanced)
    const encryptedCredentials = btoa(JSON.stringify(credentials));
    localStorage.setItem('youtube_credentials', encryptedCredentials);
    
    return credentials;
}

function getLocalCredentials() {
    try {
        const encryptedCredentials = localStorage.getItem('youtube_credentials');
        if (!encryptedCredentials) return null;
        
        const credentials = JSON.parse(atob(encryptedCredentials));
        return credentials;
    } catch (error) {
        console.error('Error reading local credentials:', error);
        return null;
    }
}

function clearLocalCredentials() {
    localStorage.removeItem('youtube_credentials');
}

// Make functions globally accessible
window.clearLocalCredentials = clearLocalCredentials;
window.updateCredentialsStatus = updateCredentialsStatus;

function hasLocalCredentials() {
    return localStorage.getItem('youtube_credentials') !== null;
}

// Function to clean up invalid jobs from Maps and localStorage
function cleanupInvalidJobs() {
    let cleaned = false;
    
    // Clean download jobs
    for (const [id, job] of downloadJobs.entries()) {
        if (!job || !job.id || typeof job.id !== 'string' || job.id === 'undefined') {
            downloadJobs.delete(id);
            cleaned = true;
            console.log('🧹 Removed invalid download job:', id, job);
        }
    }
    
    // Clean upload jobs
    for (const [id, job] of uploadJobs.entries()) {
        if (!job || !job.id || typeof job.id !== 'string' || job.id === 'undefined') {
            uploadJobs.delete(id);
            cleaned = true;
            console.log('🧹 Removed invalid upload job:', id, job);
        }
    }
    
    // Save cleaned data back to storage
    if (cleaned) {
        saveJobsToStorage();
        console.log('✅ Invalid jobs cleaned up and storage updated');
        
        // Update UI
        updateJobsList();
        updateDownloadJobSelect();
    }
    
    return cleaned;
}