/**
 * Ads Manager - Mengelola iklan dengan fitur canggih
 * Features: Lazy Loading, Responsive Ads, Ad Blocker Detection
 */

class AdsManager {
    constructor() {
        this.adConfig = {
            // Key iklan dari AdsTerra
            headerBanner: '2134425fbb8e8907be08e9c4f2c3b45b',
            sidebarAd: '2134425fbb8e8907be08e9c4f2c3b45b',
            middleBanner: '2134425fbb8e8907be08e9c4f2c3b45b',
            uploadSidebar: '2134425fbb8e8907be08e9c4f2c3b45b',
            historySidebar: '2134425fbb8e8907be08e9c4f2c3b45b',
            footerBanner: '2134425fbb8e8907be08e9c4f2c3b45b'
        };
        
        // Direct link ads configuration (selalu aktif)
        this.directLinkConfig = {
            url: 'https://www.profitableratecpm.com/wbfva5s7tm?key=3df9dc2933a2a1455b72be8f6a60fbed',
            enabled: true // Selalu aktif karena hanya pakai direct link
        };
        
        this.adBlockerDetected = false;
        this.adsLoaded = new Set();
        this.init();
    }

    init() {
        this.detectAdBlocker();
        this.setupLazyLoading();
        this.setupResponsiveAds();
        this.loadInitialAds();
        
        // Debug: tambahkan method global untuk testing
        window.debugAds = () => {
            console.log('=== AD DEBUG INFO ===');
            console.log('Ad containers found:', document.querySelectorAll('[id$="Ad"]').length);
            console.log('Ads loaded:', this.adsLoaded);
            console.log('Ad blocker detected:', this.adBlockerDetected);
            console.log('Direct link enabled:', this.directLinkConfig.enabled);
            
            // Force load semua iklan
            console.log('Force loading all ads...');
            this.forceLoadAllAds();
        };
    }

    // Force load semua iklan (untuk debugging)
    forceLoadAllAds() {
        const allAdIds = [
            'headerBannerAd', 
            'sidebarAd', 
            'middleBannerAd', 
            'uploadSidebarAd', 
            'historySidebarAd', 
            'footerBannerAd'
        ];
        
        allAdIds.forEach((adId, index) => {
            const container = document.getElementById(adId);
            if (container) {
                setTimeout(() => {
                    console.log(`Force loading: ${adId}`);
                    this.adsLoaded.delete(adId); // Remove from loaded set
                    this.loadAd(container);
                    this.adsLoaded.add(adId);
                }, index * 500); // Stagger loading
            }
        });
    }

    // Deteksi Ad Blocker
    detectAdBlocker() {
        const testAd = document.createElement('div');
        testAd.innerHTML = '&nbsp;';
        testAd.className = 'adsbox';
        testAd.style.position = 'absolute';
        testAd.style.left = '-10000px';
        document.body.appendChild(testAd);

        setTimeout(() => {
            if (testAd.offsetHeight === 0) {
                this.adBlockerDetected = true;
                this.showAdBlockerMessage();
            }
            document.body.removeChild(testAd);
        }, 100);
    }

    // Tampilkan pesan Ad Blocker
    showAdBlockerMessage() {
        const adContainers = document.querySelectorAll('[id$="Ad"]');
        adContainers.forEach(container => {
            container.innerHTML = `
                <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                    <i class="bi bi-shield-exclamation text-yellow-600 text-2xl mb-2"></i>
                    <h4 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Ad Blocker Detected</h4>
                    <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        Mohon nonaktifkan ad blocker untuk mendukung website ini
                    </p>
                    <button onclick="location.reload()" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm">
                        Refresh Page
                    </button>
                </div>
            `;
        });
    }

    // Setup Lazy Loading untuk iklan
    setupLazyLoading() {
        // Untuk debugging, load semua iklan langsung
        console.log('Setting up lazy loading...');
        
        if ('IntersectionObserver' in window) {
            const adObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.adsLoaded.has(entry.target.id)) {
                        console.log(`Ad container visible: ${entry.target.id}`);
                        this.loadAd(entry.target);
                        this.adsLoaded.add(entry.target.id);
                    }
                });
            }, {
                rootMargin: '200px' // Increased margin untuk load lebih awal
            });

            // Observe semua container iklan
            const adContainers = document.querySelectorAll('[id$="Ad"]');
            console.log(`Found ${adContainers.length} ad containers`);
            
            adContainers.forEach(ad => {
                console.log(`Observing: ${ad.id}`);
                adObserver.observe(ad);
            });
            
            // Fallback: load semua iklan setelah 3 detik jika lazy loading tidak bekerja
            setTimeout(() => {
                console.log('Fallback: Loading all ads after 3 seconds');
                this.loadAllAds();
            }, 3000);
        } else {
            // Fallback untuk browser lama
            console.log('IntersectionObserver not supported, loading all ads');
            this.loadAllAds();
        }
    }

    // Setup Responsive Ads
    setupResponsiveAds() {
        window.addEventListener('resize', () => {
            this.adjustAdSizes();
        });
        this.adjustAdSizes();
    }

    // Sesuaikan ukuran iklan berdasarkan layar
    adjustAdSizes() {
        const screenWidth = window.innerWidth;
        const bannerAds = document.querySelectorAll('.ad-banner');
        const sidebarAds = document.querySelectorAll('.ad-sidebar');

        bannerAds.forEach(ad => {
            if (screenWidth < 480) {
                ad.style.width = '300px';
                ad.style.height = '50px';
            } else if (screenWidth < 768) {
                ad.style.width = '320px';
                ad.style.height = '50px';
            } else {
                ad.style.width = '728px';
                ad.style.height = '90px';
            }
        });

        sidebarAds.forEach(ad => {
            if (screenWidth < 480) {
                ad.style.width = '250px';
                ad.style.height = '200px';
            } else {
                ad.style.width = '300px';
                ad.style.height = '250px';
            }
        });
    }

    // Load iklan individual (sekarang semua direct link)
    loadAd(container) {
        if (this.adBlockerDetected) return;

        const adId = container.id;
        
        console.log(`Loading direct link ad for: ${adId}`);

        // Tampilkan loading animation
        container.innerHTML = `
            <div class="ad-loading rounded-lg" style="width: 100%; height: 100%; min-height: 90px;">
                <div class="flex items-center justify-center h-full">
                    <div class="text-gray-500 dark:text-gray-400">
                        <i class="bi bi-hourglass-split animate-spin mr-2"></i>
                        Loading ad...
                    </div>
                </div>
            </div>
        `;

        // Load direct link setelah delay singkat
        setTimeout(() => {
            this.loadDirectLinkAd(container, adId);
        }, 300);
    }

    // Load banner ad (iframe)
    loadBannerAd(container, adId, adKey) {
        console.log(`Loading banner ad for ${adId} with key ${adKey}`);
        
        // Buat wrapper div untuk AdsTerra
        const adWrapper = document.createElement('div');
        adWrapper.style.textAlign = 'center';
        adWrapper.style.margin = '0 auto';
        
        // Script konfigurasi AdsTerra
        const configScript = `
            (function() {
                var atOptions = {
                    'key': '${adKey}',
                    'format': 'iframe',
                    'height': ${this.getAdHeight(adId)},
                    'width': ${this.getAdWidth(adId)},
                    'params': {}
                };
                
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = '//www.highperformanceformat.com/${adKey}/invoke.js';
                
                // Tambahkan script ke wrapper
                var wrapper = document.getElementById('${adId}');
                if (wrapper) {
                    wrapper.appendChild(script);
                }
            })();
        `;
        
        // Clear container dan tambahkan wrapper
        container.innerHTML = '';
        container.appendChild(adWrapper);
        
        // Execute script
        const scriptElement = document.createElement('script');
        scriptElement.innerHTML = configScript;
        document.head.appendChild(scriptElement);
        
        // Fallback jika AdsTerra tidak load dalam 5 detik
        setTimeout(() => {
            if (container.children.length <= 1) {
                console.log(`AdsTerra failed to load for ${adId}, showing fallback`);
                this.showFallbackAd(container, adId);
            }
        }, 5000);
        
        // Track ad load
        this.trackAdView(adId);
    }

    // Fallback ad (sekarang juga direct link)
    showFallbackAd(container, adId) {
        console.log(`Loading fallback direct link for ${adId}`);
        this.loadDirectLinkAd(container, adId);
    }

    // Load direct link ad
    loadDirectLinkAd(container, adId) {
        if (!this.directLinkConfig.enabled) {
            this.loadBannerAd(container, adId, this.getAdKey(adId));
            return;
        }

        const adVariations = this.getAdVariation(adId);
        
        // Design khusus untuk corner ad yang compact
        const adContent = `
            <div class="${adVariations.bgClass} rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 h-full">
                <a href="${this.directLinkConfig.url}" target="_blank" rel="noopener noreferrer" class="block p-3 text-white text-center h-full flex flex-col justify-center">
                    <div class="flex items-center justify-center mb-1">
                        <i class="${adVariations.icon} text-yellow-300 text-lg mr-1"></i>
                        <span class="font-bold ${adVariations.titleSize}">${adVariations.title}</span>
                    </div>
                    <p class="text-xs opacity-90 mb-2">${adVariations.description}</p>
                    <div class="bg-white bg-opacity-20 rounded px-2 py-1 text-xs font-medium hover:bg-opacity-30 transition-all">
                        ${adVariations.cta}
                    </div>
                </a>
            </div>
        `;
        
        container.innerHTML = adContent;
        
        // Track clicks
        const link = container.querySelector('a');
        link.addEventListener('click', () => {
            this.trackAdClick(adId);
        });
        
        // Track ad load
        this.trackAdView(adId);
    }

    // Dapatkan variasi iklan berdasarkan posisi
    getAdVariation(adId) {
        const variations = {
            cornerAd: {
                bgClass: 'bg-gradient-to-br from-blue-500 to-purple-600',
                icon: 'bi bi-star-fill',
                title: 'Tes Iklan',
                titleSize: 'text-sm',
                description: 'Ini Iklan',
                cta: 'Klik →'
            }
        };

        return variations[adId] || variations.cornerAd;
    }

    // Tentukan apakah menggunakan direct link
    shouldUseDirectLink(adId) {
        // Gunakan direct link untuk SEMUA posisi iklan
        return this.directLinkConfig.enabled;
    }

    // Dapatkan key iklan berdasarkan ID container
    getAdKey(adId) {
        const keyMap = {
            'headerBannerAd': this.adConfig.headerBanner,
            'sidebarAd': this.adConfig.sidebarAd,
            'middleBannerAd': this.adConfig.middleBanner,
            'uploadSidebarAd': this.adConfig.uploadSidebar,
            'historySidebarAd': this.adConfig.historySidebar,
            'footerBannerAd': this.adConfig.footerBanner
        };
        return keyMap[adId];
    }

    // Dapatkan tinggi iklan
    getAdHeight(adId) {
        if (adId.includes('Banner')) {
            return window.innerWidth < 768 ? 50 : 90;
        }
        return window.innerWidth < 480 ? 200 : 250;
    }

    // Dapatkan lebar iklan
    getAdWidth(adId) {
        if (adId.includes('Banner')) {
            if (window.innerWidth < 480) return 300;
            if (window.innerWidth < 768) return 320;
            return 728;
        }
        return window.innerWidth < 480 ? 250 : 300;
    }

    // Tampilkan placeholder untuk iklan yang belum dikonfigurasi
    showPlaceholderAd(container) {
        container.innerHTML = `
            <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-lg p-6 text-center">
                <i class="bi bi-badge-ad text-3xl text-blue-500 mb-3"></i>
                <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">Ad Space Available</h4>
                <p class="text-sm text-blue-600 dark:text-blue-300 mb-3">
                    Konfigurasi iklan Anda di ads-manager.js
                </p>
                <div class="text-xs text-blue-500 dark:text-blue-400">
                    ${container.id}
                </div>
            </div>
        `;
    }

    // Load semua iklan (fallback)
    loadAllAds() {
        document.querySelectorAll('[id$="Ad"]').forEach(ad => {
            if (!this.adsLoaded.has(ad.id)) {
                this.loadAd(ad);
                this.adsLoaded.add(ad.id);
            }
        });
    }

    // Load iklan awal yang terlihat
    loadInitialAds() {
        // Load semua iklan yang ada di halaman
        const allAdIds = [
            'headerBannerAd', 
            'sidebarAd', 
            'middleBannerAd', 
            'uploadSidebarAd', 
            'historySidebarAd', 
            'footerBannerAd'
        ];
        
        console.log('Loading initial ads...');
        
        allAdIds.forEach(adId => {
            const adElement = document.getElementById(adId);
            if (adElement) {
                console.log(`Found ad container: ${adId}`);
                if (!this.adsLoaded.has(adId)) {
                    setTimeout(() => {
                        this.loadAd(adElement);
                        this.adsLoaded.add(adId);
                    }, Math.random() * 1000); // Random delay untuk menghindari rate limiting
                }
            } else {
                console.log(`Ad container not found: ${adId}`);
            }
        });
    }

    // Refresh iklan
    refreshAd(adId) {
        const container = document.getElementById(adId);
        if (container) {
            this.adsLoaded.delete(adId);
            this.loadAd(container);
            this.adsLoaded.add(adId);
        }
    }

    // Refresh semua iklan
    refreshAllAds() {
        this.adsLoaded.clear();
        this.loadAllAds();
    }

    // Update konfigurasi iklan
    updateAdConfig(newConfig) {
        this.adConfig = { ...this.adConfig, ...newConfig };
        this.refreshAllAds();
    }

    // Analytics untuk iklan
    trackAdView(adId) {
        // Implementasi tracking analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ad_view', {
                'ad_id': adId,
                'page_url': window.location.href
            });
        }
        
        // Console log untuk debugging
        console.log(`Ad viewed: ${adId}`);
    }

    // Track ad clicks
    trackAdClick(adId) {
        // Implementasi tracking analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ad_click', {
                'ad_id': adId,
                'page_url': window.location.href
            });
        }
        
        // Console log untuk debugging
        console.log(`Ad clicked: ${adId}`);
        
        // Simpan ke localStorage untuk tracking internal
        const clicks = JSON.parse(localStorage.getItem('adClicks') || '{}');
        clicks[adId] = (clicks[adId] || 0) + 1;
        clicks.total = (clicks.total || 0) + 1;
        clicks.lastClick = new Date().toISOString();
        localStorage.setItem('adClicks', JSON.stringify(clicks));
    }

    // Implementasi A/B testing untuk iklan
    setupABTesting() {
        const testGroup = Math.random() < 0.5 ? 'A' : 'B';
        localStorage.setItem('adTestGroup', testGroup);
        
        if (testGroup === 'B') {
            // Implementasi variasi iklan untuk grup B
            this.adjustAdLayout();
        }
    }

    adjustAdLayout() {
        // Sesuaikan layout iklan untuk A/B testing
        const sidebarAds = document.querySelectorAll('.ad-sidebar');
        sidebarAds.forEach(ad => {
            ad.style.borderRadius = '20px';
            ad.style.border = '2px solid #3b82f6';
        });
    }

    // Direct link selalu aktif, tidak perlu toggle lagi

    // Get ad statistics
    getAdStats() {
        const clicks = JSON.parse(localStorage.getItem('adClicks') || '{}');
        const views = JSON.parse(localStorage.getItem('adViews') || '{}');
        
        return {
            clicks: clicks,
            views: views,
            ctr: clicks.total && views.total ? (clicks.total / views.total * 100).toFixed(2) + '%' : '0%'
        };
    }

    // Show ad performance dashboard
    showAdDashboard() {
        const stats = this.getAdStats();
        console.table(stats);
        
        // Bisa ditambahkan UI dashboard di masa depan
        return stats;
    }

    // Optimize ad positions based on performance
    optimizeAdPositions() {
        const stats = this.getAdStats();
        
        // Logic untuk optimasi posisi berdasarkan performance
        // Implementasi sederhana: prioritaskan posisi dengan CTR tinggi
        console.log('Ad optimization completed based on performance data');
    }
}

// Inisialisasi Ads Manager ketika DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.adsManager = new AdsManager();
    
    // Setup event listeners untuk kontrol iklan
    setupAdControls();
});

function setupAdControls() {
    // Show ad stats button
    const showStatsBtn = document.getElementById('showAdStats');
    if (showStatsBtn) {
        showStatsBtn.addEventListener('click', () => {
            const stats = window.adsManager.showAdDashboard();
            showAdStatsModal(stats);
        });
    }
    
    // Refresh ads button
    const refreshAdsBtn = document.getElementById('refreshAds');
    if (refreshAdsBtn) {
        refreshAdsBtn.addEventListener('click', () => {
            window.adsManager.refreshAllAds();
            showToast('All direct link ads refreshed!', 'success');
        });
    }
}

function showAdStatsModal(stats) {
    // Create modal untuk menampilkan statistik iklan
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold">📊 Ad Performance Statistics</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <i class="bi bi-x-lg text-xl"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600">${stats.clicks.total || 0}</div>
                        <div class="text-sm text-blue-700 dark:text-blue-300">Total Clicks</div>
                    </div>
                    <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600">${stats.views.total || 0}</div>
                        <div class="text-sm text-green-700 dark:text-green-300">Total Views</div>
                    </div>
                    <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-600">${stats.ctr}</div>
                        <div class="text-sm text-purple-700 dark:text-purple-300">Click Rate</div>
                    </div>
                </div>
                
                <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3">Performance by Position:</h4>
                    <div class="space-y-2 text-sm">
                        ${Object.entries(stats.clicks)
                            .filter(([key]) => key !== 'total' && key !== 'lastClick')
                            .map(([position, clicks]) => `
                                <div class="flex justify-between">
                                    <span>${position}:</span>
                                    <span class="font-medium">${clicks} clicks</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
                
                <div class="mt-6 flex justify-end space-x-3">
                    <button onclick="window.adsManager.optimizeAdPositions()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="bi bi-gear mr-1"></i>Optimize
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function showToast(message, type = 'info') {
    // Implementasi sederhana toast notification
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="bi bi-check-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Export untuk penggunaan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdsManager;
} 