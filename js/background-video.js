document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('.video-background video');
    const videoSource = video.querySelector('source');
    
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
    videoSource.src = `${basePath}assets/videos/mediterranean_waves_video.mp4`;
    
    console.log('Background Video Debug:', {
        hostname: window.location.hostname,
        port: window.location.port,
        isLocalhost: isLocalhost(),
        basePath: basePath,
        videoSrc: videoSource.src
    });
    
    // Play video with necessary attributes
    video.load();
    video.play().catch(function(error) {
        console.log("Video autoplay failed:", error);
    });
}); 