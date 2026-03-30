import './style.css';
import Hls from 'hls.js';
import dashjs from 'dashjs';

class Plyer {
  constructor(selector, options = {}) {
    this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    this.options = {
      src: '',
      sources: [], // [{ label: '720p', src: '...' }]
      poster: '',
      ...options
    };

    this.currentSource = this.options.src || (this.options.sources.length ? this.options.sources[0].src : '');

    if (!this.container) {
      console.error('Plyer: Container not found');
      return;
    }

    this.previewVideo = document.createElement('video');
    this.previewVideo.muted = true;
    this.previewVideo.preload = 'auto';
    this.previewVideo.crossOrigin = 'anonymous';

    this.hls = null;
    this.dash = null;

    this.render();
    this.initElements();
    this.initEvents();
    this.loadSource(this.currentSource);
    
    if (this.options.sources.length) {
      this.setupManualQualityMenu();
    }
    
    if (!this.options.poster) {
      this.captureFirstFrame();
    }
  }

  updateQualityLabel(label) {
    if (label && label.toLowerCase() !== 'auto') {
      this.qualityLabel.textContent = label;
      this.qualityLabel.style.display = 'block';
    } else {
      this.qualityLabel.style.display = 'none';
    }
  }

  getCheckIcon() {
    return `<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  }

  setupManualQualityMenu() {
    this.qualitySelector.style.display = 'flex';
    this.qualityMenu.innerHTML = '';
    
    this.options.sources.forEach((source, index) => {
      const btn = document.createElement('button');
      if (source.src === this.currentSource) btn.classList.add('active');
      btn.dataset.index = index;
      
      const span = document.createElement('span');
      span.textContent = source.label;
      btn.appendChild(span);
      btn.innerHTML += this.getCheckIcon();
      
      btn.addEventListener('click', () => {
        const idx = btn.dataset.index;
        const src = this.options.sources[idx];
        const currentTime = this.video.currentTime;
        const isPaused = this.video.paused;

        this.currentSource = src.src;
        this.loadSource(src.src);
        
        this.video.addEventListener('loadeddata', () => {
          this.video.currentTime = currentTime;
          if (!isPaused) this.video.play();
        }, { once: true });

        this.updateQualityLabel(src.label);
        this.qualityMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.qualityMenu.classList.remove('show');
      });
      this.qualityMenu.appendChild(btn);
    });

    const activeSource = this.options.sources.find(s => s.src === this.currentSource);
    if (activeSource) this.updateQualityLabel(activeSource.label);
  }

  setupHlsQualityMenu() {
    this.qualitySelector.style.display = 'flex';
    const levels = this.hls.levels;
    this.qualityMenu.innerHTML = '';

    const createBtn = (label, levelIndex, isActive) => {
      const btn = document.createElement('button');
      if (isActive) btn.classList.add('active');
      btn.dataset.level = levelIndex;
      const span = document.createElement('span');
      span.textContent = label;
      btn.appendChild(span);
      btn.innerHTML += this.getCheckIcon();
      btn.addEventListener('click', () => {
        const level = parseInt(btn.dataset.level);
        this.hls.currentLevel = level;
        this.updateQualityLabel(span.textContent);
        this.qualityMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.qualityMenu.classList.remove('show');
      });
      return btn;
    };

    this.qualityMenu.appendChild(createBtn('Auto', -1, true));
    levels.forEach((level, index) => {
      const label = level.height ? `${level.height}p` : `Level ${index}`;
      this.qualityMenu.appendChild(createBtn(label, index, false));
    });

    this.updateQualityLabel('Auto');
  }

  setupDashQualityMenu() {
    this.qualitySelector.style.display = 'flex';
    const bitrates = this.dash.getBitrateInfoListFor('video');
    this.qualityMenu.innerHTML = '';

    const createBtn = (label, index, isActive) => {
      const btn = document.createElement('button');
      if (isActive) btn.classList.add('active');
      btn.dataset.index = index;
      const span = document.createElement('span');
      span.textContent = label;
      btn.appendChild(span);
      btn.innerHTML += this.getCheckIcon();
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        if (idx === -1) {
          this.dash.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
        } else {
          this.dash.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
          this.dash.setQualityFor('video', idx);
        }
        this.updateQualityLabel(span.textContent);
        this.qualityMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.qualityMenu.classList.remove('show');
      });
      return btn;
    };

    this.qualityMenu.appendChild(createBtn('Auto', -1, true));
    bitrates.forEach((info, index) => {
      const label = info.height ? `${info.height}p` : `${Math.round(info.bitrate / 1000)}kbps`;
      this.qualityMenu.appendChild(createBtn(label, index, false));
    });

    this.updateQualityLabel('Auto');
  }

  captureFirstFrame() {
    if (!this.currentSource) return;
    const video = document.createElement('video');
    video.src = this.currentSource;
    video.muted = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    
    video.addEventListener('loadeddata', () => {
      video.currentTime = 1; 
    });

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.video.setAttribute('poster', canvas.toDataURL());
    });
  }

  render() {
    this.container.classList.add('video-container');
    this.container.innerHTML = `
      <video class="video" id="plyer-video" preload="metadata" playsinline>
          Your browser does not support the video tag.
      </video>

      <div class="video-overlay">
          <div class="loader" id="plyer-loader"></div>
          <div class="overlay-icon-container">
              <svg id="overlay-play-icon" viewBox="0 0 24 24" width="64" height="64" fill="white"><path d="M5 3l14 9-14 9V3z"/></svg>
              <svg id="overlay-pause-icon" viewBox="0 0 24 24" width="64" height="64" fill="white" style="display:none;"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
          </div>
      </div>

      <div class="controls-container">
          <div class="timeline-container">
              <div class="preview-thumbnail">
                  <canvas id="preview-canvas"></canvas>
                  <span class="preview-time">0:00</span>
              </div>
              <div class="timeline">
                  <div class="buffered-bar"></div>
                  <div class="timeline-bar"></div>
                  <div class="timeline-thumb"></div>
              </div>
          </div>

          <div class="controls">
              <div class="controls-left">
                  <button class="control-btn" id="play-pause-btn" title="Play (Space)">
                      <svg class="play-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
                      <svg class="pause-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="display:none;"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                  </button>

                  <div class="volume-container">
                      <button class="control-btn" id="mute-btn" title="Mute (m)">
                          <svg class="volume-up-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                          <svg class="volume-mute-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="display:none;"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                      </button>
                      <input type="range" class="volume-slider" min="0" max="1" step="0.05" value="1">
                  </div>

                  <div class="time-display">
                      <span id="current-time">0:00</span> / <span id="total-time">0:00</span>
                  </div>
              </div>

              <div class="controls-right">
                  <div class="quality-selector" style="display:none;">
                      <button class="control-btn" id="quality-btn" title="Quality">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                          </svg>
                          <span id="quality-label"></span>
                      </button>
                      <div class="quality-menu"></div>
                  </div>

                  <div class="speed-selector">
                      <button class="control-btn" id="speed-btn">1x</button>
                      <div class="speed-menu"></div>
                  </div>

                  <button class="control-btn" id="pip-btn" title="Picture-in-Picture">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>
                  </button>

                  <button class="control-btn" id="fullscreen-btn" title="Fullscreen (f)">
                      <svg class="maximize-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                      <svg class="minimize-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="display:none;"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                  </button>
              </div>
          </div>
      </div>
    `;
  }

  loadSource(src) {
    if (!src) return;

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.dash) {
      this.dash.reset();
      this.dash = null;
    }

    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();

    this.previewVideo.src = src;
    this.previewVideo.load();

    this.qualitySelector.style.display = 'none';
    this.qualityMenu.innerHTML = '';

    const extension = src.split('?')[0].split('.').pop().toLowerCase();

    if (extension === 'm3u8') {
      if (Hls.isSupported()) {
        this.hls = new Hls();
        this.hls.loadSource(src);
        this.hls.attachMedia(this.video);
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.setupHlsQualityMenu();
        });
      } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.video.src = src;
      }
    } else if (extension === 'mpd') {
      this.dash = dashjs.MediaPlayer().create();
      this.dash.initialize(this.video, src, false);
      this.dash.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        this.setupDashQualityMenu();
      });
    } else {
      this.video.src = src;
      if (this.options.sources.length) {
        this.setupManualQualityMenu();
      }
    }
  }

  initElements() {
    this.video = this.container.querySelector('video');
    if (this.options.poster) {
      this.video.setAttribute('poster', this.options.poster);
    }
    this.playPauseBtn = this.container.querySelector('#play-pause-btn');
    this.playIcon = this.container.querySelector('.play-icon');
    this.pauseIcon = this.container.querySelector('.pause-icon');
    this.muteBtn = this.container.querySelector('#mute-btn');
    this.volumeUpIcon = this.container.querySelector('.volume-up-icon');
    this.volumeMuteIcon = this.container.querySelector('.volume-mute-icon');
    this.volumeSlider = this.container.querySelector('.volume-slider');
    this.currentTimeElem = this.container.querySelector('#current-time');
    this.totalTimeElem = this.container.querySelector('#total-time');
    this.timelineContainer = this.container.querySelector('.timeline-container');
    this.timelineBar = this.container.querySelector('.timeline-bar');
    this.bufferedBar = this.container.querySelector('.buffered-bar');
    this.timelineThumb = this.container.querySelector('.timeline-thumb');
    this.speedBtn = this.container.querySelector('#speed-btn');
    this.speedMenu = this.container.querySelector('.speed-menu');
    this.speedButtons = this.container.querySelectorAll('.speed-menu button');
    this.qualitySelector = this.container.querySelector('.quality-selector');
    this.qualityBtn = this.container.querySelector('#quality-btn');
    this.qualityLabel = this.container.querySelector('#quality-label');
    this.qualityMenu = this.container.querySelector('.quality-menu');
    this.pipBtn = this.container.querySelector('#pip-btn');
    this.fullscreenBtn = this.container.querySelector('#fullscreen-btn');
    this.maximizeIcon = this.container.querySelector('.maximize-icon');
    this.minimizeIcon = this.container.querySelector('.minimize-icon');
    this.loader = this.container.querySelector('#plyer-loader');
    this.overlayIconContainer = this.container.querySelector('.overlay-icon-container');
    this.overlayPlayIcon = this.container.querySelector('#overlay-play-icon');
    this.overlayPauseIcon = this.container.querySelector('#overlay-pause-icon');
    this.controlsContainer = this.container.querySelector('.controls-container');
    this.previewThumbnail = this.container.querySelector('.preview-thumbnail');
    this.previewCanvas = this.container.querySelector('#preview-canvas');
    this.previewTimeSpan = this.container.querySelector('.preview-time');
  }

  initEvents() {
    this.playPauseBtn.addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('click', () => this.toggleControls());

    this.timelineContainer.addEventListener('mouseenter', () => {
      this.previewThumbnail.style.display = 'flex';
    });

    this.timelineContainer.addEventListener('mouseleave', () => {
      this.previewThumbnail.style.display = 'none';
    });

    this.timelineContainer.addEventListener('mousemove', (e) => {
      const rect = this.timelineContainer.getBoundingClientRect();
      const percent = Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width;
      const previewTime = percent * this.video.duration;
      this.previewThumbnail.style.left = `${percent * 100}%`;
      this.previewTimeSpan.textContent = this.formatTime(previewTime);
      if (this.previewVideo.readyState >= 2) {
        this.previewVideo.currentTime = previewTime;
      }
    });

    this.previewVideo.addEventListener('seeked', () => {
      const ctx = this.previewCanvas.getContext('2d');
      this.previewCanvas.width = 160;
      this.previewCanvas.height = 90;
      ctx.drawImage(this.previewVideo, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
    });
    
    this.video.addEventListener('play', () => {
      this.container.classList.remove('paused');
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
    });

    this.video.addEventListener('pause', () => {
      this.container.classList.add('paused');
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
    });

    this.muteBtn.addEventListener('click', () => this.toggleMute());
    this.volumeSlider.addEventListener('input', (e) => {
      this.video.volume = e.target.value;
      this.video.muted = e.target.value === 0;
      this.updateVolumeUI();
    });

    this.video.addEventListener('loadedmetadata', () => {
      this.totalTimeElem.textContent = this.formatTime(this.video.duration);
    });

    this.video.addEventListener('timeupdate', () => {
      const percent = (this.video.currentTime / this.video.duration) * 100;
      this.timelineBar.style.width = `${percent}%`;
      this.timelineThumb.style.left = `${percent}%`;
      this.currentTimeElem.textContent = this.formatTime(this.video.currentTime);
    });

    this.video.addEventListener('progress', () => this.updateBuffered());
    this.video.addEventListener('waiting', () => this.loader.style.display = 'block');
    this.video.addEventListener('playing', () => this.loader.style.display = 'none');
    this.video.addEventListener('canplay', () => this.loader.style.display = 'none');

    let isScrubbing = false;
    this.timelineContainer.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      this.scrub(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) this.scrub(e);
    });

    window.addEventListener('mouseup', () => {
      isScrubbing = false;
    });

    this.speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.speedMenu.classList.toggle('show');
      this.qualityMenu.classList.remove('show');
    });

    this.qualityBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.qualityMenu.classList.toggle('show');
      this.speedMenu.classList.remove('show');
    });

    document.addEventListener('click', () => {
      this.speedMenu.classList.remove('show');
      this.qualityMenu.classList.remove('show');
    });

    this.speedMenu.innerHTML = '';
    const speeds = [0.5, 1, 1.5, 2];
    speeds.forEach(speed => {
      const btn = document.createElement('button');
      if (speed === 1) btn.classList.add('active');
      btn.dataset.speed = speed;
      
      const span = document.createElement('span');
      span.textContent = `${speed}x`;
      btn.appendChild(span);
      btn.innerHTML += this.getCheckIcon();
      
      btn.addEventListener('click', () => {
        this.video.playbackRate = speed;
        this.speedBtn.textContent = `${speed}x`;
        this.speedMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speedMenu.classList.remove('show');
      });
      this.speedMenu.appendChild(btn);
    });

    this.speedButtons = this.speedMenu.querySelectorAll('button');

    this.pipBtn.addEventListener('click', () => this.togglePiP());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        this.container.classList.add('fullscreen');
        this.maximizeIcon.style.display = 'none';
        this.minimizeIcon.style.display = 'block';
      } else {
        this.container.classList.remove('fullscreen');
        this.maximizeIcon.style.display = 'block';
        this.minimizeIcon.style.display = 'none';
      }
    });

    this.container.addEventListener('mousemove', () => this.showControls());
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  togglePlay() {
    if (this.video.paused) {
      this.video.play();
      this.showOverlayIcon(this.overlayPlayIcon);
    } else {
      this.video.pause();
      this.showOverlayIcon(this.overlayPauseIcon);
    }
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    this.updateVolumeUI();
  }

  updateVolumeUI() {
    if (this.video.muted || this.video.volume === 0) {
      this.volumeUpIcon.style.display = 'none';
      this.volumeMuteIcon.style.display = 'block';
      this.volumeSlider.value = 0;
    } else {
      this.volumeUpIcon.style.display = 'block';
      this.volumeMuteIcon.style.display = 'none';
      this.volumeSlider.value = this.video.volume;
    }
  }

  updateBuffered() {
    if (this.video.duration > 0) {
      for (let i = 0; i < this.video.buffered.length; i++) {
        if (this.video.buffered.start(this.video.buffered.length - 1 - i) < this.video.currentTime) {
          const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1 - i);
          const percent = (bufferedEnd / this.video.duration) * 100;
          this.bufferedBar.style.width = `${percent}%`;
          break;
        }
      }
    }
  }

  scrub(e) {
    const rect = this.timelineContainer.getBoundingClientRect();
    const percent = Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width;
    this.video.currentTime = percent * this.video.duration;
  }

  async togglePiP() {
    try {
      if (this.video !== document.pictureInPictureElement) {
        await this.video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (e) { console.error('PiP error', e); }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  toggleControls() {
    if (getComputedStyle(this.controlsContainer).opacity === '1') {
      this.hideControls();
    } else {
      this.showControls();
    }
  }

  hideControls() {
    if (this.video.paused) return;
    this.container.style.cursor = 'none';
    this.controlsContainer.style.opacity = '0';
    clearTimeout(this.timeout);
  }

  showControls() {
    this.container.style.cursor = 'default';
    this.controlsContainer.style.opacity = '1';
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.hideControls(), 3000);
  }

  showOverlayIcon(icon) {
    this.overlayPlayIcon.style.display = 'none';
    this.overlayPauseIcon.style.display = 'none';
    icon.style.display = 'block';
    this.overlayIconContainer.classList.remove('animate');
    void this.overlayIconContainer.offsetWidth;
    this.overlayIconContainer.classList.add('animate');
    setTimeout(() => this.overlayIconContainer.classList.remove('animate'), 500);
  }

  formatTime(time) {
    const s = Math.floor(time % 60);
    const m = Math.floor(time / 60) % 60;
    const h = Math.floor(time / 3600);
    if (h === 0) return `${m}:${s < 10 ? '0' : ''}${s}`;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  handleKeyboard(e) {
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    switch (e.key.toLowerCase()) {
      case ' ': e.preventDefault(); this.togglePlay(); break;
      case 'm': this.toggleMute(); break;
      case 'f': this.toggleFullscreen(); break;
      case 'arrowright': this.video.currentTime += 5; break;
      case 'arrowleft': this.video.currentTime -= 5; break;
      case 'arrowup': e.preventDefault(); this.video.volume = Math.min(1, this.video.volume + 0.1); this.updateVolumeUI(); break;
      case 'arrowdown': e.preventDefault(); this.video.volume = Math.max(0, this.video.volume - 0.1); this.updateVolumeUI(); break;
    }
  }
}

export default Plyer;
