// Seasonal video management
const seasonalVideos = {
    spring: {
        src: 'assets/videos/spring-mediterranean-dawn.mp4',
        poster: 'assets/images/spring-mediterranean-poster.jpg'
    },
    summer: {
        src: 'assets/videos/summer-mediterranean-crystal.mp4',
        poster: 'assets/images/summer-mediterranean-poster.jpg'
    },
    autumn: {
        src: 'assets/videos/autumn-mediterranean-golden.mp4',
        poster: 'assets/images/autumn-mediterranean-poster.jpg'
    },
    winter: {
        src: 'assets/videos/winter-mediterranean-storm.mp4',
        poster: 'assets/images/winter-mediterranean-poster.jpg'
    }
};

function getCurrentSeason() {
    const now = new Date();
    const month = now.getMonth();

    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
}

function updateBackgroundVideo() {
    const season = getCurrentSeason();
    const video = document.querySelector('.video-background video');
    const videoSource = video.querySelector('source');
    
    // Update video source and poster
    videoSource.src = seasonalVideos[season].src;
    video.poster = seasonalVideos[season].poster;
    
    // Reload the video with new source
    video.load();
    video.play().catch(function(error) {
        console.log("Video autoplay failed:", error);
    });
}

// Update video when page loads
document.addEventListener('DOMContentLoaded', updateBackgroundVideo);

// Check for season change every hour
setInterval(() => {
    updateBackgroundVideo();
}, 3600000); // Check every hour 