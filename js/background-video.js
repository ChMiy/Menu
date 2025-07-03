document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('.video-background video');
    const videoSource = video.querySelector('source');
    
    // Set video source to our single video
    videoSource.src = '../assets/videos/mediterranean_waves_video.mp4';
    
    // Play video with necessary attributes
    video.load();
    video.play().catch(function(error) {
        console.log("Video autoplay failed:", error);
    });
}); 