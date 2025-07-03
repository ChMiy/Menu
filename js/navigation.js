// Shared navigation script for menu and wine pages
document.addEventListener('DOMContentLoaded', () => {
    const menuImage = document.querySelector('.menu-image');
    if (!menuImage) return;

    // Get current language and menu type
    const lang = getLang();
    const path = window.location.pathname;
    const isWineMenu = path.includes('wine-');
    const baseImagePath = `/assets/images/${isWineMenu ? 'wine' : 'menu'}/${lang}/`;
    
    let currentPage = 1;
    let totalPages = 1;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // Dynamically detect total pages by testing image existence
    function detectTotalPages() {
        let pageCount = 1;
        
        function testNextPage(page) {
            const imageName = `${isWineMenu ? 'wine' : 'menu'}_${lang}-${page}.jpg`;
            const testSrc = `${baseImagePath}${imageName}`;
            
            const testImage = new Image();
            testImage.onload = function() {
                pageCount = page;
                testNextPage(page + 1);
            };
            testImage.onerror = function() {
                totalPages = pageCount;
                console.log(`Detected ${totalPages} pages for ${lang} ${isWineMenu ? 'wine' : 'menu'}`);
            };
            testImage.src = testSrc;
        }
        
        testNextPage(1);
    }

    // Update image source based on current page
    function updateImage(page) {
        if (!menuImage || page < 1 || page > totalPages) return;
        
        const imageName = `${isWineMenu ? 'wine' : 'menu'}_${lang}-${page}.jpg`;
        const newSrc = `${baseImagePath}${imageName}`;
        
        // Add fade effect
        menuImage.classList.add('fade');
        
        setTimeout(() => {
            menuImage.src = newSrc;
            menuImage.alt = `${isWineMenu ? 'Wine List' : 'Menu'} ${lang.toUpperCase()} - Page ${page}`;
            menuImage.classList.remove('fade');
            currentPage = page;
        }, 300);
        
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
            window.location.href = `/pages/select-menu.html?lang=${lang}`;
        } else if (e.key === 'Home') {
            window.location.href = '/index.html';
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
                        window.location.href = `/pages/select-menu.html?lang=${lang}`;
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
        homeButton.onclick = () => location.href = '/index.html';
    }
    
    if (menuSelectButton) {
        menuSelectButton.innerHTML = texts.menuSelect;
        menuSelectButton.onclick = () => location.href = `/pages/select-menu.html?lang=${lang}`;
    }
}

// Auto-hide navigation controls
let hideTimeout;
const navControls = document.querySelector('.nav-controls');

function showControls() {
    if (navControls) {
        navControls.classList.remove('hidden');
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            navControls.classList.add('hidden');
        }, 3000);
    }
}

// Show controls on mouse move or touch
document.addEventListener('mousemove', showControls);
document.addEventListener('touchstart', showControls);

// Initialize
window.addEventListener('load', () => {
    updateNavigationText();
    showControls();
}); 


