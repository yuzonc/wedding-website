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

  // --- Mobile menu toggle ---
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (navToggle && navMenu) {
    // Remove old listeners by cloning
    const newToggle = navToggle.cloneNode(true);
    navToggle.parentNode.replaceChild(newToggle, navToggle);
    newToggle.addEventListener('click', () => {
      newToggle.classList.toggle('active');
      navMenu.classList.toggle('open');
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

  // --- Video autoplay on scroll ---
  const videos = document.querySelectorAll('.autoplay-video');
  if (videos.length && 'IntersectionObserver' in window) {
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

  // --- Hero parallax ---
  const hero = document.querySelector('.hero');
  if (hero) {
    const heroHeight = hero.offsetHeight;
    function parallaxHero() {
      if (window.scrollY < heroHeight) {
        hero.style.setProperty('--parallax-y', `${window.scrollY * 0.25}px`);
      }
    }
    window.addEventListener('scroll', parallaxHero, { passive: true });
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
// Stays alive across page transitions
// ========================================
function initMusic() {
  const musicFloat = document.getElementById('music-float');
  const musicToggle = document.getElementById('music-toggle');

  if (musicFloat && musicToggle) {
    musicToggle.addEventListener('click', () => {
      musicFloat.classList.toggle('open');
      musicToggle.classList.toggle('playing');
      const label = document.getElementById('music-label');
      if (label) {
        label.textContent = musicFloat.classList.contains('open') ? 'Close' : 'Play our song';
      }
    });
  }
}
