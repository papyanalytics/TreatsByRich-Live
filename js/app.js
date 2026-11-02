/* Shared app utilities and lightweight site interactions for Treats By Rich. */
window.APP_CONFIG = {
  cartStorageKey: 'tbrCart',
  orderStorageKey: 'tbrOrders',
  whatsappNumber: '233538517831'
};

window.formatCurrency = function (value) {
  return `GH₵${Number(value || 0).toFixed(2)}`;
};

window.safeParseJSON = function (value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

window.safeString = function (value, fallback = '') {
  return value === undefined || value === null ? fallback : String(value);
};

window.storeValue = function (key, value) {
  localStorage.setItem(key, JSON.stringify(value));
};

window.loadValue = function (key, fallback = []) {
  return window.safeParseJSON(localStorage.getItem(key), fallback);
};

(function initSiteUi() {
  const body = document.body;
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  const backToTopButton = document.querySelector('.back-to-top');
  const revealItems = document.querySelectorAll('.reveal');
  const testimonialDots = document.querySelectorAll('.testimonial-dot');
  const testimonialCards = document.querySelectorAll('.testimonial-card');
  const cartCountElements = document.querySelectorAll('.cart-count');
  const loaderId = 'tbr-loader';
  const cursorId = 'tbr-cursor';
  const whatsappId = 'tbr-whatsapp';

  function createLoader() {
    if (document.getElementById(loaderId)) return;
    const marker = document.createElement('div');
    marker.id = loaderId;
    marker.setAttribute('aria-hidden', 'true');
    marker.innerHTML = `
      <div class="loader-shell">
        <div class="loader-logo-wrap">
          <img src="${window.location.pathname.includes('/products/') ? '../images/logo.png' : 'images/logo.png'}" alt="Treats By Rich logo" />
        </div>
        <div class="loader-spinner"></div>
        <p>Preparing Your Premium Order...</p>
      </div>
    `;
    body.appendChild(marker);
  }

  function showLoader() {
    createLoader();
    const loader = document.getElementById(loaderId);
    if (loader) loader.classList.add('is-visible');
  }

  function hideLoader() {
    const loader = document.getElementById(loaderId);
    if (!loader) return;
    loader.classList.add('is-hidden');
    window.setTimeout(() => loader.remove(), 550);
  }

  function updateHeaderState() {
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 24);
    }
    if (backToTopButton) {
      backToTopButton.classList.toggle('is-visible', window.scrollY > 700);
    }
  }

  function updateCartCount() {
    const count = window.TBRCartAPI?.getCartCount ? window.TBRCartAPI.getCartCount() : 0;
    cartCountElements.forEach((element) => {
      element.textContent = String(count);
      element.classList.remove('pop');
      void element.offsetWidth;
      element.classList.add('pop');
    });
  }

  function initNavigation() {
    // Guard against double-binding, which would open then instantly re-close the menu on tap.
    if (navToggle && siteNav && !navToggle.dataset.navBound) {
      navToggle.dataset.navBound = 'true';
      navToggle.addEventListener('click', () => {
        const isOpen = siteNav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
        body.classList.toggle('menu-open', isOpen);
      });

      siteNav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          siteNav.classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
          body.classList.remove('menu-open');
        });
      });
    }

    if (backToTopButton) {
      backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      const fallbackButton = document.createElement('button');
      fallbackButton.className = 'back-to-top';
      fallbackButton.type = 'button';
      fallbackButton.setAttribute('aria-label', 'Back to top');
      fallbackButton.textContent = '↑';
      fallbackButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      document.body.appendChild(fallbackButton);
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        const targetId = anchor.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function initRevealObserver() {
    if ('IntersectionObserver' in window && revealItems.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
      );

      revealItems.forEach((item) => observer.observe(item));
    }
  }

  function initTestimonials() {
    if (testimonialDots.length && testimonialCards.length) {
      testimonialDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          testimonialDots.forEach((item) => item.classList.remove('active'));
          testimonialCards.forEach((item) => item.classList.remove('active'));
          dot.classList.add('active');
          testimonialCards[index]?.classList.add('active');
        });
      });
    }
  }

  function initButtonRipple() {
    document.querySelectorAll('.button, .chip, .icon-button, .quantity-btn, .text-button, .nav-toggle, .back-to-top, .menu-card a, .product-card a, .gallery-card, .option-card, .checkbox-card').forEach((element) => {
      element.addEventListener('click', (event) => {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        element.appendChild(ripple);
        window.setTimeout(() => ripple.remove(), 650);
      });
    });
  }

  function initImageEffects() {
    document.querySelectorAll('img').forEach((image) => {
      image.addEventListener('load', () => image.classList.add('image-ready'), { once: true });
      image.addEventListener('error', () => image.classList.add('image-ready'), { once: true });
      if (image.complete) image.classList.add('image-ready');
    });
  }

  function initCursor() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (document.getElementById(cursorId)) return;
    const cursor = document.createElement('div');
    cursor.id = cursorId;
    cursor.setAttribute('aria-hidden', 'true');
    body.appendChild(cursor);
    document.addEventListener('mousemove', (event) => {
      cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    }, { passive: true });

    document.querySelectorAll('a, button, input, textarea, select, .option-card, .checkbox-card, .menu-card, .product-card, .gallery-card, .chip').forEach((element) => {
      element.addEventListener('mouseenter', () => cursor.classList.add('is-hovering'));
      element.addEventListener('mouseleave', () => cursor.classList.remove('is-hovering'));
    });
  }

  function initWhatsApp() {
    if (document.getElementById(whatsappId)) return;
    const link = document.createElement('a');
    link.id = whatsappId;
      const whatsappNumber = window.APP_CONFIG?.whatsappNumber || '233538517831';
      const whatsappMessage = "Hello Treats By Rich, I'd like to make an order.";
      link.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'floating-whatsapp';
    link.setAttribute('aria-label', 'Chat with Treats By Rich on WhatsApp');
    link.title = 'Need Help? Chat With Us';
    link.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.82 11.82 0 0 0 12.09 0C5.56 0 .23 5.3.23 11.82c0 2.08.55 4.13 1.6 5.95L0 24l6.4-1.68a11.86 11.86 0 0 0 5.68 1.45h.01c6.53 0 11.86-5.3 11.87-11.82a11.74 11.74 0 0 0-3.44-8.47ZM12.1 21.76h-.01a9.84 9.84 0 0 1-5.01-1.37l-.36-.22-3.8 1 1.02-3.7-.24-.38a9.77 9.77 0 0 1-1.5-5.24c0-5.41 4.42-9.82 9.85-9.82 2.63 0 5.1 1.02 6.96 2.87a9.75 9.75 0 0 1 2.9 6.96c0 5.4-4.43 9.81-9.87 9.82Zm5.4-7.34c-.3-.15-1.8-.88-2.08-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.47a8.95 8.95 0 0 1-1.67-2.08c-.18-.3-.02-.46.14-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.63-.93-2.24-.24-.58-.5-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.08 3.18 5.03 4.46.7.3 1.25.48 1.67.61.7.22 1.34.18 1.84.11.56-.08 1.8-.73 2.05-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z"/></svg>';
    body.appendChild(link);
  }

  function initForms() {
    document.querySelectorAll('form').forEach((form) => {
      form.querySelectorAll('input, textarea, select').forEach((input) => {
        input.addEventListener('input', () => {
          if (input.value.trim()) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
          } else if (input.hasAttribute('required')) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
          }
        });
      });
    });
  }

  function applySeoMeta() {
    const title = document.title || 'Treats By Rich';
    const description = document.querySelector('meta[name="description"]')?.content || 'Premium parfaits crafted with freshness, warmth and polished presentation.';
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = `${window.location.origin}${window.location.pathname}`;
    if (!document.querySelector('link[rel="canonical"]')) {
      document.head.appendChild(canonical);
    }

    const ensureMeta = (name, content) => {
      let meta = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        if (name.startsWith('og:') || name.startsWith('twitter:')) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    ensureMeta('description', description);
    ensureMeta('og:title', title);
    ensureMeta('og:description', description);
    ensureMeta('og:type', 'website');
    ensureMeta('og:url', `${window.location.origin}${window.location.pathname}`);
    ensureMeta('twitter:card', 'summary_large_image');
    ensureMeta('twitter:title', title);
    ensureMeta('twitter:description', description);

    const favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      const icon = document.createElement('link');
      icon.rel = 'icon';
      icon.href = 'images/logo.png';
      document.head.appendChild(icon);
    }

    if (!document.getElementById('tbr-structured-data')) {
      const script = document.createElement('script');
      script.id = 'tbr-structured-data';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Bakery',
        name: 'Treats By Rich',
        url: 'https://example.com',
        description: 'Premium Ghanaian parfait brand crafting fresh, healthy and luxurious desserts.',
        telephone: '+233538517831',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Accra',
          addressCountry: 'GH'
        },
        sameAs: ['https://www.instagram.com/']
      });
      document.head.appendChild(script);
    }
  }

  function initPageTransition() {
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
      const isLocal = href.startsWith('http://') || href.startsWith('https://') ? new URL(href, window.location.href).origin === window.location.origin : true;
      if (!isLocal) return;
      link.addEventListener('click', (event) => {
        const targetPath = href.startsWith('http') ? new URL(href, window.location.href).pathname : href;
        if (targetPath === window.location.pathname) return;
        event.preventDefault();
        showLoader();
        window.setTimeout(() => {
          window.location.href = href;
        }, 240);
      });
    });
  }

  function init() {
    showLoader();
    updateHeaderState();
    updateCartCount();
    initNavigation();
    initRevealObserver();
    initTestimonials();
    initButtonRipple();
    initImageEffects();
    initCursor();
    initWhatsApp();
    initForms();
    initPageTransition();
    applySeoMeta();
    window.setTimeout(hideLoader, 900);
  }

  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('tbr:cart-updated', updateCartCount);
  window.addEventListener('load', () => {
    updateHeaderState();
    window.setTimeout(hideLoader, 400);
  });
  window.addEventListener('pageshow', () => {
    updateHeaderState();
    window.setTimeout(hideLoader, 260);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TBRApp = {
    showLoader,
    hideLoader,
    updateCartCount
  };
})();