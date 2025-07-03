// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Get the base path for the service worker
        const swPath = location.pathname.includes('/pages/') ? '../../service-worker.js' : '/service-worker.js';
        
        navigator.serviceWorker.register(swPath)
            .then(registration => {
                console.log('ServiceWorker registration successful');
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, refresh to update
                            if (confirm('New content is available! Would you like to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
} 