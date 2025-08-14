(() => {
    // Only run on screens wider than 800px
    if (window.innerWidth <= 800) return;
  
    const IDLE_TIMEOUT_MS = 60 * 1000; // 1 minute
  
    // Build homepage URL dynamically
    const baseTag = document.querySelector('base[href]');
    const HOMEPAGE_URL = baseTag
      ? baseTag.getAttribute('href')
      : (window.location.origin + '/Menu');
  
    function isOnHomepage() {
      const p = window.location.pathname.toLowerCase();
      return p === '/' || /\/index\.(html?|php|aspx?)$/.test(p);
    }
  
    let idleTimer = null;
    let redirected = false;
  
    function redirectHome() {
      if (redirected) return;
      redirected = true;
      if (!isOnHomepage()) {
        window.location.href = HOMEPAGE_URL;
      } else {
        resetIdleTimer();
      }
    }
  
    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(redirectHome, IDLE_TIMEOUT_MS);
    }
  
    const activityEvents = [
      'pointerdown', 'pointermove', 'pointerup', 'pointercancel',
      'touchstart', 'touchmove', 'touchend',
      'click', 'keydown', 'wheel', 'scroll',
      'focus'
    ];
  
    activityEvents.forEach(evt => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });
  
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) resetIdleTimer();
    }, { passive: true });
  
    resetIdleTimer();
  })();
  
  