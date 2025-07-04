document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('.video-background video');
    const videoSource = video.querySelector('source');
    
    // Set video source using base path detection for GitHub Pages
    const basePath = window.location.pathname.includes('/Menu/') ? 
        window.location.pathname.split('/Menu/')[0] + '/Menu/' : 
        '/Menu/';
    videoSource.src = basePath + 'assets/videos/mediterranean_waves_video.mp4';
    
    // Play video with necessary attributes
    video.load();
    video.play().catch(function(error) {
        console.log("Video autoplay failed:", error);
    });
}); 