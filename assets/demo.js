/* ============================================================
   SITEWORK Demo JS — shared across all template HTML exports
   Handles: count-up stats, FAQ accordion, form submit, marquee
   ============================================================ */

(function () {
  'use strict';

  /* ── Count-up on scroll ── */
  function parseVal(str) {
    var s = String(str || '');
    var num = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
    var pre = s.match(/^[^0-9]*/)[0];
    var suf = s.match(/[^0-9.]*$/)[0];
    return { num: num, pre: pre, suf: suf };
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCount(el, target, duration) {
    var p = parseVal(target);
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = easeOutCubic(progress);
      var val = Math.floor(eased * p.num);
      el.textContent = p.pre + val.toLocaleString() + p.suf;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  function initCountUp() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          animateCount(el, el.getAttribute('data-count'), 1800);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ── FAQ accordion ── */
  function initFAQ() {
    document.querySelectorAll('.faq-q, .hfaq-q, .dfaq-q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = this.parentElement;
        var isOpen = item.classList.contains('open');
        // close all siblings
        var list = item.parentElement;
        if (list) list.querySelectorAll('.faq-item, .hfaq-item, .dfaq-item').forEach(function (i) {
          i.classList.remove('open');
        });
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  /* ── Contact form submit ── */
  function initForms() {
    document.querySelectorAll('.sw-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var thanks = form.getAttribute('data-thanks') || 'We got it. You\'ll hear from us within 15 minutes. ✓';
        var wrap = form.closest('.sw-form-wrap') || form.parentElement;
        wrap.innerHTML = '<div class="sw-form-thanks">' + thanks + '</div>';
      });
    });

    // Plan enrollment buttons
    document.querySelectorAll('.sw-enroll-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var wrap = btn.closest('.sw-enroll-wrap');
        if (wrap) wrap.innerHTML = '<div class="sw-form-thanks">' + (btn.getAttribute('data-thanks') || 'You\'re enrolled. We\'ll call to confirm. ✓') + '</div>';
      });
    });
  }

  /* ── Marquee pause on hover ── */
  function initMarquee() {
    document.querySelectorAll('.hmarquee-track, .dmarquee-track').forEach(function (track) {
      var parent = track.parentElement;
      if (!parent) return;
      parent.addEventListener('mouseenter', function () { track.style.animationPlayState = 'paused'; });
      parent.addEventListener('mouseleave', function () { track.style.animationPlayState = 'running'; });
    });
  }

  /* ── Sticky nav shadow ── */
  function initNav() {
    var nav = document.querySelector('.hnav, .dnav');
    if (!nav) return;
    window.addEventListener('scroll', function () {
      nav.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,.1)' : '';
    }, { passive: true });
  }

  /* ── Mobile CTA bar visibility ── */
  function initMobileCTA() {
    var cta = document.querySelector('.hmcta, .dmcta');
    if (!cta) return;
    // Already shown via CSS media query, no JS needed
    // But add smooth show/hide on scroll direction
    var lastY = 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < 200) { cta.style.transform = 'translateY(0)'; }
      else if (y > lastY) { cta.style.transform = 'translateY(100%)'; }
      else { cta.style.transform = 'translateY(0)'; }
      lastY = y;
    }, { passive: true });
    cta.style.transition = 'transform .25s ease';
  }

  /* ── Init ── */
  function init() {
    initCountUp();
    initFAQ();
    initForms();
    initMarquee();
    initNav();
    initMobileCTA();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
