/* ═══════════════════════════════════════════════════════
   VISION STUDIO — MASTER JS ENGINE v3
   GSAP · ScrollTrigger · Custom Cursor · Video Modal
   Smooth FAQ · Active Nav · Burger X · Counter Animation
   ═══════════════════════════════════════════════════════ */
'use strict';

/* ── PROJECT DATA ── */
/* ── PROJECT DATA — szerkeszd: data/projects.js ────────────────
   A PROJECTS tömb most a data/projects.js fájlból töltődik.
   Közvetlen szerkesztéshez használd az admin.html-t,
   vagy nyisd meg a data/projects.js fájlt bármilyen szövegszerkesztőben.
   ─────────────────────────────────────────────────────────────── */
/* ── UTILITY ── */
const qs  = (s, ctx=document) => ctx ? ctx.querySelector(s) : null;
const qsa = (s, ctx=document) => ctx ? [...ctx.querySelectorAll(s)] : [];
const lerp = (a, b, t) => a + (b - a) * t;

/* ── LOADING SCREEN ── */
class Loader {
  constructor() {
    this.el   = qs('#loader');
    if (!this.el) return;
    this.fill    = qs('.loader-fill', this.el);
    this.pct     = qs('.loader-pct',  this.el);
    this.logo    = qsa('.loader-logo span', this.el);
    this.sub     = qs('.loader-sub',  this.el);
    this.val     = 0;
    this._exited = false;

    // FIX 1: Hard safety timeout — loader ALWAYS exits within 6 seconds
    // regardless of rAF pauses (backgrounded tab), GSAP failures, or any
    // downstream error that might have blocked the normal tick→exit path.
    this._safetyTimer = setTimeout(() => this._forceExit(), 6000);

    this.run();
  }

  run() {
    if (typeof gsap !== 'undefined') {
      gsap.to(this.logo, { y: 0, stagger: .06, duration: .9, ease: 'power4.out', delay: .2 });
      gsap.to(this.sub,  { opacity: 1, delay: .8, duration: .6 });
    }
    const tick = () => {
      this.val = Math.min(this.val + Math.random() * 4.5 + .5, 100);
      if (this.fill) this.fill.style.width = this.val + '%';
      if (this.pct)  this.pct.textContent  = Math.floor(this.val) + '%';
      if (this.val < 100) requestAnimationFrame(tick);
      else this.exit();
    };
    setTimeout(tick, 400);
  }

  exit() {
    // FIX 2: Guard against double-exit (safety timer + normal path racing)
    if (this._exited) return;
    this._exited = true;
    clearTimeout(this._safetyTimer);

    if (typeof gsap === 'undefined') {
      this._forceExit();
      return;
    }

    // FIX 3: Wrap GSAP animation in try/catch so a GSAP internal error
    // (e.g. clipPath unsupported, tween failure) cannot leave the loader
    // permanently visible. A setTimeout backup fires after the animation
    // duration + buffer, guaranteeing onComplete always runs.
    try {
      const backupTimer = setTimeout(() => this._forceExit(), 1800);
      gsap.to(this.el, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 1.1, ease: 'power4.inOut', delay: .3,
        onComplete: () => {
          clearTimeout(backupTimer);
          this._forceExit();
        }
      });
    } catch (e) {
      this._forceExit();
    }
  }

  _forceExit() {
    if (this.el) this.el.style.display = 'none';
    document.body.style.overflow = '';
  }
}

/* ── CUSTOM CURSOR ── */
class Cursor {
  constructor() {
    /* Skip entirely on touch/pointer-coarse devices — no hover cursor needed */
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    this.dot  = qs('#cur-dot');
    this.ring = qs('#cur-ring');
    if (!this.dot) return;
    this._alive = true; /* rAF cancellation flag */
    this.mx = 0; this.my = 0;
    this.rx = 0; this.ry = 0;
    this.bind();
    this.loop();
  }
  bind() {
    document.addEventListener('mousemove', e => {
      this.mx = e.clientX; this.my = e.clientY;
    }, { passive: true });
    qsa('a, button, [data-hover], .pf-pill, .faq-q, .modal-x').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
    });
    /* pf-card cursor via event delegation (cards are built dynamically by Portfolio.build()) */
    document.addEventListener('mouseenter', e => {
      const card = e.target.closest?.('.pf-card, [data-video]');
      if (card) {
        document.body.classList.remove('cur-hover');
        document.body.classList.add('cur-video');
      }
    }, { capture: true, passive: true });
    document.addEventListener('mouseleave', e => {
      const card = e.target.closest?.('.pf-card, [data-video]');
      if (card) document.body.classList.remove('cur-video');
    }, { capture: true, passive: true });
  }
  loop() {
    if (!this._alive) return; /* stop rAF chain if destroyed */
    this.rx = lerp(this.rx, this.mx, .09);
    this.ry = lerp(this.ry, this.my, .09);
    if (this.dot)  { this.dot.style.left  = this.mx + 'px'; this.dot.style.top  = this.my + 'px'; }
    if (this.ring) { this.ring.style.left = this.rx + 'px'; this.ring.style.top = this.ry + 'px'; }
    requestAnimationFrame(() => this.loop());
  }
}

/* ── NAV ── */
class Nav {
  constructor() {
    this.nav    = qs('#nav');
    if (!this.nav) return;
    this.burger = qs('.nav-burger', this.nav);
    this.menu   = qs('.nav-menu',   this.nav);
    this._lastY = 0;
    this._hidden = false;

    // Scroll: add solid class + hide nav on scroll down, show on scroll up
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      this.nav.classList.toggle('solid', y > 60);

      // Hide nav on scroll down (after 200px), reveal on scroll up
      if (y > 200) {
        if (y > this._lastY + 6 && !this._hidden) {
          this.nav.style.transform = 'translateY(-100%)';
          this._hidden = true;
        } else if (y < this._lastY - 4 && this._hidden) {
          this.nav.style.transform = 'translateY(0)';
          this._hidden = false;
        }
      } else {
        this.nav.style.transform = 'translateY(0)';
        this._hidden = false;
      }
      this._lastY = y;
    }, { passive: true });

    // Ensure nav has smooth transform transition
    this.nav.style.transition = 'background .5s var(--ease-film),backdrop-filter .5s,transform .45s var(--ease-out)';

    // Burger toggle with X animation
    if (this.burger && this.menu) {
      this.burger.addEventListener('click', () => {
        const open = this.menu.classList.toggle('nav-open');
        this.burger.classList.toggle('is-open', open);
        this.burger.setAttribute('aria-expanded', open);
        document.body.style.overflow = open ? 'hidden' : '';
        /* FIX: any inline transform on #nav creates a containing block for
           position:fixed children — the overlay only covers nav height, not
           the full viewport. Clear it when the menu opens so the overlay
           uses the viewport as its containing block (correct behaviour). */
        if (open) this.nav.style.transform = '';
      });
    }

    // Close on link click
    qsa('a', this.menu).forEach(a => {
      a.addEventListener('click', () => this.closeMenu());
    });

    // Close mobile menu on ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.menu && this.menu.classList.contains('nav-open')) {
        this.closeMenu();
      }
    });

    // Active nav highlight based on current URL
    this.setActive();
  }

  closeMenu() {
    if (!this.menu) return;
    this.menu.classList.remove('nav-open');
    if (this.burger) {
      this.burger.classList.remove('is-open');
      this.burger.setAttribute('aria-expanded', 'false');
      /* Return focus to burger button after menu closes (WCAG 2.1) */
      this.burger.focus();
    }
    document.body.style.overflow = '';
  }

  setActive() {
    /* Nav active state is owned by vs-final.js setNavActive() which runs
       at DOMContentLoaded and properly removes stale active classes first.
       This stub prevents duplicate/conflicting active class additions. */
  }
}

/* ── HERO ANIMATION ── */
function heroAnim() {
  if (typeof gsap === 'undefined') return;
  /* Only run on pages that actually have hero elements */
  if (!document.querySelector('.eyebrow-line') && !document.querySelector('.hero-h1')) return;
  const delay = document.body.classList.contains('no-loader') ? 0.2 : 2.1;
  const tl = gsap.timeline({ delay });
  if (document.querySelector('.eyebrow-line'))
    tl.to('.eyebrow-line', { scaleX: 1, duration: .8, ease: 'power4.out' });
  if (document.querySelector('.eyebrow-txt'))
    tl.to('.eyebrow-txt',  { opacity: 1, x: 0, duration: .7, ease: 'power3.out' }, '-=.4');
  if (document.querySelector('.hero-h1 .word'))
    tl.to('.hero-h1 .word',{ y: 0, stagger: .09, duration: 1, ease: 'power4.out' }, '-=.3');
  if (document.querySelector('.hero-sub'))
    tl.to('.hero-sub',     { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, '-=.5');
  if (document.querySelector('.hero-ctas'))
    tl.to('.hero-ctas',    { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, '-=.5');
  if (document.querySelector('.hero-stats .h-stat'))
    tl.to('.hero-stats .h-stat', { opacity: 1, y: 0, stagger: .1, duration: .7, ease: 'power3.out' }, '-=.5');
  if (document.querySelector('.hero-scroll'))
    tl.to('.hero-scroll',  { opacity: 1, duration: .6 }, '-=.2');
}

/* ── SCROLL REVEAL (IntersectionObserver) ── */
/* upgradeScrollReveal() in v19 runs earlier (IIFE) and handles [data-reveal].
   This function is kept for structural compatibility but skips elements already
   being observed by the upgrade pass (already have a pending or completed reveal). */
function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el  = e.target;
      const del = el.dataset.delay || 0;
      el.style.transitionDelay = del + 'ms';
      el.classList.add('in');
      io.unobserve(el);
    });
  }, { threshold: .12 });
  /* Only observe elements NOT yet picked up by upgradeScrollReveal */
  qsa('[data-reveal]').forEach(el => {
    if (!el.classList.contains('in') && !el.dataset.revealObserved) {
      el.dataset.revealObserved = '1';
      io.observe(el);
    }
  });
}

/* ── ANIMATED COUNTERS ── */
function initCounters() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el     = e.target;
      /* Skip if already handled by initStatsCounters (data-counter-wrap parent) */
      if (el.closest('[data-counter-wrap]')) { io.unobserve(el); return; }
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      let start = 0;
      const dur = 1800;
      const step = timestamp => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / dur, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + (Number.isInteger(target) ? Math.floor(ease * target) : (ease * target).toFixed(1)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: .5 });
  qsa('[data-counter]').forEach(el => io.observe(el));
}

/* ── VIDEO MODAL ── */
class Modal {
  constructor() {
    this.el     = qs('#modal');
    this.iframe = qs('#modal-iframe');
    this.title  = qs('.modal-title');
    this.tag    = qs('.modal-project-tag');
    this.stats  = qsa('.modal-stat-v');
    this.labels = qsa('.modal-stat-l');
    if (!this.el) return;

    // FIX 5: qs() can return null if .modal-back or .modal-x are absent from
    // the page's HTML. Calling .addEventListener() on null throws a TypeError
    // that propagates out of the constructor and halts the entire init chain —
    // which can block the loader from ever receiving its exit signal.
    const backBtn = qs('.modal-back', this.el);
    const closeBtn = qs('.modal-x',   this.el);
    if (backBtn)  backBtn.addEventListener('click',  () => this.close());
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  }
  open(project) {
    if (!this.el) return;
    if (this.title) this.title.textContent = project.title;
    if (this.tag)   this.tag.textContent   = `${project.tag} · ${project.client}`;
    const statData = [project.client, project.year, project.dur, project.tag];
    const statLbls = ['Ügyfél', 'Év', 'Hossz', 'Kategória'];
    this.stats.forEach((s, i)  => { if (statData[i]) s.textContent = statData[i]; });
    this.labels.forEach((l, i) => { if (statLbls[i]) l.textContent = statLbls[i]; });
    const src = project.type === 'yt'
      ? `https://www.youtube.com/embed/${project.vid}?autoplay=1&rel=0&modestbranding=1&color=white`
      : `https://player.vimeo.com/video/${project.vid}?autoplay=1&color=c8a85a`;
    if (this.iframe) this.iframe.src = src;
    // Detail link — owned by portfolio-engine.js (VS_Engine.Modal).
    // main.js only injects if engine is NOT present, preventing duplicates.
    if (typeof window.VS_Engine === 'undefined') {
      const existingLink = this.el.querySelector('.modal-detail-link');
      if (existingLink) existingLink.remove();
      const detailHref = project.id === 'hell-energy-ai'
        ? 'case-studies/hell-energy-launch-campaign.html'
        : `portfolio/${project.id}.html`;
      const detailLabel = project.id === 'hell-energy-ai' ? 'Teljes case study →' : 'Projekt részletei →';
      const linkEl = document.createElement('a');
      linkEl.className = 'modal-detail-link';
      linkEl.href = detailHref;
      linkEl.innerHTML = '<span style="display:inline-flex;align-items:center;justify-content:center;gap:8px">' + detailLabel + '<svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M1 5H15M10 1L15 5L10 9" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      linkEl.style.cssText = 'display:flex;align-items:center;justify-content:center;text-align:center;padding:18px 24px;margin:16px 20px 20px;font-family:var(--ff-mono);font-size:13px;letter-spacing:.2em;color:#000;background:var(--c-gold);text-decoration:none;text-transform:uppercase;font-weight:700;border-radius:2px;box-shadow:0 4px 24px rgba(200,168,90,.45);transition:all .2s;border:2px solid var(--c-gold)';
      linkEl.onmouseover = () => { linkEl.style.background = '#e8c96a'; linkEl.style.boxShadow = '0 6px 32px rgba(200,168,90,.7)'; linkEl.style.transform = 'translateY(-1px)'; };
      linkEl.onmouseout  = () => { linkEl.style.background = 'var(--c-gold)'; linkEl.style.boxShadow = '0 4px 24px rgba(200,168,90,.45)'; linkEl.style.transform = 'translateY(0)'; };
      const modalInner = this.el.querySelector('.modal-inner');
      if (modalInner) modalInner.appendChild(linkEl);
    }
    document.body.style.overflow = 'hidden';
    this.el.classList.add('open');
    // Focus trap
    setTimeout(() => { const x = qs('.modal-x', this.el); if (x) x.focus(); }, 50);
  }
  close() {
    if (!this.el) return;
    this.el.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (this.iframe) this.iframe.src = ''; }, 600);
  }
}

/* ── PORTFOLIO GRID BUILDER ── */
class Portfolio {
  constructor(modal) {
    this.grid   = qs('#pf-grid');
    this.modal  = modal;
    this.active = 'all';
    if (!this.grid) return;
    this.build();
    this.initFilter();
    this.initParallax();
    this.initLazyReveal();
  }

  build() {
    if (typeof PROJECTS === 'undefined' || !Array.isArray(PROJECTS) || !PROJECTS.length) {
      /* data/projects.js failed to load or is empty — bail gracefully */
      this.grid.innerHTML = '<p style="color:var(--c-mid);padding:40px;text-align:center">Projektek betöltése sikertelen.</p>';
      return;
    }
    this.grid.innerHTML = '';
    /* Category canonical display labels for task 8 */
    const catLabels = {
      'commercial': 'Commercial',
      'hotel':      'Brand Film',
      'restaurant': 'Brand Film',
      'corporate':  'Corporate',
      'social':     'Social'
    };
    PROJECTS.forEach(p => {
      const wrap = document.createElement('div');
      wrap.className = 'pf-item';
      wrap.dataset.cat = p.cat;
      const catBadge = catLabels[p.cat] || 'Brand Film';
      wrap.innerHTML = `
        <div class="pf-card${p.thumb ? ' has-thumb' : ''}" data-video tabindex="0" role="button" aria-label="${p.title} — lejátszás" data-id="${p.id}" data-vimeo-preview="${p.vid}">
          <div class="pf-thumb-img" aria-hidden="true">${this.thumb(p)}</div>
          <div class="pf-dark-veil" aria-hidden="true"></div>
          <div class="pf-scanline" aria-hidden="true"></div>
          <div class="pf-top" aria-hidden="true">
            <span class="pf-tag">${catBadge}</span>
            <span class="pf-dur">${p.dur}</span>
          </div>
          <div class="pf-play-btn" aria-hidden="true">
            <div class="play-ring-lg"><div class="tri"></div></div>
          </div>
          <div class="pf-title-overlay" aria-hidden="true">
            <div class="pf-overlay-client">${p.client}</div>
            <div class="pf-overlay-title">${p.title}</div>
          </div>
          <div class="pf-info">
            <div class="pf-client">${p.client}</div>
            <h3 class="pf-title">${p.title}</h3>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:4px">
              <span class="pf-cta">Videó megtekintése <svg width="14" height="9" viewBox="0 0 14 9" fill="none"><path d="M1 4.5H13M9 .5L13 4.5L9 8.5" stroke="#c8a85a" stroke-width="1.2" stroke-linecap="round"/></svg></span>
              ${p.id === 'hell-energy-ai'
                ? `<a href="case-studies/hell-energy-launch-campaign.html" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:6px;font-family:var(--ff-mono);font-size:11px;letter-spacing:.15em;color:#000;background:var(--c-gold);text-decoration:none;text-transform:uppercase;font-weight:700;padding:8px 16px;border-radius:2px;box-shadow:0 3px 16px rgba(200,168,90,.5);transition:all .2s;white-space:nowrap" onmouseover="this.style.background='#e8c96a';this.style.boxShadow='0 5px 24px rgba(200,168,90,.7)';this.style.transform='translateY(-1px)'" onmouseout="this.style.background='var(--c-gold)';this.style.boxShadow='0 3px 16px rgba(200,168,90,.5)';this.style.transform='translateY(0)'">Case Study <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 4H11M7.5 1L11 4L7.5 7" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`
                : `<a href="portfolio/${p.id}.html" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:6px;font-family:var(--ff-mono);font-size:11px;letter-spacing:.15em;color:#000;background:var(--c-gold);text-decoration:none;text-transform:uppercase;font-weight:700;padding:8px 16px;border-radius:2px;box-shadow:0 3px 16px rgba(200,168,90,.5);transition:all .2s;white-space:nowrap" onmouseover="this.style.background='#e8c96a';this.style.boxShadow='0 5px 24px rgba(200,168,90,.7)';this.style.transform='translateY(-1px)'" onmouseout="this.style.background='var(--c-gold)';this.style.boxShadow='0 3px 16px rgba(200,168,90,.5)';this.style.transform='translateY(0)'">Projekt részletei <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 4H11M7.5 1L11 4L7.5 7" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`
              }
            </div>
          </div>
        </div>`;
      const card = qs('.pf-card', wrap);
      card.addEventListener('click',   () => this.modal.open(p));
      card.addEventListener('keydown', e  => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.modal.open(p); } });
      this.grid.appendChild(wrap);
    });
    const cnt = qs('.pf-count');
    if (cnt) cnt.textContent = PROJECTS.length + ' projekt';
  }

  thumb(p) {
    const svgFallback = `<div style="display:none;position:absolute;inset:0">${this._svgThumb(p)}</div>`;
    const showFallback = `this.style.display='none';this.nextElementSibling.style.display='block'`;
    /* ── Priority 1: explicit thumbnail URL from data/projects.js ── */
    if (p.thumb && p.thumb.trim()) {
      return `<img src="${p.thumb}" alt="${p.client}"
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;"
        loading="eager"
        onerror="${showFallback}">
        ${svgFallback}`;
    }
    /* ── Priority 2: Vimeo auto-thumbnail via vumbnail ── */
    if (p.vid) {
      const vimeoId = String(p.vid).replace(/.*vimeo\.com\/(video\/)?/, '').replace(/[^0-9].*/, '');
      if (vimeoId) {
        return `<img src="https://vumbnail.com/${vimeoId}.jpg" alt="${p.client}"
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"
          loading="lazy"
          onerror="${showFallback}">
          ${svgFallback}`;
      }
    }
    /* ── Priority 3: SVG placeholder ── */
    return this._svgThumb(p);
  }

  _svgThumb(p) {
    const c = p.accentCol || '#c8a85a';
    /* High-contrast SVG — visible even through the brightness(.55) filter on pf-thumb-img */
    return `<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%">
      <defs><radialGradient id="rg_${p.id}" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="${c}" stop-opacity=".55"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
      <rect width="800" height="500" fill="#1c1c1c"/>
      <ellipse cx="400" cy="220" rx="300" ry="220" fill="url(#rg_${p.id})"/>
      <rect x="260" y="170" width="280" height="160" rx="2" fill="${c}18" stroke="${c}55" stroke-width="1.5"/>
      <circle cx="400" cy="250" r="65" fill="none" stroke="${c}55" stroke-width="1.5"/>
      <circle cx="400" cy="250" r="40" fill="${c}22"/>
      <path d="M390 238L418 250L390 262Z" fill="${c}ee"/>
      <rect x="0" y="0" width="800" height="38" fill="rgba(0,0,0,.7)"/>
      <rect x="0" y="462" width="800" height="38" fill="rgba(0,0,0,.7)"/>
      <text x="18" y="24" font-family="monospace" font-size="10" fill="${c}cc" letter-spacing="3">REC ●</text>
      <text x="700" y="24" font-family="monospace" font-size="10" fill="${c}99" letter-spacing="2">4K</text>
      <text x="18" y="480" font-family="monospace" font-size="9" fill="${c}bb" letter-spacing="2">${p.client.toUpperCase()}</text>
      <text x="680" y="480" font-family="monospace" font-size="9" fill="${c}88" letter-spacing="2">${p.dur}</text>
    </svg>`;
  }

  initFilter() {
    qsa('.pf-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        qsa('.pf-pill').forEach(p => p.classList.remove('on'));
        pill.classList.add('on');
        this.filter(pill.dataset.cat);
      });
    });
  }

  filter(cat) {
    this.active = cat;
    let visible = 0;
    qsa('.pf-item', this.grid).forEach((item, i) => {
      const match = cat === 'all' || item.dataset.cat === cat;
      if (match) {
        visible++;
        item.style.display = '';
        if (typeof gsap !== 'undefined')
          gsap.fromTo(item, { opacity:0, y:22, scale:.97 }, { opacity:1, y:0, scale:1, duration:.5, delay:visible*.07, ease:'power3.out' });
      } else {
        if (typeof gsap !== 'undefined')
          gsap.to(item, { opacity:0, scale:.96, duration:.3, ease:'power2.in', onComplete:()=>{ item.style.display='none'; } });
        else item.style.display = 'none';
      }
    });
    const cnt = qs('.pf-count');
    if (cnt) cnt.textContent = visible + ' projekt';
  }

  initParallax() {
    if (typeof gsap === 'undefined' || !gsap.ScrollTrigger) return;
    qsa('.pf-card', this.grid).forEach(card => {
      const inner = qs('.pf-thumb-img', card);
      if (!inner) return;
      gsap.to(inner, {
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 1.5 },
        y: '8%', ease: 'none'
      });
    });
  }

  initLazyReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        const item = e.target;
        if (typeof gsap !== 'undefined')
          gsap.fromTo(item, { opacity:0, y:28 }, { opacity:1, y:0, duration:.7, delay: i * .05, ease:'power3.out' });
        else item.style.opacity = '1';
        io.unobserve(item);
      });
    }, { threshold: .08 });
    qsa('.pf-item', this.grid).forEach(el => { el.style.opacity = '0'; io.observe(el); });
  }
}

/* ── GSAP SCROLL ANIMATIONS ── */
function initGSAP() {
  // FIX 6: The original guard checked gsap.ScrollTrigger (the property GSAP sets
  // after registration) but then passed the bare `ScrollTrigger` identifier to
  // registerPlugin(). If the ScrollTrigger CDN script failed to load, `ScrollTrigger`
  // is an undeclared variable and causes a ReferenceError in strict mode, which
  // propagates up and can interrupt the init chain. Guard with typeof instead.
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Section titles
  qsa('.sec-title').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      y: 50, opacity: 0, duration: 1.1, ease: 'power4.out'
    });
  });

  // Service cards — only on pages that have them
  if (document.querySelector('.srv-grid')) {
    gsap.from('.srv-card', {
      scrollTrigger: { trigger: '.srv-grid', start: 'top 82%' },
      y: 40, opacity: 0, stagger: .12, duration: .9, ease: 'power3.out'
    });
  }

  // Stat cells — skipped on portfolio page (initPfStatsAnim handles it there)
  if (!document.getElementById('pf-stats') && document.querySelector('.stats-row')) {
    gsap.from('.stat-cell', {
      scrollTrigger: { trigger: '.stats-row', start: 'top 85%' },
      y: 30, opacity: 0, stagger: .1, duration: .8, ease: 'power3.out'
    });
  }

  // Testimonials — animation handled by initFeatureGrids (CSS transition stagger)

  // Process steps — only on pages that have them
  if (document.querySelector('.proc-grid')) {
    gsap.from('.proc-step', {
      scrollTrigger: { trigger: '.proc-grid', start: 'top 82%' },
      y: 36, opacity: 0, stagger: .14, duration: .9, ease: 'power3.out'
    });
  }

  // Blog cards — only on pages that have them
  if (document.querySelector('.blog-grid')) {
    gsap.from('.blog-card', {
      scrollTrigger: { trigger: '.blog-grid', start: 'top 82%' },
      y: 30, opacity: 0, stagger: .1, duration: .8, ease: 'power3.out'
    });
  }

  // Discipline items stagger reveal (replaced marquee)
  const disciplineItems = qsa('.discipline-item');
  if (disciplineItems.length) {
    gsap.from(disciplineItems, {
      scrollTrigger: { trigger: '.discipline-grid', start: 'top 88%' },
      y: 20, opacity: 0, stagger: .08, duration: .8, ease: 'power3.out'
    });
  }

  // Logo cells
  const logoCells = qsa('.logo-cell');
  if (logoCells.length) {
    gsap.from(logoCells, {
      scrollTrigger: { trigger: '.logos-grid', start: 'top 85%' },
      y: 24, opacity: 0, stagger: .06, duration: .7, ease: 'power3.out'
    });
  }

  // CTA title
  const ctaTitle = qs('.cta-title');
  if (ctaTitle) {
    gsap.from(ctaTitle, {
      scrollTrigger: { trigger: ctaTitle, start: 'top 85%' },
      y: 40, opacity: 0, duration: 1.1, ease: 'power4.out'
    });
  }

  // About visual parallax
  const aboutVis = qs('.about-visual');
  if (aboutVis) {
    gsap.to(aboutVis, {
      scrollTrigger: { trigger: aboutVis, scrub: 1.5 },
      y: '-6%', ease: 'none'
    });
  }

  // Hero stats fade-up on load — only if present on this page
  if (document.querySelector('.h-stat')) {
    gsap.set('.h-stat', { opacity: 0, y: 12 });
  }
}

/* ── PORTFOLIO STATS ANIMATION ── */
/* Cinematic count-up + staggered entrance for the #pf-stats bar
   on portfolio.html. GSAP ScrollTrigger drives both the fade-in
   and the number odometer — they stay perfectly in sync.        */
function initPfStatsAnim() {
  var wrap = document.getElementById('pf-stats');
  if (!wrap) return;

  var cells = wrap.querySelectorAll('.stat-cell');
  var nums  = wrap.querySelectorAll('.stat-n[data-counter]');
  if (!cells.length) return;

  /* ── Shared count-up engine ── */
  function runCounter(el) {
    var target  = parseFloat(el.dataset.target) || 0;
    var suffix  = el.dataset.suffix  || '';
    var prefix  = el.dataset.prefix  || '';
    var dur     = target >= 500 ? 2400 : 1600;
    var startTs = null;
    var isInt   = Number.isInteger(target);

    function easeOutExpo(t) {
      return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }
    function tick(ts) {
      if (!startTs) startTs = ts;
      var progress = Math.min((ts - startTs) / dur, 1);
      var val = isInt
        ? Math.floor(easeOutExpo(progress) * target)
        : (easeOutExpo(progress) * target).toFixed(1);
      el.textContent = prefix + val + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ── GSAP path — synced entrance + count-up ── */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {

    gsap.set(cells, { opacity: 0, y: 36 });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: 'top 84%',
        once: true
      }
    });

    tl.to(cells, {
      opacity: 1,
      y: 0,
      stagger: 0.14,
      duration: 1.0,
      ease: 'power4.out'
    });

    /* Start each counter in sync with its cell's entrance stagger */
    nums.forEach(function(el, i) {
      tl.add(function() { runCounter(el); }, i * 0.14);
    });

  } else {
    /* ── IntersectionObserver fallback (no GSAP) ── */
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        cells.forEach(function(cell, i) {
          setTimeout(function() {
            cell.style.transition = 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)';
            cell.style.opacity    = '1';
            cell.style.transform  = 'translateY(0)';
          }, i * 140);
        });
        nums.forEach(function(el, i) {
          setTimeout(function() { runCounter(el); }, i * 140);
        });
        io.unobserve(wrap);
      });
    }, { threshold: 0.2 });

    /* Set initial hidden state for the CSS fallback */
    cells.forEach(function(cell) {
      cell.style.opacity   = '0';
      cell.style.transform = 'translateY(36px)';
    });
    io.observe(wrap);
  }
}

/* ── PAGE TRANSITIONS ── */
/* DISABLED: The wipe-panel transition caused a black screen flash on every
   page load (GSAP wipeIn() immediately set panels to scaleY:1, covering the
   viewport before animating away) and added ~500ms navigation lag.
   Simple instant navigation is used instead. */
function initPageTransition() { return; }

/* ── MAGNETIC CURSOR ──────────────────────────────────────
   Subtle attraction (max 10px) on CTA buttons, play buttons,
   portfolio cards. GPU-accelerated, disabled on touch devices.
   ────────────────────────────────────────────────────── */
function initMagnetic() {
  if (window.matchMedia('(hover: none)').matches) return;

  const RADIUS = 88;  // px from element centre to start attraction
  const MAX_PX = 10;  // hard ceiling on displacement
  const state  = new WeakMap();

  function setup(el) {
    state.set(el, { tx: 0, ty: 0, cx: 0, cy: 0, raf: null });
  }

  function tick(el) {
    const s = state.get(el);
    if (!s) return;
    s.cx = lerp(s.cx, s.tx, 0.11);
    s.cy = lerp(s.cy, s.ty, 0.11);
    const moving = Math.abs(s.cx) > 0.04 || Math.abs(s.cy) > 0.04
                || s.tx !== 0 || s.ty !== 0;
    if (moving) {
      el.style.transform = `translate(${s.cx.toFixed(2)}px,${s.cy.toFixed(2)}px)`;
      s.raf = requestAnimationFrame(() => tick(el));
    } else {
      el.style.transform = '';
      s.raf = null;
    }
  }

  function onMove(el, e, strength) {
    const r    = el.getBoundingClientRect();
    const dx   = e.clientX - (r.left + r.width  * 0.5);
    const dy   = e.clientY - (r.top  + r.height * 0.5);
    const dist = Math.hypot(dx, dy);
    const s    = state.get(el);
    if (!s) return;
    if (dist < RADIUS) {
      const f = (1 - dist / RADIUS) * strength;
      s.tx = Math.max(-MAX_PX, Math.min(MAX_PX, dx * f));
      s.ty = Math.max(-MAX_PX, Math.min(MAX_PX, dy * f));
    } else {
      s.tx = 0; s.ty = 0;
    }
    if (!s.raf) {
      el.style.willChange = 'transform';
      s.raf = requestAnimationFrame(() => tick(el));
    }
  }

  function onLeave(el) {
    const s = state.get(el);
    if (!s) return;
    s.tx = 0; s.ty = 0;
    if (!s.raf) s.raf = requestAnimationFrame(() => tick(el));
  }

  // CTA & play buttons — 0.40 pull strength
  qsa('.btn-gold, .btn-ghost, .nav-btn, #showreel-play-btn').forEach(el => {
    setup(el);
    el.addEventListener('mousemove',  e  => onMove(el, e, 0.40), { passive: true });
    el.addEventListener('mouseleave', () => onLeave(el),          { passive: true });
  });

  // Portfolio cards — attached via delegation so dynamically built cards work.
  // Cards are created by Portfolio.build(); we hook in via event delegation.
  document.addEventListener('mousemove', e => {
    const card = e.target.closest?.('.pf-card');
    if (!card) return;
    if (!state.has(card)) setup(card);
    onMove(card, e, 0.18);
  }, { passive: true });

  document.addEventListener('mouseleave', e => {
    const card = e.target.closest?.('.pf-card');
    if (card && state.has(card)) onLeave(card);
  }, { passive: true });
}

/* ── FAQ ACCORDION ── */
/* Intentionally a no-op: FAQ is fully handled by vs-final.js (VSPolish20)
   which uses grid-template-rows for smooth open/close with .vs-open class,
   supports multiple items open simultaneously, and runs conflict-free.
   DO NOT re-enable max-height or .open logic here — it will break service pages. */
function initFaq() { /* deferred to vs-final.js */ }

/* ── SMOOTH ANCHOR SCROLL ── */
function initSmoothScroll() {
  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id     = a.getAttribute('href').slice(1);
      const target = qs('#' + id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── MOBILE NAV (close on outside click) ── */
function initMobileNav() {
  document.addEventListener('click', e => {
    const nav = qs('#nav');
    // FIX 8: If #nav is absent on a page, nav is null. Passing null explicitly
    // to qs() as the context bypasses the default=document fallback and causes
    // null.querySelector() to throw a TypeError on every single click event.
    if (!nav) return;
    const menu   = qs('.nav-menu',  nav);
    const burger = qs('.nav-burger', nav);
    if (!menu || !menu.classList.contains('nav-open')) return;
    if (!nav.contains(e.target)) {
      menu.classList.remove('nav-open');
      if (burger) { burger.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
      document.body.style.overflow = '';
    }
  });
}

/* ── SCROLL REVEAL STAGGER FOR FEATURE GRIDS ── */
function initFeatureGrids() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const boxes = e.target.querySelectorAll('.feat-box, .testi-card, .proc-list-item');
      boxes.forEach((box, i) => {
        box.style.transitionDelay = (i * 80) + 'ms';
        if (box._vsReveal) box._vsReveal();
        else { box.style.opacity = '1'; box.style.transform = 'none'; box.classList.add('in'); }
      });
      io.unobserve(e.target);
    });
  }, { threshold: .1 });

  qsa('.feat-grid, .testi-grid, .proc-list').forEach(el => {
    qsa('.feat-box, .testi-card, .proc-list-item', el).forEach(b => {
      b.style.opacity    = '0';
      b.style.transform  = 'translateY(28px)';
      b.style.transition = 'opacity .7s cubic-bezier(0.16,1,0.3,1), transform .7s cubic-bezier(0.16,1,0.3,1)';

      /* Store reveal handler on the element — called by IO callback */
      b._vsReveal = function() {
        b.style.opacity = '1';
        b.style.transform = 'none';
        b.classList.add('in');
      };
    });
    io.observe(el);
  });
}

/* ── HERO VIDEO FALLBACK ── */
function initHeroVideo() {
  const localVid    = qs('.hero-video-local');
  const vimeoIframe = qs('.hero-vimeo');
  if (!localVid) return;

  const testSrc = localVid.querySelector('source');
  if (!testSrc || !testSrc.src) return;

  /* HEAD check: only attempt local MP4 if the file actually exists.
     This prevents a wasted 404 request when hero-video.mp4 is not deployed. */
  fetch(testSrc.src, { method: 'HEAD' })
    .then(function(res) {
      if (!res.ok) return;          // file not found — stay with Vimeo
      localVid.style.display = 'block';
      localVid.load();
      localVid.play().then(function() {
        // Local MP4 works — mute Vimeo iframe to save bandwidth
        if (vimeoIframe) {
          vimeoIframe.style.opacity      = '0';
          vimeoIframe.style.pointerEvents = 'none';
        }
      }).catch(function() {
        localVid.style.display = 'none'; // autoplay blocked — keep Vimeo
      });
    })
    .catch(function() {
      /* Network error or CORS on HEAD — silently stay with Vimeo */
    });
}

/* ═══════════════════════════════════════════════════════
   CINEMATIC FEATURES v1 — Four new UI enhancements
   ═══════════════════════════════════════════════════════ */

/* ── FEATURE 2: CINEMATIC TEXT REVEAL ── */
function initCinematicReveal() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  qsa('.cinematic-reveal').forEach(container => {
    const lines = qsa('.reveal-line', container);
    if (!lines.length) return;

    // Mark container as processed so initCinematicTextReveal skips it
    container.dataset.revealDone = 'v1';
    // Wrap each .reveal-line's content in an inner span for clipping
    lines.forEach(line => {
      // Avoid double-wrapping if already processed
      if (line.querySelector('.reveal-line-inner')) return;
      const inner = document.createElement('span');
      inner.className = 'reveal-line-inner';
      // Move all child nodes into the inner span
      while (line.firstChild) inner.appendChild(line.firstChild);
      line.appendChild(inner);
    });

    const inners = qsa('.reveal-line-inner', container);

    // Set initial state
    gsap.set(inners, { y: '105%', opacity: 0 });

    // Scroll-triggered reveal with stagger
    gsap.to(inners, {
      scrollTrigger: {
        trigger: container,
        start: 'top 84%',
        once: true,
      },
      y: '0%',
      opacity: 1,
      duration: 1.15,
      ease: 'power4.out',
      stagger: 0.14,
    });
  });
}

/* ── FEATURE 3: WORKFLOW TIMELINE ── */
function initWorkflowTimeline() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const section    = qs('#workflow-timeline');
  const lineFill   = qs('#wf-line-fill');
  const steps      = qsa('[data-wf-step]');

  if (!section || !steps.length) return;

  // On mobile the track is hidden; still animate text content
  const trackVisible = window.getComputedStyle(qs('.wf-track', section) || section)
    .display !== 'none';

  // Master timeline, scrubbed by scroll
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 72%',
      end:   'bottom 60%',
      scrub: 4,    /* was 1.4 — heavier scroll coupling, less reactive */
      once: false,
    }
  });

  // 1) Draw the line left → right
  if (lineFill && trackVisible) {
    tl.fromTo(lineFill,
      { width: '0%' },
      { width: '100%', ease: 'none', duration: 4 },
      0
    );
  }

  // 2) Illuminate each node + reveal text staggered along the scrub
  steps.forEach((step, i) => {
    const pct = i / (steps.length - 1); // 0, 0.33, 0.66, 1
    const start = pct * 3.2;            // spread across the 4-unit scrub

    tl.to(step, {
      onStart()    { step.classList.add('lit'); },
      onReverseComplete() { step.classList.remove('lit'); },
      duration: 0.4,
      ease: 'none',
    }, start);
  });
}

/* ── FEATURE 4: CINEMATIC SCROLL COLOR GRADING ── */
function initColorGrading() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const overlay = qs('#cinematic-grade');
  if (!overlay) return;

  // Define the tint per section trigger:
  // rgba values chosen so mix-blend-mode:multiply creates a gentle LUT shift
  const grades = [
    // Hero section → neutral (no tint, overlay invisible)
    {
      trigger:  '#hero',
      start:    'top top',
      end:      'bottom top',
      fromColor: 'rgba(0,0,0,0)',
      toColor:   'rgba(0,0,0,0)',
      fromOp: 0, toOp: 0,
    },
    // Portfolio section → slightly warmer amber
    {
      trigger:  '#pf-grid',
      start:    'top 80%',
      end:      'bottom 20%',
      fromColor: 'rgba(180,130,60,0)',
      toColor:   'rgba(180,130,60,1)',
      fromOp: 0, toOp: 0.04,
    },
    // Services section → subtle gold tint
    {
      trigger:  '.srv-grid',
      start:    'top 80%',
      end:      'bottom 20%',
      fromColor: 'rgba(200,160,60,0)',
      toColor:   'rgba(200,160,60,1)',
      fromOp: 0, toOp: 0.045,
    },
    // Logos (clients) section → slightly darker / cooler contrast
    {
      trigger:  '.logos-section',
      start:    'top 80%',
      end:      'bottom 20%',
      fromColor: 'rgba(40,40,60,0)',
      toColor:   'rgba(40,40,60,1)',
      fromOp: 0, toOp: 0.055,
    },
    // Workflow timeline → cinematic teal-steel tint
    {
      trigger:  '#workflow-v2',
      start:    'top 80%',
      end:      'bottom 20%',
      fromColor: 'rgba(30,50,70,0)',
      toColor:   'rgba(30,50,70,1)',
      fromOp: 0, toOp: 0.05,
    },
  ];

  grades.forEach(g => {
    const triggerEl = qs(g.trigger);
    if (!triggerEl) return;

    // In-transition
    ScrollTrigger.create({
      trigger: triggerEl,
      start: g.start,
      end:   g.end,
      scrub: 2,
      onUpdate(self) {
        // Fade in on enter, back out on leave (ping-pong via scrub progress)
        const p   = self.progress;
        // Ease in/out the opacity
        const op  = g.toOp * Math.sin(p * Math.PI);
        overlay.style.opacity         = op;
        overlay.style.backgroundColor = g.toColor;
      },
      onLeaveBack() {
        overlay.style.opacity = 0;
      },
    });
  });
}

/* ── INIT ── */
/* Guard: if load already fired (deferred script), run immediately */
function _vsInit() {

  // Signal to CSS that JS is running — activates GSAP-driven animations
  // and deactivates the no-JS fallback visibility rules.
  if (typeof gsap !== 'undefined') {
    document.body.classList.add('gsap-ready');
  }

  if (!document.body.classList.contains('no-loader')) new Loader();
  new Cursor();
  new Nav();
  initSmoothScroll();
  initMobileNav();
  initReveal();
  initCounters();
  initFaq();
  heroAnim();

  const modal = new Modal();
  window._vsModal = modal;  /* expose for portfolio-engine.js LegacyPatch */
  if (typeof window.__vsModalReady === 'function') window.__vsModalReady(modal);
  /* portfolio-engine.js owns #pf-grid on portfolio.html — it builds the grid
     and binds all hover/click listeners via VS_Engine. If we run Portfolio()
     here as well it calls innerHTML='' and destroys the engine's DOM + listeners.
     Guard: only build the main.js Portfolio on pages where VS_Engine is absent. */
  if (qs('#pf-grid') && !window.VS_Engine) new Portfolio(modal);

  setTimeout(() => {
    initGSAP();
    initPfStatsAnim();  // portfolio stats bar: count-up + cinematic entrance
    initPageTransition();
    initHeroVideo();
    initFeatureGrids();
    // Cinematic features v1
    initCinematicReveal();
    initWorkflowTimeline();
    initColorGrading();
    // Interaction upgrades
    initMagnetic();
  }, 100);

}
/* Run when fully loaded, or immediately if load already fired */
if (document.readyState === 'complete') {
  _vsInit();
} else {
  window.addEventListener('load', _vsInit, { once: true });
}

/* ═══════════════════════════════════════════════════════
   CINEMATIC UPGRADE v2 — Features 1–8
   Appended below existing engine. All additive.
   ═══════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────
   FEATURE 1 — Cinematic Spotlight Sweep
   Animates the ::after pseudo's `left` via a real DOM
   element (pseudo-elements can't be GSAP targets directly,
   so we use a span injected inside each host).
   ────────────────────────────────────────────────────── */
function initSpotlightSweep() {
  if (typeof gsap === 'undefined') return;

  // Targets: hero headline, section titles, CTA title
  const hosts = qsa('.spotlight-host');
  if (!hosts.length) return;

  hosts.forEach(host => {
    // Inject a real sweep element so GSAP can drive it
    const sweep = document.createElement('span');
    sweep.className = 'spotlight-sweep-el';
    sweep.setAttribute('aria-hidden', 'true');
    sweep.style.cssText = `
      position:absolute; top:-40%; left:-60%; width:40%; height:180%;
      background:linear-gradient(105deg,transparent 0%,rgba(200,168,90,.04) 30%,rgba(220,190,110,.12) 50%,rgba(200,168,90,.04) 70%,transparent 100%);
      transform:skewX(-15deg); pointer-events:none; z-index:1; opacity:0;
      will-change:left,opacity;
    `;
    // host needs position:relative — ensure it
    const cs = getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
    host.appendChild(sweep);

    // Stagger the start time per element so sweeps don't all align
    const delay = hosts.indexOf(host) * 2.2 + Math.random() * 1.5;

    gsap.to(sweep, {
      left: '130%',
      opacity: 1,
      duration: 2.8,
      ease: 'sine.inOut',
      delay,
      repeat: -1,
      repeatDelay: 6 + Math.random() * 4,
      onStart()  { sweep.style.opacity = '1'; },
      onRepeat() { gsap.set(sweep, { left: '-60%' }); },
    });
  });
}

/* ──────────────────────────────────────────────────────
   FEATURE 2 — Cinematic Text Reveal (ScrollTrigger)
   Targets elements with class .c-reveal or .cinematic-reveal.
   Splits visible text nodes into wrapped lines.
   ────────────────────────────────────────────────────── */
function initCinematicTextReveal() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // Target headings that carry the .cinematic-reveal class
  // plus any h2 with data-cinematic-reveal attribute
  const targets = qsa('.cinematic-reveal:not(.wf-title), [data-c-reveal]');

  targets.forEach(el => {
    // If already processed by existing initCinematicReveal(), skip
    if (el.dataset.revealDone) return;
    el.dataset.revealDone = 'v2';

    const lines = qsa('.reveal-line', el);
    if (!lines.length) return;

    const inners = lines.map(line => {
      // Wrap inner content if not already wrapped
      if (!qs('.reveal-line-inner', line)) {
        const inner = document.createElement('span');
        inner.className = 'reveal-line-inner';
        inner.innerHTML = line.innerHTML;
        line.innerHTML = '';
        line.appendChild(inner);
      }
      return qs('.reveal-line-inner', line);
    }).filter(Boolean);

    gsap.set(inners, { y: '105%', opacity: 0 });

    ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      once: true,
      onEnter() {
        gsap.to(inners, {
          y: '0%',
          opacity: 1,
          duration: 1.1,
          stagger: 0.14,
          ease: 'power4.out',
        });
      },
    });
  });
}

/* ──────────────────────────────────────────────────────
   FEATURE 3 — Depth Parallax Layers (ScrollTrigger scrub)
   ────────────────────────────────────────────────────── */
function initDepthParallax() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // Hero: three-layer depth
  const heroVideo = qs('.hero-video-wrapper');
  const heroBody  = qs('.hero-body');
  const heroStats = qs('.hero-stats');

  if (heroVideo) {
    gsap.to(heroVideo, {
      yPercent: 18,          // background moves slowest
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      },
    });
  }
  if (heroBody) {
    gsap.to(heroBody, {
      yPercent: 10,          // mid-ground
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8,
      },
    });
  }
  if (heroStats) {
    gsap.to(heroStats, {
      yPercent: 5,           // foreground text, moves least
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.4,
      },
    });
  }

  // Portfolio section — subtle vertical float on the grid
  const pfGrid = qs('#pf-grid');
  if (pfGrid) {
    gsap.to(pfGrid, {
      yPercent: -4,
      ease: 'none',
      scrollTrigger: {
        trigger: pfGrid,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
      },
    });
  }

  // Services section — section label floats at a different rate
  qsa('.sec-label').forEach(label => {
    gsap.to(label, {
      y: -18,
      ease: 'none',
      scrollTrigger: {
        trigger: label.closest('section, .sec') || label,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });
  });
}

/* ──────────────────────────────────────────────────────
   FEATURE 5 — Portfolio Hover: Light Sweep + Video Autoplay
   Light sweep fires on mouseenter (GSAP one-shot).
   If the card has a data-preview-src attribute with an
   MP4 URL, that video fades in on hover and pauses on leave.
   Cards built from PROJECTS data expose data-id which maps
   to project.vid — wire in real preview URLs in production.
   ────────────────────────────────────────────────────── */
function initPortfolioHoverSweep() {
  if (typeof gsap === 'undefined') return;
  // Portfolio page runs its own complete hover+preview system via VS_Engine.
  // Running this on top creates duplicate mouseenter listeners on every card.
  if (window.VS_Engine) return;

  qsa('.pf-card').forEach(card => {
    // ── Inject light sweep span ──
    let sweepEl = qs('.pf-hover-sweep', card);
    if (!sweepEl) {
      sweepEl = document.createElement('span');
      sweepEl.className = 'pf-hover-sweep';
      sweepEl.setAttribute('aria-hidden', 'true');
      sweepEl.style.cssText =
        'position:absolute;top:0;left:-70%;width:45%;height:100%;' +
        'background:linear-gradient(100deg,transparent 0%,rgba(200,168,90,.08) 40%,rgba(220,195,120,.2) 55%,rgba(200,168,90,.08) 70%,transparent 100%);' +
        'transform:skewX(-10deg);pointer-events:none;z-index:4;opacity:0;will-change:left,opacity;';
      card.appendChild(sweepEl);
    }

    // ── Inject video preview element ──
    // Look for an explicit data-preview-src on the card,
    // OR fall back to nothing (sweep still works without video).
    const previewSrc = card.dataset.previewSrc || null;
    let vid = null;
    if (previewSrc) {
      vid = document.createElement('video');
      vid.src        = previewSrc;
      vid.muted      = true;
      vid.loop       = true;
      vid.playsInline = true;
      vid.preload    = 'none';
      vid.setAttribute('aria-hidden', 'true');
      vid.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;' +
        'object-fit:cover;opacity:0;z-index:2;pointer-events:none;' +
        'transition:opacity .35s ease;';
      card.insertBefore(vid, card.firstChild);
    }

    // ── Events ──
    card.addEventListener('mouseenter', () => {
      // One-shot light sweep
      gsap.fromTo(sweepEl,
        { left: '-70%', opacity: 0 },
        { left: '120%', opacity: 1, duration: 0.75, ease: 'power2.out',
          onComplete: () => { sweepEl.style.opacity = '0'; } }
      );
      // Start video if present
      if (vid) {
        vid.load();
        vid.play().catch(() => {});
        vid.style.opacity = '1';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (vid) {
        vid.pause();
        vid.style.opacity = '0';
      }
    });
  });
}

/* FEATURE 6 — 3D Tilt removed (motion sickness reports) */

/* ──────────────────────────────────────────────────────
   FEATURE 7 — Cinematic Dividers: upgrade existing ones
   and observe glow-divider-v2 elements for scroll reveal
   ────────────────────────────────────────────────────── */
function initGlowDividers() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // Animate new .glow-divider-v2 lines: scale from center on scroll
  qsa('.glow-divider-v2, .glow-divider').forEach(div => {
    gsap.fromTo(div,
      { scaleX: 0, opacity: 0 },
      {
        scaleX: 1, opacity: 1, duration: 1.4, ease: 'power3.out',
        scrollTrigger: {
          trigger: div,
          start: 'top 95%',
          once: true,
        },
      }
    );
    div.style.transformOrigin = 'center';
  });
}

/* ──────────────────────────────────────────────────────
   FEATURE 8 — Workflow Timeline v2 (alternating layout)
   GSAP animates: spine line draw + node glow + step fade
   ────────────────────────────────────────────────────── */
function initWorkflowV2() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const section = qs('#workflow-v2');
  if (!section) return;

  const spineFills = qsa('.wf2-spine-line-fill', section);
  const nodes      = qsa('.wf2-node', section);
  const lefts      = qsa('.wf2-step-left', section);
  const rights     = qsa('.wf2-step-right', section);

  // Set initial states
  gsap.set(lefts,       { x: -36, opacity: 0 });
  gsap.set(rights,      { x:  36, opacity: 0 });
  gsap.set(spineFills,  { height: '0%' });

  const totalNodes = nodes.length;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 72%',
      end:   'bottom 55%',
      scrub: 1.8,
    },
  });

  // Each node / spine segment animates in sequence
  nodes.forEach((node, i) => {
    const prog     = i / (totalNodes - 0.4);
    const segProg  = (i + 0.5) / (totalNodes - 0.4);

    // Draw spine segment leading to this node
    if (spineFills[i]) {
      tl.to(spineFills[i], { height: '100%', ease: 'none', duration: 0.25 }, prog);
    }

    // Light up the node
    tl.to(node, { duration: 0.01,
      onComplete()        { node.classList.add('lit'); },
      onReverseComplete() { node.classList.remove('lit'); },
    }, segProg);

    // Reveal the associated step card
    if (lefts[i])  tl.to(lefts[i],  { x: 0, opacity: 1, duration: 0.28, ease: 'power2.out' }, segProg + 0.02);
    if (rights[i]) tl.to(rights[i], { x: 0, opacity: 1, duration: 0.28, ease: 'power2.out' }, segProg + 0.04);
  });
}

/* ──────────────────────────────────────────────────────
   BOOT — wire up all new features after load
   ────────────────────────────────────────────────────── */
(function bootCinematicV2() {
  // Wait for DOMContentLoaded if document not yet ready
  const run = () => {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger); // safe to call twice
    }

    // Feature 1 — Spotlight sweep on key headlines
    qsa('.hero-h1, .sec-title, .cta-title').forEach(el => {
      el.classList.add('spotlight-host');
    });
    initSpotlightSweep();

    // Feature 2 — Enhanced text reveal
    initCinematicTextReveal();

    // Feature 3 — Parallax depth
    initDepthParallax();

    // Feature 5 — Hover sweep + video preview
    initPortfolioHoverSweep();

    // Feature 7 — Glow dividers
    initGlowDividers();

    // Feature 8 — Workflow v2
    initWorkflowV2();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}());

/* ═══════════════════════════════════════════════════════
   CINEMATIC UPGRADE v3
   ═══════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────
   WORKFLOW v3 — left/right layout with gold spine
   ────────────────────────────────────────────────────── */
function initWorkflowV3() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const section = qs('#workflow-v2');
  if (!section) return;

  const spineFill = qs('#wf3-spine-fill', section);
  const steps     = qsa('.wf3-step', section);

  if (!steps.length) return;

  // Set initial state — steps already have opacity:0 / translateX(28px) via CSS
  // (CSS handles the no-JS fallback; gsap-ready class activates GSAP control)

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 80%',    /* start earlier for more scroll travel */
      end:   'bottom 5%',  /* end very late — maximum scroll range = slowest draw */
      scrub: 2.5,          /* tighter scrub coupling so lag doesn't feel broken */
    },
  });

  // Draw the spine
  if (spineFill) {
    tl.to(spineFill, { height: '100%', ease: 'none' }, 0);
  }

  // Reveal each step and light its node
  steps.forEach((step, i) => {
    const prog = i / (steps.length - 0.3);

    // Light node
    tl.to(step, { duration: 0.01,
      onComplete()        { step.classList.add('lit'); },
      onReverseComplete() { step.classList.remove('lit'); },
    }, prog);

    // Slide + fade in — slow, cinematic
    tl.to(step, {
      x: 0, opacity: 1,
      duration: 0.5,
      ease: 'power3.out',
    }, prog + 0.04);
  });
}

/* ──────────────────────────────────────────────────────
   WORKFLOW v3 — ambient particle canvas
   Tiny glowing dots float slowly over the section.
   Pure canvas — no library dependency.
   ────────────────────────────────────────────────────── */
function initWF3Particles() {
  const canvas = qs('.wf3-particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, raf;

  const COUNT = 38;
  const GOLD  = [200, 168, 90];
  const ROSE  = [180, 110, 85];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function makeParticle(i) {
    const col = i % 3 === 0 ? ROSE : GOLD;
    return {
      x:   Math.random() * W,
      y:   Math.random() * H,
      r:   Math.random() * 1.6 + 0.4,
      vx:  (Math.random() - .5) * 0.18,
      vy: -(Math.random() * 0.22 + 0.06),  // drift upward slowly
      a:    Math.random(),                   // phase offset
      col,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, (_, i) => makeParticle(i));
  }

  let tick = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    tick += 0.008;

    particles.forEach(p => {
      // Gentle sine-wave drift
      p.x += p.vx + Math.sin(tick + p.a * 6) * 0.12;
      p.y += p.vy;

      // Wrap around edges
      if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -4) p.x = W + 4;
      if (p.x > W + 4) p.x = -4;

      // Pulse opacity
      const opacity = (0.3 + Math.sin(tick * 1.1 + p.a * 4) * 0.25) * 0.7;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${opacity})`;
      ctx.fill();

      // Tiny glow
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${opacity * 0.4})`);
      g.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  // Only run when section is visible — saves CPU
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { if (!raf) draw(); }
      else { cancelAnimationFrame(raf); raf = null; }
    });
  }, { threshold: 0.05 });

  const section = canvas.closest('section') || canvas.parentElement;
  io.observe(section);

  window.addEventListener('resize', () => {
    /* Cancel running loop before resize to prevent parallel rAF chains */
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    resize();
    particles = Array.from({ length: COUNT }, (_, i) => makeParticle(i));
  }, { passive: true });

  init();
}

/* ──────────────────────────────────────────────────────
   CINEMATIC SOUND DESIGN v2 — Premium Web Audio synthesis
   Soft, modern, tech-cinematic. No external files needed.
   Activates only after first user gesture (browser policy).
   ────────────────────────────────────────────────────── */
const CinemaSound = (() => {
  let ctx = null;
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      unlocked = true;
    } catch (e) { /* AudioContext not available */ }
  }

  ['pointerdown', 'keydown'].forEach(ev =>
    document.addEventListener(ev, unlock, { once: true, passive: true })
  );

  /* Master gain node with output volume */
  function master(vol) {
    if (!ctx || !unlocked) return null;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.connect(ctx.destination);
    return g;
  }

  /* Utility: play an oscillator with frequency + gain envelope */
  function playTone(freq, type, vol, attack, sustain, release, pitchEnd) {
    const g = master(0);
    if (!g) return;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + attack + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + sustain + release);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (pitchEnd) o.frequency.exponentialRampToValueAtTime(pitchEnd, t + attack + sustain + release);
    o.connect(g);
    o.start(t);
    o.stop(t + attack + sustain + release + 0.05);
  }

  return {
    /* ── Hover: ultra-minimal film-camera tick — single sine, very soft ── */
    hover() {
      if (!ctx || !unlocked) return;
      const t = ctx.currentTime;
      const g = master(0);
      if (!g) return;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.015, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(2900, t);
      o.frequency.exponentialRampToValueAtTime(1700, t + 0.075);
      o.connect(g);
      o.start(t); o.stop(t + 0.085);
    },

    /* ── Whoosh: cinematic air sweep for modal open ── */
    whoosh() {
      if (!ctx || !unlocked) return;
      const t = ctx.currentTime;
      const dur = 0.42;

      // Noise source — filtered
      const bufLen = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < bufLen; i++) {
          // Pink-ish noise via one-pole filter
          const white = Math.random() * 2 - 1;
          last = 0.95 * last + 0.05 * white;
          d[i] = last * 3.5;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      // Bandpass sweeping up
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(280, t);
      bp.frequency.exponentialRampToValueAtTime(3200, t + dur);
      bp.Q.setValueAtTime(0.8, t);

      // High-shelf for air
      const hs = ctx.createBiquadFilter();
      hs.type = 'highshelf';
      hs.frequency.setValueAtTime(4000, t);
      hs.gain.setValueAtTime(6, t);

      const gOut = master(0);
      if (!gOut) return;
      gOut.gain.setValueAtTime(0, t);
      gOut.gain.linearRampToValueAtTime(0.038, t + 0.04);
      gOut.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      // Tonal undertone to add depth
      const tone = ctx.createOscillator();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(180, t);
      tone.frequency.exponentialRampToValueAtTime(680, t + dur * 0.6);
      const gTone = ctx.createGain();
      gTone.gain.setValueAtTime(0, t);
      gTone.gain.linearRampToValueAtTime(0.022, t + 0.03);
      gTone.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.55);

      src.connect(bp); bp.connect(hs); hs.connect(gOut);
      tone.connect(gTone); gTone.connect(ctx.destination);
      src.start(t);
      tone.start(t); tone.stop(t + dur * 0.6);
    },

    /* ── Transition: cinematic impact — low thud + high transient ── */
    transition() {
      if (!ctx || !unlocked) return;
      const t = ctx.currentTime;

      // Sub thud
      const gSub = master(0);
      if (!gSub) return;
      gSub.gain.setValueAtTime(0.06, t);
      gSub.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(100, t);
      sub.frequency.exponentialRampToValueAtTime(28, t + 0.32);
      sub.connect(gSub);
      sub.start(t); sub.stop(t + 0.38);

      // Short transient click for definition
      const gClk = master(0);
      if (!gClk) return;
      gClk.gain.setValueAtTime(0.025, t);
      gClk.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      const clk = ctx.createOscillator();
      clk.type = 'triangle';
      clk.frequency.setValueAtTime(220, t);
      clk.frequency.exponentialRampToValueAtTime(80, t + 0.06);
      clk.connect(gClk);
      clk.start(t); clk.stop(t + 0.07);

      // Soft high shimmer
      const gShim = master(0);
      if (!gShim) return;
      gShim.gain.setValueAtTime(0, t);
      gShim.gain.linearRampToValueAtTime(0.014, t + 0.005);
      gShim.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      const shim = ctx.createOscillator();
      shim.type = 'sine';
      shim.frequency.setValueAtTime(2200, t);
      shim.connect(gShim);
      shim.start(t); shim.stop(t + 0.16);
    },

    /* ── Click: warm projector-gate click — tone drop + noise transient ── */
    click() {
      if (!ctx || !unlocked) return;
      const t = ctx.currentTime;

      // Warm mid tone sweep — projector mechanism
      const gTone = master(0);
      if (!gTone) return;
      gTone.gain.setValueAtTime(0, t);
      gTone.gain.linearRampToValueAtTime(0.046, t + 0.003);
      gTone.gain.exponentialRampToValueAtTime(0.0001, t + 0.145);
      const tone = ctx.createOscillator();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(345, t);
      tone.frequency.exponentialRampToValueAtTime(155, t + 0.14);
      tone.connect(gTone);
      tone.start(t); tone.stop(t + 0.16);

      // Brief noise burst for mechanical texture
      const bufLen = Math.floor(ctx.sampleRate * 0.042);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      const ns = ctx.createBufferSource();
      ns.buffer = buf;
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 820; nf.Q.value = 1.4;
      const gNs = master(0);
      if (!gNs) return;
      gNs.gain.setValueAtTime(0.011, t);
      gNs.gain.exponentialRampToValueAtTime(0.0001, t + 0.042);
      ns.connect(nf); nf.connect(gNs);
      ns.start(t);
    },

    /* ── Play: cinematic projector start — rising tone + film-thread sweep ── */
    play() {
      if (!ctx || !unlocked) return;
      const t = ctx.currentTime;
      const dur = 0.34;

      // Rising sine — projector motor spooling up
      const gTone = master(0);
      if (!gTone) return;
      gTone.gain.setValueAtTime(0, t);
      gTone.gain.linearRampToValueAtTime(0.04, t + 0.04);
      gTone.gain.setValueAtTime(0.04, t + dur * 0.62);
      gTone.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const tone = ctx.createOscillator();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(88, t);
      tone.frequency.exponentialRampToValueAtTime(370, t + dur * 0.78);
      tone.connect(gTone);
      tone.start(t); tone.stop(t + dur + 0.05);

      // Filtered noise sweep — film threading through gate
      const nLen = Math.floor(ctx.sampleRate * dur);
      const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
      const nd = nBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < nLen; i++) {
        const w = Math.random() * 2 - 1;
        last = 0.9 * last + 0.1 * w;
        nd[i] = last * 2.8;
      }
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = nBuf;
      const nFilt = ctx.createBiquadFilter();
      nFilt.type = 'bandpass';
      nFilt.frequency.setValueAtTime(220, t);
      nFilt.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.68);
      nFilt.Q.value = 0.65;
      const gNs = master(0);
      if (!gNs) return;
      gNs.gain.setValueAtTime(0, t);
      gNs.gain.linearRampToValueAtTime(0.026, t + 0.03);
      gNs.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.82);
      nSrc.connect(nFilt); nFilt.connect(gNs);
      nSrc.start(t);
    },
  };
})();

/* Wire sounds to existing UI elements */
function initSoundDesign() {
  // Portfolio card hover — soft tick (throttled: once per 400ms per card)
  // Only fires on pf-card hover START, not on every mouse movement
  let lastPfHover = 0;
  document.addEventListener('mouseenter', e => {
    const card = e.target.closest?.('.pf-card');
    if (!card) return;
    const now = Date.now();
    if (now - lastPfHover < 400) return;
    lastPfHover = now;
    CinemaSound.hover();
  }, true);

  // Navigation link clicks — subtle thud (nav menu only, non-hash links)
  qsa('a', qs('#nav') || document).forEach(a => {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return; // skip anchor-only links
    a.addEventListener('click', () => CinemaSound.transition(), { passive: true });
  });

  // CTA buttons — warm projector click on press
  qsa('.btn-gold, .btn-ghost, .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => CinemaSound.click(), { passive: true });
  });

  // Video / play buttons — cinematic projector-start sound
  qsa('#showreel-play-btn, .pf-play-btn, [data-video]').forEach(btn => {
    btn.addEventListener('click', () => CinemaSound.play(), { passive: true });
  });

  // Modal open — whoosh
  const modalEl = qs('#modal');
  if (modalEl) {
    const observer = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.attributeName === 'class' && modalEl.classList.contains('open')) {
          CinemaSound.whoosh();
        }
      });
    });
    observer.observe(modalEl, { attributes: true });
  }
}

/* ──────────────────────────────────────────────────────
   PORTFOLIO — cinematic headline scroll reveal
   ────────────────────────────────────────────────────── */
function initPortfolioCinemaHeadline() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const el = qs('.pf-cinema-headline');
  if (!el) return;

  gsap.fromTo(el,
    { opacity: 0, y: 20, filter: 'blur(8px)' },
    {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    }
  );
}

/* ──────────────────────────────────────────────────────
   BOOT v3 — all new features
   ────────────────────────────────────────────────────── */
(function bootV3() {
  const run = () => {
    setTimeout(() => {
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
      }
      initWorkflowV3();
      initWF3Particles();
      initSoundDesign();
      initPortfolioCinemaHeadline();
    }, 250);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}());

/* ═══════════════════════════════════════════════════════
   VISION STUDIO — UPGRADE v7
   Task 2: Portfolio Title Overlay
   Task 3: Enhanced hover (already in CSS, sweep in JS)
   Task 4: Video Preview System (MP4 + Vimeo support)
   Task 6: Lazy image load observer
   ═══════════════════════════════════════════════════════ */

/* ── TASK 2 + 3 + 4: Rebuilt Portfolio Card System ────── */

/* Monkey-patch Portfolio.prototype.build to inject title overlay
   and video preview support. We override after initial load. */
/* ══ VIMEO HOVER PREVIEW SYSTEM ══════════════════════════════
   Injects a Vimeo iframe on mouseenter, destroys on mouseleave.
   Zero iframes at page load. One active iframe max at any time.
   CSS z-index: .pf-vimeo-preview = 5 (above veil+::after, below UI).
   ════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════
   HOVER VIDEO PREVIEWS — v4  (on-demand + short cache)
   Strategy:
   • NO preloading — zero iframes loaded at page load
   • On mouseenter: create iframe on demand (first hover)
   • iframe cached CACHE_TTL ms after mouseleave
     → quick re-hover of the same card is instant
   • Only ONE iframe lives at a time during active hover
   • SEO/perf safe: Vimeo JS never loads until first hover
   ══════════════════════════════════════════════════════ */
(function initVimeoHoverPreviews() {

  var CACHE_TTL = 10000; /* ms to keep iframe after mouseleave */

  /* cache: card → { iframe, timer } */
  var cache      = new Map();
  var activeCard = null;

  /* ── helpers ─────────────────────────────────────── */
  function makeVimeoIframe(vimeoId, cssClass) {
    var f = document.createElement('iframe');
    f.className = cssClass || 'pf-vimeo-preview';
    f.setAttribute('frameborder', '0');
    f.setAttribute('allow', 'autoplay; fullscreen');
    f.setAttribute('aria-hidden', 'true');
    f.src = 'https://player.vimeo.com/video/' + vimeoId +
      '?background=1&autoplay=1&muted=1&loop=1&title=0&byline=0&portrait=0&quality=auto';
    return f;
  }

  function dropIframe(card) {
    var entry = cache.get(card);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.iframe.classList.remove('playing');
    entry.iframe.src = '';
    if (entry.iframe.parentNode) entry.iframe.remove();
    cache.delete(card);
  }

  function getIframe(card, vimeoId, cssClass) {
    if (cache.has(card)) {
      var e = cache.get(card);
      clearTimeout(e.timer);
      return e.iframe;
    }
    var iframe = makeVimeoIframe(vimeoId, cssClass);
    card.insertBefore(iframe, card.firstChild);
    cache.set(card, { iframe: iframe, timer: null });
    return iframe;
  }

  function scheduleCleanup(card) {
    var entry = cache.get(card);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.timer = setTimeout(function() { dropIframe(card); }, CACHE_TTL);
  }

  /* ── touch support ───────────────────────────────── */
  /* FIX: Original code used { passive: false } + e.preventDefault() on
     touchstart, which blocked scroll entirely on the portfolio page.
     Replaced with tap-vs-scroll detection: all listeners are passive,
     touchmove sets a flag so finger drags never trigger the preview. */
  function attachTouchPreviews(withVideo) {
    if (!window.matchMedia('(hover: none)').matches) return;
    withVideo.forEach(function(card) {
      var touchStartY = 0;
      var touchStartX = 0;
      var didScroll   = false;

      card.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        didScroll   = false;
      }, { passive: true });

      /* Any movement beyond 8px = treat as scroll, never fire preview */
      card.addEventListener('touchmove', function(e) {
        var dy = Math.abs(e.touches[0].clientY - touchStartY);
        var dx = Math.abs(e.touches[0].clientX - touchStartX);
        if (dy > 8 || dx > 8) didScroll = true;
      }, { passive: true });

      card.addEventListener('touchend', function() {
        if (didScroll) return; /* scroll gesture — ignore */
        if (activeCard === card) {
          /* 2nd tap → open modal */
          dropIframe(card);
          activeCard = null;
          card.classList.remove('preview-playing');
          card.click();
          return;
        }
        if (activeCard && activeCard !== card) {
          var pe = cache.get(activeCard);
          if (pe) pe.iframe.classList.remove('playing');
          activeCard.classList.remove('preview-playing');
          scheduleCleanup(activeCard);
        }
        activeCard = card;
        card.classList.add('preview-playing');
        var iframe = getIframe(card, card.dataset.vimeoPreview);
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            if (activeCard === card) iframe.classList.add('playing');
          });
        });
      }, { passive: true });
    });

    document.addEventListener('touchstart', function(e) {
      if (activeCard && !activeCard.contains(e.target)) {
        var pe = cache.get(activeCard);
        if (pe) pe.iframe.classList.remove('playing');
        activeCard.classList.remove('preview-playing');
        scheduleCleanup(activeCard);
        activeCard = null;
      }
    }, { passive: true });
  }

  /* ── desktop hover ──────────────────────────────── */
  function attachPreviews(grid) {
    var cards     = Array.from(grid.querySelectorAll('.pf-card'));
    var withVideo = cards.filter(function(c) { return !!c.dataset.vimeoPreview; });

    withVideo.forEach(function(card) {
      card.addEventListener('mouseenter', function() {
        if (activeCard && activeCard !== card) {
          var pe = cache.get(activeCard);
          if (pe) pe.iframe.classList.remove('playing');
          activeCard.classList.remove('preview-playing');
          scheduleCleanup(activeCard);
        }
        if (activeCard === card) return;
        activeCard = card;

        var iframe = getIframe(card, card.dataset.vimeoPreview);
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            if (activeCard === card) iframe.classList.add('playing');
          });
        });
      });

      card.addEventListener('mouseleave', function() {
        if (activeCard !== card) return;
        var e = cache.get(card);
        if (e) e.iframe.classList.remove('playing');
        card.classList.remove('preview-playing');
        activeCard = null;
        scheduleCleanup(card);
      });
    });

    attachTouchPreviews(withVideo);
  }

  function tryInit() {
    var grid = document.getElementById('pf-grid');
    if (!grid || !grid.children.length) { setTimeout(tryInit, 150); return; }
    attachPreviews(grid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
}());

/* ══════════════════════════════════════════════════════
   FEATURED HERO (#pf-featured)
   • mouseenter → inject background Vimeo preview
   • mouseleave → fade out, cache 10s
   • click / button click → open modal
   ══════════════════════════════════════════════════════ */
(function initFeaturedHero() {
  var featured = document.getElementById('pf-featured');
  if (!featured) return;

  var VIMEO_ID  = '1175474817';  /* hell-energy-ai */
  var CACHE_TTL = 10000;

  var cachedIframe = null;
  var cacheTimer   = null;

  function makeIframe() {
    var f = document.createElement('iframe');
    f.className = 'pf-feat-iframe';
    f.setAttribute('frameborder', '0');
    f.setAttribute('allow', 'autoplay; fullscreen');
    f.setAttribute('aria-hidden', 'true');
    f.src = 'https://player.vimeo.com/video/' + VIMEO_ID +
      '?background=1&autoplay=1&muted=1&loop=1&title=0&byline=0&portrait=0&quality=auto';
    return f;
  }

  function showPreview() {
    clearTimeout(cacheTimer);
    if (!cachedIframe) {
      cachedIframe = makeIframe();
      featured.insertBefore(cachedIframe, featured.firstChild);
    }
    featured.classList.add('video-active');
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (cachedIframe) cachedIframe.classList.add('playing');
      });
    });
  }

  function hidePreview() {
    featured.classList.remove('video-active');
    if (cachedIframe) cachedIframe.classList.remove('playing');
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(function() {
      if (cachedIframe) {
        cachedIframe.src = '';
        if (cachedIframe.parentNode) cachedIframe.remove();
        cachedIframe = null;
      }
    }, CACHE_TTL);
  }

  function openModal() {
    var modal = window._vsModal;
    if (!modal) return;
    var project = (typeof PROJECTS !== 'undefined')
      ? PROJECTS.find(function(p) { return p.id === 'hell-energy-ai'; })
      : null;
    if (project) {
      modal.open(project);
    } else {
      var m  = document.getElementById('modal');
      var mi = document.getElementById('modal-iframe');
      if (!m || !mi) return;
      mi.src = 'https://player.vimeo.com/video/' + VIMEO_ID + '?autoplay=1&color=c8a85a';
      document.body.style.overflow = 'hidden';
      m.classList.add('open');
      setTimeout(function() { var x = m.querySelector('.modal-x'); if (x) x.focus(); }, 50);
    }
  }

  featured.addEventListener('mouseenter', showPreview);
  featured.addEventListener('mouseleave', hidePreview);

  /* Button click opens modal, doesn't just toggle preview */
  var btn = document.getElementById('pf-feat-play-btn');
  if (btn) {
    btn.addEventListener('click', function(e) { e.stopPropagation(); openModal(); });
  }
  /* Click on section body (not the button) also opens modal */
  featured.addEventListener('click', function(e) {
    if (e.target.closest && e.target.closest('#pf-feat-play-btn')) return;
    openModal();
  });
  featured.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
  });
}());

/* ══════════════════════════════════════════════════════
   CASE STUDY VIDEO (#cs-vid)
   • mouseenter → inject Vimeo background preview
   • mouseleave → fade out, cache 10s
   • click / Enter → open modal
   ══════════════════════════════════════════════════════ */
(function initCaseStudyVideo() {
  var csVid = document.getElementById('cs-vid');
  if (!csVid) return;

  var CACHE_TTL = 10000;
  var cachedIframe = null;
  var cacheTimer   = null;

  function getVimeoId() {
    var pid = csVid.dataset.id || 'hell-power';
    if (typeof PROJECTS !== 'undefined') {
      var p = PROJECTS.find(function(x) { return x.id === pid; });
      if (p && p.vid) return String(p.vid);
    }
    return '1174708286'; /* hell-power fallback */
  }

  function showPreview() {
    clearTimeout(cacheTimer);
    if (!cachedIframe) {
      var vid = getVimeoId();
      cachedIframe = document.createElement('iframe');
      cachedIframe.className = 'cs-vimeo-preview';
      cachedIframe.setAttribute('frameborder', '0');
      cachedIframe.setAttribute('allow', 'autoplay; fullscreen');
      cachedIframe.setAttribute('aria-hidden', 'true');
      cachedIframe.src = 'https://player.vimeo.com/video/' + vid +
        '?background=1&autoplay=1&muted=1&loop=1&title=0&byline=0&portrait=0&quality=auto';
      csVid.insertBefore(cachedIframe, csVid.firstChild);
    }
    csVid.classList.add('video-active');
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (cachedIframe) cachedIframe.classList.add('playing');
      });
    });
  }

  function hidePreview() {
    csVid.classList.remove('video-active');
    if (cachedIframe) cachedIframe.classList.remove('playing');
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(function() {
      if (cachedIframe) {
        cachedIframe.src = '';
        if (cachedIframe.parentNode) cachedIframe.remove();
        cachedIframe = null;
      }
    }, CACHE_TTL);
  }

  function openModal() {
    var modal = window._vsModal;
    if (!modal) return;
    var pid = csVid.dataset.id || 'hell-power';
    var project = (typeof PROJECTS !== 'undefined')
      ? PROJECTS.find(function(p) { return p.id === pid; })
      : null;
    if (project) {
      modal.open(project);
    } else {
      var m  = document.getElementById('modal');
      var mi = document.getElementById('modal-iframe');
      if (!m || !mi) return;
      mi.src = 'https://player.vimeo.com/video/1174708286?autoplay=1&color=c8a85a';
      document.body.style.overflow = 'hidden';
      m.classList.add('open');
      setTimeout(function() { var x = m.querySelector('.modal-x'); if (x) x.focus(); }, 50);
    }
  }

  csVid.addEventListener('mouseenter', showPreview);
  csVid.addEventListener('mouseleave', hidePreview);
  csVid.addEventListener('click', openModal);
  csVid.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
  });
}());

/* ── TASK 6: Lazy image load observer ───────────────────
   Adds .loaded class after native lazy-load completes,
   triggering CSS fade-in transition.
────────────────────────────────────────────────────────── */
(function initLazyImages() {
  const imgs = document.querySelectorAll('img[loading="lazy"]');
  if (!imgs.length) return;

  imgs.forEach(img => {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load',  () => img.classList.add('loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
    }
  });
}());

/* ── TASK 1: Ensure srv-card keyboard navigation ────────
   The srv-card is now an <a> tag (changed in HTML).
   This block adds keyboard enter/space support for any
   legacy .srv-card elements that might remain as divs
   on other pages.
────────────────────────────────────────────────────────── */
(function initSrvCardKeyboard() {
  /* Navigate via vsWipeNavigate so the cinematic wipe fires.
     Falls back to direct navigation if vs-wipe.js hasn't loaded yet. */
  function navigateSrv(href) {
    if (!href) return;
    if (typeof window.vsWipeNavigate === 'function') {
      window.vsWipeNavigate(href);
    } else {
      window.location.href = href;
    }
  }

  document.querySelectorAll('[data-srv-href]').forEach(card => {
    if (card.tagName === 'A') return; /* already an anchor */
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'link');
    card.addEventListener('click', () => {
      navigateSrv(card.dataset.srvHref);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateSrv(card.dataset.srvHref);
      }
    });
  });
}());


/* ═══════════════════════════════════════════════════════
   VISION STUDIO — UPGRADE v8
   Task 1:  Workflow timeline progress fix (section-relative)
   Task 2:  Featured case study reveal
   Task 4:  Showreel lazy video load + clip-path reveal
   Task 3:  Marquee accessibility (pause on focus)
   Task 8:  Button microinteraction sounds + glow callbacks
   ═══════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────
   WORKFLOW TIMELINE — canonical implementation is
   initWorkflowIntersection() below (v9, load+500ms).
   It kills GSAP scrub, clears inline styles, and uses
   IntersectionObserver for reliable step lighting.
   ────────────────────────────────────────────────────── */


/* ──────────────────────────────────────────────────────
   TASK 2 — FEATURED CASE STUDY SECTION REVEAL
   Uses IntersectionObserver for a cinematic entrance:
   .fc-inner fades in + rises on scroll enter.
   ────────────────────────────────────────────────────── */
(function initFeaturedCaseReveal() {
  /* Guard: redesign-v18.js initFeaturedCase also watches .fc-inner */
  const inner = document.querySelector('.fc-inner');
  if (!inner || inner.dataset.fcBound) return;
  inner.dataset.fcBound = '1';

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      inner.classList.add('fc-revealed');
      io.unobserve(inner);
    });
  }, { threshold: 0.15 });

  io.observe(inner);

}());


/* ──────────────────────────────────────────────────────
   TASK 4 — SHOWREEL SECTION: lazy video + reveal
   
   The iframe has its real src in data-src to avoid loading
   Vimeo until the section is almost in viewport.
   
   Behaviour:
   • IntersectionObserver (threshold 0.1) loads the iframe
   • clip-path transitions from inset(6% 4%) → inset(0%) via .revealed class
   • The play button opens the Vimeo video in a new modal / full playback
   ────────────────────────────────────────────────────── */
(function initShowreel() {

  const frame       = document.querySelector('#showreel-frame');
  const iframe      = document.querySelector('#showreel-iframe');
  const playBtn     = document.querySelector('#showreel-play-btn');

  if (!frame || !iframe) return;
  /* Mark so redesign-v18 initShowreelReveal skips this element */
  frame.dataset.showreelBound = '1';

  let loaded = false;

  function loadVideo() {
    if (loaded) return;
    loaded = true;
    const src = iframe.dataset.src || '';
    if (src) iframe.src = src;
    /* Small delay then reveal for cinematic entrance */
    setTimeout(() => {
      frame.classList.add('revealed');
    }, 120);
  }

  /* Lazy-load when section enters viewport */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        loadVideo();
        io.disconnect();
      }
    });
  }, { threshold: 0.08 });

  io.observe(frame);

  /* Play button — opens the showreel in the existing video modal */
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      /* Reuse the existing Modal class by finding a dummy project object */
      const modal = document.querySelector('#modal');
      if (!modal) return;
      /* Dispatch a custom event that the page's modal can intercept */
      const modalIframe = document.querySelector('#modal-iframe');
      const modalTitle  = document.querySelector('.modal-title');
      const modalTag    = document.querySelector('.modal-project-tag');
      if (!modalIframe) return;

      if (modalTag)   modalTag.textContent   = 'Vision Studio · Budapest';
      if (modalTitle) modalTitle.textContent = 'Showreel 2025';

      modalIframe.src =
        'https://player.vimeo.com/video/1176859984?autoplay=1&color=c8a85a';

      document.body.style.overflow = 'hidden';
      modal.classList.add('open');
      setTimeout(() => {
        const x = modal.querySelector('.modal-x');
        if (x) x.focus();
      }, 50);
    });
  }

}());


/* ── TASK 3 — MARQUEE: pause on keyboard focus only (a11y, no hover pause per spec) ── */
(function initMarqueeA11y() {

  const track = document.querySelector('.marquee-track');
  if (!track || track.dataset.vsFinalBound || track.dataset.a11yBound) return;
  track.dataset.a11yBound = '1';

  /* Pause only on keyboard focus — NOT on mouse hover */
  track.addEventListener('focusin', () => {
    track.style.animationPlayState = 'paused';
  });
  track.addEventListener('focusout', () => {
    track.style.animationPlayState = 'running';
  });

  /* Initialise loaded class on marquee images */
  const imgs = track.querySelectorAll('img');
  imgs.forEach(img => {
    if (img.complete) img.classList.add('loaded');
    else img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
  });

}());


/* ──────────────────────────────────────────────────────
   TASK 5 — STATS: Enhanced counter with easeOutExpo
   Replaces the base initCounters approach for stat cells
   specifically to work with the new .stat-n gradient text.
   ────────────────────────────────────────────────────── */
(function initStatsCounters() {

  const cells = document.querySelectorAll('.stat-cell[data-counter-wrap]');
  if (!cells.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el     = e.target.querySelector('[data-counter]');
      if (!el) return;

      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const dur    = 2200;
      let start    = null;

      const step = (ts) => {
        if (!start) start = ts;
        const elapsed  = ts - start;
        const progress = Math.min(elapsed / dur, 1);
        /* easeOutExpo for premium feel */
        const ease     = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const val      = Number.isInteger(target)
          ? Math.floor(ease * target)
          : (ease * target).toFixed(1);
        el.textContent = val + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
      io.unobserve(e.target);
    });
  }, { threshold: 0.45 });

  cells.forEach(cell => io.observe(cell));

}());


/* ──────────────────────────────────────────────────────
   TASK 8 — MICROINTERACTIONS: additional hover sounds
   for the new sections and enhanced button feedback
   ────────────────────────────────────────────────────── */
(function initV8Microinteractions() {

  /* Featured case study CTA — extra sparkle sound */
  const fcCta = document.querySelector('.fc-cta');
  if (fcCta) {
    fcCta.addEventListener('mouseenter', () => {
      if (typeof CinemaSound !== 'undefined') CinemaSound.hover();
    });
  }

  /* Stats cells — subtle glow entrance sound on counter completion */
  const statCells = document.querySelectorAll('.stat-cell');
  const statIo = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (!e.isIntersecting) return;
      setTimeout(() => {
        if (typeof CinemaSound !== 'undefined') CinemaSound.hover();
      }, i * 160);
      statIo.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  statCells.forEach(c => statIo.observe(c));

  /* Showreel play button hover sound */
  const showreelBtn = document.querySelector('#showreel-play-btn');
  if (showreelBtn) {
    showreelBtn.addEventListener('mouseenter', () => {
      if (typeof CinemaSound !== 'undefined') CinemaSound.hover();
    });
  }

  /* Logo marquee items — subtle hover tick (throttled) */
  let lastLogoHover = 0;
  document.addEventListener('mouseenter', e => {
    const logo = e.target.closest?.('.marquee-logo');
    if (!logo) return;
    const now = Date.now();
    if (now - lastLogoHover < 300) return;
    lastLogoHover = now;
    if (typeof CinemaSound !== 'undefined') CinemaSound.hover();
  }, true);

}());

/* ═══════════════════════════════════════════════════════
   VISION STUDIO — v8 FINAL POLISH JS
   1. Section reveal observer (data-section-reveal)
   2. Workflow: ensure CSS transitions fire after GSAP clear
   3. Showreel: graceful fallback when Vimeo blocked
   4. Featured case: stagger pill reveal via class
   ═══════════════════════════════════════════════════════ */

/* ── Section reveal (data-section-reveal) ─────────────── */
(function initSectionReveal() {
  const els = document.querySelectorAll('[data-section-reveal]');
  if (!els.length) return;
  const io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.1 });
  els.forEach(function(el) { io.observe(el); });
}());

/* ── Workflow: force CSS transition after GSAP clear ─────
   After window.load + 400ms, GSAP clearProps has run.
   We nudge the browser to re-evaluate the CSS transition
   by touching the will-change property, ensuring the
   opacity/transform transitions are active. ─────────────── */
window.addEventListener('load', function() {
  setTimeout(function() {
    var steps = document.querySelectorAll('.wf3-step');
    steps.forEach(function(step) {
      /* Force a style recalc so the browser registers
         the CSS transition we added in v8 polish CSS */
      void step.offsetHeight; // trigger reflow
    });
  }, 420);
});

/* ── Showreel: text track / no-autoplay fallback ─────────
   If autoplay is blocked (some browsers), show a static
   cinematic placeholder with the play button prominent. ─── */
(function showreelFallback() {
  var frame  = document.querySelector('#showreel-frame');
  var iframe = document.querySelector('#showreel-iframe');
  if (!frame || !iframe) return;

  /* After 3s, if the iframe hasn't received a load event,
     show the frame as revealed anyway so it's not stuck. */
  var didLoad = false;
  iframe.addEventListener('load', function() {
    didLoad = true;
  }, { once: true });

  setTimeout(function() {
    if (!frame.classList.contains('revealed')) {
      frame.classList.add('revealed');
    }
  }, 3000);
}());

/* ── Featured case: ensure pills animate even with slow IO ─
   If the IntersectionObserver fires but the page hasn't
   painted yet, the CSS transition may be skipped.
   We double-check with a rAF after reveal class is set. ─── */
(function fcPillSafety() {
  var inner = document.querySelector('.fc-inner');
  if (!inner) return;

  /* Watch for fc-revealed class addition */
  var mo = new MutationObserver(function(muts) {
    muts.forEach(function(m) {
      if (m.type === 'attributes' &&
          inner.classList.contains('fc-revealed')) {
        /* Nudge layout for transition to fire */
        requestAnimationFrame(function() {
          void inner.offsetHeight;
          mo.disconnect();
        });
      }
    });
  });
  mo.observe(inner, { attributes: true, attributeFilter: ['class'] });
}());

/* ── Performance: pause marquee when not visible (off-screen only, not hover) ─
   IntersectionObserver stops the CSS animation when the
   logo section is outside the viewport. ─────────────────── */
(function pauseMarqueeOffscreen() {
  var track = document.querySelector('.marquee-track');
  if (!track || track.dataset.vsFinalBound || track.dataset.offscreenBound) return;
  track.dataset.offscreenBound = '1';
  var wall  = document.querySelector('.marquee-wall');
  if (!wall) return;

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      track.style.animationPlayState =
        e.isIntersecting ? 'running' : 'paused';
    });
  }, { threshold: 0 });
  io.observe(wall);
}());

/* ── Engine ready ────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════
   VISION STUDIO — UPGRADE v9
   Tasks: Client Trust Marquee A11y · Workflow IO Fix (clean)
          Portfolio Tags Always Visible · Blog hover ·
          Testimonial border entrance · About dividers
   ═══════════════════════════════════════════════════════ */

/* ── TASK 8 (v9): Workflow — pure IntersectionObserver ──
   Replace all scroll-event and GSAP scrub approaches with
   a clean IntersectionObserver for each step node.
   Each step gets .lit when its centre is in the viewport.
   The spine fill uses a CSS height transition driven by
   the highest lit step index.
   ─────────────────────────────────────────────────────── */
/* initWorkflowIntersection (v9) — deferred to vs-final.js buildTimeline which
   runs at load+400ms and is the authoritative workflow timeline owner.
   Keeping as no-op to preserve file structure. */
(function initWorkflowIntersection() { /* no-op: owned by vs-final.js buildTimeline */ }());


/* ── TASK 2 (v9): Client Trust marquee accessibility ────
   Pause on focus; resume on blur. Also handles SVG logos
   that may not have natural dimensions — fix via CSS class.
   ─────────────────────────────────────────────────────── */
(function initClientTrustMarquee() {
  'use strict';

  var track = document.querySelector('.ct-track');
  if (!track) return;

  track.addEventListener('focusin',  function() { track.style.animationPlayState = 'paused'; });
  track.addEventListener('focusout', function() { track.style.animationPlayState = 'running'; });

  // Pause when section is off-screen (performance)
  var wall = document.querySelector('.ct-marquee');
  if (wall) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        track.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
      });
    }, { threshold: 0 });
    io.observe(wall);
  }

  // SVG logo sizing fix — ensure SVGs display correctly
  var imgs = track.querySelectorAll('img');
  imgs.forEach(function(img) {
    img.addEventListener('load', function() {
      img.classList.add('loaded');
    }, { once: true });
    if (img.complete) img.classList.add('loaded');
  });
}());


/* ── TASK 5 (v9): Portfolio category tags — always visible ─
   Ensure .pf-top is always partially visible (not hidden
   by GSAP initial set). Override after grid is built.
   ─────────────────────────────────────────────────────── */
(function ensurePortfolioTagsVisible() {
  'use strict';

  function patch() {
    var grid = document.getElementById('pf-grid');
    if (!grid || !grid.children.length) {
      setTimeout(patch, 150);
      return;
    }
    var tops = grid.querySelectorAll('.pf-top');
    tops.forEach(function(el) {
      // Override GSAP initial transform to always show
      el.style.transform = 'translateY(0)';
      el.style.opacity   = '0.8';
      el.style.transition = 'opacity .3s ease';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 400); });
  } else {
    setTimeout(patch, 400);
  }
}());


/* ── TASK 7 (v9): About section divider entrance ────────
   Fade in the ::after pseudo-dividers using a data attr
   trick — we animate an actual element instead.
   ─────────────────────────────────────────────────────── */
(function initAboutDividers() {
  'use strict';

  var aboutSection = document.querySelector('.about-grid');
  if (!aboutSection) return;

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('about-dividers-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  io.observe(aboutSection);
}());


/* ── TASK 9 (v9): Testimonial cards — stagger border reveal ─
   Cards already animate via GSAP/CSS. We add a short delay
   before the gold border appears to create a premium feel.
   ─────────────────────────────────────────────────────── */
(function initTestimonialBorders() {
  'use strict';

  var cards = document.querySelectorAll('.testi-card');
  if (!cards.length) return;

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e, idx) {
      if (!e.isIntersecting) return;
      var card = e.target;
      setTimeout(function() {
        card.style.borderColor = 'rgba(200,168,90,0.15)';
      }, idx * 120);
      io.unobserve(card);
    });
  }, { threshold: 0.3 });

  cards.forEach(function(c) { io.observe(c); });
}());


/* ── TASK 10 (v9): Blog card gold border on hover ───────
   CSS already handles the :hover state. This JS adds
   a one-shot GSAP sweep when a card is first hovered.
   ─────────────────────────────────────────────────────── */
(function initBlogHoverEnhancement() {
  'use strict';

  if (typeof gsap === 'undefined') return;

  var cards = document.querySelectorAll('.blog-card');
  cards.forEach(function(card) {
    var swept = false;

    /* Set layout properties at init time — not on first hover */
    card.style.position = 'relative';
    card.style.overflow = 'hidden';

    card.addEventListener('mouseenter', function() {
      if (swept) return;
      swept = true;

      // Inject a one-shot sweep span for the card
      var sweep = document.createElement('span');
      sweep.setAttribute('aria-hidden', 'true');
      sweep.style.cssText = [
        'position:absolute', 'top:0', 'left:-65%', 'width:40%', 'height:100%',
        'background:linear-gradient(100deg,transparent 0%,rgba(200,168,90,.06) 40%,rgba(220,195,120,.15) 55%,rgba(200,168,90,.06) 70%,transparent 100%)',
        'transform:skewX(-10deg)', 'pointer-events:none', 'z-index:3', 'opacity:0',
        'will-change:left,opacity'
      ].join(';');
      card.appendChild(sweep);

      gsap.fromTo(sweep,
        { left: '-65%', opacity: 0 },
        { left: '115%', opacity: 1, duration: 0.7, ease: 'power2.out',
          onComplete: function() { sweep.style.opacity = '0'; } }
      );
    }, { passive: true });
  });
}());


/* ── v10 stats active ──────────────────────────────────── */


/* ═══════════════════════════════════════════════════════════════════
   VISION STUDIO — SERVICE CARD 3D TILT + SWEEP  v18.1
   Lightweight vanilla JS — no external deps required
   ═══════════════════════════════════════════════════════════════════ */
(function initServiceCardTilt() {
  'use strict';

  /* Only run on pointer-capable (non-touch) devices */
  if (!window.matchMedia('(hover: hover)').matches) return;
  /* Bail on reduced-motion preference */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cards = document.querySelectorAll('.szv-cine-card');
  if (!cards.length) return;

  /* ── Config ── */
  var MAX_TILT    = 9;     /* degrees max tilt on each axis     */
  var LIFT_PX     = 7;     /* translateY on hover (px)          */
  var RESET_MS    = 600;   /* spring-back duration (ms)         */
  var EASE_SPRING = 'cubic-bezier(0.34,1.56,0.64,1)'; /* spring */
  var EASE_LEAVE  = 'cubic-bezier(0.76,0,0.24,1)';    /* film   */

  /* ── Sweep factory ── */
  function createSweep(card) {
    var el = document.createElement('span');
    el.className   = 'szv-sweep';
    el.setAttribute('aria-hidden', 'true');
    card.appendChild(el);
    return el;
  }

  /* ── Per-card setup ── */
  cards.forEach(function(card) {
    var sweep   = createSweep(card);
    var rafId   = null;
    var isIn    = false;
    var tiltX   = 0;
    var tiltY   = 0;

    /* Smooth rAF lerp state */
    var curX = 0, curY = 0;
    var tarX = 0, tarY = 0;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function tick() {
      curX = lerp(curX, tarX, 0.12);
      curY = lerp(curY, tarY, 0.12);

      /* Stop rAF when close enough and mouse has left */
      if (!isIn && Math.abs(curX) < 0.05 && Math.abs(curY) < 0.05) {
        curX = 0; curY = 0;
        applyTransform(0, 0, 0, EASE_LEAVE);
        rafId = null;
        return;
      }

      applyTransform(curX, curY, isIn ? LIFT_PX : 0, null);
      rafId = requestAnimationFrame(tick);
    }

    function applyTransform(rx, ry, lift, easing) {
      var t = easing
        ? 'transform ' + RESET_MS + 'ms ' + easing
        : 'none';
      card.style.transition = [
        'background 0.5s cubic-bezier(0.76,0,0.24,1)',
        'box-shadow 0.5s cubic-bezier(0.76,0,0.24,1)',
        (easing ? 'transform ' + RESET_MS + 'ms ' + easing : '')
      ].filter(Boolean).join(', ');

      card.style.transform =
        'perspective(1200px) ' +
        'rotateX(' + rx.toFixed(3) + 'deg) ' +
        'rotateY(' + ry.toFixed(3) + 'deg) ' +
        'translateY(' + (-lift) + 'px) ' +
        'translateZ(0)';
    }

    /* ── Mouse enter ── */
    card.addEventListener('mouseenter', function() {
      isIn = true;

      /* Gold sweep: animate left → right using rAF for smoothness */
      sweep.style.transition = 'none';
      sweep.style.opacity    = '1';
      sweep.style.left       = '-80%';

      var start = null;
      var dur   = 680; /* ms */

      function animateSweep(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        /* ease-out cubic */
        var eased = 1 - Math.pow(1 - p, 3);
        var left  = -80 + eased * (210); /* -80% → 130% */
        sweep.style.left    = left + '%';
        sweep.style.opacity = p < 0.8 ? '1' : (1 - (p - 0.8) / 0.2).toString();
        if (p < 1) requestAnimationFrame(animateSweep);
        else { sweep.style.opacity = '0'; sweep.style.left = '-80%'; }
      }
      requestAnimationFrame(animateSweep);

      /* Start tilt loop */
      if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: true });

    /* ── Mouse move ── */
    card.addEventListener('mousemove', function(e) {
      var rect  = card.getBoundingClientRect();
      var normX = (e.clientX - rect.left)  / rect.width  - 0.5; /* -0.5 → 0.5 */
      var normY = (e.clientY - rect.top)   / rect.height - 0.5;

      /* rotateY positive = right side comes forward */
      tarY =  normX * MAX_TILT;
      /* rotateX positive = bottom comes forward */
      tarX = -normY * MAX_TILT;

      if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: true });

    /* ── Mouse leave ── */
    card.addEventListener('mouseleave', function() {
      isIn = false;
      tarX = 0;
      tarY = 0;
      /* rAF loop will lerp back and stop itself */
      if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: true });
  });

}());

/* ═══════════════════════════════════════════════════════
   VISION STUDIO — ANIMATION ENGINE v19
   Scroll Progress (lerp) · Timeline Reveal · Shiny Text
   Enhanced IntersectionObserver · Hover Cleanup
   ═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   1. SMOOTH SCROLL PROGRESS LINE
   Algorithm: lerp-based smoothing via rAF loop.
   
   targetProgress = actual scroll percentage (0–100)
   currentProgress += (targetProgress - currentProgress) * SMOOTH_FACTOR
   
   SMOOTH_FACTOR of 0.06 creates a ~16-frame lag at 60fps,
   making the bar feel like it "follows" the scroll with
   a cinematic, inertial quality — never instantly jumping.
   ───────────────────────────────────────────────────── */
(function initScrollProgress() {
  const bar = document.getElementById('vs-progress');
  if (!bar) return;

  // Skip on low-power / reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bar.style.display = 'none';
    return;
  }

  const SMOOTH_FACTOR = 0.06;   // Lower = smoother/slower, higher = snappier
  const SHOW_THRESHOLD = 50;    // px scrolled before bar appears

  let currentProgress = 0;      // The displayed value (lerped)
  let targetProgress  = 0;      // The real scroll value
  let rafId = null;
  let isVisible = false;

  // Calculate real scroll progress (0–100)
  function getScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;
    return Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
  }

  // Scroll-driven rAF — only runs while lerping (stops when settled)
  let settling = false;

  function tick() {
    targetProgress = getScrollProgress();

    const prev = currentProgress;
    currentProgress += (targetProgress - currentProgress) * SMOOTH_FACTOR;

    if (currentProgress < 0.05) currentProgress = 0;
    if (currentProgress > 99.95) currentProgress = 100;

    bar.style.width = currentProgress + '%';

    const scrolled = window.scrollY > SHOW_THRESHOLD;
    if (scrolled !== isVisible) {
      isVisible = scrolled;
      bar.style.opacity = isVisible ? '1' : '0';
      bar.classList.toggle('active', isVisible && currentProgress > 1);
    }

    // Keep looping until progress has settled (diff < 0.01)
    if (Math.abs(currentProgress - targetProgress) > 0.01) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      settling = false;
    }
  }

  // Trigger rAF only on scroll events
  function onScroll() {
    if (!rafId) {
      settling = true;
      rafId = requestAnimationFrame(tick);
    }
  }

  // Init
  bar.style.opacity = '0';
  bar.style.transition = 'opacity 0.6s var(--ease-film, cubic-bezier(0.76,0,0.24,1))';
  window.addEventListener('scroll', onScroll, { passive: true });
  // Run once to set initial state
  tick();
})();


/* ─────────────────────────────────────────────────────
   2. CINEMATIC TIMELINE REVEAL
   Animates the horizontal timeline in .szv-timeline-track:
   — Steps fade in with stagger on scroll into viewport
   — Gold line animates across after steps start appearing
   ───────────────────────────────────────────────────── */
(function initTimelineReveal() {
  const track = document.getElementById('szv-timeline');
  if (!track) return;

  const steps = track.querySelectorAll('.szv-timeline-step');
  if (!steps.length) return;

  // Reduced motion: instant reveal
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    steps.forEach(s => s.classList.add('step-in'));
    track.classList.add('line-animate');
    return;
  }

  let revealed = false;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || revealed) return;
      revealed = true;
      io.disconnect();

      // Stagger each step in
      steps.forEach((step, i) => {
        setTimeout(() => {
          step.classList.add('step-in');
        }, i * 160);
      });

      // Animate the gold connecting line — slight delay after first step
      setTimeout(() => {
        track.classList.add('line-animate');
      }, 200);
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px 0px -60px 0px'
  });

  io.observe(track);
})();


/* ─────────────────────────────────────────────────────
   3. ENHANCED SCROLL REVEAL — replaces/upgrades initReveal
   Upgrades data-reveal-group for staggered child reveals,
   and tightens threshold/rootMargin for better timing.
   ───────────────────────────────────────────────────── */
(function upgradeScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-reveal], [data-reveal-group]').forEach(el => {
      el.classList.add('in');
    });
    return;
  }

  // Upgrade existing [data-reveal] observer with better config
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el  = e.target;
      const del = parseInt(el.dataset.delay || 0, 10);
      setTimeout(() => el.classList.add('in'), del);
      revealIO.unobserve(el);
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('[data-reveal]').forEach(el => {
    // Don't double-observe already-revealed elements
    if (!el.classList.contains('in')) {
      el.dataset.revealObserved = '1';
      revealIO.observe(el);
    }
  });

  // New: group stagger reveal
  const groupIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      groupIO.unobserve(e.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -30px 0px'
  });

  document.querySelectorAll('[data-reveal-group]').forEach(el => {
    if (!el.classList.contains('in')) {
      groupIO.observe(el);
    }
  });
})();


/* ─────────────────────────────────────────────────────
   4. HOVER INTERACTION CLEANUP
   Ensures all interactive elements have consistent
   pointer cursor (custom cursor already handles desktop)
   and removes any overflow artifacts.
   ───────────────────────────────────────────────────── */
(function cleanHoverInteractions() {
  // Ensure consistent cursor on touch devices (where custom cursor is hidden)
  const isTouchDevice = window.matchMedia('(hover: none)').matches;
  if (isTouchDevice) {
    document.documentElement.style.setProperty('cursor', 'auto');
    document.querySelectorAll('button, a, [role="button"]').forEach(el => {
      el.style.cursor = 'pointer';
    });
  }

  // Prevent overflow flash on srv-cards during hover
  document.querySelectorAll('.srv-card, .szv-cine-card, .pf-card').forEach(card => {
    card.style.isolation = 'isolate';
  });
})();


/* ─────────────────────────────────────────────────────
   5. RESPONSIVE ANIMATION GATE
   Disables heavy animations on mobile/low-power devices.
   Threshold: screen width < 480px or deviceMemory < 2GB
   ───────────────────────────────────────────────────── */
(function gateAnimationsForDevice() {
  const isLowPower = (
    (navigator.deviceMemory !== undefined && navigator.deviceMemory < 2) ||
    (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency < 4)
  );
  const isMobileSmall = window.innerWidth < 480;

  if (isLowPower || isMobileSmall) {
    // Disable GSAP-heavy particle/parallax effects if running
    document.documentElement.classList.add('low-power-mode');

    // Keep scroll reveal but speed it up
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.style.transitionDuration = '0.5s';
    });
  }
})();



/* ─────────────────────────────────────────────────────
   PREMIUM POLISH v11 — Scroll Progress + Micro-interactions
   ───────────────────────────────────────────────────── */

/* ── Section title underline reveal via IntersectionObserver ── */
(function initSectionTitleReveal() {
  const els = document.querySelectorAll('.section-title-line');
  if (!els.length) return;
  const io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  els.forEach(function(el) { io.observe(el); });
})();

/* ── Stat counter gold shimmer ── */
(function patchStatCounters() {
  const nums = document.querySelectorAll('.stat-num, .fc-pill-n');
  if (!nums.length) return;
  const io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add('counting');
        setTimeout(function() { el.classList.remove('counting'); }, 2000);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.6 });
  nums.forEach(function(el) { io.observe(el); });
})();

/* ── Service card arrow injection ── */
(function addSrvArrows() {
  document.querySelectorAll('.srv-card').forEach(function(card) {
    if (card.querySelector('.srv-arrow')) return;
    const arrow = document.createElement('span');
    arrow.className = 'srv-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = 'Részletek';
    card.appendChild(arrow);
  });
})();

/* ── Lazy image fade-in — handled by initLazyImages() above (Task 6) ── */


/* ============================================================
   SECTION: redesign-v18.js — merged in
   cursor iframe fix, play button upgrade,
   hero frame counter, service ghost numbers
   ============================================================ */

/* ═══════════════════════════════════════════════════════
   VISION STUDIO — CINEMATIC REDESIGN JS v18
   3 Bug Fixes + Visual Enhancements
   ═══════════════════════════════════════════════════════ */
'use strict';
(function VisionRedesignV18() {
  var qs  = function(s,c){ return (c||document).querySelector(s); };
  var qsa = function(s,c){ return Array.from((c||document).querySelectorAll(s)); };

  /* ════════════════════════════════════════════════════
     BUG FIX 2 — VIDEO IFRAME CURSOR COVERAGE
     Vimeo/YouTube iframes swallow all mousemove events,
     causing the custom gold cursor dot to freeze at the
     edge of the iframe. We inject a transparent overlay
     on non-interactive video containers that re-broadcasts
     mousemove to keep the cursor alive.
     ══════════════════════════════════════════════════ */
  function fixVideoIframeCursor() {
    var dot  = qs('#cur-dot');
    var ring = qs('#cur-ring');
    if (!dot) return; // Touch device — no custom cursor

    function applyOverlay(container) {
      if (!container || container.dataset.cursorFixed) return;
      container.dataset.cursorFixed = '1';

      var cs = getComputedStyle(container);
      if (cs.position === 'static') container.style.position = 'relative';

      var overlay = document.createElement('div');
      overlay.className = 'vid-cursor-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      container.appendChild(overlay);

      // Route mouse tracking through overlay
      overlay.addEventListener('mousemove', function(e) {
        dot.style.left = e.clientX + 'px';
        dot.style.top  = e.clientY + 'px';
      }, { passive: true });

      overlay.addEventListener('mouseenter', function() {
        document.body.classList.remove('cur-hover');
        document.body.classList.add('cur-video');
      });
      overlay.addEventListener('mouseleave', function() {
        document.body.classList.remove('cur-video');
      });

      // On click: dismiss overlay so the user can interact with controls
      overlay.addEventListener('click', function() {
        overlay.classList.add('dismissed');
        overlay.style.pointerEvents = 'none';
        /* Remove from DOM after CSS transition (0.3s) to avoid memory accumulation */
        setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 400);
      }, { once: true });
    }

    var videoContainers = [
      '.vid-showcase-screen',
      '.cs-video-frame',
      '.showreel-frame'
    ];

    videoContainers.forEach(function(sel) {
      qsa(sel).forEach(applyOverlay);
    });

    // Watch for dynamically added containers (e.g. after filter)
    new MutationObserver(function() {
      videoContainers.forEach(function(sel) {
        qsa(sel + ':not([data-cursor-fixed])').forEach(applyOverlay);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ════════════════════════════════════════════════════
     BUG FIX 3 — PORTFOLIO PLAY BUTTON: CINEMATIC REDESIGN
     The old ring+triangle combo looks generic and feels
     out of place on autoplay hover-preview cards.
     We replace the inner HTML with an editorial PLAY
     treatment: aperture circle + PLAY word + horizontal lines.
     ══════════════════════════════════════════════════ */
  function upgradePfPlayButtons() {
    function inject() {
      qsa('.pf-play-btn').forEach(function(btn) {
        if (btn.dataset.upgraded) return;
        btn.dataset.upgraded = '1';
        btn.innerHTML = [
          '<div class="pf-play-cinematic" aria-hidden="true">',
            '<span class="pf-play-line-top"></span>',
            '<div class="pf-play-text-wrap">',
              '<div class="pf-play-aperture"></div>',
              '<span class="pf-play-word">Lejátszás</span>',
            '</div>',
            '<span class="pf-play-line-bottom"></span>',
          '</div>'
        ].join('');
      });
    }

    // Initial inject after portfolio builds
    setTimeout(inject, 500);
    // Re-inject after filter clicks
    document.addEventListener('click', function(e) {
      if (e.target.closest && e.target.closest('.pf-pill')) {
        setTimeout(inject, 400);
      }
    });
  }

  /* ════════════════════════════════════════════════════
     BUG FIX 1 (JS reinforcement) — BLOG CTA ALIGNMENT
     CSS handles the grid fix. JS ensures the button is
     always the last child so grid-column:2 targets it.
     ══════════════════════════════════════════════════ */
  function fixBlogCtaAlignment() {
    qsa('.blog-cta').forEach(function(cta) {
      var btn = qs('.btn-gold', cta);
      if (btn && btn !== cta.lastElementChild) {
        cta.appendChild(btn);
      }
    });
  }

  /* ════════════════════════════════════════════════════
     HERO FILM HUD — Camera viewfinder frame counter
     Adds a cinematic REC + frame number to the hero,
     referencing real cinema camera HUDs (Arri, RED).
     ══════════════════════════════════════════════════ */
  function initHeroFrameCounter() {
    var hero = qs('#hero');
    if (!hero || qs('.hero-frame-counter', hero)) return;
    if (window.innerWidth < 900) return; // Desktop only

    var counter = document.createElement('div');
    counter.className = 'hero-frame-counter';
    counter.setAttribute('aria-hidden', 'true');
    counter.innerHTML = [
      '<span class="hero-frame-rec">REC</span>',
      '<span class="hero-frame-num">0001</span>',
      '<span class="hero-frame-label">&nbsp;·&nbsp;24fps&nbsp;·&nbsp;4K</span>'
    ].join('');
    hero.appendChild(counter);

    var numEl = qs('.hero-frame-num', counter);
    var frame = 1;

    function tick() {
      frame = (frame + 1) % 10000;
      numEl.textContent = ('000' + frame).slice(-4);
    }

    // Only tick while hero is visible
    var interval = null;
    new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        if (!interval) interval = setInterval(tick, 83); // ~12fps
      } else {
        clearInterval(interval);
        interval = null;
      }
    }, { threshold: 0.1 }).observe(hero);
  }

  /* ════════════════════════════════════════════════════
     SERVICES — Ghost number watermarks
     Large editorial numerals behind each card for depth.
     ══════════════════════════════════════════════════ */
  function initSrvNumbers() {
    qsa('.srv-card').forEach(function(card, i) {
      if (qs('.srv-num', card)) return;
      var num = document.createElement('span');
      num.className = 'srv-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = ('0' + (i + 1)).slice(-2);
      card.appendChild(num);
    });
  }

  /* ════════════════════════════════════════════════════
     FEATURED CASE STUDY — Scroll reveal
     ══════════════════════════════════════════════════ */
  function initFeaturedCase() {
    var inner = qs('.fc-inner[data-fc-reveal]');
    /* Skip if main.js initFeaturedCaseReveal already bound this element */
    if (!inner || inner.classList.contains('fc-revealed') || inner.dataset.fcBound) return;
    inner.dataset.fcBound = '1';
    new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        inner.classList.add('fc-revealed');
        this.disconnect();
      }
    }, { threshold: 0.2 }).observe(inner);
  }

  /* ════════════════════════════════════════════════════
     SHOWREEL — Clip-path reveal
     ══════════════════════════════════════════════════ */
  function initShowreelReveal() {
    var frame = qs('.showreel-frame');
    /* initShowreel() in main.js owns the showreel reveal — skip here */
    if (!frame || frame.dataset.showreelBound) return;
    frame.dataset.showreelBound = '1';
    new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        frame.classList.add('revealed');
        this.disconnect();
      }
    }, { threshold: 0.15 }).observe(frame);
  }

  /* ════════════════════════════════════════════════════
     WORKFLOW V3 — CSS fallback reveal
     Only fires when GSAP is unavailable.
     ══════════════════════════════════════════════════ */
  function initWorkflowFallback() {
    if (typeof gsap !== 'undefined') return;
    var section = qs('#workflow-v2');
    if (!section) return;
    var steps = qsa('.wf3-step', section);
    if (!steps.length) return;
    new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (!e.isIntersecting) return;
        var idx = steps.indexOf(e.target);
        setTimeout(function() {
          e.target.classList.add('lit');
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateX(0)';
        }, idx * 200);
        this.unobserve(e.target);
      }.bind(this));
    }, { threshold: 0.2 }).observe.apply(
      new IntersectionObserver(function(){}),
      steps
    );
  }

  /* ════════════════════════════════════════════════════
     CURSOR SOUND HOOKS (if CinemaSound exists)
     ══════════════════════════════════════════════════ */
  function hookCinemaSound() {
    if (typeof CinemaSound === 'undefined') return;
    document.addEventListener('mouseenter', function(e) {
      var t = e.target;
      if ((t.closest && (t.closest('.pf-play-btn') || t.closest('.btn-gold') || t.closest('.showreel-play')))) {
        CinemaSound.hover();
      }
    }, { capture: true, passive: true });
  }

  /* ════════════════════════════════════════════════════
     INITIALISE
     ══════════════════════════════════════════════════ */
  function init() {
    fixBlogCtaAlignment();
    initFeaturedCase();
    initShowreelReveal();
    initWorkflowFallback();

    setTimeout(function() {
      fixVideoIframeCursor();
      upgradePfPlayButtons();
      initHeroFrameCounter();
      initSrvNumbers();
      hookCinemaSound();
    }, 280);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Second pass after all lazy components finish
  window.addEventListener('load', function() {
    setTimeout(function() {
      upgradePfPlayButtons();
      initSrvNumbers();
      fixBlogCtaAlignment();
    }, 900);
  });

}());


/* ============================================================
   SECTION: vs-final.js — merged in
   FAQ override (data-vsBound guard), process timeline,
   WhatsApp button, nav active state, marquee
   ============================================================ */

/* ═══════════════════════════════════════════════════════════════
   VISION STUDIO — PRODUCTION POLISH v20
   Single authoritative JS. Loaded last.
   Owns: FAQ · Timeline · WhatsApp · Nav Active · Marquee
   ═══════════════════════════════════════════════════════════════ */
(function VSPolish20() {
  'use strict';

  var $ = function(s, c) { return (c || document).querySelector(s); };
  var $$ = function(s, c) { return Array.from((c || document).querySelectorAll(s)); };

  /* ════════════════════════════════════════════════════════════
     1. FAQ — grid-template-rows 0fr → 1fr
        No max-height. No JS height measurement. Zero lag.
        Multiple items open simultaneously (toggle, not accordion).
        Kills main.js initFaq before it runs.
     ══════════════════════════════════════════════════════════ */
  function buildFAQ() {

    /* Patch out the main.js initFaq so it becomes a no-op */
    try { window.initFaq = function() {}; } catch(e) {}

    $$('.faq-item').forEach(function(item) {

      /* ── 1a. Ensure we have a button.faq-q ── */
      var btn = $('button.faq-q', item);
      if (!btn) {
        var oldQ = $('div.faq-q, summary.faq-q, [class*="faq-q"]', item);
        if (!oldQ) return;
        btn = document.createElement('button');
        btn.className = 'faq-q';
        btn.type = 'button';
        btn.textContent = (oldQ.textContent || '').replace(/[＋✕+×]/g, '').trim();
        oldQ.parentNode.replaceChild(btn, oldQ);
      }

      /* Strip any icon chars from the text node */
      var textNode = btn.firstChild;
      if (textNode && textNode.nodeType === 3) {
        textNode.textContent = textNode.textContent.replace(/[＋✕+×]/g, '').trim();
      }

      /* ── 1b. Ensure .faq-arrow chevron inside button ── */
      if (!$('.faq-arrow', btn)) {
        var arrow = document.createElement('span');
        arrow.className = 'faq-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        btn.appendChild(arrow);
      }

      /* ── 1c. Remove stale .faq-icon elements ── */
      $$('.faq-icon', item).forEach(function(el) { el.remove(); });

      /* ── 1d. Ensure .faq-body > .faq-body-inner structure ── */
      var body = item.querySelector(':scope > .faq-body');
      if (!body) {
        body = document.createElement('div');
        body.className = 'faq-body';
        var answer = $('.faq-a', item);
        if (answer && answer.parentNode === item) {
          item.appendChild(body);
          body.appendChild(answer);
        }
      }
      if (body && !$('.faq-body-inner', body)) {
        var inner = document.createElement('div');
        inner.className = 'faq-body-inner';
        while (body.firstChild) inner.appendChild(body.firstChild);
        body.appendChild(inner);
      }

      /* ── 1e. Strip inline max-height — grid handles open/close ── */
      if (body) {
        body.style.removeProperty('max-height');
        body.style.removeProperty('transition');
      }

      /* ── 1f. Normalise open state to vs-open class ── */
      var isOpen = item.classList.contains('vs-open') || item.classList.contains('open');
      item.classList.remove('open');
      if (isOpen) item.classList.add('vs-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    });

    /* ── 1g. Bind click — prevent duplicate binding with data flag ── */
    $$('.faq-item').forEach(function(item) {
      var btn = $('button.faq-q', item);
      if (!btn || btn.dataset.vsBound) return;
      btn.dataset.vsBound = '1';

      btn.addEventListener('click', function() {
        var open = item.classList.toggle('vs-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      btn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });
  }

  /* ════════════════════════════════════════════════════════════
     2. PROCESS TIMELINE — clean IntersectionObserver, single owner
        Runs AFTER all other scripts (load + 700ms) to ensure
        it's the last word on step visibility.
        Recreates IO after reset so already-visible steps fire.
     ══════════════════════════════════════════════════════════ */
  function buildTimeline() {
    var section   = $('#workflow-v2');
    var spineFill = $('#wf3-spine-fill');
    var steps     = $$('.wf3-step');
    if (!section || !spineFill || !steps.length) return;

    var activeIO = null;

    function killGSAP() {
      if (typeof ScrollTrigger !== 'undefined') {
        try {
          ScrollTrigger.getAll().forEach(function(st) {
            if (st.trigger === section || (st.vars && st.vars.trigger === section)) st.kill();
          });
        } catch(e) {}
      }
      if (typeof gsap !== 'undefined') {
        try { gsap.set(steps, { clearProps: 'all' }); } catch(e) {}
      }
    }

    function resetSteps() {
      if (activeIO) { activeIO.disconnect(); activeIO = null; }
      steps.forEach(function(s) {
        s.classList.remove('lit', 'vs-lit');
        s.style.removeProperty('opacity');
        s.style.removeProperty('transform');
      });
      spineFill.style.height = '0%';
    }

    function startIO() {
      if (activeIO) activeIO.disconnect();

      var litCount = 0;

      activeIO = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          var idx = steps.indexOf(entry.target);
          if (idx === -1) return;

          if (entry.isIntersecting) {
            litCount = Math.max(litCount, idx + 1);
            /* Small stagger per step index */
            (function(step, delay) {
              setTimeout(function() { step.classList.add('vs-lit'); }, delay);
            })(entry.target, idx * 80);
          } else if (entry.boundingClientRect.top > window.innerHeight * 0.6) {
            litCount = Math.min(litCount, idx);
            entry.target.classList.remove('vs-lit');
          }

          var pct = (litCount / steps.length) * 100;
          spineFill.style.height = pct + '%';
        });
      }, { threshold: 0.3 });

      steps.forEach(function(s) { activeIO.observe(s); });
    }

    /* Run after all other scripts (initWorkflowV3 at ~200ms, initWorkflowIntersection at ~500ms) */
    window.addEventListener('load', function() {
      /* 400ms: enough for initWorkflowIntersection (load+500ms wins if needed)
         but short enough to avoid a visible flash on already-scrolled pages */
      setTimeout(function() {
        killGSAP();
        /* Only reset if GSAP left inline opacity on steps (avoids flash) */
        var needsReset = steps.some(function(s) {
          return s.style.opacity === '0' || s.style.transform;
        });
        if (needsReset) resetSteps();
        startIO();    /* fresh IO — fires immediately for in-viewport steps */
      }, 400);
    });
  }

  /* ════════════════════════════════════════════════════════════
     3. WHATSAPP BUTTON
     ══════════════════════════════════════════════════════════ */
  function buildWhatsApp() {
    if ($('#vs-whatsapp')) return;

    var wrap = document.createElement('div');
    wrap.id = 'vs-whatsapp';

    var label = document.createElement('span');
    label.className = 'vs-wa-label';
    label.textContent = 'WhatsApp';

    var link = document.createElement('a');
    link.className = 'vs-wa-link';
    link.href = 'https://wa.me/36303462267';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Írjon nekünk WhatsApp-on');
    link.innerHTML =
      '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">' +
        '<path d="M16 0C7.163 0 0 7.163 0 16c0 2.833.738 5.49 2.028 7.8L0 32l8.456-2.01' +
        'A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0z"/>' +
        '<path fill="#1a1a1a" d="M16 29.5a13.42 13.42 0 01-6.72-1.8l-.48-.28-5.02 1.31' +
        ' 1.34-4.88-.3-.5A13.45 13.45 0 012.5 16C2.5 8.82 8.82 2.5 16 2.5S29.5 8.82 29.5 16' +
        ' 23.18 29.5 16 29.5z"/>' +
        '<path d="M23.3 19.3c-.37-.18-2.17-1.07-2.5-1.19-.34-.12-.58-.18-.83.18s-.95 1.19-1.16' +
        ' 1.44-.43.27-.8.09c-.37-.18-1.56-.58-2.97-1.84-1.1-.98-1.84-2.2-2.06-2.57-.21-.37' +
        '-.02-.57.16-.75.16-.16.37-.43.55-.64.18-.21.24-.37.37-.61.12-.25.06-.46-.03-.64' +
        '-.09-.18-.83-2-.1-2.74-.3-.73-.6-.63-.83-.64h-.7c-.25 0-.65.09-.98.46-.34.37-1.29' +
        ' 1.26-1.29 3.08s1.32 3.57 1.5 3.82c.18.24 2.6 3.97 6.3 5.57.88.38 1.57.61 2.1.78' +
        '.88.28 1.69.24 2.32.15.71-.1 2.17-.89 2.48-1.75.3-.86.3-1.59.21-1.75-.09-.15-.34-.24-.71-.42z"/>' +
      '</svg>';

    wrap.appendChild(label);
    wrap.appendChild(link);
    document.body.appendChild(wrap);
  }

  /* ════════════════════════════════════════════════════════════
     4. NAV ACTIVE STATE
     ══════════════════════════════════════════════════════════ */
  function setNavActive() {
    var menu = $('.nav-menu');
    if (!menu) return;

    // Normalize current path: strip leading slash, trailing slash, and /index.html
    var raw = window.location.pathname.replace(/^\//, '');
    var normalPath = raw
      .replace(/\/index\.html$/, '')
      .replace(/^index\.html$/, '')
      .replace(/\/$/, '');

    // Top-level folder segment (e.g. 'portfolio', 'iparagak', 'blog.html')
    var topSegment = normalPath.split('/')[0];
    var topBase    = topSegment.replace(/\.html$/, '');

    $$('a', menu).forEach(function(a) {
      a.classList.remove('active');
      var href = (a.getAttribute('href') || '').replace(/^\//, '').replace(/^\.\//, '');
      if (!href) return;

      // Normalize link the same way
      var normalHref = href
        .replace(/\/index\.html$/, '')
        .replace(/^index\.html$/, '')
        .replace(/\/$/, '');
      var hrefBase = normalHref.replace(/\.html$/, '');

      var match = false;

      // Exact path match
      if (normalHref === normalPath) match = true;

      // Section match: top-level nav link covers its sub-pages
      // e.g. portfolio.html stays active on portfolio/bosch-corporate.html
      // e.g. iparagak/index.html stays active on iparagak/b2b-video.html
      if (!match && hrefBase !== '' && hrefBase === topBase) match = true;

      // Home page special case
      if (!match && normalPath === '' && normalHref === '') match = true;

      if (match) a.classList.add('active');
    });
  }

  /* ════════════════════════════════════════════════════════════
     5. MARQUEE — pause off-screen (performance) + keyboard-focus (a11y)
        NO hover-pause per spec. Guard prevents duplicate binding.
     ══════════════════════════════════════════════════════════ */
  function buildMarquee() {
    var track = $('.marquee-track');
    var wall  = $('.marquee-wall');
    if (!track || !wall) return;
    if (track.dataset.vsFinalBound) return; /* dedup guard */
    track.dataset.vsFinalBound = '1';

    /* Pause only when section is off-screen (performance) */
    new IntersectionObserver(function(entries) {
      track.style.animationPlayState = entries[0].isIntersecting ? 'running' : 'paused';
    }, { threshold: 0 }).observe(wall);

    /* Accessibility: pause on keyboard focus ONLY — no mouse hover pause */
    track.addEventListener('focusin',  function() { track.style.animationPlayState = 'paused'; });
    track.addEventListener('focusout', function() { track.style.animationPlayState = 'running'; });
  }

  /* ════════════════════════════════════════════════════════════
     BOOT — DOMContentLoaded
     ══════════════════════════════════════════════════════════ */
  function boot() {
    buildFAQ();
    setNavActive();
    buildWhatsApp();
    buildMarquee();
    buildTimeline(); /* sets up load listener, doesn't run GSAP kill yet */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

}());


/* ============================================================
   SECTION: vs-wipe.js — merged in
   Cinematic column wipe page transition
   ============================================================ */

/* ══════════════════════════════════════════════════════════════
   VISION STUDIO — CINEMATIC COLUMN WIPE  v3
   ──────────────────────────────────────────────────────────────
   5 vertical columns, each 20% wide, slide DOWN to cover screen.
   Gold glow on the RIGHT edge of each column (vertical divider) —
   no horizontal leading-edge shadow that causes staircase.

   OUTGOING : columns drop top → bottom, stagger left → right
   INCOMING : columns already at Y(0), rise up to reveal page
   Guard    : isNavigating flag — single-fire, no double-trigger
   bfcache  : pageshow event resets stale state
   ══════════════════════════════════════════════════════════════ */
(function initColumnWipe() {
  'use strict';

  /* ── Reduced-motion bail ─────────────────────────────── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── Config ──────────────────────────────────────────── */
  var NUM_COLS    = 5;
  var STAGGER_MS  = 28;   /* tighter stagger — snappier unified sweep */
  var DURATION_MS = 400;  /* faster cover — feels instant but still cinematic */
  var STORAGE_KEY = 'vs-wipe-in';

  /* last column finishes at: (NUM_COLS-1)*STAGGER + DURATION */
  var NAV_DELAY   = (NUM_COLS - 1) * STAGGER_MS + DURATION_MS + 10;

  /* ── Build overlay ───────────────────────────────────── */
  var wipe = document.createElement('div');
  wipe.className = 'vs-wipe';
  wipe.setAttribute('aria-hidden', 'true');
  wipe.setAttribute('role', 'presentation');

  for (var i = 0; i < NUM_COLS; i++) {
    var col = document.createElement('div');
    col.className = 'vs-wipe-col';
    wipe.appendChild(col);
  }
  document.body.appendChild(wipe);

  /* ── Navigation lock ─────────────────────────────────── */
  var isNavigating = false;

  /* ── Find closest internal anchor ───────────────────── */
  function findLink(target) {
    return target.closest ? target.closest('a[href]') : (function () {
      var el = target;
      while (el && el !== document.body) {
        if (el.tagName === 'A' && el.getAttribute('href')) return el;
        el = el.parentNode;
      }
      return null;
    }());
  }

  /* ── Should this link trigger the wipe? ─────────────── */
  function shouldWipe(link, event) {
    if (!link) return false;
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return false;
    var href = link.getAttribute('href') || '';
    if (!href || href === '#')           return false;
    if (href.charAt(0) === '#')          return false;
    if (/^(mailto|tel|http|https):/.test(href)) return false;
    if (href.indexOf('//') === 0)        return false;
    if (link.getAttribute('target') === '_blank') return false;
    if (link.hasAttribute('download'))   return false;
    return true;
  }

  /* ── Outgoing: drop columns, then navigate ───────────── */
  function runWipeOut(href) {
    if (isNavigating) return;
    isNavigating = true;

    /* Signal incoming wipe to the new page */
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}

    requestAnimationFrame(function () {
      wipe.className = 'vs-wipe vs-wipe--out';
    });

    /* Navigate once screen is fully covered */
    setTimeout(function () {
      document.body.style.overflow = '';   /* clear any modal lock */
      window.location.href = href;
    }, NAV_DELAY);
  }

  /* ── Click handler (capture phase) ──────────────────── */
  document.addEventListener('click', function (e) {
    if (isNavigating) {
      var g = findLink(e.target);
      if (g && shouldWipe(g, e)) e.preventDefault();
      return;
    }
    var link = findLink(e.target);
    if (!link || !shouldWipe(link, e)) return;
    e.preventDefault();
    runWipeOut(link.getAttribute('href'));
  }, true);

  /* ── Public API for non-anchor navigations ───────────── */
  window.vsWipeNavigate = function (href) {
    if (href && !isNavigating) runWipeOut(href);
  };

  /* ── Incoming: cover instantly, then rise up ─────────── */
  (function checkIncoming() {
    var flag = false;
    try { flag = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}
    if (!flag) return;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}

    /* Snap columns to cover position — no animation yet */
    wipe.className = 'vs-wipe vs-wipe--covered';

    /* Single rAF: paint covered state then trigger rise */
    requestAnimationFrame(function () {
      wipe.className = 'vs-wipe vs-wipe--in';

      /* After last column has risen clear */
      var clearDelay = (NUM_COLS - 1) * STAGGER_MS + DURATION_MS + 60;
      setTimeout(function () {
        wipe.className = 'vs-wipe';
      }, clearDelay);
    });
  }());

  /* ── bfcache reset ───────────────────────────────────── */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      isNavigating = false;
      wipe.className = 'vs-wipe';
    }
  });

}());

/* ── LOGO STRIP: JS RAF scroll (mobile-safe, iOS Safari compatible) ──────
   CSS animation on .logo-track stops on iOS Safari / some Android Chrome
   whenever any ancestor has overflow:hidden. JS requestAnimationFrame
   is 100% reliable across all mobile browsers.

   Strategy:
   - On TOUCH devices: take over the animation with JS rAF translateX
   - On DESKTOP: leave the CSS animation running (it works fine there)
   - Pauses when section leaves viewport (IntersectionObserver)
   ─────────────────────────────────────────────────────────────────────── */
(function initLogoSliderJS() {
  'use strict';

  /* Only override on touch/mobile — CSS animation works fine on desktop */
  /* Only run on genuine touch/mobile devices */
  if (!window.matchMedia('(pointer: coarse)').matches) return;

  var track = document.querySelector('.logo-track');
  if (!track) return;

  /* Measure total width of ONE row (Row 1) to set scroll distance */
  var row = track.querySelector('.logo-row');
  if (!row) return;

  /* Stop the CSS animation — use setProperty with 'important' to override !important CSS rules */
  track.style.setProperty('animation',         'none', 'important');
  track.style.setProperty('-webkit-animation', 'none', 'important');
  track.style.willChange = 'transform';
  /* Force GPU compositing layer */
  track.style.setProperty('-webkit-transform', 'translateX(0) translateZ(0)', 'important');
  track.style.setProperty('transform',         'translateX(0) translateZ(0)', 'important');

  var pos      = 0;       /* current translateX in px */
  var speed    = 0.9;     /* px per frame at 60fps ≈ 54px/s — matches CSS 30s animation speed */
  var rafId    = null;
  var paused   = false;
  var rowWidth = 0;

  function measureRow() {
    /* Force layout to get accurate width */
    rowWidth = row.getBoundingClientRect().width;
    if (!rowWidth) {
      /* Fallback: estimate from item count × item width */
      var items = row.querySelectorAll('.logo-item');
      rowWidth  = items.length * 152; /* 120px + 32px gap */
    }
  }

  function step() {
    if (!paused && rowWidth > 0) {
      pos -= speed;
      /* Seamless loop: when we've scrolled exactly one row's width, reset */
      if (Math.abs(pos) >= rowWidth) {
        pos = pos + rowWidth;
      }
      var t = 'translateX(' + pos + 'px) translateZ(0)';
      track.style.setProperty('transform',         t, 'important');
      track.style.setProperty('-webkit-transform', t, 'important');
    }
    rafId = requestAnimationFrame(step);
  }

  /* Pause when off-screen to save battery */
  var logoStrip = document.querySelector('.logo-strip');
  if (logoStrip && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      paused = !entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(logoStrip);
  }

  /* Start after images have a chance to load (accurate width measurement) */
  function start() {
    measureRow();
    /* Re-measure after 500ms — images may still be loading */
    setTimeout(measureRow, 500);
    rafId = requestAnimationFrame(step);
  }

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start);
  }

}());
