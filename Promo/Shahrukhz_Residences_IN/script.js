/* Lead form setup is in config.js. No lead data is stored in this browser. */
(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
      mobileMenu.hidden = isOpen;
    });
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      mobileMenu.hidden = true;
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
    }));
  }

  document.querySelectorAll('[data-unit]').forEach(link => {
    link.addEventListener('click', () => {
      const interest = document.querySelector('select[name="interest"]');
      if (interest) {
        const wanted = link.dataset.unit;
        const option = [...interest.options].find(o => o.textContent.toLowerCase().includes(wanted.toLowerCase()));
        if (option) interest.value = option.value;
        if (wanted.includes('Studio')) interest.value = 'Studio';
        if (wanted.includes('1–2 Bedroom')) interest.value = '1 Bedroom';
        if (wanted.includes('Penthouse')) interest.value = 'Penthouse';
      }
    });
  });

  // Native-scroll-snap amenities slider. Buttons move one card at a time.
  const amenitySlider = document.querySelector('#amenity-slider');
  const amenityPrev = document.querySelector('#amenity-prev');
  const amenityNext = document.querySelector('#amenity-next');
  if (amenitySlider && amenityPrev && amenityNext) {
    const getStep = () => {
      const card = amenitySlider.querySelector('.amenity-card');
      if (!card) return amenitySlider.clientWidth;
      const styles = getComputedStyle(amenitySlider);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;
      return card.getBoundingClientRect().width + gap;
    };
    amenityPrev.addEventListener('click', () => amenitySlider.scrollBy({ left: -getStep(), behavior: 'smooth' }));
    amenityNext.addEventListener('click', () => amenitySlider.scrollBy({ left: getStep(), behavior: 'smooth' }));
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  const form = document.querySelector('#lead-form');
  const status = document.querySelector('#form-status');
  if (!form || !status) return;

  const phoneInput = document.querySelector('#india-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
      phoneInput.setCustomValidity(phoneInput.value && !/^[6-9]\d{9}$/.test(phoneInput.value) ? 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.' : '');
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const cfg = window.KARWAN_LANDING_CONFIG || {};
    const endpointUrl = String(cfg.formEndpoint || '').trim();
    const consent = form.querySelector('[name="consent"]');
    if (!consent || !consent.checked) return;

    if (!endpointUrl || endpointUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
      status.textContent = 'Form setup is incomplete. Add your deployed Google Apps Script Web App URL in config.js.';
      return;
    }

    let endpoint;
    try {
      endpoint = new URL(endpointUrl);
      if (!/script\.google\.com$/.test(endpoint.hostname) || !endpoint.pathname.includes('/exec')) {
        throw new Error('Please use the Google Apps Script Web App URL ending in /exec.');
      }
    } catch (err) {
      status.textContent = err.message || 'The Google Apps Script URL in config.js is invalid.';
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    data.phone = '+91' + String(data.phone || '').replace(/\D/g, '');
    data.source = 'Google Ads — Shahrukhz landing page';
    data.pageUrl = window.location.href;
    data.submittedAt = new Date().toISOString();
    data.consent = 'true';

    status.textContent = 'Submitting your enquiry…';
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    // JSONP avoids browser CORS restrictions on Google Apps Script ContentService redirects.
    const callbackName = '__karwanLeadCallback_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    let finished = false;
    const timeout = window.setTimeout(() => finish(false, 'The server did not respond in time. Please try again.'), 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    function finish(success, message) {
      if (finished) return;
      finished = true;
      cleanup();
      if (success) {
        status.textContent = 'Enquiry received. Redirecting…';
        window.location.href = 'thank-you.html';
      } else {
        status.textContent = message || 'We could not save your enquiry. Please check the details and try again.';
        if (submitButton) submitButton.disabled = false;
      }
    }

    window[callbackName] = (result) => {
      if (result && result.success === true) finish(true);
      else finish(false, (result && result.message) || 'Your enquiry was not saved. Please try again.');
    };
    endpoint.searchParams.set('callback', callbackName);
    Object.entries(data).forEach(([key, value]) => endpoint.searchParams.set(key, String(value)));
    script.onerror = () => finish(false, 'Could not reach Google Sheets. Check the Web App deployment and URL in config.js.');
    script.src = endpoint.toString();
    document.head.appendChild(script);
  });

  function addWhatsAppFallback(cfg, message, statusNode) {
    if (!cfg.whatsappNumber) return;
    const link = document.createElement('a');
    link.href = `https://wa.me/${cfg.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'text-link dark-link';
    link.textContent = 'Send enquiry on WhatsApp ↗';
    statusNode.append(' ');
    statusNode.appendChild(link);
  }



  // Site-wide Lenis smooth scrolling. Native touch scrolling remains enabled on mobile.
  function initLenis() {
    if (!window.Lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const lenis = new Lenis({
      duration: isTouch ? 0.75 : 1.05,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 0.9,
      anchors: true,
      autoRaf: true
    });
    window.__karwanLenis = lenis;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLenis);
  else initLenis();

  // Cinematic first-look animation, inspired by the supplied scroll sequence.
  // Falls back to normal scrolling if GSAP/ScrollTrigger is unavailable.
  function initCinematicShowcase() {
    const panels = document.querySelectorAll('.cinema-panel');
    if (!panels.length || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    panels.forEach((panel, index) => {
      const image = panel.querySelector('.cinema-image-wrap');
      const imageEl = panel.querySelector('img');
      const content = panel.querySelector('.cinema-content');
      const word = panel.querySelector('.cinema-word');
      gsap.fromTo(image, { yPercent: -7 }, {
        yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
      });
      gsap.fromTo(imageEl, { scale: 1.13 }, {
        scale: 1.02, ease: 'none',
        scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
      });
      gsap.fromTo(content, { y: 55, opacity: 0.35 }, {
        y: 0, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: panel, start: 'top 72%', end: 'top 30%', scrub: 0.7 }
      });
      if (word) gsap.fromTo(word, { x: 70, opacity: 0.03 }, {
        x: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
      });
      // Keep the transition cinematic without hijacking normal page scrolling.
      if (index < panels.length - 1) panel.style.scrollSnapAlign = 'start';
    });
    ScrollTrigger.refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCinematicShowcase);
  else initCinematicShowcase();

})();
