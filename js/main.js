(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = { cartCount: 0, carouselIndex: 0, carouselTimer: null, exitShown: false, cleanup: [] };
    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
    const on = (target, event, handler, options) => {
      if (!target) return;
      target.addEventListener(event, handler, options);
      state.cleanup.push(() => target.removeEventListener(event, handler, options));
    };
    const debounceFrame = (fn) => {
      let frame = null;
      return (...args) => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => fn(...args));
      };
    };

    const updateScrollProgress = () => {
      const bar = $('.scroll-progress');
      if (!bar) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    };

    const updateHeader = () => {
      const header = $('[data-header]');
      if (header) header.classList.toggle('scrolled', window.scrollY > 80);
    };

    const initScroll = () => {
      const handle = debounceFrame(() => { updateScrollProgress(); updateHeader(); maybeShowExitByScroll(); });
      on(window, 'scroll', handle, { passive: true });
      updateScrollProgress();
      updateHeader();
    };

    const initMobileMenu = () => {
      const toggle = $('[data-menu-toggle]');
      const menu = $('[data-mobile-menu]');
      if (!toggle || !menu) return;
      const focusableSelector = 'a, button, input, [tabindex]:not([tabindex="-1"])';
      let previousFocus = null;
      const setOpen = (open) => {
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        menu.classList.toggle('open', open);
        menu.setAttribute('aria-hidden', String(!open));
        document.body.classList.toggle('menu-open', open);
        if (open) {
          previousFocus = document.activeElement;
          const first = $(focusableSelector, menu);
          first?.focus();
        } else {
          previousFocus?.focus?.();
        }
      };
      on(toggle, 'click', () => setOpen(!menu.classList.contains('open')));
      on(menu, 'click', (event) => { if (event.target.matches('a')) setOpen(false); });
      on(document, 'keydown', (event) => {
        if (!menu.classList.contains('open')) return;
        if (event.key === 'Escape') setOpen(false);
        if (event.key !== 'Tab') return;
        const nodes = $$(focusableSelector, menu);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
    };

    const initReveal = () => {
      const items = $$('.animate-in');
      if (!items.length) return;
      if (!('IntersectionObserver' in window) || prefersReducedMotion) {
        items.forEach((item) => item.classList.add('visible'));
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
      items.forEach((item, index) => {
        if (!item.style.getPropertyValue('--delay')) item.style.setProperty('--delay', `${Math.min(index * 45, 360)}ms`);
        observer.observe(item);
      });
      state.cleanup.push(() => observer.disconnect());
    };

    const getNextMondayWarsaw = () => {
      const now = new Date();
      const warsawNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
      const day = warsawNow.getDay();
      let daysUntilMonday = (1 - day + 7) % 7;
      const target = new Date(warsawNow);
      target.setDate(warsawNow.getDate() + daysUntilMonday);
      target.setHours(18, 0, 0, 0);
      if (target <= warsawNow) target.setDate(target.getDate() + 7);
      const offset = target.getTime() - warsawNow.getTime();
      return new Date(now.getTime() + offset);
    };

    const initCountdown = () => {
      const root = $('[data-countdown]');
      if (!root) return;
      const els = { days: $('[data-days]', root), hours: $('[data-hours]', root), minutes: $('[data-minutes]', root), seconds: $('[data-seconds]', root) };
      let target = getNextMondayWarsaw();
      const pad = (num) => String(num).padStart(2, '0');
      const tick = () => {
        let diff = target.getTime() - Date.now();
        if (diff <= 0) { target = getNextMondayWarsaw(); diff = target.getTime() - Date.now(); }
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        els.days && (els.days.textContent = pad(days));
        els.hours && (els.hours.textContent = pad(hours));
        els.minutes && (els.minutes.textContent = pad(minutes));
        els.seconds && (els.seconds.textContent = pad(seconds));
      };
      tick();
      const id = setInterval(tick, 1000);
      state.cleanup.push(() => clearInterval(id));
    };

    const initTicker = () => {
      const ticker = $('[data-ticker]');
      if (!ticker || ticker.dataset.duplicated) return;
      ticker.textContent = `${ticker.textContent} ${ticker.textContent}`;
      ticker.dataset.duplicated = 'true';
    };

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const initCounter = () => {
      const counter = $('[data-counter]');
      const section = $('#newsletter');
      if (!counter || !section) return;
      let started = false;
      const run = () => {
        if (started) return;
        started = true;
        const target = Number(counter.dataset.counter || 0);
        const start = performance.now();
        const duration = prefersReducedMotion ? 1 : 2000;
        const frame = (now) => {
          const progress = Math.min(1, (now - start) / duration);
          counter.textContent = Math.round(target * easeOutCubic(progress)).toLocaleString('pl-PL');
          if (progress < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      };
      if (!('IntersectionObserver' in window)) { run(); return; }
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { run(); observer.disconnect(); } });
      }, { threshold: 0.35 });
      observer.observe(section);
      state.cleanup.push(() => observer.disconnect());
    };

    const initFaq = () => {
      const faq = $('[data-faq]');
      if (!faq) return;
      const setItem = (item, open) => {
        const button = $('button', item);
        const panel = $('.faq-panel', item);
        item.classList.toggle('open', open);
        button?.setAttribute('aria-expanded', String(open));
        if (panel) panel.style.maxHeight = open ? `${panel.scrollHeight}px` : '0px';
      };
      $$('.faq-item', faq).forEach((item) => setItem(item, item.classList.contains('open')));
      on(faq, 'click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const item = button.closest('.faq-item');
        const willOpen = !item.classList.contains('open');
        $$('.faq-item', faq).forEach((node) => setItem(node, false));
        if (willOpen) setItem(item, true);
      });
      on(window, 'resize', debounceFrame(() => $$('.faq-item.open', faq).forEach((item) => setItem(item, true))), { passive: true });
    };

    const initCarousel = () => {
      const carousel = $('[data-carousel]');
      const cards = $$('.testimonial-card', carousel || document);
      const dotsWrap = $('[data-carousel-dots]', carousel || document);
      if (!carousel || !cards.length || !dotsWrap) return;
      const show = (index) => {
        state.carouselIndex = (index + cards.length) % cards.length;
        cards.forEach((card, i) => card.classList.toggle('active', i === state.carouselIndex));
        $$('button', dotsWrap).forEach((dot, i) => dot.classList.toggle('active', i === state.carouselIndex));
      };
      cards.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Pokaż opinię ${i + 1}`);
        on(dot, 'click', () => { show(i); restart(); });
        dotsWrap.appendChild(dot);
      });
      const start = () => {
        if (prefersReducedMotion) return;
        state.carouselTimer = setInterval(() => show(state.carouselIndex + 1), 4000);
      };
      const stop = () => { if (state.carouselTimer) clearInterval(state.carouselTimer); state.carouselTimer = null; };
      const restart = () => { stop(); start(); };
      on(carousel, 'mouseenter', stop);
      on(carousel, 'mouseleave', start);
      on(carousel, 'keydown', (event) => {
        if (event.key === 'ArrowRight') { show(state.carouselIndex + 1); restart(); }
        if (event.key === 'ArrowLeft') { show(state.carouselIndex - 1); restart(); }
      });
      show(0);
      start();
      state.cleanup.push(stop);
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    const initForms = () => {
      $$('[data-newsletter-form]').forEach((form) => {
        on(form, 'submit', (event) => {
          event.preventDefault();
          const email = $('input[type="email"]', form);
          const honeypot = $('.honeypot', form);
          const error = $('[data-form-error]', form);
          if (honeypot?.value) return;
          if (!email || !validateEmail(email.value.trim())) {
            if (error) error.textContent = 'Wpisz poprawny adres email';
            email?.setAttribute('aria-invalid', 'true');
            email?.focus();
            return;
          }
          email.setAttribute('aria-invalid', 'false');
          if (error) error.textContent = 'Dzięki! Sprawdź skrzynkę i potwierdź zapis.';
          form.reset();
          closeExitModal();
        });
      });
    };

    const updateCartBadge = () => {
      const badge = $('[data-cart-count]');
      if (badge) badge.textContent = String(state.cartCount);
    };
    const addToCart = (productId) => {
      state.cartCount += 1;
      updateCartBadge();
      const button = $(`[data-add-cart="${productId}"]`);
      if (!button) return;
      const original = button.textContent;
      button.textContent = 'Dodano ✓';
      button.disabled = true;
      setTimeout(() => { button.textContent = original; button.disabled = false; }, 1300);
    };

    const initCart = () => {
      on(document, 'click', (event) => {
        const button = event.target.closest('[data-add-cart]');
        if (!button) return;
        addToCart(button.dataset.addCart);
      });
    };

    const initSmoothScroll = () => {
      on(document, 'click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        const id = link.getAttribute('href');
        if (!id || id === '#') return;
        const target = $(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
    };

    const initCategoryFilter = () => {
      const buttons = $$('.filter-btn');
      const cards = $$('.product-card');
      if (!buttons.length || !cards.length) return;
      buttons.forEach((button) => on(button, 'click', () => {
        const category = button.dataset.category;
        buttons.forEach((btn) => btn.classList.toggle('active', btn === button));
        cards.forEach((card) => card.classList.toggle('hidden-by-filter', category !== 'all' && card.dataset.category !== category));
      }));
    };

    const modal = $('[data-exit-modal]');
    const canShowExit = () => window.innerWidth >= 1024 && modal && !state.exitShown && localStorage.getItem('zz_exit_dismissed') !== '1';
    const showExitModal = () => {
      if (!canShowExit()) return;
      state.exitShown = true;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      $('input[type="email"]', modal)?.focus();
    };
    const closeExitModal = () => {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      localStorage.setItem('zz_exit_dismissed', '1');
    };
    const maybeShowExitByScroll = () => {
      if (!canShowExit()) return;
      const scrolled = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrolled >= 0.5) showExitModal();
    };
    const initExitIntent = () => {
      if (!modal) return;
      const timer = setTimeout(showExitModal, 10000);
      state.cleanup.push(() => clearTimeout(timer));
      on(document, 'mouseleave', (event) => { if (event.clientY <= 0) showExitModal(); });
      on(modal, 'click', (event) => { if (event.target === modal || event.target.closest('[data-modal-close]')) closeExitModal(); });
      on(document, 'keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('open')) closeExitModal(); });
    };

    const initImageSkeletons = () => {
      $$('.product-image img').forEach((img) => {
        const wrapper = img.closest('.product-image');
        const clear = () => wrapper?.classList.remove('skeleton');
        if (img.complete) clear(); else on(img, 'load', clear, { once: true });
        on(img, 'error', clear, { once: true });
      });
    };

    initScroll();
    initMobileMenu();
    initReveal();
    initCountdown();
    initTicker();
    initCounter();
    initFaq();
    initCarousel();
    initForms();
    initCart();
    initSmoothScroll();
    initCategoryFilter();
    initExitIntent();
    initImageSkeletons();
    window.addEventListener('pagehide', () => state.cleanup.forEach((fn) => fn()), { once: true });
  });
})();
