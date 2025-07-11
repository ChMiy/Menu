document.addEventListener('DOMContentLoaded', () => {
    // Get the selected language from URL
    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get('lang') || 'en';

    // Track touch events
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    // Robust localhost detection
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

    const basePath = isLocalhost() ? '' : '/Menu/';
    
    console.log('Select Menu Debug:', {
        hostname: window.location.hostname,
        port: window.location.port,
        isLocalhost: isLocalhost(),
        basePath: basePath
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

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'Escape' || e.key === 'Home') {
            navigateToHome();
        }
    });

    function handleSwipe() {
        const swipeDistanceX = touchEndX - touchStartX;
        const swipeDistanceY = touchEndY - touchStartY;
        const minSwipeDistance = 50;

        // Only handle horizontal swipes if they're more horizontal than vertical
        if (Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY)) {
            if (Math.abs(swipeDistanceX) > minSwipeDistance) {
                if (swipeDistanceX > 0) {
                    // Swipe right -> go back to home
                    navigateToHome();
                }
            }
        }
    }

    function navigateToHome() {
        window.location.href = `${basePath}index.html`;
    }

    // Get current language from URL
    function getLang() {
        const params = new URLSearchParams(window.location.search);
        return params.get('lang') || 'en';
    }

    // Handle menu panel clicks
    document.getElementById('food-menu').addEventListener('click', () => {
        const lang = getLang();
        window.location.href = `${basePath}pages/menu/menu-${lang}.html?lang=${lang}`;
    });

    document.getElementById('desserts-menu').addEventListener('click', () => {
        const lang = getLang();
        window.location.href = `${basePath}pages/desserts/desserts-${lang}.html?lang=${lang}`;
    });

    document.getElementById('wine-menu').addEventListener('click', () => {
        const lang = getLang();
        window.location.href = `${basePath}pages/wine/wine-${lang}.html?lang=${lang}`;
    });

    // Add hover effects
    function addHoverEffect(element) {
        element.addEventListener('mouseenter', () => {
            const img = element.querySelector('img');
            if (img) {
                img.style.transform = 'scale(1.05)';
                img.style.transition = 'transform 0.5s ease';
            }
        });

        element.addEventListener('mouseleave', () => {
            const img = element.querySelector('img');
            if (img) {
                img.style.transform = 'scale(1)';
            }
        });
    }

    // Add touch effects
    function addTouchEffect(element) {
        element.addEventListener('touchstart', () => {
            const img = element.querySelector('img');
            if (img) {
                img.style.transform = 'scale(1.02)';
            }
        });

        element.addEventListener('touchend', () => {
            const img = element.querySelector('img');
            if (img) {
                img.style.transform = 'scale(1)';
            }
        });
    }

    // Initialize effects
    document.querySelectorAll('.menu-panel').forEach(panel => {
        addHoverEffect(panel);
        addTouchEffect(panel);
    });
}); 