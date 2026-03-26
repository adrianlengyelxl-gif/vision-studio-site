/* ═══════════════════════════════════════════════════════
   VISION STUDIO — PERFORMANCE ENGINE v1
   Video Viewport Management · Mobile CTA · Resource Hints
   ═══════════════════════════════════════════════════════ */
'use strict';

/* ── VIDEO VIEWPORT MANAGER ───────────────────────────────
   Pauses Vimeo iframes when off-screen to save CPU/GPU.
   Resumes when back in viewport. Prevents multiple
   background videos playing simultaneously.
   ────────────────────────────────────────────────────── */
(function VideoViewportManager() {

  /* Track all active background video iframes */
  const bgVideos = new Map(); // iframe el → { src, loaded }

  function postVimeoCommand(iframe, action) {
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ method: action }),
        'https://player.vimeo.com'
      );
    } catch (e) { /* cross-origin — expected, silently ignore */ }
  }

  function observeVideo(iframe) {
    if (bgVideos.has(iframe)) return;
    bgVideos.set(iframe, { loaded: iframe.src !== '' });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          /* Resume — only if src is set */
          if (iframe.src && iframe.src !== 'about:blank') {
            postVimeoCommand(iframe, 'play');
          }
        } else {
          /* Pause when fully off-screen */
          postVimeoCommand(iframe, 'pause');
        }
      });
    }, { threshold: 0.05 });

    io.observe(iframe);
  }

  /* Observe hero Vimeo background (always present) */
  window.addEventListener('load', () => {
    const heroVimeo = document.querySelector('.hero-vimeo');
    if (heroVimeo) observeVideo(heroVimeo);

    /* Observe showreel when it gets its src (lazy loaded) */
    const showreelIframe = document.querySelector('#showreel-iframe');
    if (showreelIframe) {
      observeVideo(showreelIframe);

      /* Also watch for src change via MutationObserver */
      const mo = new MutationObserver(() => {
        if (showreelIframe.src && showreelIframe.src !== 'about:blank') {
          observeVideo(showreelIframe);
        }
      });
      mo.observe(showreelIframe, { attributes: true, attributeFilter: ['src'] });
    }
  });

  /* Expose for external use */
  window.VS_videoManager = { observeVideo };

}());


/* ── MULTIPLE VIDEO PREVENTION ────────────────────────────
   When a portfolio hover-preview starts, pause all other
   playing Vimeo preview iframes to prevent audio leaks
   and CPU overload.
   ────────────────────────────────────────────────────── */
(function PreventMultipleVideos() {

  /* Delegate on the portfolio grid via event bubbling */
  document.addEventListener('mouseenter', (e) => {
    const card = e.target && e.target.closest ? e.target.closest('.pf-card, .hs-slide') : null;
    if (!card) return;

    /* Pause all OTHER active preview iframes */
    document.querySelectorAll('.pf-vimeo-preview.playing, .hs-vimeo.hs-vimeo--on').forEach(iframe => {
      const parentCard = iframe.closest('.pf-card, .hs-slide');
      if (parentCard && parentCard !== card) {
        /* Remove from DOM immediately — cleanest stop */
        iframe.src = '';
        iframe.remove();
        if (parentCard.classList.contains('preview-playing')) {
          parentCard.classList.remove('preview-playing');
        }
        if (parentCard.classList.contains('hs-slide--playing')) {
          parentCard.classList.remove('hs-slide--playing');
        }
      }
    });
  }, { capture: true, passive: true });

}());


/* ── MOBILE STICKY CTA BAR ────────────────────────────────
   Appears only on mobile. Fixed bottom bar with
   "Hívás" (left) and "Ajánlatkérés" (right).
   Hidden when nav mobile menu is open.
   Hides when user is in the footer zone.
   ────────────────────────────────────────────────────── */
(function MobileCTABar() {

  /* Only inject on mobile */
  if (window.matchMedia('(min-width: 768px)').matches) return;

  const bar = document.createElement('div');
  bar.id = 'vs-mobile-cta';
  bar.setAttribute('aria-label', 'Gyors kapcsolatfelvétel');
  bar.innerHTML = `
    <a href="tel:+36303462267" class="vs-mcta-btn vs-mcta-call" aria-label="Hívás">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 9.87a19.79 19.79 0 01-3-8.55A2 2 0 012.48 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.94a16 16 0 006.29 6.29l1.3-1.3a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
      <span>Hívás</span>
    </a>
    <div class="vs-mcta-divider" aria-hidden="true"></div>
    <a href="/contact.html" class="vs-mcta-btn vs-mcta-quote" aria-label="Ajánlatkérés">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <span>Ajánlatkérés</span>
    </a>
  `;
  document.body.appendChild(bar);

  /* Hide when mobile nav is open */
  const burger = document.querySelector('.nav-burger');
  if (burger) {
    const observer = new MutationObserver(() => {
      const menuOpen = document.querySelector('.nav-menu.nav-open');
      bar.style.transform = menuOpen ? 'translateY(100%)' : '';
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  /* Hide when footer is visible (don't overlay contact info) */
  const footer = document.querySelector('footer');
  if (footer) {
    const footerIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        bar.style.opacity = e.isIntersecting ? '0' : '1';
        bar.style.pointerEvents = e.isIntersecting ? 'none' : '';
      });
    }, { threshold: 0.1 });
    footerIO.observe(footer);
  }

  /* Show bar after slight delay for cinematic entrance */
  setTimeout(() => {
    bar.classList.add('vs-mcta-visible');
  }, 1200);

}());


/* ── RESOURCE PERFORMANCE HINTS ───────────────────────────
   Preconnect to Vimeo at runtime for faster iframe loads.
   ────────────────────────────────────────────────────── */
(function addResourceHints() {
  const origins = [
    'https://player.vimeo.com',
    'https://i.vimeocdn.com',
    'https://f.vimeocdn.com',
  ];

  origins.forEach(origin => {
    if (document.querySelector(`link[href="${origin}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}());


/* ── IMAGE LAZY LOAD OBSERVER (ENHANCED) ─────────────────
   Fade-in on load for all lazy images.
   Adds IntersectionObserver-driven src swap for
   any [data-src] images (progressive enhancement).
   ────────────────────────────────────────────────────── */
(function enhancedLazyImages() {

  /* Fade-in native lazy images */
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (img.complete) {
      img.classList.add('img-loaded');
    } else {
      img.addEventListener('load',  () => img.classList.add('img-loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('img-loaded'), { once: true });
    }
  });

  /* data-src swap for manually deferred images */
  const lazyImgs = document.querySelectorAll('img[data-src]');
  if (!lazyImgs.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      img.src = img.dataset.src;
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
      io.unobserve(img);
    });
  }, { rootMargin: '200px 0px' });

  lazyImgs.forEach(img => io.observe(img));

}());


/* ── SCROLL PERFORMANCE: will-change cleanup ──────────────
   Remove will-change from animated elements after their
   animation completes to free compositor layers.
   ────────────────────────────────────────────────────── */
(function cleanWillChange() {
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.querySelectorAll('[style*="will-change"]').forEach(el => {
        /* Only clear after animations are done — keep for active animated els */
        const anim = el.style.animation || window.getComputedStyle(el).animation;
        if (!anim || anim === 'none') {
          el.style.willChange = 'auto';
        }
      });
    }, 4000);
  });
}());
