// ========================================
// Guo Jie & Yu Zon — Wedding Website
// SPA Router + Persistent Music
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initPage();
  initRouter();
  initMusic();
  initI18n();
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
        const scrolled = window.scrollY > 100;
        nav.classList.toggle('scrolled', scrolled);
        hero.classList.toggle('scrolled-past', scrolled);
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

  // --- Colour story modal (wedding page) ---
  const colourModal = document.getElementById('colour-modal');
  if (colourModal) {
    const swatchEl = document.getElementById('colour-modal-swatch');
    const nameEl = document.getElementById('colour-modal-name');
    const descEl = document.getElementById('colour-modal-desc');

    const openColourModal = (btn) => {
      const bg = btn.style.background || btn.style.backgroundColor;
      if (swatchEl) swatchEl.style.background = bg;

      // Pull strings — prefer i18n lookup if Chinese is active, fall back to data attrs (English)
      const lookup = (key, fallback) => {
        if (window.__i18nLookup) {
          const v = window.__i18nLookup(key);
          if (v != null) return v;
        }
        return fallback;
      };
      if (nameEl) nameEl.textContent = lookup(btn.dataset.colourNameI18n, btn.dataset.colourName);
      if (descEl) descEl.textContent = lookup(btn.dataset.colourDescI18n, btn.dataset.colourDesc);

      colourModal.classList.add('open');
      colourModal.setAttribute('aria-hidden', 'false');
    };

    const closeColourModal = () => {
      colourModal.classList.remove('open');
      colourModal.setAttribute('aria-hidden', 'true');
    };

    document.querySelectorAll('.colour-swatch').forEach(btn => {
      btn.addEventListener('click', () => openColourModal(btn));
    });
    colourModal.querySelectorAll('[data-colour-modal-close]').forEach(el => {
      el.addEventListener('click', closeColourModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && colourModal.classList.contains('open')) closeColourModal();
    });
  }

  // --- Tap-hint dismissal on first photo-card interaction ---
  const tapHint = document.getElementById('tap-hint');
  if (tapHint) {
    const dismiss = () => tapHint.classList.add('tap-hint--hidden');
    document.querySelectorAll('.photo-card').forEach(card => {
      card.addEventListener('click', dismiss, { once: true });
    });

    // Only start the auto-dismiss timer once the user has actually scrolled
    // into a section with cards — otherwise the hint vanishes before they arrive.
    const firstSeason = document.querySelector('.season');
    let timerStarted = false;
    const startTimer = () => {
      if (timerStarted) return;
      timerStarted = true;
      setTimeout(() => tapHint.classList.add('tap-hint--seen'), 28000);
    };
    if (firstSeason && 'IntersectionObserver' in window) {
      const hintObserver = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
          startTimer();
          hintObserver.disconnect();
        }
      }, { threshold: 0.2 });
      hintObserver.observe(firstSeason);
    } else {
      startTimer();
    }
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

    // Re-apply translations to swapped content
    if (window.__applyI18n) window.__applyI18n();

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
  const musicIcon = document.getElementById('music-icon');
  const musicLabel = document.getElementById('music-label');
  const musicHint = document.getElementById('music-hint');
  const iframe = document.querySelector('.music-iframe');

  if (!musicFloat || !musicToggle) return;

  // Music hint — show on first visit, dismiss on first toggle click or after 12s.
  // Persist dismissal in localStorage so it doesn't keep showing across pages.
  const HINT_KEY = 'gjyz-music-hint-seen';
  const hideHint = () => {
    if (musicHint) musicHint.classList.add('music-hint--hidden');
    localStorage.setItem(HINT_KEY, '1');
  };
  if (musicHint) {
    if (localStorage.getItem(HINT_KEY) === '1' || localStorage.getItem(MUSIC_KEYS.playing) === 'true') {
      musicHint.classList.add('music-hint--hidden');
    } else {
      musicToggle.addEventListener('click', hideHint, { once: true });
      setTimeout(hideHint, 12000);
    }
  }

  const ICON_PLAY = '♫';

  // Set initial visual state (will be updated once widget reports state).
  // The pause state is rendered via CSS (two bars on .music-toggle.playing),
  // so we never replace this character — we only toggle the .playing class.
  if (musicIcon) musicIcon.textContent = ICON_PLAY;
  if (musicLabel) musicLabel.textContent = 'Play music';
  musicToggle.setAttribute('aria-label', 'Play our song');

  if (!iframe) return;

  // Load SoundCloud Widget API once, then bind position tracking + restore
  const setupWidget = () => {
    if (!window.SC || !window.SC.Widget) return;
    const widget = SC.Widget(iframe);

    // Track widget readiness so we don't call play/pause before the iframe has
    // its media payload (that throws "mediaPayload required").
    let widgetReady = false;
    let pendingPlay = false;

    // Click toggles play/pause. Sync state check (so play() lands inside the
    // user-gesture window for Chrome's autoplay policy). If the widget isn't
    // ready yet, queue the play and let the READY handler resume it.
    musicToggle.addEventListener('click', () => {
      if (!widgetReady) {
        pendingPlay = true;
        return;
      }
      if (musicToggle.classList.contains('playing')) {
        widget.pause();
      } else {
        widget.play();
      }
    });

    // Diagnostic: log any widget error + what tracks (if any) it actually loaded
    if (SC.Widget.Events.ERROR) {
      widget.bind(SC.Widget.Events.ERROR, (err) => {
        console.error('[music] SoundCloud widget error:', err);
      });
    }

    widget.bind(SC.Widget.Events.READY, () => {
      widget.getSounds((sounds) => {
        console.log('[music] widget READY. tracks loaded:', Array.isArray(sounds) ? sounds.length : 'none');
      });
      widgetReady = true;

      // If we'd queued a play (user clicked while loading) or were playing on
      // the previous page, kick it off now. play() on a fresh playlist auto-
      // selects track 0; calling skip() before play() throws mediaPayload.
      const wasPlaying = localStorage.getItem(MUSIC_KEYS.playing) === 'true';
      if (wasPlaying || pendingPlay) {
        widget.play();
        musicToggle.classList.add('playing');
        pendingPlay = false;
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
      if (musicLabel) musicLabel.textContent = 'Pause';
      musicToggle.setAttribute('aria-label', 'Pause music');
      widget.getCurrentSoundIndex((idx) => {
        if (typeof idx === 'number') cachedIndex = idx;
      });
    });

    widget.bind(SC.Widget.Events.PAUSE, () => {
      localStorage.setItem(MUSIC_KEYS.playing, 'false');
      musicToggle.classList.remove('playing');
      if (musicLabel) musicLabel.textContent = 'Play music';
      musicToggle.setAttribute('aria-label', 'Play our song');
    });

    widget.bind(SC.Widget.Events.FINISH, () => {
      // Track ended; reset position so next track starts from its beginning
      localStorage.setItem(MUSIC_KEYS.position, '0');

      // Loop back to track 1 if we just finished the last track in the playlist
      widget.getCurrentSoundIndex((idx) => {
        widget.getSounds((sounds) => {
          if (typeof idx === 'number' && Array.isArray(sounds) && idx >= sounds.length - 1) {
            widget.skip(0);
            // Skip is async — give it a beat before play() so the new track is queued
            setTimeout(() => widget.play(), 300);
          }
        });
      });
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

// ========================================
// I18N — English ↔ Traditional Chinese (Taiwan)
// English content lives in HTML (default). Chinese is loaded from i18n/zh.json.
// Each translatable element has a data-i18n="dot.path" attribute pointing into
// the JSON. Variants:
//   data-i18n        → replace textContent
//   data-i18n-html   → replace innerHTML (for content with embedded <strong>/<em>)
//   data-i18n-aria   → replace aria-label
//   data-i18n-alt    → replace alt
//   data-i18n-title  → replace title attribute
// ========================================
const I18N_KEY = 'gjyz-lang';
const SUPPORTED_LANGS = ['en', 'zh'];
let zhDict = null;
let currentLang = 'en';
const originalText = new WeakMap();
const originalHtml = new WeakMap();
const originalAttr = new WeakMap();

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function detectInitialLang() {
  const stored = localStorage.getItem(I18N_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  const browser = (navigator.language || '').toLowerCase();
  if (browser.startsWith('zh')) return 'zh';
  return 'en';
}

function applyI18n() {
  const lang = currentLang;

  // textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (!originalText.has(el)) originalText.set(el, el.textContent);
    if (lang === 'en') {
      el.textContent = originalText.get(el);
    } else {
      const value = getNested(zhDict, el.dataset.i18n);
      if (value != null) el.textContent = value;
    }
  });

  // innerHTML
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    if (!originalHtml.has(el)) originalHtml.set(el, el.innerHTML);
    if (lang === 'en') {
      el.innerHTML = originalHtml.get(el);
    } else {
      const value = getNested(zhDict, el.dataset.i18nHtml);
      if (value != null) el.innerHTML = value;
    }
  });

  // attributes (aria-label, alt, title)
  const attrMap = [
    ['data-i18n-aria', 'aria-label', 'i18nAria'],
    ['data-i18n-alt', 'alt', 'i18nAlt'],
    ['data-i18n-title', 'title', 'i18nTitle'],
  ];
  attrMap.forEach(([selector, attr, datasetKey]) => {
    document.querySelectorAll(`[${selector}]`).forEach(el => {
      if (!originalAttr.has(el)) originalAttr.set(el, {});
      const stash = originalAttr.get(el);
      if (!(attr in stash)) stash[attr] = el.getAttribute(attr) || '';
      if (lang === 'en') {
        el.setAttribute(attr, stash[attr]);
      } else {
        const value = getNested(zhDict, el.dataset[datasetKey]);
        if (value != null) el.setAttribute(attr, value);
      }
    });
  });

  // <html lang="">
  document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';

  // Sync the single language switch — its label shows the OTHER language
  // (clicking it flips to that language).
  const otherLabel = lang === 'zh' ? 'EN' : '中文';
  document.querySelectorAll('.lang-switch-label').forEach(el => {
    el.textContent = otherLabel;
  });
  document.querySelectorAll('.lang-switch').forEach(btn => {
    btn.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切換為中文');
  });
}

// Expose for the SPA router to call after page swap
window.__applyI18n = applyI18n;

// Expose a lookup helper for runtime strings (e.g. dynamic modal content).
// Returns the Chinese value when ZH is active and the key exists; null otherwise
// (caller falls back to English value carried in the DOM/data attributes).
window.__i18nLookup = function(key) {
  if (currentLang !== 'zh' || !zhDict || !key) return null;
  return getNested(zhDict, key);
};

async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  if (lang === 'zh' && !zhDict) {
    try {
      const res = await fetch('i18n/zh.json');
      if (!res.ok) throw new Error('Failed to load zh.json');
      zhDict = await res.json();
    } catch (err) {
      console.error('i18n load failed', err);
      return;
    }
  }
  currentLang = lang;
  localStorage.setItem(I18N_KEY, lang);
  applyI18n();
}

async function initI18n() {
  const initial = detectInitialLang();

  // Wire up the single language switch (delegated, so it survives SPA nav).
  // Clicking always flips to the OTHER language.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-switch');
    if (!btn) return;
    e.preventDefault();
    setLang(currentLang === 'zh' ? 'en' : 'zh');
  });

  // Apply initial language
  if (initial === 'zh') {
    await setLang('zh');
  } else {
    currentLang = 'en';
    applyI18n();
  }
}
