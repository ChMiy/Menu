// SINGLE ROBUST LOCALHOST DETECTION FUNCTION - USED THROUGHOUT FILE
function isLocalhost() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Check for localhost conditions
    const isLocalIP = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const isLocalPort = port === '8000' || port === '3000' || port === '8080' || port === '5000';
    const isFileProtocol = window.location.protocol === 'file:';
    
    // Also check if we're NOT on GitHub Pages domain
    const isGitHubPages = hostname.includes('github.io') || hostname.includes('githubusercontent.com');
    
    return (isLocalIP && isLocalPort) || isFileProtocol || (!isGitHubPages && port);
}

// Global basePath for consistent use
const GLOBAL_BASE_PATH = isLocalhost() ? '' : '/Menu/';

// Shared navigation script for menu and wine pages
document.addEventListener('DOMContentLoaded', () => {
    const menuImage = document.querySelector('.menu-image');
    if (!menuImage) return;

    // Get current language and menu type
    const lang = getLang();
    const path = window.location.pathname;
    const isWineMenu = path.includes('wine-');
    
    const basePath = GLOBAL_BASE_PATH;
    // Fix path construction for subdirectories (menu/wine pages are in /pages/menu/ and /pages/wine/)
    const baseImagePath = isLocalhost() ? 
        `../../assets/images/${isWineMenu ? 'wine' : 'menu'}/${lang}/` : 
        `${basePath}assets/images/${isWineMenu ? 'wine' : 'menu'}/${lang}/`;
    
    console.log('Navigation Debug:', {
        hostname: window.location.hostname,
        port: window.location.port,
        isLocalhost: isLocalhost(),
        basePath: basePath,
        baseImagePath: baseImagePath
    });
    
    let currentPage = 1;
    let totalPages = 1;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // Helper function to try WebP first, then fallback to JPEG
    function loadImageWithFallback(basePath, imageName, onSuccess, onError) {
        const webpSrc = `${basePath}${imageName.replace('.jpg', '.webp')}`;
        const jpegSrc = `${basePath}${imageName}`;
        
        const testWebP = new Image();
        testWebP.onload = function() {
            onSuccess(webpSrc, 'webp');
        };
        testWebP.onerror = function() {
            const testJPEG = new Image();
            testJPEG.onload = function() {
                onSuccess(jpegSrc, 'jpeg');
            };
            testJPEG.onerror = function() {
                onError();
            };
            testJPEG.src = jpegSrc;
        };
        testWebP.src = webpSrc;
    }

    // Generate content hash from first few images to detect content changes
    async function generateContentHash(menuType, lang, pageCount) {
        const samplePages = Math.min(3, pageCount); // Sample first 3 pages or all if less
        const hashes = [];
        
        for (let page = 1; page <= samplePages; page++) {
            try {
                const hash = await getImageHash(menuType, lang, page);
                hashes.push(hash);
            } catch (error) {
                console.log(`Hash generation failed for page ${page}, using fallback`);
                hashes.push(`fallback-${page}`);
            }
        }
        
        return hashes.join('-');
    }
    
    // Generate hash from image file (using first few bytes)
    function getImageHash(menuType, lang, page) {
        return new Promise((resolve, reject) => {
            const imageName = `${menuType}_${lang}-${page}.jpg`;
            
            // Try WebP first, then JPEG
            const webpSrc = `${baseImagePath}${imageName.replace('.jpg', '.webp')}`;
            const jpegSrc = `${baseImagePath}${imageName}`;
            
            // Simple hash generation using fetch to get first few bytes
            const generateHash = (url) => {
                return fetch(url, { 
                    method: 'HEAD' // Just get headers for lightweight hash
                })
                .then(response => {
                    if (!response.ok) throw new Error('Not found');
                    // Use Last-Modified and Content-Length as hash components
                    const lastModified = response.headers.get('last-modified') || '';
                    const contentLength = response.headers.get('content-length') || '';
                    const etag = response.headers.get('etag') || '';
                    
                    // Simple hash combination
                    const hashString = `${lastModified}-${contentLength}-${etag}`;
                    return hashString.substring(0, 16); // First 16 chars
                })
                .catch(() => {
                    throw new Error('Hash generation failed');
                });
            };
            
            // Try WebP first
            generateHash(webpSrc)
                .then(hash => resolve(hash))
                .catch(() => {
                    // Fallback to JPEG
                    generateHash(jpegSrc)
                        .then(hash => resolve(hash))
                        .catch(() => reject(new Error('Both formats failed')));
                });
        });
    }

    // Smart content detection with permanent localStorage caching and content hash verification
    function detectTotalPages() {
        const menuType = isWineMenu ? 'wine' : 'menu';
        const cacheKey = `pageCount_${menuType}_${lang}`;
        const hashKey = `contentHash_${menuType}_${lang}`;
        
        // Check for service worker version changes (invalidates cache)
        const currentSWVersion = 'v22-navigation-fix';
        const lastSWVersion = localStorage.getItem('lastSWVersion');
        
        if (lastSWVersion && lastSWVersion !== currentSWVersion) {
            // Service worker version changed - clear all detection cache
            console.log(`Service worker updated: ${lastSWVersion} → ${currentSWVersion}`);
            clearDetectionCache();
            localStorage.setItem('lastSWVersion', currentSWVersion);
        } else if (!lastSWVersion) {
            // First run - store current version
            localStorage.setItem('lastSWVersion', currentSWVersion);
        }
        
        // Check if we have a cached count
        const cachedCount = localStorage.getItem(cacheKey);
        
        if (cachedCount) {
            // We have cached data, but verify content hasn't changed
            const cachedHash = localStorage.getItem(hashKey);
            
            if (cachedHash) {
                // Generate current content hash and compare
                const pageCount = parseInt(cachedCount);
                generateContentHash(menuType, lang, pageCount)
                    .then(currentHash => {
                        if (currentHash === cachedHash) {
                            // Content unchanged - use cached count
                            totalPages = pageCount;
                            console.log(`Using cached page count: ${totalPages} for ${lang} ${menuType} (content verified)`);
                            sequentialPreload(currentPage);
                        } else {
                            // Content changed - clear cache and re-detect
                            console.log(`Content changed detected for ${lang} ${menuType} - clearing cache`);
                            localStorage.removeItem(cacheKey);
                            localStorage.removeItem(hashKey);
                            
                            // Clear image cache silently
                            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                                navigator.serviceWorker.controller.postMessage({
                                    type: 'INVALIDATE_CACHE',
                                    reason: 'Content changed - hash mismatch'
                                });
                            }
                            
                            // Re-detect with new content
                            performSmartDetection(menuType, cacheKey, hashKey);
                        }
                    })
                    .catch(error => {
                        // Hash generation failed - proceed with cached count but log warning
                        console.log(`Hash verification failed for ${lang} ${menuType}, using cached count`);
                        totalPages = pageCount;
                        sequentialPreload(currentPage);
                    });
            } else {
                // No cached hash - use cached count and generate hash for next time
                totalPages = parseInt(cachedCount);
                console.log(`Using cached page count: ${totalPages} for ${lang} ${menuType} (generating hash for future)`);
                
                // Generate hash for future comparisons
                generateContentHash(menuType, lang, totalPages)
                    .then(hash => {
                        localStorage.setItem(hashKey, hash);
                        console.log(`Content hash generated for ${lang} ${menuType}`);
                    })
                    .catch(error => {
                        console.log(`Hash generation failed for ${lang} ${menuType}`);
                    });
                
                sequentialPreload(currentPage);
            }
            return;
        }
        
        // Perform smart detection
        console.log(`Detecting pages for ${lang} ${menuType}...`);
        performSmartDetection(menuType, cacheKey, hashKey);
    }
    
    function performSmartDetection(menuType, cacheKey, hashKey) {
        // Start with reasonable estimates based on known data
        const defaultCounts = {
            'menu': { 'pt': 17, 'en': 17, 'fr': 12, 'es': 12, 'de': 12 },
            'wine': { 'pt': 6, 'en': 6, 'fr': 6, 'es': 6, 'de': 6 }
        };
        
        const estimatedCount = defaultCounts[menuType][lang] || 12;
        let detectedCount = 0;
        let testingComplete = false;
        
        // Test a reasonable range around the estimate
        const testRange = Math.max(25, estimatedCount + 8); // Test up to 25 or estimate+8
        let pendingTests = 0;
        let completedTests = 0;
        
        function completeDetection() {
            if (testingComplete) return;
            testingComplete = true;
            
            totalPages = Math.max(1, detectedCount);
            
            // Cache the result permanently
            localStorage.setItem(cacheKey, totalPages.toString());
            
            console.log(`Smart detection complete: ${totalPages} pages for ${lang} ${menuType}`);
            
            // Generate and cache content hash for future change detection
            generateContentHash(menuType, lang, totalPages)
                .then(hash => {
                    localStorage.setItem(hashKey, hash);
                    console.log(`Content hash cached for ${lang} ${menuType}: ${hash.substring(0, 8)}...`);
                })
                .catch(error => {
                    console.log(`Hash generation failed for ${lang} ${menuType}, proceeding without hash`);
                });
            
            // Check if we found more pages than expected (new content)
            if (totalPages > estimatedCount) {
                console.log(`New content detected! Found ${totalPages} pages, expected ${estimatedCount}`);
                // Clear image cache to ensure new content is fetched fresh
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'INVALIDATE_CACHE',
                        reason: 'New content detected'
                    });
                }
            }
            
            sequentialPreload(currentPage);
        }
        
        // Test pages in parallel with smart batching
        for (let page = 1; page <= testRange; page++) {
            const imageName = `${menuType}_${lang}-${page}.jpg`;
            pendingTests++;
            
            // Add small delay to avoid overwhelming the browser
            setTimeout(() => {
                loadImageWithFallback(baseImagePath, imageName,
                    (src, format) => {
                        detectedCount = Math.max(detectedCount, page);
                        completedTests++;
                        
                        // If we've tested enough and haven't found new pages recently, complete
                        if (completedTests >= Math.min(testRange, detectedCount + 3)) {
                            completeDetection();
                        }
                    },
                    () => {
                        completedTests++;
                        
                        // If we've tested enough pages beyond the last found page, complete
                        if (completedTests >= Math.min(testRange, detectedCount + 3)) {
                            completeDetection();
                        }
                    }
                );
            }, page * 50); // 50ms stagger to avoid overwhelming
        }
        
        // Safety timeout to ensure detection completes
        setTimeout(() => {
            if (!testingComplete) {
                console.log(`Detection timeout reached, using detected count: ${detectedCount}`);
                completeDetection();
            }
        }, 10000); // 10 second maximum
    }

    // Sequential preloading starting from page 1
    function sequentialPreload(currentPage) {
        // Create array of pages to preload (excluding current page)
        const pagesToPreload = [];
        for (let page = 1; page <= totalPages; page++) {
            if (page !== currentPage) {
                pagesToPreload.push(page);
            }
        }
        
        // Process pages sequentially - each waits for previous to complete
        function preloadNextPage(index) {
            // All pages processed
            if (index >= pagesToPreload.length) return;
            
            const page = pagesToPreload[index];
            const imageName = `${isWineMenu ? 'wine' : 'menu'}_${lang}-${page}.jpg`;
            
            loadImageWithFallback(baseImagePath, imageName,
                (src, format) => {
                    console.log(`Preloaded page ${page} (${format}): ${src}`);
                    const img = new Image();
                    img.src = src;
                    
                    // Continue to next page immediately (no artificial delay)
                    preloadNextPage(index + 1);
                },
                () => {
                    console.warn(`Failed to preload page ${page} (both WebP and JPEG)`);
                    
                    // Continue to next page even if this one failed
                    preloadNextPage(index + 1);
                }
            );
        }
        
        // Start sequential preloading
        preloadNextPage(0);
    }

    // Update image source based on current page
    function updateImage(page) {
        if (!menuImage || page < 1 || page > totalPages) return;
        
        const imageName = `${isWineMenu ? 'wine' : 'menu'}_${lang}-${page}.jpg`;
        
        // Add fade effect
        menuImage.classList.add('fade');
        
        loadImageWithFallback(baseImagePath, imageName,
            (src, format) => {
        setTimeout(() => {
                    menuImage.src = src;
            menuImage.alt = `${isWineMenu ? 'Wine List' : 'Menu'} ${lang.toUpperCase()} - Page ${page}`;
            menuImage.classList.remove('fade');
            currentPage = page;
            
                    // Continue sequential preloading after navigation
                    sequentialPreload(page);
        }, 300);
            },
            () => {
                // Fallback failed - remove fade effect and show error
                menuImage.classList.remove('fade');
                console.error(`Failed to load page ${page} (both WebP and JPEG)`);
            }
        );
        
        // Update page indicator if it exists
        const pageIndicator = document.querySelector('.page-indicator');
        if (pageIndicator) {
            pageIndicator.textContent = `Page ${page} of ${totalPages}`;
        }
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' && currentPage < totalPages) {
            updateImage(currentPage + 1);
        } else if (e.key === 'ArrowLeft' && currentPage > 1) {
            updateImage(currentPage - 1);
        } else if (e.key === 'Escape') {
            window.location.href = `${basePath}pages/select-menu.html?lang=${lang}`;
        } else if (e.key === 'Home') {
            window.location.href = `${basePath}index.html`;
        }
    });

    // Touch navigation
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeDistanceX = touchEndX - touchStartX;
        const swipeDistanceY = touchEndY - touchStartY;
        const minSwipeDistance = 50;

        // Only handle horizontal swipes if they're more horizontal than vertical
        if (Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY)) {
            if (Math.abs(swipeDistanceX) > minSwipeDistance) {
                if (swipeDistanceX < 0) {
                    // Swipe left -> go forward
                    if (currentPage < totalPages) {
                        updateImage(currentPage + 1);
                    }
                } else {
                    // Swipe right -> go back
                    if (currentPage === 1) {
                        // On first page, swipe right to go back to menu selection
                        window.location.href = `${basePath}pages/select-menu.html?lang=${lang}`;
                    } else {
                        // Go to previous page
                        updateImage(currentPage - 1);
                    }
                }
            }
        }
    }

    // Handle image load to ensure proper scaling
    menuImage.addEventListener('load', () => {
        // CSS handles all scaling now - no JavaScript needed
        console.log('Menu image loaded successfully');
    });

    // Initialize page detection
    detectTotalPages();
});

// Clear detection cache (for service worker version changes)
function clearDetectionCache() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('pageCount_') || key.startsWith('contentHash_')) {
            localStorage.removeItem(key);
        }
    });
    console.log('Detection cache and content hashes cleared for service worker update');
}

// Get the current language from URL
function getLang() {
    const params = new URLSearchParams(window.location.search);
    return params.get('lang') || 'en';
}

// Translations for navigation
const translations = {
    en: {
        home: '⬅ Home',
        menuSelect: '📂 Menu Select'
    },
    pt: {
        home: '⬅ Início',
        menuSelect: '📂 Seleção Menu'
    },
    fr: {
        home: '⬅ Accueil',
        menuSelect: '📂 Sélection Menu'
    },
    es: {
        home: '⬅ Inicio',
        menuSelect: '📂 Selección Menú'
    },
    de: {
        home: '⬅ Start',
        menuSelect: '📂 Menüauswahl'
    }
};

// Update navigation text based on current language
function updateNavigationText() {
    const lang = getLang();
    const texts = translations[lang] || translations.en;
    
    const homeButton = document.querySelector('.nav-button:first-child');
    const menuSelectButton = document.querySelector('.nav-button:last-child');
    
    if (homeButton) {
        homeButton.innerHTML = texts.home;
        homeButton.onclick = () => location.href = `${GLOBAL_BASE_PATH}index.html`;
    }
    
    if (menuSelectButton) {
        menuSelectButton.innerHTML = texts.menuSelect;
        menuSelectButton.onclick = () => location.href = `${GLOBAL_BASE_PATH}pages/select-menu.html?lang=${lang}`;
    }
}

// Call updateNavigationText when DOM is loaded
document.addEventListener('DOMContentLoaded', updateNavigationText);

// Show/hide controls based on device
function showControls() {
    const controls = document.querySelector('.controls');
    if (controls) {
        controls.style.display = 'block';
    }
}

// Auto-hide controls on mobile after 3 seconds
function autoHideControls() {
    const controls = document.querySelector('.controls');
    if (controls && window.innerWidth <= 768) {
        setTimeout(() => {
            controls.style.display = 'none';
        }, 3000);
    }
}

// Initialize controls
document.addEventListener('DOMContentLoaded', () => {
    showControls();
    autoHideControls();
}); 


