/**
 * Background Asset Detector v1.0
 * Automatically detects changes in all visual assets and updates cache silently
 * Monitors: Videos, Images, Fonts, Menu Images, Wine Images
 */

// Asset manifest - all assets to monitor for background updates
const ASSET_MANIFEST = {
    // Core visual assets
    videos: [
        '/assets/videos/mediterranean_waves_video.mp4'
    ],
    
    images: [
        '/assets/images/logo.png',
        '/assets/images/backgrounds/food-menu-bg.jpg',
        '/assets/images/backgrounds/desserts-menu-bg.webp',
        '/assets/images/backgrounds/wine-menu-bg.jpg',
        '/assets/images/icons/icon-192.png',
        '/assets/images/icons/icon-512.png'
    ],
    
    fonts: [
        '/assets/fonts/EngraversGothic BT.woff2',
        '/assets/fonts/EngraversGothic BT.woff',
        '/assets/fonts/EngraversGothic BT.ttf'
    ],
    
    // Menu images (dynamic - will be generated)
    menuImages: {
        languages: ['pt', 'en', 'fr', 'es', 'de'],
        types: ['menu', 'wine', 'desserts'],
        // Will be populated dynamically based on detected counts
        maxPages: 20 // Maximum pages to check per menu type
    }
};

// Configuration
const BACKGROUND_DETECTOR_CONFIG = {
    version: 'v1.0-bg-detector',
    hashStoragePrefix: 'bgAssetHash_',
    lastCheckKey: 'lastBackgroundCheck',
    updateIntervalMs: 30 * 60 * 1000, // 30 minutes
    retryDelayMs: 5 * 60 * 1000, // 5 minutes on failure
    maxRetries: 3,
    batchSize: 5, // Process assets in batches to avoid overwhelming
    timeoutMs: 15000 // 15 seconds timeout per asset
};

/**
 * Background Asset Detector Class
 */
class BackgroundAssetDetector {
    constructor() {
        this.isRunning = false;
        this.currentBatch = [];
        this.results = new Map();
        this.listeners = new Map();
        
        this.initializeDetector();
    }
    
    /**
     * Initialize the background detector
     */
    initializeDetector() {
        console.log('🔄 Background Asset Detector initialized');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start initial check if online
        if (navigator.onLine) {
            this.scheduleCheck('App initialized');
        }
    }
    
    /**
     * Set up event listeners for network and app events
     */
    setupEventListeners() {
        // Network status changes
        window.addEventListener('online', () => {
            console.log('📶 Network connection restored - scheduling asset check');
            this.scheduleCheck('Network restored');
        });
        
        // Page visibility changes (app becomes active)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                const lastCheck = localStorage.getItem(BACKGROUND_DETECTOR_CONFIG.lastCheckKey);
                const now = Date.now();
                
                if (!lastCheck || (now - parseInt(lastCheck)) > BACKGROUND_DETECTOR_CONFIG.updateIntervalMs) {
                    this.scheduleCheck('App became active');
                }
            }
        });
        
        // Service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'BACKGROUND_CHECK_REQUESTED') {
                    this.scheduleCheck('Service worker request');
                }
            });
        }
    }
    
    /**
     * Schedule a background check
     */
    scheduleCheck(reason) {
        if (this.isRunning) {
            console.log(`⏳ Background check already running, skipping: ${reason}`);
            return;
        }
        
        console.log(`🔄 Scheduling background asset check: ${reason}`);
        
        // Small delay to avoid overwhelming on rapid events
        setTimeout(() => {
            this.performBackgroundCheck();
        }, 1000);
    }
    
    /**
     * Perform comprehensive background asset check
     */
    async performBackgroundCheck() {
        if (this.isRunning) return;
        
        console.log('🚀 Starting background asset check...');
        this.isRunning = true;
        
        try {
            // Emit start event
            this.emit('checkStarted');
            
            // Get all assets to check
            const allAssets = await this.getAllAssetsToCheck();
            console.log(`📋 Found ${allAssets.length} assets to check`);
            
            // Process in batches
            const results = await this.processAssetsBatched(allAssets);
            
            // Analyze results and take action
            const changedAssets = await this.analyzeResults(results);
            
            if (changedAssets.length > 0) {
                console.log(`🔄 ${changedAssets.length} assets changed - updating cache`);
                await this.handleAssetChanges(changedAssets);
            } else {
                console.log('✅ All assets up to date');
            }
            
            // Update last check timestamp
            localStorage.setItem(BACKGROUND_DETECTOR_CONFIG.lastCheckKey, Date.now().toString());
            
            // Emit complete event
            this.emit('checkCompleted', {
                totalAssets: allAssets.length,
                changedAssets: changedAssets.length,
                success: true
            });
            
        } catch (error) {
            console.error('❌ Background asset check failed:', error);
            this.emit('checkFailed', { error: error.message });
            
            // Schedule retry
            this.scheduleRetry();
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * Get all assets that need to be checked
     * Context-aware: different asset sets based on page type
     */
    async getAllAssetsToCheck() {
        const allAssets = [];
        const currentContext = this.getCurrentMenuContext();
        
        // Static assets logic based on page type
        if (!currentContext.isSpecificMenu && !currentContext.isSelectMenu) {
            // Index page: Check all static assets
            allAssets.push(...ASSET_MANIFEST.videos.map(url => ({ type: 'video', url })));
            allAssets.push(...ASSET_MANIFEST.images.map(url => ({ type: 'image', url })));
            allAssets.push(...ASSET_MANIFEST.fonts.map(url => ({ type: 'font', url })));
        } else if (currentContext.isSelectMenu) {
            // Select-menu page: Only check background images (user will see them)
            allAssets.push(...ASSET_MANIFEST.images.map(url => ({ type: 'image', url })));
        }
        // Menu/wine pages: No static assets (navigation.js handles everything)
        
        // Add dynamic menu images (context-aware)
        const menuAssets = await this.getMenuAssetsToCheck();
        allAssets.push(...menuAssets);
        
        return allAssets;
    }
    
    /**
     * Get menu assets to check (dynamic based on detected counts)
     * Context-aware: check based on page type and selected language
     */
    async getMenuAssetsToCheck() {
        const menuAssets = [];
        
        // Determine context from current page
        const currentContext = this.getCurrentMenuContext();
        
        // Different logic based on page type
        if (currentContext.isSelectMenu) {
            // Select-menu page: Only check selected language
            const lang = currentContext.lang;
            
            for (const menuType of ASSET_MANIFEST.menuImages.types) {
                // Check cached page count or use default
                const cacheKey = `pageCount_${menuType}_${lang}`;
                const cachedCount = localStorage.getItem(cacheKey);
                const pagesToCheck = cachedCount ? parseInt(cachedCount) : Math.min(ASSET_MANIFEST.menuImages.maxPages, 3);
                
                // Add first few pages for hash checking
                for (let page = 1; page <= Math.min(pagesToCheck, 3); page++) {
                    const imageName = `${menuType}_${lang}-${page}`;
                    
                    // Check both WebP and JPEG
                    menuAssets.push({
                        type: 'menu-image',
                        url: `/assets/images/${menuType}/${lang}/${imageName}.webp`,
                        fallback: `/assets/images/${menuType}/${lang}/${imageName}.jpg`,
                        menuType,
                        lang,
                        page
                    });
                }
            }
            
            console.log(`🎯 Background detector: Language-specific check for ${lang} (${menuAssets.length} assets)`);
        } else if (currentContext.isSpecificMenu) {
            // Menu/wine pages: SKIP - navigation.js handles everything
            console.log(`⏭️ Background detector: Skipping on ${currentContext.menuType} page - navigation.js handles detection`);
            return [];
        } else {
            // Index page: Full comprehensive check
            for (const lang of ASSET_MANIFEST.menuImages.languages) {
                for (const menuType of ASSET_MANIFEST.menuImages.types) {
                    // Check cached page count or use default
                    const cacheKey = `pageCount_${menuType}_${lang}`;
                    const cachedCount = localStorage.getItem(cacheKey);
                    const pagesToCheck = cachedCount ? parseInt(cachedCount) : Math.min(ASSET_MANIFEST.menuImages.maxPages, 3);
                    
                    // Add first few pages for hash checking
                    for (let page = 1; page <= Math.min(pagesToCheck, 3); page++) {
                        const imageName = `${menuType}_${lang}-${page}`;
                        
                        // Check both WebP and JPEG
                        menuAssets.push({
                            type: 'menu-image',
                            url: `/assets/images/${menuType}/${lang}/${imageName}.webp`,
                            fallback: `/assets/images/${menuType}/${lang}/${imageName}.jpg`,
                            menuType,
                            lang,
                            page
                        });
                    }
                }
            }
            
            console.log(`🌍 Background detector: Full comprehensive check (${menuAssets.length} assets)`);
        }
        
        return menuAssets;
    }
    
    /**
     * Determine current menu context from URL
     */
    getCurrentMenuContext() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        
        // Check if we're on select-menu page
        if (path.includes('/pages/select-menu') || path.includes('select-menu.html')) {
            return {
                isSelectMenu: true,
                isSpecificMenu: false,
                menuType: null,
                lang: this.extractLanguageFromPath(path, params)
            };
        }
        
        // Check if we're on a specific menu page
        if (path.includes('/pages/menu/')) {
            return {
                isSelectMenu: false,
                isSpecificMenu: true,
                menuType: 'menu',
                lang: this.extractLanguageFromPath(path, params)
            };
        } else if (path.includes('/pages/wine/')) {
            return {
                isSelectMenu: false,
                isSpecificMenu: true,
                menuType: 'wine',
                lang: this.extractLanguageFromPath(path, params)
            };
        } else if (path.includes('/pages/desserts/')) {
            return {
                isSelectMenu: false,
                isSpecificMenu: true,
                menuType: 'desserts',
                lang: this.extractLanguageFromPath(path, params)
            };
        }
        
        // Default: index page or other
        return {
            isSelectMenu: false,
            isSpecificMenu: false,
            menuType: null,
            lang: null
        };
    }
    
    /**
     * Extract language from path or URL parameters
     */
    extractLanguageFromPath(path, params) {
        // Try URL parameter first
        const langParam = params.get('lang');
        if (langParam) return langParam;
        
        // Extract from filename (e.g., menu-pt.html -> pt, desserts-en.html -> en)
        const pathMatch = path.match(/(?:menu|wine|desserts)-(\w+)\.html$/);
        if (pathMatch) return pathMatch[1];
        
        // Default fallback
        return 'en';
    }
    
    /**
     * Process assets in batches to avoid overwhelming
     */
    async processAssetsBatched(assets) {
        const results = [];
        const batches = this.createBatches(assets, BACKGROUND_DETECTOR_CONFIG.batchSize);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} assets)`);
            
            const batchResults = await Promise.all(
                batch.map(asset => this.checkAssetHash(asset))
            );
            
            results.push(...batchResults);
            
            // Small delay between batches
            if (i < batches.length - 1) {
                await this.delay(100);
            }
        }
        
        return results;
    }
    
    /**
     * Check hash for a single asset
     */
    async checkAssetHash(asset) {
        try {
            const hash = await this.generateAssetHash(asset);
            const cacheKey = `${BACKGROUND_DETECTOR_CONFIG.hashStoragePrefix}${asset.type}_${this.getAssetIdentifier(asset)}`;
            const cachedHash = localStorage.getItem(cacheKey);
            
            const changed = cachedHash && cachedHash !== hash;
            
            return {
                asset,
                hash,
                cachedHash,
                changed,
                cacheKey
            };
        } catch (error) {
            console.warn(`⚠️ Failed to check asset: ${asset.url}`, error);
            return {
                asset,
                hash: null,
                cachedHash: null,
                changed: false,
                error: error.message
            };
        }
    }
    
    /**
     * Generate hash for an asset
     */
    async generateAssetHash(asset) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), BACKGROUND_DETECTOR_CONFIG.timeoutMs);
        
        try {
            let response;
            
            if (asset.type === 'menu-image') {
                // Try WebP first, then JPEG fallback
                try {
                    response = await fetch(asset.url, { method: 'HEAD', signal: controller.signal });
                    if (!response.ok) {
                        response = await fetch(asset.fallback, { method: 'HEAD', signal: controller.signal });
                    }
                } catch {
                    response = await fetch(asset.fallback, { method: 'HEAD', signal: controller.signal });
                }
            } else {
                response = await fetch(asset.url, { method: 'HEAD', signal: controller.signal });
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Generate hash from headers
            const lastModified = response.headers.get('last-modified') || '';
            const contentLength = response.headers.get('content-length') || '';
            const etag = response.headers.get('etag') || '';
            
            const hashInput = `${asset.url}:${lastModified}:${contentLength}:${etag}`;
            return this.hashString(hashInput);
            
        } finally {
            clearTimeout(timeoutId);
        }
    }
    
    /**
     * Generate hash from string (same as existing navigation.js)
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
    }
    
    /**
     * Get unique identifier for an asset
     */
    getAssetIdentifier(asset) {
        if (asset.type === 'menu-image') {
            return `${asset.menuType}_${asset.lang}_${asset.page}`;
        }
        return asset.url.replace(/[^a-zA-Z0-9]/g, '_');
    }
    
    /**
     * Analyze results and determine what changed
     */
    async analyzeResults(results) {
        const changedAssets = [];
        
        for (const result of results) {
            if (result.changed) {
                changedAssets.push(result);
                console.log(`🔄 Asset changed: ${result.asset.url}`);
            } else if (result.hash && !result.cachedHash) {
                // New asset - store hash for future comparison
                localStorage.setItem(result.cacheKey, result.hash);
            }
        }
        
        return changedAssets;
    }
    
    /**
     * Handle asset changes by clearing cache and updating hashes
     */
    async handleAssetChanges(changedAssets) {
        // Clear relevant caches
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'INVALIDATE_CACHE',
                reason: 'Background asset changes detected',
                assets: changedAssets.map(r => r.asset.url)
            });
        }
        
        // Update stored hashes
        for (const result of changedAssets) {
            if (result.hash) {
                localStorage.setItem(result.cacheKey, result.hash);
            }
        }
        
        // Clear menu detection cache if menu images changed
        const menuImagesChanged = changedAssets.some(r => r.asset.type === 'menu-image');
        if (menuImagesChanged) {
            this.clearMenuDetectionCache();
        }
        
        console.log(`✅ Updated ${changedAssets.length} asset hashes`);
    }
    
    /**
     * Clear menu detection cache
     */
    clearMenuDetectionCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('pageCount_') || key.startsWith('contentHash_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('🧹 Cleared menu detection cache');
    }
    
    /**
     * Utility functions
     */
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    scheduleRetry() {
        setTimeout(() => {
            if (navigator.onLine) {
                this.scheduleCheck('Retry after failure');
            }
        }, BACKGROUND_DETECTOR_CONFIG.retryDelayMs);
    }
    
    /**
     * Event system
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Manual trigger for testing
     */
    triggerCheck() {
        this.scheduleCheck('Manual trigger');
    }
    
    /**
     * Get status information
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheck: localStorage.getItem(BACKGROUND_DETECTOR_CONFIG.lastCheckKey),
            version: BACKGROUND_DETECTOR_CONFIG.version
        };
    }
}

// Initialize global instance
let backgroundAssetDetector = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!backgroundAssetDetector) {
        backgroundAssetDetector = new BackgroundAssetDetector();
        
        // Make available globally for debugging
        window.backgroundAssetDetector = backgroundAssetDetector;
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundAssetDetector;
} 