// Cache configuration - NAVIGATION FIX
const CONFIG = {
    version: 'v22-navigation-fix',
    staticCacheName: 'static-assets-v22-navigation-fix',
    imagesCacheName: 'images-v22-navigation-fix',
    documentsCacheName: 'documents-v22-navigation-fix',
    fontsCacheName: 'fonts-v22-navigation-fix',
    videoCacheName: 'videos-v22-navigation-fix',
    cacheNames: [
        'static-assets-v22-navigation-fix',
        'images-v22-navigation-fix',
        'documents-v22-navigation-fix',
        'fonts-v22-navigation-fix',
        'videos-v22-navigation-fix'
    ]
};

// Assets to precache
const CORE_ASSETS = [
    '/manifest.json',
    '/assets/css/style.css',
    '/js/background-video.js',
    '/js/navigation.js',
    '/js/select-menu-navigation.js',
    '/js/register-sw.js',
    '/js/background-asset-detector.js'
];

const DOCUMENT_ASSETS = [
    '/',
    '/index.html',
    '/pages/select-menu.html',
    '/pages/menu/menu-pt.html',
    '/pages/menu/menu-en.html',
    '/pages/menu/menu-fr.html',
    '/pages/menu/menu-es.html',
    '/pages/menu/menu-de.html',
    '/pages/wine/wine-pt.html',
    '/pages/wine/wine-en.html',
    '/pages/wine/wine-fr.html',
    '/pages/wine/wine-es.html',
    '/pages/wine/wine-de.html'
];

const FONT_ASSETS = [
    '/assets/fonts/EngraversGothic BT.woff2',
    '/assets/fonts/EngraversGothic BT.woff',
    '/assets/fonts/EngraversGothic BT.ttf'
];

const IMAGE_ASSETS = [
    '/assets/images/logo.png',
    '/assets/images/backgrounds/food-menu-bg.jpg',
    '/assets/images/backgrounds/wine-menu-bg.jpg',
    '/assets/images/icons/icon-192.png',
    '/assets/images/icons/icon-512.png'
];

const VIDEO_ASSETS = [
    '/assets/videos/mediterranean_waves_video.mp4'
];

// Helper function to determine resource type
function getResourceType(url) {
    const path = new URL(url).pathname;
    
    if (path.endsWith('.html') || path === '/') return 'document';
    if (path.endsWith('.css')) return 'style';
    if (path.endsWith('.js')) return 'script';
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (path.match(/\.(mp4|webm)$/)) return 'video';
    if (path.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    return 'static';
}

// Helper function to get cache name based on resource type
function getCacheName(resourceType) {
    switch (resourceType) {
        case 'image':
            return CONFIG.imagesCacheName;
        case 'document':
            return CONFIG.documentsCacheName;
        case 'font':
            return CONFIG.fontsCacheName;
        case 'video':
            return CONFIG.videoCacheName;
        default:
            return CONFIG.staticCacheName;
    }
}

// Generate menu page URLs for languages that have images (WebP + JPEG fallback)
const generateMenuUrls = () => {
    const urls = [];
    
    // Portuguese menu has 17 pages (WebP preferred, JPEG fallback)
    for (let i = 1; i <= 17; i++) {
        urls.push(`/assets/images/menu/pt/menu_pt-${i}.webp`);
        urls.push(`/assets/images/menu/pt/menu_pt-${i}.jpg`);
    }
    
    // English menu has 17 pages (WebP preferred, JPEG fallback)
    for (let i = 1; i <= 17; i++) {
        urls.push(`/assets/images/menu/en/menu_en-${i}.webp`);
        urls.push(`/assets/images/menu/en/menu_en-${i}.jpg`);
    }
    
    // All languages have wine images (6 pages each, WebP preferred, JPEG fallback)
    const wineLanguages = ['pt', 'en', 'fr', 'es', 'de'];
    wineLanguages.forEach(lang => {
        for (let i = 1; i <= 6; i++) {
            urls.push(`/assets/images/wine/${lang}/wine_${lang}-${i}.webp`);
            urls.push(`/assets/images/wine/${lang}/wine_${lang}-${i}.jpg`);
        }
    });

    return urls;
};

// Combine all assets to cache
const ASSETS_TO_CACHE = [
    ...CORE_ASSETS,
    ...DOCUMENT_ASSETS,
    ...FONT_ASSETS,
    ...IMAGE_ASSETS,
    ...VIDEO_ASSETS,
    ...generateMenuUrls()
];

// Install event - cache all static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CONFIG.staticCacheName)
            .then(cache => {
                console.log('Caching assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(error => {
                console.error('Error caching assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (!CONFIG.cacheNames.includes(cacheName)) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
    );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then(response => {
                        // Cache new assets that weren't pre-cached
                        if (response.status === 200) {
                            const responseToCache = response.clone();
                            const resourceType = getResourceType(event.request.url);
                            const cacheName = getCacheName(resourceType);
                            
                            caches.open(cacheName)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        // You could return a custom offline page here
                    });
            })
    );
});

// Handle messages from client (for cache invalidation and background detection)
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'INVALIDATE_CACHE') {
        console.log('Cache invalidation requested:', event.data.reason);
        
        // Enhanced cache clearing based on asset types
        if (event.data.assets && Array.isArray(event.data.assets)) {
            // Clear specific cache types based on changed assets
            const cachesToClear = new Set();
            
            event.data.assets.forEach(assetUrl => {
                const resourceType = getResourceType(assetUrl);
                const cacheName = getCacheName(resourceType);
                cachesToClear.add(cacheName);
            });
            
            // Clear all affected caches
            Promise.all(Array.from(cachesToClear).map(cacheName => 
                caches.delete(cacheName)
                    .then(() => console.log(`Cache cleared: ${cacheName}`))
                    .catch(error => console.error(`Error clearing cache ${cacheName}:`, error))
            ));
        } else {
            // Fallback: clear image cache (original behavior)
            caches.delete(CONFIG.imagesCacheName)
                .then(() => {
                    console.log('Image cache cleared for new content');
                })
                .catch(error => {
                    console.error('Error clearing image cache:', error);
                });
        }
    }
    
    // Handle background detection requests
    if (event.data && event.data.type === 'BACKGROUND_CHECK_REQUESTED') {
        console.log('Background asset check requested');
        // Send message to all clients to trigger background check
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'BACKGROUND_CHECK_REQUESTED',
                    timestamp: Date.now()
                });
            });
        });
    }
    
    // Handle status requests
    if (event.data && event.data.type === 'GET_SW_STATUS') {
        event.ports[0].postMessage({
            version: CONFIG.version,
            cacheNames: CONFIG.cacheNames,
            timestamp: Date.now()
        });
    }
}); 