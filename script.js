// ========================================
// Guo Jie & Yu Zon — Wedding Website
// SPA Router + Persistent Music
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initPage();
  initRouter();
  initMusic();
});

// ========================================
// PAGE INITIALIZATION
// Runs on first load AND after each SPA navigation
// ========================================
function initPage() {

  // --- Scroll-based nav ---
  const nav = document.getElementById('nav');
  if (nav) {
    // On index.html (has hero), toggle on scroll; on sub-pages, always scrolled
    const hero = document.querySelector('.hero');
    if (hero) {
      nav.classList.remove('scrolled');
      function updateNav() {
        nav.classList.toggle('scrolled', window.scrollY > 100);
      }
      window.addEventListener('scroll', updateNav, { passive: true });
      updateNav();
    } else {
      nav.classList.add('scrolled');
    }
  }

  // --- Mobile menu toggle (with scroll lock + outside-tap close) ---
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (navToggle && navMenu) {
    // Remove old listeners by cloning
    const newToggle = navToggle.cloneNode(true);
    navToggle.parentNode.replaceChild(newToggle, navToggle);

    const setMenuOpen = (open) => {
      newToggle.classList.toggle('active', open);
      navMenu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      // Hide tap-hint while menu is open so they don't compete for attention
      const tapHint = document.getElementById('tap-hint');
      if (tapHint) tapHint.classList.toggle('tap-hint--hidden', open);
    };

    newToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(!navMenu.classList.contains('open'));
    });

    // Outside tap closes the menu
    document.addEventListener('click', (e) => {
      if (!navMenu.classList.contains('open')) return;
      if (e.target.closest('#nav-menu') || e.target.closest('#nav-toggle')) return;
      setMenuOpen(false);
    });

    // Escape key closes the menu (desktop helper)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) setMenuOpen(false);
    });
  }

  // --- Reveal on scroll ---
  const reveals = document.querySelectorAll('.reveal:not(.visible), .reveal-photo:not(.visible)');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }

  // --- Flip cards ---
  document.querySelectorAll('.photo-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
  });

  // --- Video autoplay on scroll (skip if user has data-saver / save-data) ---
  const videos = document.querySelectorAll('.autoplay-video');
  const saveData =
    (navigator.connection && navigator.connection.saveData) ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches);
  if (videos.length && 'IntersectionObserver' in window && !saveData) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.play().catch(() => {});
        } else {
          entry.target.pause();
        }
      });
    }, { threshold: 0.3 });
    videos.forEach(video => videoObserver.observe(video));
  } else if (saveData) {
    // Show a static poster cue so user can tap to play if they want
    videos.forEach(video => { video.controls = true; video.preload = 'none'; });
  }

  // --- Countdown timer ---
  const cdDays = document.getElementById('cd-days');
  if (cdDays) {
    const weddingDate = new Date('2027-01-30T14:30:00+08:00');
    function updateCountdown() {
      const diff = weddingDate - new Date();
      if (diff <= 0) {
        cdDays.textContent = '0';
        document.getElementById('cd-hours').textContent = '0';
        document.getElementById('cd-mins').textContent = '0';
        document.getElementById('cd-secs').textContent = '0';
        return;
      }
      cdDays.textContent = Math.floor(diff / (1000 * 60 * 60 * 24));
      document.getElementById('cd-hours').textContent = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      document.getElementById('cd-mins').textContent = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
      document.getElementById('cd-secs').textContent = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
    }
    updateCountdown();
    window._countdownInterval = window._countdownInterval || setInterval(updateCountdown, 1000);
  }

  // --- Tap-hint dismissal on first photo-card interaction ---
  const tapHint = document.getElementById('tap-hint');
  if (tapHint) {
    const dismiss = () => tapHint.classList.add('tap-hint--hidden');
    document.querySelectorAll('.photo-card').forEach(card => {
      card.addEventListener('click', dismiss, { once: true });
    });
    setTimeout(() => tapHint.classList.add('tap-hint--seen'), 12000);
  }
}

// ========================================
// SPA ROUTER
// Intercepts internal links, fetches page, swaps <main> content
// ========================================
function initRouter() {
  // Intercept clicks on all internal links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip external links, RSVP form, booking links, mailto, tel
    if (link.target === '_blank') return;
    if (href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;
    if (href.startsWith('#')) return; // in-page anchor, let default behavior

    e.preventDefault();

    // Close mobile menu if open
    const navMenu = document.getElementById('nav-menu');
    const navToggle = document.getElementById('nav-toggle');
    if (navMenu) navMenu.classList.remove('open');
    if (navToggle) navToggle.classList.remove('active');
    document.body.classList.remove('menu-open');

    // Parse the href into page + hash
    const [page, hash] = href.split('#');
    const targetPage = page || window.location.pathname.split('/').pop();

    navigate(targetPage, hash);
  });

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const hash = window.location.hash.replace('#', '');
    navigate(page, hash, true);
  });
}

async function navigate(page, hash, isPopState) {
  try {
    const response = await fetch(page);
    if (!response.ok) return;
    const html = await response.text();

    // Parse the fetched page
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newContent = doc.getElementById('page-content');

    if (!newContent) {
      // Fallback: full page navigation
      window.location.href = page + (hash ? '#' + hash : '');
      return;
    }

    // Swap content
    const currentContent = document.getElementById('page-content');
    if (currentContent) {
      currentContent.innerHTML = newContent.innerHTML;
    }

    // Merge any <style> blocks from the new page
    const newStyles = doc.querySelectorAll('head style');
    // Remove old injected page styles
    document.querySelectorAll('style[data-page-style]').forEach(s => s.remove());
    newStyles.forEach(style => {
      const s = document.createElement('style');
      s.setAttribute('data-page-style', 'true');
      s.textContent = style.textContent;
      document.head.appendChild(s);
    });

    // Update document title
    document.title = doc.title;

    // Update URL
    if (!isPopState) {
      history.pushState(null, '', page + (hash ? '#' + hash : ''));
    }

    // Scroll to hash or top
    if (hash) {
      requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        if (target) {
          const offset = 70;
          window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
        }
      });
    } else {
      window.scrollTo(0, 0);
    }

    // Re-initialize page behaviors for new content
    initPage();

  } catch (err) {
    // On error, fall back to normal navigation
    window.location.href = page + (hash ? '#' + hash : '');
  }
}

// ========================================
// PERSISTENT MUSIC PLAYER
// Stays alive across page transitions; uses SoundCloud Widget API
// to save and resume playback position across hard reloads.
// ========================================
const MUSIC_KEYS = {
  position: 'gjyz-music-position',
  trackIndex: 'gjyz-music-track-index',
  playing: 'gjyz-music-playing',
};

function initMusic() {
  const musicFloat = document.getElementById('music-float');
  const musicToggle = document.getElementById('music-toggle');
  const iframe = document.querySelector('.music-iframe');

  if (!musicFloat || !musicToggle) return;

  // Toggle the visible player panel
  musicToggle.addEventListener('click', () => {
    musicFloat.classList.toggle('open');
    const label = document.getElementById('music-label');
    if (label) {
      label.textContent = musicFloat.classList.contains('open') ? 'Close' : 'Play our song';
    }
  });

  if (!iframe) return;

  // Load SoundCloud Widget API once, then bind position tracking + restore
  const setupWidget = () => {
    if (!window.SC || !window.SC.Widget) return;
    const widget = SC.Widget(iframe);

    widget.bind(SC.Widget.Events.READY, () => {
      const savedPos = parseFloat(localStorage.getItem(MUSIC_KEYS.position) || '0');
      const savedIndex = parseInt(localStorage.getItem(MUSIC_KEYS.trackIndex) || '0', 10);
      const wasPlaying = localStorage.getItem(MUSIC_KEYS.playing) === 'true';

      const resume = () => {
        if (savedPos > 0) widget.seekTo(savedPos);
        if (wasPlaying) {
          widget.play();
          musicToggle.classList.add('playing');
        }
      };

      if (savedIndex > 0) {
        widget.skip(savedIndex);
        // Skip is async; give it a moment before seeking + playing
        setTimeout(resume, 500);
      } else {
        resume();
      }
    });

    let lastSaved = 0;
    let cachedIndex = 0;
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
      const now = Date.now();
      if (now - lastSaved < 250) return;
      lastSaved = now;
      localStorage.setItem(MUSIC_KEYS.position, String(e.currentPosition));
      localStorage.setItem(MUSIC_KEYS.trackIndex, String(cachedIndex));
    });

    widget.bind(SC.Widget.Events.PLAY, () => {
      localStorage.setItem(MUSIC_KEYS.playing, 'true');
      musicToggle.classList.add('playing');
      widget.getCurrentSoundIndex((idx) => {
        if (typeof idx === 'number') cachedIndex = idx;
      });
    });

    widget.bind(SC.Widget.Events.PAUSE, () => {
      localStorage.setItem(MUSIC_KEYS.playing, 'false');
      musicToggle.classList.remove('playing');
    });

    widget.bind(SC.Widget.Events.FINISH, () => {
      // Track ended; reset position so next track starts from its beginning
      localStorage.setItem(MUSIC_KEYS.position, '0');
    });

    // Force a final state flush as the page goes away.
    // pagehide fires more reliably than beforeunload (esp. on iOS/Safari).
    const flushState = () => {
      widget.getPosition((pos) => {
        if (typeof pos === 'number') {
          localStorage.setItem(MUSIC_KEYS.position, String(pos));
        }
      });
      widget.getCurrentSoundIndex((idx) => {
        if (typeof idx === 'number') {
          localStorage.setItem(MUSIC_KEYS.trackIndex, String(idx));
        }
      });
    };
    window.addEventListener('pagehide', flushState);
    window.addEventListener('beforeunload', flushState);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushState();
    });
  };

  if (window.SC && window.SC.Widget) {
    setupWidget();
  } else {
    const existing = document.querySelector('script[data-soundcloud-api]');
    if (existing) {
      existing.addEventListener('load', setupWidget);
    } else {
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.dataset.soundcloudApi = 'true';
      script.onload = setupWidget;
      document.head.appendChild(script);
    }
  }
}
