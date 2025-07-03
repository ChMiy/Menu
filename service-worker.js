// Cache configuration
const CONFIG = {
    version: 'v6',
    staticCacheName: 'static-assets-v6',
    imagesCacheName: 'images-v6',
    documentsCacheName: 'documents-v6',
    fontsCacheName: 'fonts-v6',
    videoCacheName: 'videos-v6',
    cacheNames: [
        'static-assets-v6',
        'images-v6',
        'documents-v6',
        'fonts-v6',
        'videos-v6'
    ]
};

// Assets to precache
const CORE_ASSETS = [
    '/manifest.json',
    '/assets/css/style.css',
    '/js/background-video.js',
    '/js/navigation.js',
    '/js/select-menu-navigation.js',
    '/js/language.js',
    '/js/seasonal-video.js'
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
    '/assets/images/menu/menu-en.jpg',
    '/assets/images/menu/menu-pt.jpg',
    '/assets/images/menu/menu-fr.jpg',
    '/assets/images/menu/menu-es.jpg',
    '/assets/images/menu/menu-de.jpg',
    '/assets/images/wine/wine-en.jpg',
    '/assets/images/wine/wine-pt.jpg',
    '/assets/images/wine/wine-fr.jpg',
    '/assets/images/wine/wine-es.jpg',
    '/assets/images/wine/wine-de.jpg',
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

// Generate menu page URLs for all languages
const generateMenuUrls = () => {
    const languages = ['pt', 'en', 'fr', 'es', 'de'];
    const urls = [];
    
    languages.forEach(lang => {
        // Portuguese menu has 18 pages
        if (lang === 'pt') {
            for (let i = 1; i <= 18; i++) {
                urls.push(`assets/images/menu/pt/menu_pt-${i}.jpg`);
            }
        } else {
            urls.push(`assets/images/menu/${lang}/menu_${lang}-1.jpg`);
        }
        urls.push(`assets/images/wine/wine-${lang}.jpg`);
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