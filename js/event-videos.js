(function initEventShowcaseVideos() {
  const videos = document.querySelectorAll('.event-showcase-video');

  function pauseOtherVideos(currentVideo) {
    videos.forEach((video) => {
      if (video !== currentVideo && !video.paused) {
        video.pause();
      }
    });
  }

  videos.forEach((video) => {
    const stage = video.closest('.event-video-stage');
    const toggle = stage?.querySelector('.event-video-toggle');
    const status = stage?.querySelector('.event-video-status');

    if (!toggle) return;

    const updateToggle = () => {
      const isPlaying = !video.paused && !video.ended;
      toggle.setAttribute('aria-label', isPlaying ? 'Pause event video' : 'Play event video');
      toggle.setAttribute('aria-pressed', String(isPlaying));
      toggle.classList.toggle('is-playing', isPlaying);
      toggle.querySelector('span').textContent = isPlaying ? 'Ⅱ' : '▶';
    };

    video.addEventListener('play', () => pauseOtherVideos(video));
    video.addEventListener('play', updateToggle);
    video.addEventListener('pause', updateToggle);
    video.addEventListener('ended', updateToggle);

    toggle.addEventListener('click', () => {
      if (!video.paused) {
        video.pause();
        return;
      }

      pauseOtherVideos(video);
      video.play().then(() => {
        if (status) status.textContent = '';
      }).catch(() => {
        if (status) status.textContent = 'This video could not be played. Please try again.';
      });
    });
  });
})();
