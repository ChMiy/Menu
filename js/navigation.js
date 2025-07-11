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
    const isDessertsMenu = path.includes('desserts-');
    
    // Determine menu type for image paths
    let menuType = 'menu'; // default to food menu
    if (isWineMenu) {
        menuType = 'wine';
    } else if (isDessertsMenu) {
        menuType = 'desserts';
    }
    
    const basePath = GLOBAL_BASE_PATH;
    // Fix path construction for subdirectories (menu/wine/deserts pages are in /pages/menu/, /pages/wine/, /pages/deserts/)
    const baseImagePath = isLocalhost() ? 
        `../../assets/images/${menuType}/${lang}/` : 
        `${basePath}assets/images/${menuType}/${lang}/`;
    
    console.log('Navigation Debug:', {
        hostname: window.location.hostname,
        port: window.location.port,
        isLocalhost: isLocalhost(),
        basePath: basePath,
        baseImagePath: baseImagePath,
        path: path,
        isWineMenu: isWineMenu,
        isDessertsMenu: isDessertsMenu,
        detectedMenuType: menuType,
        lang: lang
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

    // Clear cache for other menu types to prevent conflicts
    function clearOtherMenuTypesCache() {
        const allMenuTypes = ['menu', 'wine', 'desserts'];
        const currentMenuType = menuType;
        
        allMenuTypes.forEach(type => {
            if (type !== currentMenuType) {
                const cacheKey = `pageCount_${type}_${lang}`;
                const hashKey = `contentHash_${type}_${lang}`;
                if (localStorage.getItem(cacheKey)) {
                    console.log(`Clearing cache for different menu type: ${type}_${lang}`);
                    localStorage.removeItem(cacheKey);
                    localStorage.removeItem(hashKey);
                }
            }
        });
    }

    // Smart content detection with permanent localStorage caching and content hash verification
    function detectTotalPages() {
        const detectedMenuType = menuType; // Use the menuType determined earlier
        const cacheKey = `pageCount_${detectedMenuType}_${lang}`;
        const hashKey = `contentHash_${detectedMenuType}_${lang}`;
        
        // Clear cache for other menu types to prevent conflicts
        clearOtherMenuTypesCache();
        
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
        console.log(`Cache check for ${detectedMenuType}_${lang}: cachedCount=${cachedCount}, cacheKey=${cacheKey}`);
        
        if (cachedCount) {
            // We have cached data, but verify content hasn't changed
            const cachedHash = localStorage.getItem(hashKey);
            console.log(`Using cached count for ${detectedMenuType}_${lang}: ${cachedCount} pages`);
            
            if (cachedHash) {
                // Generate current content hash and compare
                const pageCount = parseInt(cachedCount);
                generateContentHash(detectedMenuType, lang, pageCount)
                    .then(currentHash => {
                        if (currentHash === cachedHash) {
                            // Content unchanged - use cached count
                            totalPages = pageCount;
                            console.log(`Using cached page count: ${totalPages} for ${lang} ${menuType} (content verified)`);
                            sequentialPreload(currentPage);
                            updateBackButton(); // Update back button after page count is known
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
                            performSmartDetection(detectedMenuType, cacheKey, hashKey);
                        }
                    })
                    .catch(error => {
                        // Hash generation failed - proceed with cached count but log warning
                        console.log(`Hash verification failed for ${lang} ${menuType}, using cached count`);
                        totalPages = pageCount;
                        sequentialPreload(currentPage);
                        updateBackButton(); // Update back button after page count is known
                    });
            } else {
                // No cached hash - use cached count and generate hash for next time
                totalPages = parseInt(cachedCount);
                console.log(`Using cached page count: ${totalPages} for ${lang} ${menuType} (generating hash for future)`);
                
                // Generate hash for future comparisons
                generateContentHash(detectedMenuType, lang, totalPages)
                    .then(hash => {
                        localStorage.setItem(hashKey, hash);
                        console.log(`Content hash generated for ${lang} ${menuType}`);
                    })
                    .catch(error => {
                        console.log(`Hash generation failed for ${lang} ${menuType}`);
                    });
                
                sequentialPreload(currentPage);
                updateBackButton(); // Update back button after page count is known
            }
            return;
        }
        
        // Perform smart detection
        console.log(`Detecting pages for ${lang} ${detectedMenuType}...`);
        performSmartDetection(detectedMenuType, cacheKey, hashKey);
    }
    
    function performSmartDetection(menuType, cacheKey, hashKey) {
        let detectedCount = 0;
        let testingComplete = false;
        let currentTestPage = 1;
        
        function completeDetection() {
            if (testingComplete) return;
            testingComplete = true;
            
            totalPages = Math.max(1, detectedCount);
            
            // Cache the result permanently
            localStorage.setItem(cacheKey, totalPages.toString());
            
            console.log(`Sequential detection complete: ${totalPages} pages for ${lang} ${menuType}`);
            
            // Generate and cache content hash for future change detection
            generateContentHash(menuType, lang, totalPages)
                .then(hash => {
                    localStorage.setItem(hashKey, hash);
                    console.log(`Content hash cached for ${lang} ${menuType}: ${hash.substring(0, 8)}...`);
                })
                .catch(error => {
                    console.log(`Hash generation failed for ${lang} ${menuType}, proceeding without hash`);
                });
            
            sequentialPreload(currentPage);
            updateBackButton(); // Update back button after page count is known
        }
        
        // Sequential detection: test one page at a time, stop when not found
        function testNextPage() {
            if (testingComplete) return;
            
            const imageName = `${menuType}_${lang}-${currentTestPage}.jpg`;
            console.log(`Testing sequential image: ${baseImagePath}${imageName} (page ${currentTestPage})`);
            
            loadImageWithFallback(baseImagePath, imageName,
                (src, format) => {
                    console.log(`Found page ${currentTestPage}: ${src} (menuType: ${menuType})`);
                    detectedCount = currentTestPage;
                    currentTestPage++;
                    
                    // Continue testing next page
                    setTimeout(testNextPage, 50); // Small delay to avoid overwhelming
                },
                () => {
                    console.log(`Page ${currentTestPage} not found - stopping detection at ${detectedCount} pages`);
                    // This page doesn't exist, so we're done
                    completeDetection();
                }
            );
        }
        
        // Start sequential testing from page 1
        testNextPage();
        
        // Safety timeout to ensure detection completes (30 seconds max)
        setTimeout(() => {
            if (!testingComplete) {
                console.log(`Detection timeout reached, using detected count: ${detectedCount}`);
                completeDetection();
            }
        }, 30000);
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
            const imageName = `${menuType}_${lang}-${page}.jpg`;
            console.log(`Preloading: ${baseImagePath}${imageName} (menuType: ${menuType})`);
            
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
        
        const imageName = `${menuType}_${lang}-${page}.jpg`;
        console.log(`Loading image: ${baseImagePath}${imageName} (menuType: ${menuType}, page: ${page})`);
        
        // Add fade effect
        menuImage.classList.add('fade');
        
        loadImageWithFallback(baseImagePath, imageName,
            (src, format) => {
        setTimeout(() => {
                    menuImage.src = src;
            const menuTypeDisplayName = menuType === 'wine' ? 'Wine List' : menuType === 'desserts' ? 'Desserts' : 'Menu';
            menuImage.alt = `${menuTypeDisplayName} ${lang.toUpperCase()} - Page ${page}`;
            menuImage.classList.remove('fade');
            currentPage = page;
            
                    // Continue sequential preloading after navigation
                    sequentialPreload(page);
                    
                    // Show/hide back button based on current page
                    updateBackButton();
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

    // Create back button
    function createBackButton() {
        // Check if button already exists
        if (document.querySelector('.back-button')) {
            console.log('Back button already exists');
            return;
        }
        
        console.log('Creating back button...');
        
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        
        // Add appropriate class based on menu type
        if (menuType === 'wine') {
            backButton.classList.add('wine-page');
        } else if (menuType === 'desserts') {
            backButton.classList.add('desserts-page');
        } else {
            backButton.classList.add('menu-page');
        }
        
        // Set text based on language
        const texts = translations[lang] || translations.en;
        backButton.textContent = texts.back;
        
        console.log(`Back button text set to: ${backButton.textContent}`);
        
        // Add click handler
        backButton.addEventListener('click', () => {
            const selectMenuUrl = isLocalhost() ? 
                `../select-menu.html?lang=${lang}` : 
                `${basePath}pages/select-menu.html?lang=${lang}`;
            console.log(`Back button clicked, navigating to: ${selectMenuUrl}`);
            window.location.href = selectMenuUrl;
        });
        
        // Add to body
        document.body.appendChild(backButton);
        console.log('Back button added to body');
    }

    // Update back button visibility based on current page
    function updateBackButton() {
        const backButton = document.querySelector('.back-button');
        if (!backButton) {
            console.log('Back button not found');
            return;
        }
        
        console.log(`Back button update: currentPage=${currentPage}, totalPages=${totalPages}`);
        
        if (currentPage === totalPages) {
            backButton.classList.add('show');
            console.log('Back button shown');
        } else {
            backButton.classList.remove('show');
            console.log('Back button hidden');
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
    
    // Create back button
    createBackButton();
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
        menuSelect: '📂 Menu Select',
        back: 'Back'
    },
    pt: {
        home: '⬅ Início',
        menuSelect: '📂 Seleção Menu',
        back: 'Voltar'
    },
    fr: {
        home: '⬅ Accueil',
        menuSelect: '📂 Sélection Menu',
        back: 'Retour'
    },
    es: {
        home: '⬅ Inicio',
        menuSelect: '📂 Selección Menú',
        back: 'Volver'
    },
    de: {
        home: '⬅ Start',
        menuSelect: '📂 Menüauswahl',
        back: 'Zurück'
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


