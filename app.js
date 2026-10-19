/**
 * =============================================================================
 * CYBERION — PLATAFORMA DE INGENIERÍA DE SOFTWARE & DESARROLLO WEB
 * SCRIPT PRINCIPAL DE PRODUCCIÓN (VANILLA ES6+ MODULAR)
 * =============================================================================
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Inicialización de la aplicación
  CyberionApp.init();
});

/**
 * =============================================================================
 * 00. SERVICIO DE TASA DE CAMBIO OFICIAL BCV Y EURO EN TIEMPO REAL
 * =============================================================================
 */
const CurrencyService = {
  rateUSD: 881.07,
  rateEUR: 991.16,
  lastUpdated: null,
  isLive: false,

  async init() {
    await this.fetchLiveRates();
    this.updateDomElements();
  },

  async fetchLiveRates() {
    try {
      // 1. API oficial de ve.dolarapi.com (Oficial BCV)
      const [usdRes, eurRes] = await Promise.allSettled([
        fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: AbortSignal.timeout(4500) }),
        fetch('https://ve.dolarapi.com/v1/euros/oficial', { signal: AbortSignal.timeout(4500) })
      ]);

      if (usdRes.status === 'fulfilled' && usdRes.value.ok) {
        const dataUsd = await usdRes.value.json();
        if (dataUsd && (dataUsd.promedio || dataUsd.precio)) {
          this.rateUSD = Number(dataUsd.promedio || dataUsd.precio);
          this.lastUpdated = dataUsd.fechaActualizacion || new Date().toISOString();
          this.isLive = true;
        }
      }

      if (eurRes.status === 'fulfilled' && eurRes.value.ok) {
        const dataEur = await eurRes.value.json();
        if (dataEur && (dataEur.promedio || dataEur.precio)) {
          this.rateEUR = Number(dataEur.promedio || dataEur.precio);
        }
      }
    } catch (err) {
      console.warn('[CURRENCY SERVICE] Intentando fallback secundario:', err);
      try {
        const fallbackRes = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(3500) });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData?.rates?.VES) {
            this.rateUSD = Number(fallbackData.rates.VES);
            this.isLive = true;
          }
        }
      } catch (fbErr) {
        console.info('[CURRENCY SERVICE] Usando tasa referencial cacheada:', this.rateUSD);
      }
    }

    // Sincronizar tasa con el cotizador si está en la página
    if (typeof QuoteCalculatorModule !== 'undefined') {
      QuoteCalculatorModule.bcvRate = this.rateUSD;
      QuoteCalculatorModule.bcvEurRate = this.rateEUR;
      if (typeof QuoteCalculatorModule.calculate === 'function') {
        QuoteCalculatorModule.calculate();
      }
    }

    return { usd: this.rateUSD, eur: this.rateEUR, isLive: this.isLive };
  },

  updateDomElements() {
    const usdFormatted = this.rateUSD.toFixed(2);
    const eurFormatted = this.rateEUR.toFixed(2);

    // Hero rate banner (index.html)
    const heroRateVal = document.getElementById('hero-rate-val');
    if (heroRateVal) heroRateVal.textContent = usdFormatted;

    const heroRateEur = document.getElementById('hero-rate-eur');
    if (heroRateEur) heroRateEur.textContent = eurFormatted;

    // Cotizador (cotizador.html)
    const bcvDisplay = document.getElementById('bcv-rate-display');
    if (bcvDisplay) bcvDisplay.textContent = usdFormatted;

    const bcvEurDisplay = document.getElementById('bcv-rate-eur-display');
    if (bcvEurDisplay) bcvEurDisplay.textContent = eurFormatted;

    const rateAppliedNote = document.getElementById('calc-rate-applied-note');
    if (rateAppliedNote) {
      rateAppliedNote.textContent = `Calculado a tasa oficial BCV de ${usdFormatted} Bs./$`;
    }
  }
};

/**
 * Módulo Orquestador Principal
 */
const CyberionApp = {
  init() {
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');
    this.updateCurrentYear();
    CurrencyService.init();
    ThemeModule.init();
    NavigationModule.init();
    DispatchModalModule.init();
    VideoBackgroundModule.init();
    AboutTabsModule.init();
    QuoteCalculatorModule.init();
    MetricsCounterModule.init();
    PortfolioModule.init();
    ProjectModalModule.init();
    FaqModule.init();
    ScrollAnimationModule.init();
    ContactFormModule.init();
  },

  /**
   * Actualiza dinámicamente el año de copyright en el footer
   */
  updateCurrentYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }
};

/* =============================================================================
   00. MÓDULO DE TEMA (MODO CLARO / MODO OSCURO)
   ============================================================================= */
const ThemeModule = {
  themeToggleBtn: null,
  themeToggleText: null,
  currentTheme: 'light', // Por defecto modo claro según solicitud del usuario

  init() {
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.themeToggleText = document.getElementById('theme-toggle-text');

    // Recuperar preferencia de tema guardada o usar 'light' por defecto
    const savedTheme = localStorage.getItem('cyberion_theme') || 'light';
    this.applyTheme(savedTheme);

    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
      });
    }
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('cyberion_theme', theme);

    if (this.themeToggleBtn) {
      this.themeToggleBtn.setAttribute(
        'aria-label',
        theme === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'
      );
      this.themeToggleBtn.setAttribute(
        'title',
        theme === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'
      );
    }

    if (this.themeToggleText) {
      this.themeToggleText.textContent = theme === 'light' ? 'Modo Oscuro' : 'Modo Claro';
    }

    const sunIcon = this.themeToggleBtn?.querySelector('.theme-icon--sun');
    const moonIcon = this.themeToggleBtn?.querySelector('.theme-icon--moon');
    if (sunIcon && moonIcon) {
      if (theme === 'light') {
        sunIcon.setAttribute('hidden', '');
        moonIcon.removeAttribute('hidden');
      } else {
        moonIcon.setAttribute('hidden', '');
        sunIcon.removeAttribute('hidden');
      }
    }
  }
};

/* =============================================================================
   01. MÓDULO DE NAVEGACIÓN & NAVBAR SCROLL
   ============================================================================= */
const NavigationModule = {
  navbar: null,
  toggleBtn: null,
  navMenu: null,
  navLinks: [],
  sections: [],

  init() {
    this.navbar = document.getElementById('site-header');
    this.toggleBtn = document.getElementById('mobile-menu-toggle') || document.getElementById('menu-toggle-btn');
    this.navMenu = document.getElementById('primary-navigation');
    this.navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));
    this.sections = Array.from(document.querySelectorAll('section[id]'));

    this.bindEvents();
    this.handleScroll();
    this.highlightCurrentPage();
    this.initScrollSpy();
  },

  highlightCurrentPage() {
    let path = window.location.pathname.replace(/\\/g, '/');
    let filename = path.substring(path.lastIndexOf('/') + 1);
    if (!filename || filename === '') filename = 'index.html';

    this.navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      const cleanHref = href.split('#')[0].split('?')[0];
      if (cleanHref === filename || (filename === 'index.html' && (cleanHref === './' || cleanHref === 'index.html'))) {
        link.classList.add('navbar__link--active');
      } else if (!href.startsWith('#')) {
        link.classList.remove('navbar__link--active');
      }
    });
  },

  bindEvents() {
    // Scroll dinámico en Navbar
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });

    // Alternar menú hamburguesa móvil
    if (this.toggleBtn && this.navMenu) {
      this.toggleBtn.addEventListener('click', () => this.toggleMobileMenu());
    }

    // Cerrar menú móvil al pulsar cualquier enlace de navegación
    this.navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    });

    // Cerrar menú con la tecla ESC
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.navMenu?.classList.contains('navbar__nav--open')) {
        this.closeMobileMenu();
      }
    });

    // Cerrar al hacer clic fuera del menú móvil
    document.addEventListener('click', (event) => {
      if (
        this.navMenu?.classList.contains('navbar__nav--open') &&
        !this.navMenu.contains(event.target) &&
        !this.toggleBtn.contains(event.target)
      ) {
        this.closeMobileMenu();
      }
    });
  },

  handleScroll() {
    if (!this.navbar) return;
    if (window.scrollY > 40) {
      this.navbar.classList.add('navbar--scrolled');
    } else {
      this.navbar.classList.remove('navbar--scrolled');
    }
  },

  toggleMobileMenu() {
    const isExpanded = this.toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  },

  openMobileMenu() {
    this.toggleBtn.classList.add('navbar__toggle--active');
    this.toggleBtn.setAttribute('aria-expanded', 'true');
    this.toggleBtn.setAttribute('aria-label', 'Cerrar menú de navegación');
    this.navMenu.classList.add('navbar__nav--open');
    document.body.style.overflow = 'hidden'; // Evita scroll de fondo
  },

  closeMobileMenu() {
    if (!this.toggleBtn || !this.navMenu) return;
    this.toggleBtn.classList.remove('navbar__toggle--active');
    this.toggleBtn.setAttribute('aria-expanded', 'false');
    this.toggleBtn.setAttribute('aria-label', 'Abrir menú de navegación');
    this.navMenu.classList.remove('navbar__nav--open');
    document.body.style.overflow = '';
  },

  /**
   * ScrollSpy mediante IntersectionObserver para sincronizar el enlace activo
   */
  initScrollSpy() {
    if (!('IntersectionObserver' in window)) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          this.setActiveNavLink(currentId);
        }
      });
    }, observerOptions);

    this.sections.forEach((section) => spyObserver.observe(section));
  },

  setActiveNavLink(sectionId) {
    const hasHashLinks = Array.from(this.navLinks).some((l) => l.getAttribute('href')?.startsWith('#'));
    if (!hasHashLinks) return;

    this.navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === `#${sectionId}`) {
        link.classList.add('navbar__link--active');
      } else if (href && href.startsWith('#')) {
        link.classList.remove('navbar__link--active');
      }
    });
  }
};

/* =============================================================================
   02. MÓDULO DE CONTADORES NUMÉRICOS (MÉTRICAS HERO)
   ============================================================================= */
const MetricsCounterModule = {
  counterElements: [],

  init() {
    this.counterElements = Array.from(document.querySelectorAll('[data-count]'));
    if (!this.counterElements.length) return;

    if (!('IntersectionObserver' in window)) {
      this.counterElements.forEach((el) => {
        el.textContent = el.getAttribute('data-count');
      });
      return;
    }

    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    this.counterElements.forEach((el) => counterObserver.observe(el));
  },

  animateCounter(el) {
    const targetValue = parseFloat(el.getAttribute('data-count'));
    const isDecimal = String(targetValue).includes('.');
    const duration = 1800; // 1.8s
    const startTime = performance.now();

    const updateFrame = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      // Easing cúbico hacia afuera
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = easeProgress * targetValue;

      if (isDecimal) {
        el.textContent = currentValue.toFixed(2);
      } else {
        el.textContent = Math.floor(currentValue);
      }

      if (progress < 1) {
        requestAnimationFrame(updateFrame);
      } else {
        el.textContent = isDecimal ? targetValue.toFixed(2) : targetValue;
      }
    };

    requestAnimationFrame(updateFrame);
  }
};

/* =============================================================================
   03. MÓDULO DE PORTAFOLIO FILTRABLE
   ============================================================================= */
const PortfolioModule = {
  filterBar: null,
  filterButtons: [],
  cards: [],

  init() {
    this.filterBar = document.querySelector('.portfolio__filter-bar');
    this.filterButtons = Array.from(document.querySelectorAll('.portfolio__filter-btn'));
    this.cards = Array.from(document.querySelectorAll('.portfolio-card'));

    if (!this.filterBar || !this.filterButtons.length) return;

    this.bindEvents();
  },

  bindEvents() {
    // Delegación de eventos en la barra de filtros
    this.filterBar.addEventListener('click', (event) => {
      const button = event.target.closest('.portfolio__filter-btn');
      if (!button) return;

      const filterValue = button.getAttribute('data-filter');
      this.setActiveButton(button);
      this.filterProjects(filterValue);
    });
  },

  setActiveButton(activeBtn) {
    this.filterButtons.forEach((btn) => {
      const isActive = btn === activeBtn;
      btn.classList.toggle('portfolio__filter-btn--active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  },

  filterProjects(category) {
    this.cards.forEach((card) => {
      const cardCategory = card.getAttribute('data-category');
      const shouldShow = category === 'all' || cardCategory === category;

      if (shouldShow) {
        // Restaurar visibilidad con animación fluida
        card.classList.remove('portfolio-card--hidden');
        card.style.opacity = '0';
        card.style.transform = 'scale(0.96)';

        requestAnimationFrame(() => {
          setTimeout(() => {
            card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 30);
        });
      } else {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.96)';
        setTimeout(() => {
          card.classList.add('portfolio-card--hidden');
        }, 250);
      }
    });
  }
};

/* =============================================================================
   04. MÓDULO DE ANIMACIONES AL HACER SCROLL (INTERSECTION OBSERVER)
   ============================================================================= */
const ScrollAnimationModule = {
  targets: [],

  init() {
    // Seleccionar elementos clave para animar al entrar en vista
    const elementsToAnimate = [
      ...document.querySelectorAll('.hero__metric-card'),
      ...document.querySelectorAll('.about__highlight-card'),
      ...document.querySelectorAll('.principle-card'),
      ...document.querySelectorAll('.service-card'),
      ...document.querySelectorAll('.calc-type-card'),
      ...document.querySelectorAll('.portfolio-card'),
      ...document.querySelectorAll('.testimonial-card'),
      ...document.querySelectorAll('.faq-item'),
      ...document.querySelectorAll('.process__step'),
      ...document.querySelectorAll('.contact__info'),
      ...document.querySelectorAll('.contact__form-card')
    ];

    if (!elementsToAnimate.length) return;

    elementsToAnimate.forEach((element) => {
      element.classList.add('reveal-fade-up');
    });

    if (!('IntersectionObserver' in window)) {
      elementsToAnimate.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.12
      }
    );

    elementsToAnimate.forEach((el) => revealObserver.observe(el));
  }
};

/* =============================================================================
   04.B MÓDULO DE MODAL DE DESPACHO DIRECTO (EMAIL, GMAIL, WHATSAPP & CLIPBOARD)
   ============================================================================= */
const DispatchModalModule = {
  modal: null,
  backdrop: null,
  closeBtn: null,
  gmailBtn: null,
  whatsappBtn: null,
  copyBtn: null,
  copyText: null,
  mailtoLink: null,
  summaryBox: null,
  statusNote: null,
  currentPayloadText: '',

  init() {
    this.modal = document.getElementById('dispatch-modal');
    if (!this.modal) return;

    this.backdrop = document.getElementById('dispatch-modal-backdrop');
    this.closeBtn = document.getElementById('dispatch-modal-close');
    this.gmailBtn = document.getElementById('dispatch-btn-gmail');
    this.whatsappBtn = document.getElementById('dispatch-btn-whatsapp');
    this.copyBtn = document.getElementById('dispatch-btn-copy');
    this.copyText = document.getElementById('dispatch-copy-text');
    this.mailtoLink = document.getElementById('dispatch-link-mailto');
    this.summaryBox = document.getElementById('dispatch-modal-summary');
    this.statusNote = document.getElementById('dispatch-modal-status-note');

    this.bindEvents();
  },

  bindEvents() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.backdrop?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('is-open')) {
        this.close();
      }
    });

    this.copyBtn?.addEventListener('click', () => this.copyToClipboard());
  },

  open(data) {
    if (!this.modal) return;

    const {
      title = '¡Requerimiento Listo para Despacho!',
      clientName = 'Cliente',
      clientEmail = '',
      serviceLabel = 'Desarrollo de Software',
      budgetLabel = 'A convenir',
      details = '',
      statusMessage = '',
      rawQuoteSummary = ''
    } = data;

    // Destinatario empresarial oficial
    const targetEmail = 'eduardojhp12@gmail.com';
    const timestampCaracas = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
    const subject = `Nueva Solicitud Cyberion: ${clientName} — ${serviceLabel}`;

    const emailBody =
`NUEVA SOLICITUD DE PROYECTO — CYBERION INGENIERÍA
============================================================
Destinatario: ${targetEmail}
Fecha y Hora: ${timestampCaracas}
Cliente: ${clientName}
${clientEmail ? `Correo del Cliente: ${clientEmail}\n` : ''}Tipo de Solución: ${serviceLabel}
Presupuesto Estimado: ${budgetLabel}
Acuerdo de Confidencialidad NDA: Activado

DESCRIPCIÓN DEL REQUERIMIENTO:
------------------------------------------------------------
${details || rawQuoteSummary}

============================================================
Generado desde la plataforma web oficial de Cyberion Venezuela.`;

    const waText =
`*🚀 NUEVA SOLICITUD DE PROYECTO — CYBERION*
*Cliente:* ${clientName}
${clientEmail ? `*Correo:* ${clientEmail}\n` : ''}*Solución:* ${serviceLabel}
*Presupuesto:* ${budgetLabel}
*Fecha:* ${timestampCaracas}

*Detalles del Proyecto:*
${details || rawQuoteSummary}`;

    this.currentPayloadText = emailBody;

    // Enlaces de despacho directo
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const waUrl = `https://wa.me/584141682547?text=${encodeURIComponent(waText)}`;

    if (this.gmailBtn) this.gmailBtn.href = gmailUrl;
    if (this.mailtoLink) this.mailtoLink.href = mailtoUrl;
    if (this.whatsappBtn) this.whatsappBtn.href = waUrl;

    // Renderizar resumen en el modal
    if (this.summaryBox) {
      this.summaryBox.innerHTML = `
        <div class="dispatch-modal__summary-row">
          <span class="dispatch-modal__summary-label">Destinatario Oficial:</span>
          <strong class="dispatch-modal__summary-val" style="color: var(--color-cyan);">${targetEmail}</strong>
        </div>
        <div class="dispatch-modal__summary-row">
          <span class="dispatch-modal__summary-label">Cliente / Contacto:</span>
          <span class="dispatch-modal__summary-val">${clientName}${clientEmail ? ` &bull; ${clientEmail}` : ''}</span>
        </div>
        <div class="dispatch-modal__summary-row">
          <span class="dispatch-modal__summary-label">Solución Solicitada:</span>
          <span class="dispatch-modal__summary-val">${serviceLabel}</span>
        </div>
        <div class="dispatch-modal__summary-row">
          <span class="dispatch-modal__summary-label">Inversión Estimada:</span>
          <span class="dispatch-modal__summary-val">${budgetLabel}</span>
        </div>
        <div class="dispatch-modal__summary-row">
          <span class="dispatch-modal__summary-label">Garantía NDA:</span>
          <span class="dispatch-modal__summary-val" style="color: var(--color-success);">&#10003; Blindado / Confidencial</span>
        </div>
      `;
    }

    if (this.statusNote) {
      this.statusNote.innerHTML = statusMessage || `
        ℹ️ Tu requerimiento está listo para enviarse a <strong>${targetEmail}</strong>. Usa los botones directos abajo para confirmar la entrega.
      `;
    }

    // Título dinámico
    const titleEl = document.getElementById('dispatch-modal-title');
    if (titleEl) titleEl.textContent = title;

    // Mostrar modal con animación fluida
    this.modal.hidden = false;
    requestAnimationFrame(() => {
      this.modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (this.copyText) this.copyText.textContent = '📋 Copiar Resumen Técnico';
    });
  },

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      this.modal.hidden = true;
    }, 300);
  },

  async copyToClipboard() {
    if (!this.currentPayloadText) return;
    try {
      await navigator.clipboard.writeText(this.currentPayloadText);
      if (this.copyText) this.copyText.textContent = '✅ ¡Copiado con Éxito al Portapapeles!';
      setTimeout(() => {
        if (this.copyText) this.copyText.textContent = '📋 Copiar Resumen Técnico';
      }, 3500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  }
};

/* =============================================================================
   05. MÓDULO DE FORMULARIO DE CONTACTO & VALIDACIÓN EN TIEMPO REAL
   ============================================================================= */
const ContactFormModule = {
  form: null,
  fields: {},
  feedbackAlert: null,
  submitBtn: null,
  submitBtnText: null,
  submitSpinner: null,
  charCounter: null,

  init() {
    this.form = document.getElementById('project-form');
    if (!this.form) return;

    this.feedbackAlert = document.getElementById('form-general-feedback');
    this.submitBtn = document.getElementById('btn-submit-proposal');
    this.submitBtnText = this.submitBtn?.querySelector('.contact-form__btn-text');
    this.submitSpinner = this.submitBtn?.querySelector('.contact-form__spinner');
    this.charCounter = document.getElementById('char-counter');

    this.fields = {
      fullname: {
        input: document.getElementById('input-fullname'),
        group: document.getElementById('group-fullname'),
        validate: (value) => value.trim().length >= 3
      },
      email: {
        input: document.getElementById('input-email'),
        group: document.getElementById('group-email'),
        validate: (value) => {
          const corporateEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          return corporateEmailRegex.test(value.trim());
        }
      },
      service: {
        input: document.getElementById('select-service'),
        group: document.getElementById('group-service'),
        validate: (value) => Boolean(value && value !== '')
      },
      budget: {
        input: document.getElementById('select-budget'),
        group: document.getElementById('group-budget'),
        validate: (value) => Boolean(value && value !== '')
      },
      details: {
        input: document.getElementById('textarea-details'),
        group: document.getElementById('group-details'),
        validate: (value) => value.trim().length >= 20
      },
      nda: {
        input: document.getElementById('checkbox-nda'),
        group: document.getElementById('group-nda'),
        validate: (element) => element.checked
      }
    };

    this.bindEvents();
    this.checkTransferredQuote();
  },

  checkTransferredQuote() {
    try {
      const stored = localStorage.getItem('cyberion_quote_transfer');
      if (!stored) return;
      const data = JSON.parse(stored);
      localStorage.removeItem('cyberion_quote_transfer');

      if (data.service && this.fields.service?.input) {
        this.fields.service.input.value = data.service;
        this.fields.service.input.dispatchEvent(new Event('change'));
      }
      if (data.budget && this.fields.budget?.input) {
        this.fields.budget.input.value = data.budget;
        this.fields.budget.input.dispatchEvent(new Event('change'));
      }
      if (data.details && this.fields.details?.input) {
        this.fields.details.input.value = data.details;
        this.fields.details.input.dispatchEvent(new Event('input'));
      }

      const formCard = document.querySelector('.contact__form-card');
      if (formCard) {
        formCard.style.boxShadow = '0 0 45px rgba(2, 132, 199, 0.45)';
        setTimeout(() => {
          formCard.style.boxShadow = '';
        }, 2200);
      }
    } catch (e) {
      console.warn('Error al recuperar cotización transferida:', e);
    }
  },

  bindEvents() {
    // Contador en vivo de caracteres
    if (this.fields.details?.input && this.charCounter) {
      this.fields.details.input.addEventListener('input', (e) => {
        const count = e.target.value.length;
        this.charCounter.textContent = count;
        if (count > 600) {
          this.charCounter.style.color = 'var(--color-error)';
        } else {
          this.charCounter.style.color = 'var(--color-text-muted)';
        }
      });
    }

    // Validación individual en tiempo real (blur e input)
    Object.keys(this.fields).forEach((key) => {
      const field = this.fields[key];
      if (!field.input) return;

      const eventType = field.input.type === 'checkbox' || field.input.tagName === 'SELECT' ? 'change' : 'input';

      field.input.addEventListener(eventType, () => {
        this.validateField(key, false);
      });

      field.input.addEventListener('blur', () => {
        this.validateField(key, true);
      });
    });

    // Envío del Formulario
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  },

  validateField(key, markTouched = false) {
    const field = this.fields[key];
    if (!field || !field.input || !field.group) return false;

    const value = field.input.type === 'checkbox' ? field.input : field.input.value;
    const isValid = field.validate(value);

    // Solo mostrar estado de error si el campo ha sido tocado o evaluado
    if (!isValid) {
      if (markTouched) {
        field.group.classList.add('contact-form__group--error');
        field.group.classList.remove('contact-form__group--valid');
      }
      return false;
    } else {
      field.group.classList.remove('contact-form__group--error');
      field.group.classList.add('contact-form__group--valid');
      return true;
    }
  },

  validateAllFields() {
    let allValid = true;
    let firstInvalidInput = null;

    Object.keys(this.fields).forEach((key) => {
      const isValid = this.validateField(key, true);
      if (!isValid) {
        allValid = false;
        if (!firstInvalidInput) {
          firstInvalidInput = this.fields[key].input;
        }
      }
    });

    if (firstInvalidInput) {
      firstInvalidInput.focus();
    }

    return allValid;
  },

  async handleSubmit(event) {
    event.preventDefault();
    this.hideFeedback();

    const isFormValid = this.validateAllFields();

    if (!isFormValid) {
      this.showFeedback(
        'error',
        'Por favor, corrige los campos marcados en rojo antes de enviar tu requerimiento.'
      );
      return;
    }

    // Estado de Envío / Carga
    this.setSubmittingState(true);

    try {
      const serviceSelect = this.fields.service.input;
      const serviceLabel = (serviceSelect && serviceSelect.selectedIndex >= 0 && serviceSelect.options[serviceSelect.selectedIndex]?.text)
        ? serviceSelect.options[serviceSelect.selectedIndex].text
        : (this.fields.service.input.value || 'Solución Web');

      const budgetSelect = this.fields.budget.input;
      const budgetLabel = (budgetSelect && budgetSelect.selectedIndex >= 0 && budgetSelect.options[budgetSelect.selectedIndex]?.text)
        ? budgetSelect.options[budgetSelect.selectedIndex].text
        : (this.fields.budget.input.value || 'A convenir');

      // Extraer datos del formulario
      const formData = {
        fullname: this.fields.fullname.input.value.trim(),
        email: this.fields.email.input.value.trim(),
        service: this.fields.service.input.value,
        serviceLabel: serviceLabel,
        budget: this.fields.budget.input.value,
        budgetLabel: budgetLabel,
        details: this.fields.details.input.value.trim(),
        ndaAgreed: this.fields.nda.input.checked,
        timestamp: new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })
      };

      console.info('[CYBERION DISPATCH] Despachando requerimiento a eduardojhp12@gmail.com:', formData);

      const isLocalFile = window.location.protocol === 'file:';
      let formSubmitSuccess = false;

      // Despacho vía FormSubmit AJAX (activo cuando se ejecuta bajo protocolo web http/https)
      if (!isLocalFile) {
        try {
          const fsRes = await fetch('https://formsubmit.co/ajax/eduardojhp12@gmail.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              _subject: `Nueva Cotización Cyberion: ${formData.fullname} — ${formData.serviceLabel}`,
              _template: 'table',
              _captcha: 'false',
              _replyto: formData.email,
              'Nombre del Cliente': formData.fullname,
              'Correo del Cliente': formData.email,
              'Tipo de Solución': formData.serviceLabel,
              'Presupuesto Estimado': formData.budgetLabel,
              'Detalles del Requerimiento': formData.details,
              'Acuerdo Confidencialidad NDA': formData.ndaAgreed ? 'Aceptado' : 'No',
              'Fecha y Hora': formData.timestamp
            })
          });

          const fsData = await fsRes.json().catch(() => null);
          if (fsRes.ok && fsData && (fsData.success === 'true' || fsData.success === true)) {
            formSubmitSuccess = true;
          }
        } catch (networkErr) {
          console.warn('[CYBERION FORMSUBMIT AJAX FALLBACK]', networkErr);
        }
      }

      // Preparar notas de estado y mensaje al usuario
      let statusNotice = '';
      if (formSubmitSuccess) {
        statusNotice = `✅ <strong>¡Enviado a eduardojhp12@gmail.com!</strong> Recibirás confirmación formal a tu correo en menos de 2 horas. Si deseas atención inmediata, pulsa en WhatsApp.`;
        this.showFeedback(
          'success',
          `¡Requerimiento recibido con éxito, ${formData.fullname}! Tu cotización fue enviada directamente a eduardojhp12@gmail.com y responderemos a ${formData.email} en menos de 2 horas hábiles.`
        );
      } else if (isLocalFile) {
        statusNotice = `ℹ️ <strong>Estás visualizando desde un archivo local (file://).</strong> Pulsa 'Abrir en Gmail' o 'Enviar por WhatsApp' para despachar tu requerimiento directamente a <strong>eduardojhp12@gmail.com</strong> al instante.`;
        this.showFeedback(
          'success',
          `¡Requerimiento estructurado con éxito! Haz clic en el botón de Gmail o WhatsApp en el modal para despacharlo a eduardojhp12@gmail.com.`
        );
      } else {
        statusNotice = `⚡ <strong>Entrega Directa:</strong> Para garantizar recepción instantánea en <strong>eduardojhp12@gmail.com</strong>, pulsa el botón 'Abrir en Gmail' o 'Enviar por WhatsApp' a continuación.`;
        this.showFeedback(
          'success',
          `¡Requerimiento listo para despacho! Selecciona tu canal preferido en el modal para enviarlo a eduardojhp12@gmail.com.`
        );
      }

      // Abrir Modal de Despacho Inmediato con toda la información cargada
      DispatchModalModule.open({
        title: '¡Requerimiento Listo para Despacho!',
        clientName: formData.fullname,
        clientEmail: formData.email,
        serviceLabel: formData.serviceLabel,
        budgetLabel: formData.budgetLabel,
        details: formData.details,
        statusMessage: statusNotice
      });

      // Resetear formulario
      this.form.reset();
      if (this.charCounter) this.charCounter.textContent = '0';
      Object.keys(this.fields).forEach((key) => {
        this.fields[key].group.classList.remove('contact-form__group--valid', 'contact-form__group--error');
      });

    } catch (error) {
      console.error('[CYBERION ERROR]', error);
      this.showFeedback(
        'error',
        'Ocurrió un error inesperado. Por favor intenta nuevamente o escríbenos directamente a eduardojhp12@gmail.com.'
      );
    } finally {
      this.setSubmittingState(false);
    }
  },

  setSubmittingState(isSubmitting) {
    if (!this.submitBtn) return;

    this.submitBtn.disabled = isSubmitting;
    if (this.submitSpinner) {
      this.submitSpinner.hidden = !isSubmitting;
    }

    if (isSubmitting) {
      if (this.submitBtnText) this.submitBtnText.textContent = 'Procesando Requerimiento...';
    } else {
      if (this.submitBtnText) this.submitBtnText.textContent = 'Solicitar Propuesta Técnica';
    }
  },

  showFeedback(type, message) {
    if (!this.feedbackAlert) return;

    this.feedbackAlert.className = `contact-form__alert contact-form__alert--${type}`;
    this.feedbackAlert.textContent = message;
    this.feedbackAlert.hidden = false;
    this.feedbackAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  hideFeedback() {
    if (!this.feedbackAlert) return;
    this.feedbackAlert.hidden = true;
    this.feedbackAlert.textContent = '';
  }
};

/* =============================================================================
   06. MÓDULO DE FONDO DE VIDEO INTERACTIVO
   ============================================================================= */
const VideoBackgroundModule = {
  video: null,
  toggleBtn: null,
  statusText: null,

  init() {
    this.video = document.getElementById('hero-bg-video');
    this.toggleBtn = document.getElementById('btn-toggle-video');
    this.statusText = document.getElementById('video-status-text');

    if (!this.video) return;

    // Asegurar reproducción con sonido muteado (políticas autoplay del navegador)
    this.video.muted = true;
    const playPromise = this.video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.info('[VideoModule] Autoplay con video pausado por política de navegador:', err);
        this.updateStateUI(true);
      });
    }

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.togglePlayback());
    }
  },

  togglePlayback() {
    if (!this.video) return;

    if (this.video.paused) {
      this.video.play();
      this.updateStateUI(false);
    } else {
      this.video.pause();
      this.updateStateUI(true);
    }
  },

  updateStateUI(isPaused) {
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
    }
    if (this.statusText) {
      this.statusText.textContent = isPaused ? 'Reanudar Video' : 'Pausar Video';
    }
  }
};

/* =============================================================================
   07. MÓDULO DE PESTAÑAS (INFORMACIÓN DE LA EMPRESA)
   ============================================================================= */
const AboutTabsModule = {
  tabButtons: [],
  panels: [],

  init() {
    this.tabButtons = Array.from(document.querySelectorAll('[data-about-tab]'));
    this.panels = Array.from(document.querySelectorAll('.about__panel'));

    if (!this.tabButtons.length) return;

    this.bindEvents();
  },

  bindEvents() {
    this.tabButtons.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        this.switchTab(tab);
      });

      // Navegación por teclado accesible (Flechas izquierda/derecha)
      tab.addEventListener('keydown', (e) => {
        let targetIndex = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          targetIndex = (index + 1) % this.tabButtons.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          targetIndex = (index - 1 + this.tabButtons.length) % this.tabButtons.length;
        } else if (e.key === 'Home') {
          targetIndex = 0;
        } else if (e.key === 'End') {
          targetIndex = this.tabButtons.length - 1;
        }

        if (targetIndex !== null) {
          e.preventDefault();
          this.tabButtons[targetIndex].focus();
          this.switchTab(this.tabButtons[targetIndex]);
        }
      });
    });
  },

  switchTab(selectedTab) {
    const targetKey = selectedTab.getAttribute('data-about-tab');
    const targetPanelId = `panel-${targetKey}`;

    this.tabButtons.forEach((btn) => {
      const isSelected = btn === selectedTab;
      btn.classList.toggle('about__tab--active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      btn.tabIndex = isSelected ? 0 : -1;
    });

    this.panels.forEach((panel) => {
      if (panel.id === targetPanelId) {
        panel.classList.add('about__panel--active');
        panel.removeAttribute('hidden');
      } else {
        panel.classList.remove('about__panel--active');
        panel.setAttribute('hidden', '');
      }
    });
  }
};

/* =============================================================================
   08. MÓDULO DE COTIZADOR INTERACTIVO DE SOFTWARE (VENEZUELA)
   ============================================================================= */
const QuoteCalculatorModule = {
  // Tasa de cambio oficial BCV (actualizada automáticamente vía CurrencyService)
  bcvRate: 881.07,
  bcvEurRate: 991.16,
  currencyMode: 'DUAL', // 'DUAL', 'USD', 'VES'
  milestoneScheme: '3-steps', // '3-steps', '2-steps', 'full'
  filterMode: 'recommended', // 'recommended' | 'all'
  currentServiceKey: 'webapp',

  projectTypes: {
    webapp: {
      name: 'Sistema Administrativo & POS Multimoneda',
      baseCost: 650,
      weeks: 4,
      squad: '1 Fullstack Engineer + 1 Database Architect',
      desc: 'Facturación en $ y Bs., control de inventario multialmacén, tasa BCV y caja'
    },
    ecommerce: {
      name: 'Tienda Online + Pedidos a WhatsApp',
      baseCost: 360,
      weeks: 3,
      squad: '1 E-commerce Specialist + 1 Frontend + 1 QA',
      desc: 'Catálogo digital interactivo, checkout con Pago Móvil, Zelle y WhatsApp'
    },
    landing: {
      name: 'Página Web Corporativa / Servicios',
      baseCost: 180,
      weeks: 2,
      squad: '1 UI/UX Designer + 1 Frontend Dev',
      desc: 'Presencia web profesional para marcas, consultorios médicos y firmas'
    },
    software: {
      name: 'Software a Medida & SaaS Empresarial',
      baseCost: 1150,
      weeks: 6,
      squad: '1 Tech Lead + 2 Fullstack Devs + 1 QA',
      desc: 'Automatización completa de operaciones, reportes gerenciales y APIs'
    },
    mobile: {
      name: 'App Móvil para Clientes / Delivery',
      baseCost: 850,
      weeks: 5,
      squad: '1 Mobile Architect + 1 Backend + 1 QA',
      desc: 'App nativa o híbrida con catálogo, pedidos y notificaciones push'
    }
  },

  modules: {
    pagomovil: { label: 'Pago Móvil Automático & Pasarelas (C2P, Banesco, Zelle, Binance)', cost: 120, weeks: 1.0 },
    whatsapp_order: { label: 'Botón de Pedidos Directo a WhatsApp con Ticket Detallado', cost: 65, weeks: 0.5 },
    bcv_sync: { label: 'Sincronización Automática Diaria con Tasa Oficial BCV', cost: 50, weeks: 0.5 },
    inventory: { label: 'Control de Inventario Multialmacén & Alertas de Stock', cost: 140, weeks: 1.0 },
    seniat: { label: 'Facturación, Control de Ventas & Reportes Contables / SENIAT', cost: 160, weeks: 1.0 },
    roles: { label: 'Roles y Permisos de Usuarios (Cajeros, Supervisores, Admin)', cost: 85, weeks: 0.5 },
    delivery: { label: 'Módulo de Delivery & Zonas de Envíos en Venezuela (MRW, Zoom, Tealca)', cost: 110, weeks: 1.0 },
    hosting: { label: 'Dominio (.com/.com.ve) + Hosting Cloud + Correos (1er Año)', cost: 60, weeks: 0.5 },
    notifications: { label: 'Notificaciones Automáticas por WhatsApp / SMS para Clientes', cost: 75, weeks: 0.5 },
    analytics: { label: 'Dashboard de Ganancias & Métricas de Ventas en Vivo', cost: 95, weeks: 0.5 },
    offline: { label: 'Modo Offline Resiliente para Contingencias de Conexión/Luz', cost: 115, weeks: 1.0 },
    thermal_print: { label: 'Integración con Impresoras Térmicas de Tickets POS (58mm/80mm)', cost: 70, weeks: 0.5 }
  },

  speeds: {
    standard: { multiplier: 1.0, timelineMult: 1.0, label: 'Ritmo Estándar (Planificado)' },
    priority: { multiplier: 1.15, timelineMult: 0.75, label: 'Prioritario (+15% aceleración)' },
    express: { multiplier: 1.25, timelineMult: 0.60, label: 'Sprint Urgente Express (+25% aceleración)' }
  },

  filterRecommendedBtn: null,
  filterAllBtn: null,
  filterStatusServiceName: null,

  init() {
    this.currencyButtons = Array.from(document.querySelectorAll('[data-currency]'));
    this.bcvRateDisplay = document.getElementById('bcv-rate-display');
    this.heroRateVal = document.getElementById('hero-rate-val');
    this.rateAppliedNote = document.getElementById('calc-rate-applied-note');

    this.typeInputs = Array.from(document.querySelectorAll('input[name="calc-type"]'));
    this.moduleInputs = Array.from(document.querySelectorAll('input[name="calc-modules"]'));
    this.speedInputs = Array.from(document.querySelectorAll('input[name="calc-speed"]'));
    this.milestoneTabs = Array.from(document.querySelectorAll('.milestone-tab'));

    this.filterRecommendedBtn = document.getElementById('btn-filter-recommended');
    this.filterAllBtn = document.getElementById('btn-filter-all');
    this.filterStatusServiceName = document.getElementById('calc-current-service-name');

    this.usdRowEl = document.getElementById('calc-usd-row');
    this.vesRowEl = document.getElementById('calc-ves-row');
    this.priceUsdEl = document.getElementById('calc-price-usd');
    this.priceVesEl = document.getElementById('calc-price-ves');
    this.milestonesListEl = document.getElementById('calc-milestones-list');

    this.timelineTextEl = document.getElementById('calc-timeline-text');
    this.squadTextEl = document.getElementById('calc-squad-text');
    this.modulesCountEl = document.getElementById('calc-modules-count');
    this.activeTagsContainer = document.getElementById('calc-active-tags-container');
    this.btnTransferQuote = document.getElementById('btn-transfer-quote');
    this.btnDirectDispatch = document.getElementById('btn-direct-dispatch-quote');
    this.btnPrintQuote = document.getElementById('btn-print-quote');

    if (!this.typeInputs.length || !this.priceUsdEl) return;

    // Detectar servicio preseleccionado
    const selectedTypeInput = this.typeInputs.find((i) => i.checked) || this.typeInputs[0];
    if (selectedTypeInput) {
      this.currentServiceKey = selectedTypeInput.value;
    }

    this.bindEvents();
    this.filterModulesByType(this.currentServiceKey);
    this.updateSelectionUI();
    this.calculate();
  },

  filterModulesByType(serviceKey) {
    const serviceNames = {
      webapp: 'Sistema Administrativo & POS',
      ecommerce: 'Tienda Online + WhatsApp',
      landing: 'Página Web & Landing Page',
      software: 'Software a Medida & SaaS',
      mobile: 'App Móvil para Clientes / Delivery'
    };

    if (this.filterStatusServiceName) {
      this.filterStatusServiceName.textContent = serviceNames[serviceKey] || 'Tu Tipo de Proyecto';
    }

    this.moduleInputs.forEach((input) => {
      const chip = input.closest('.calc-module-chip');
      if (!chip) return;

      const servicesAttr = chip.getAttribute('data-services') || '';
      const allowedServices = servicesAttr.split(',').map((s) => s.trim().toLowerCase());
      const isRelevant = allowedServices.includes(serviceKey.toLowerCase());

      if (this.filterMode === 'recommended') {
        if (isRelevant) {
          chip.classList.remove('calc-module-chip--hidden');
        } else {
          chip.classList.add('calc-module-chip--hidden');
          // Desmarcar opciones ocultas para no cobrar ítems no visibles
          if (input.checked) {
            input.checked = false;
            chip.classList.remove('calc-module-chip--checked');
          }
        }
      } else {
        // Modo 'all': mostrar todas las funciones
        chip.classList.remove('calc-module-chip--hidden');
      }
    });
  },

  updateSelectionUI() {
    this.moduleInputs.forEach((input) => {
      const chip = input.closest('.calc-module-chip');
      if (chip) {
        chip.classList.toggle('calc-module-chip--checked', Boolean(input.checked));
      }
    });

    this.typeInputs.forEach((input) => {
      const card = input.closest('.calc-type-card');
      if (card) {
        card.classList.toggle('calc-type-card--selected', Boolean(input.checked));
      }
    });

    this.speedInputs.forEach((input) => {
      const card = input.closest('.calc-speed-card');
      if (card) {
        card.classList.toggle('calc-speed-card--selected', Boolean(input.checked));
      }
    });
  },

  bindEvents() {
    // Cambio de modo de moneda (DUAL, USD, VES)
    this.currencyButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-currency');
        if (mode) {
          this.currencyMode = mode;
          this.currencyButtons.forEach((b) => b.classList.toggle('quote-calculator__curr-btn--active', b === btn));
          this.updateCurrencyVisibility();
          this.calculate();
        }
      });
    });

    // Selección de esquema de hitos/porcentajes
    this.milestoneTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const scheme = tab.getAttribute('data-scheme');
        if (scheme) {
          this.milestoneScheme = scheme;
          this.milestoneTabs.forEach((t) => t.classList.toggle('milestone-tab--active', t === tab));
          this.calculate();
        }
      });
    });

    // Cambio de tipo de servicio en Paso 01 (Filtra automáticamente funciones sugeridas)
    this.typeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        this.currentServiceKey = input.value;
        this.filterModulesByType(this.currentServiceKey);
        this.updateSelectionUI();
        this.calculate();
      });
    });

    // Filtros de funciones: Recomendadas vs Todas
    if (this.filterRecommendedBtn) {
      this.filterRecommendedBtn.addEventListener('click', () => {
        this.filterMode = 'recommended';
        this.filterRecommendedBtn.classList.add('quote-calculator__filter-btn--active');
        if (this.filterAllBtn) this.filterAllBtn.classList.remove('quote-calculator__filter-btn--active');
        this.filterModulesByType(this.currentServiceKey);
        this.calculate();
      });
    }

    if (this.filterAllBtn) {
      this.filterAllBtn.addEventListener('click', () => {
        this.filterMode = 'all';
        this.filterAllBtn.classList.add('quote-calculator__filter-btn--active');
        if (this.filterRecommendedBtn) this.filterRecommendedBtn.classList.remove('quote-calculator__filter-btn--active');
        this.filterModulesByType(this.currentServiceKey);
        this.calculate();
      });
    }

    // Inputs de módulos y velocidad
    const otherInputs = [...this.moduleInputs, ...this.speedInputs];
    otherInputs.forEach((input) => {
      input.addEventListener('change', () => {
        this.updateSelectionUI();
        this.calculate();
      });
    });

    // Delegación de clic sobre chips y tarjetas para asegurar respuesta táctil y de puntero inmediata
    const calculatorEl = document.getElementById('quote-calculator');
    if (calculatorEl) {
      calculatorEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.calc-module-chip, .calc-type-card, .calc-speed-card');
        if (chip) {
          // Un pequeño retardo o microtask garantiza sincronización precisa tras el cambio nativo del input
          requestAnimationFrame(() => {
            this.updateSelectionUI();
          });
        }
      });
    }

    // Transferir cotización al formulario
    if (this.btnTransferQuote) {
      this.btnTransferQuote.addEventListener('click', () => this.transferToContact());
    }

    // Despacho directo de cotización vía modal / WhatsApp / Gmail
    if (this.btnDirectDispatch) {
      this.btnDirectDispatch.addEventListener('click', () => this.dispatchQuoteDirectly());
    }

    // Imprimir o guardar presupuesto
    if (this.btnPrintQuote) {
      this.btnPrintQuote.addEventListener('click', () => this.printSummary());
    }
  },

  updateCurrencyVisibility() {
    if (this.currencyMode === 'USD') {
      if (this.usdRowEl) this.usdRowEl.style.display = 'flex';
      if (this.vesRowEl) this.vesRowEl.style.display = 'none';
    } else if (this.currencyMode === 'VES') {
      if (this.usdRowEl) this.usdRowEl.style.display = 'none';
      if (this.vesRowEl) this.vesRowEl.style.display = 'flex';
    } else {
      // DUAL
      if (this.usdRowEl) this.usdRowEl.style.display = 'flex';
      if (this.vesRowEl) this.vesRowEl.style.display = 'flex';
    }
  },

  calculate() {
    this.updateSelectionUI();

    const selectedTypeInput = this.typeInputs.find((i) => i.checked) || this.typeInputs[0];
    const typeKey = selectedTypeInput.value;
    const typeData = this.projectTypes[typeKey] || this.projectTypes.webapp;

    const selectedModules = this.moduleInputs.filter((i) => i.checked).map((i) => i.value);
    const selectedSpeedInput = this.speedInputs.find((i) => i.checked) || this.speedInputs[0];
    const speedKey = selectedSpeedInput.value;
    const speedData = this.speeds[speedKey] || this.speeds.standard;

    // Calcular costo base en USD
    let baseUsdCost = typeData.baseCost;
    let totalWeeks = typeData.weeks;

    selectedModules.forEach((modKey) => {
      const mod = this.modules[modKey];
      if (mod) {
        baseUsdCost += mod.cost;
        totalWeeks += mod.weeks;
      }
    });

    // Aplicar aceleración
    const finalUsdCost = baseUsdCost * speedData.multiplier;
    const calculatedWeeks = Math.max(2, Math.round(totalWeeks * speedData.timelineMult));

    // Rango de inversión en USD
    const minUsd = Math.round(finalUsdCost * 0.95);
    const maxUsd = Math.round(finalUsdCost * 1.15);

    // Rango de inversión en Bolívares (VES) a la tasa BCV
    const minVes = Math.round(minUsd * this.bcvRate);
    const maxVes = Math.round(maxUsd * this.bcvRate);

    // Actualizar precios en pantalla
    if (this.priceUsdEl) {
      this.priceUsdEl.textContent = `${minUsd.toLocaleString()} – ${maxUsd.toLocaleString()}`;
    }
    if (this.priceVesEl) {
      this.priceVesEl.textContent = `${minVes.toLocaleString()} – ${maxVes.toLocaleString()}`;
    }

    // Actualizar dinámicamente los costos referenciales en las tarjetas de soluciones
    document.querySelectorAll('.calc-type-base').forEach((baseEl) => {
      const baseUsd = parseFloat(baseEl.getAttribute('data-base-usd'));
      if (!isNaN(baseUsd)) {
        const baseVes = Math.round(baseUsd * this.bcvRate);
        baseEl.textContent = `$${baseUsd.toLocaleString()} USD (≈ ${baseVes.toLocaleString()} Bs.)`;
      }
    });

    // Actualizar dinámicamente los costos referenciales en las etiquetas de cada módulo
    document.querySelectorAll('.calc-module-chip__cost').forEach((chipCostEl) => {
      const costUsd = parseFloat(chipCostEl.getAttribute('data-cost-usd'));
      if (!isNaN(costUsd)) {
        const costVes = Math.round(costUsd * this.bcvRate);
        chipCostEl.textContent = `+ $${costUsd.toLocaleString()} USD (≈ ${costVes.toLocaleString()} Bs.)`;
      }
    });

    if (this.timelineTextEl) {
      this.timelineTextEl.textContent = `~${calculatedWeeks} semanas`;
    }
    if (this.squadTextEl) {
      this.squadTextEl.textContent = typeData.squad;
    }
    if (this.modulesCountEl) {
      this.modulesCountEl.textContent = `${selectedModules.length} requerimientos`;
    }

    if (this.rateAppliedNote) {
      this.rateAppliedNote.textContent = `Calculado a tasa oficial BCV de ${this.bcvRate.toFixed(2)} Bs./$`;
    }

    // Renderizar desglose de hitos de pago en USD y Bolívares
    this.renderMilestones(minUsd, maxUsd, minVes, maxVes);

    // Renderizar tags activos
    if (this.activeTagsContainer) {
      this.activeTagsContainer.innerHTML = '';

      const typeTag = document.createElement('span');
      typeTag.className = 'calc-summary__tag';
      typeTag.textContent = typeData.name;
      this.activeTagsContainer.appendChild(typeTag);

      selectedModules.forEach((modKey) => {
        const mod = this.modules[modKey];
        if (mod) {
          const modTag = document.createElement('span');
          modTag.className = 'calc-summary__tag';
          modTag.textContent = mod.label.split('(')[0].trim();
          this.activeTagsContainer.appendChild(modTag);
        }
      });

      if (speedKey !== 'standard') {
        const speedTag = document.createElement('span');
        speedTag.className = 'calc-summary__tag';
        speedTag.style.borderColor = 'rgba(255, 0, 85, 0.4)';
        speedTag.style.color = '#FF2A85';
        speedTag.textContent = speedData.label;
        this.activeTagsContainer.appendChild(speedTag);
      }
    }

    // Guardar estado actual
    this.lastCalculation = {
      typeName: typeData.name,
      typeKey: typeKey,
      minUsd,
      maxUsd,
      minVes,
      maxVes,
      bcvRate: this.bcvRate,
      weeks: calculatedWeeks,
      modulesCount: selectedModules.length,
      modulesList: selectedModules.map((k) => this.modules[k]?.label || k),
      speedLabel: speedData.label,
      scheme: this.milestoneScheme
    };
  },

  renderMilestones(minUsd, maxUsd, minVes, maxVes) {
    if (!this.milestonesListEl) return;

    let items = [];

    if (this.milestoneScheme === '3-steps') {
      // 50% / 30% / 20%
      items = [
        {
          pct: '50% Inicial (Arranque)',
          desc: 'Reserva de squad, arquitectura & diseño UI/UX',
          usd: `$${Math.round(minUsd * 0.5).toLocaleString()} – $${Math.round(maxUsd * 0.5).toLocaleString()}`,
          ves: `Bs. ${Math.round(minVes * 0.5).toLocaleString()} – ${Math.round(maxVes * 0.5).toLocaleString()}`
        },
        {
          pct: '30% Avance (Staging)',
          desc: 'Funcionalidades y pruebas con datos reales',
          usd: `$${Math.round(minUsd * 0.3).toLocaleString()} – $${Math.round(maxUsd * 0.3).toLocaleString()}`,
          ves: `Bs. ${Math.round(minVes * 0.3).toLocaleString()} – ${Math.round(maxVes * 0.3).toLocaleString()}`
        },
        {
          pct: '20% Entrega & Despliegue',
          desc: 'Puesta en marcha, entrega de código y garantía',
          usd: `$${Math.round(minUsd * 0.2).toLocaleString()} – $${Math.round(maxUsd * 0.2).toLocaleString()}`,
          ves: `Bs. ${Math.round(minVes * 0.2).toLocaleString()} – ${Math.round(maxVes * 0.2).toLocaleString()}`
        }
      ];
    } else if (this.milestoneScheme === '2-steps') {
      // 50% / 50%
      items = [
        {
          pct: '50% Inicial (Arranque)',
          desc: 'Inicio de desarrollo y prototipo funcional',
          usd: `$${Math.round(minUsd * 0.5).toLocaleString()} – $${Math.round(maxUsd * 0.5).toLocaleString()}`,
          ves: `Bs. ${Math.round(minVes * 0.5).toLocaleString()} – ${Math.round(maxVes * 0.5).toLocaleString()}`
        },
        {
          pct: '50% Contra Entrega',
          desc: 'Lanzamiento final a producción y dominio activo',
          usd: `$${Math.round(minUsd * 0.5).toLocaleString()} – $${Math.round(maxUsd * 0.5).toLocaleString()}`,
          ves: `Bs. ${Math.round(minVes * 0.5).toLocaleString()} – ${Math.round(maxVes * 0.5).toLocaleString()}`
        }
      ];
    } else {
      // Pago de Contado con -5% Descuento
      const discMinUsd = Math.round(minUsd * 0.95);
      const discMaxUsd = Math.round(maxUsd * 0.95);
      const discMinVes = Math.round(minVes * 0.95);
      const discMaxVes = Math.round(maxVes * 0.95);

      items = [
        {
          pct: '100% Contado (-5% OFF)',
          desc: 'Ahorro inmediato por pago total anticipado',
          usd: `$${discMinUsd.toLocaleString()} – $${discMaxUsd.toLocaleString()} USD`,
          ves: `Bs. ${discMinVes.toLocaleString()} – ${discMaxVes.toLocaleString()}`
        }
      ];
    }

    const showUsd = this.currencyMode === 'DUAL' || this.currencyMode === 'USD';
    const showVes = this.currencyMode === 'DUAL' || this.currencyMode === 'VES';

    this.milestonesListEl.innerHTML = items.map((item) => `
      <div class="milestone-item">
        <div class="milestone-item__info">
          <strong class="milestone-item__pct">${item.pct}</strong>
          <span class="milestone-item__desc">${item.desc}</span>
        </div>
        <div class="milestone-item__amounts">
          ${showUsd ? `<span class="milestone-item__usd">${item.usd}</span>` : ''}
          ${showVes ? `<span class="milestone-item__ves">${item.ves}</span>` : ''}
        </div>
      </div>
    `).join('');
  },

  transferToContact() {
    if (!this.lastCalculation) return;

    const calc = this.lastCalculation;
    const summaryText =
`[PRESUPUESTO CONFIGURADO EN EL COTIZADOR - VENEZUELA]
• Solución: ${calc.typeName}
• Inversión Estimada: $${calc.minUsd.toLocaleString()} - $${calc.maxUsd.toLocaleString()} USD (≈ Bs. ${calc.minVes.toLocaleString()} - ${calc.maxVes.toLocaleString()} VES)
• Tasa BCV Aplicada: 1 USD = ${calc.bcvRate.toFixed(2)} Bs.
• Plazo de Entrega: ~${calc.weeks} semanas (${calc.speedLabel})
• Esquema de Pago: ${calc.scheme === '3-steps' ? '50% Inicial / 30% Avance / 20% Entrega' : calc.scheme === '2-steps' ? '50% Inicial / 50% Entrega' : 'Contado (-5% Descuento)'}
• Módulos Seleccionados (${calc.modulesCount}):
${calc.modulesList.map((m) => `  - ${m}`).join('\n')}

Por favor contáctenme por WhatsApp o llamada para agendar la reunión de kick-off.`;

    let budgetTier = 'tier-3';
    if (calc.maxUsd < 400) budgetTier = 'tier-1';
    else if (calc.maxUsd <= 900) budgetTier = 'tier-2';
    else if (calc.maxUsd <= 2000) budgetTier = 'tier-3';
    else budgetTier = 'tier-4';

    const quotePayload = {
      service: calc.typeKey,
      budget: budgetTier,
      details: summaryText
    };

    const contactSection = document.getElementById('contact');
    const serviceSelect = document.getElementById('select-service');
    const budgetSelect = document.getElementById('select-budget');
    const detailsTextarea = document.getElementById('textarea-details');

    if (contactSection && serviceSelect && detailsTextarea) {
      serviceSelect.value = quotePayload.service;
      serviceSelect.dispatchEvent(new Event('change'));

      if (budgetSelect) {
        budgetSelect.value = quotePayload.budget;
        budgetSelect.dispatchEvent(new Event('change'));
      }

      detailsTextarea.value = quotePayload.details;
      detailsTextarea.dispatchEvent(new Event('input'));

      contactSection.scrollIntoView({ behavior: 'smooth' });

      const formCard = document.querySelector('.contact__form-card');
      if (formCard) {
        formCard.style.boxShadow = '0 0 45px rgba(2, 132, 199, 0.45)';
        setTimeout(() => {
          formCard.style.boxShadow = '';
        }, 1800);
      }
    } else {
      // Transferencia entre páginas hacia contacto.html
      try {
        localStorage.setItem('cyberion_quote_transfer', JSON.stringify(quotePayload));
      } catch (err) {
        console.warn('Error guardando cotización en localStorage:', err);
      }
      window.location.href = 'contacto.html#contact-form';
    }
  },

  dispatchQuoteDirectly() {
    if (!this.lastCalculation) return;
    const calc = this.lastCalculation;
    const summaryText =
`[PRESUPUESTO CONFIGURADO EN EL COTIZADOR - VENEZUELA]
• Solución: ${calc.typeName}
• Inversión Estimada: $${calc.minUsd.toLocaleString()} - $${calc.maxUsd.toLocaleString()} USD (≈ Bs. ${calc.minVes.toLocaleString()} - ${calc.maxVes.toLocaleString()} VES)
• Tasa BCV Oficial: 1 USD = ${calc.bcvRate.toFixed(2)} Bs.
• Plazo de Entrega: ~${calc.weeks} semanas (${calc.speedLabel})
• Esquema de Pago: ${calc.scheme === '3-steps' ? '50% Inicial / 30% Avance / 20% Entrega' : calc.scheme === '2-steps' ? '50% Inicial / 50% Entrega' : 'Contado (-5% Descuento)'}
• Módulos Seleccionados (${calc.modulesCount}):
${calc.modulesList.map((m) => `  - ${m}`).join('\n')}

Por favor contáctenme para coordinar la propuesta técnica formal.`;

    let budgetTier = 'tier-3';
    if (calc.maxUsd < 400) budgetTier = 'tier-1';
    else if (calc.maxUsd <= 900) budgetTier = 'tier-2';
    else if (calc.maxUsd <= 2000) budgetTier = 'tier-3';
    else budgetTier = 'tier-4';

    DispatchModalModule.open({
      title: '¡Presupuesto Listo para Despacho!',
      clientName: 'Cliente Interesado',
      clientEmail: '',
      serviceLabel: calc.typeName,
      budgetLabel: `$${calc.minUsd.toLocaleString()} – $${calc.maxUsd.toLocaleString()} USD (≈ Bs. ${calc.minVes.toLocaleString()} – ${calc.maxVes.toLocaleString()})`,
      details: summaryText,
      statusMessage: `⚡ Presupuesto calculado en vivo a tasa oficial BCV (${calc.bcvRate.toFixed(2)} Bs./$). Despáchalo con un solo clic a <strong>eduardojhp12@gmail.com</strong> o por WhatsApp.`
    });
  },

  printSummary() {
    window.print();
  }
};

/* =============================================================================
   09. MÓDULO DE MODAL DE PROYECTOS (PORTAFOLIO EN DETALLE)
   ============================================================================= */
const ProjectModalModule = {
  modal: null,
  backdrop: null,
  closeBtn: null,
  lastFocusedElement: null,

  projectsData: {
    fintech: {
      title: 'Plataforma de Trading Algorítmico y Análisis en Tiempo Real',
      client: 'Apex Financial Markets',
      badge: 'Web App',
      image: 'assets/project-fintech.jpg',
      challenge: 'Garantizar transacciones financieras masivas con 0% de pérdidas y latencias inferiores a 18ms bajo cumplimiento regulatorio internacional.',
      solution: 'Diseño de microservicios tolerantes a fallos en Rust y Next.js, con WebSockets reactivos de baja latencia y base de datos distribuida en Redis.',
      metrics: [
        { label: 'Latencia P99', value: '< 18ms' },
        { label: 'Volumen Operativo', value: '+340%' },
        { label: 'Throughput', value: '45k tx/s' },
        { label: 'Disponibilidad', value: '99.995%' }
      ],
      stack: ['Next.js', 'Rust Core', 'WebAssembly', 'Redis', 'WebSockets', 'Chart.js']
    },
    ecommerce: {
      title: 'E-Commerce Headless Global con Checkout Instantáneo',
      client: 'Aura Luxury Goods',
      badge: 'E-Commerce',
      image: 'assets/project-ecommerce.jpg',
      challenge: 'Superar la tasa de rebote del 42% provocada por una plataforma monolítica heredada lenta, preparando la infraestructura para picos de ventas globales.',
      solution: 'Reingeniería headless con arquitectura desacoplada, Edge CDN, integración Stripe Elements y optimización móvil con tiempo de carga inferior a 600ms.',
      metrics: [
        { label: 'Tasa Conversión', value: '+42%' },
        { label: 'First Contentful Paint', value: '0.58s' },
        { label: 'Tiempo de Carga', value: '< 600ms' },
        { label: 'Mercados Activos', value: '18 Países' }
      ],
      stack: ['Headless Shopify', 'TypeScript', 'Stripe Elements', 'Edge CDN', 'Next.js']
    },
    logistics: {
      title: 'Motor Distribuido de Telemetría y Despacho Automatizado',
      client: 'Vanguard Logistics Corp',
      badge: 'Sistemas',
      image: 'assets/project-logistics.jpg',
      challenge: 'Malla de microservicios para tracking geográfico en vivo de 15,000 unidades de transporte con tolerancia estricta a caídas de red.',
      solution: 'Pipeline de telemetría distribuida en Golang con Apache Kafka para particionado de eventos y clúster Kubernetes de alta disponibilidad.',
      metrics: [
        { label: 'Disponibilidad', value: '99.999%' },
        { label: 'Ahorro Servidores', value: '-65%' },
        { label: 'Flota Monitoreada', value: '15,000 Uni' },
        { label: 'Latencia de Red', value: '48ms' }
      ],
      stack: ['Go / Golang', 'Apache Kafka', 'Kubernetes', 'PostgreSQL', 'Mapbox GL']
    },
    saas: {
      title: 'Suite Colaborativa Cloud con Edición Concurrente Multiusuario',
      client: 'Syncro Enterprise Workspace',
      badge: 'Web App',
      image: 'assets/project-saas.jpg',
      challenge: 'Permitir edición de documentos y tableros interactivos de proyectos en tiempo real para cientos de miles de usuarios concurrentes sin colisiones de datos.',
      solution: 'Espacio de trabajo web reactivo implementado con algoritmos CRDT conflict-free, sincronización punto a punto WebRTC y almacenamiento local IndexedDB.',
      metrics: [
        { label: 'Conflictos de Merge', value: '0 ms' },
        { label: 'Usuarios Activos', value: '100k+ DAU' },
        { label: 'Sincronización', value: '< 25ms' },
        { label: 'Cifrado de Datos', value: 'AES-256' }
      ],
      stack: ['React', 'WebRTC', 'Node.js', 'IndexedDB', 'CRDT Yjs', 'TailwindCSS']
    },
    b2bmarket: {
      title: 'Marketplace B2B de Abastecimiento con Cotizador Automático',
      client: 'Metropolis Industrial Supplies',
      badge: 'E-Commerce',
      image: 'assets/project-b2bmarket.jpg',
      challenge: 'Digitalizar compras mayoristas de maquinaria industrial pesada con catálogos jerárquicos personalizados y cotizaciones instantáneas por volumen.',
      solution: 'Plataforma B2B con motor de búsqueda vectorial ElasticSearch, backend modular FastAPI y sincronización bidireccional con ERP empresarial SAP.',
      metrics: [
        { label: 'GMV Procesado', value: '$82M+' },
        { label: 'Tiempo de Compra', value: '-80%' },
        { label: 'Catálogo de Piezas', value: '850k+ SKUs' },
        { label: 'Sincronización SAP', value: 'Realtime' }
      ],
      stack: ['Vue.js 3', 'Python / FastAPI', 'ElasticSearch', 'AWS Aurora', 'SAP ERP API']
    },
    security: {
      title: 'Sistema Zero-Trust de Detección e Inmunización de Amenazas',
      client: 'Sentinel Defense Grid',
      badge: 'Sistemas',
      image: 'assets/project-security.jpg',
      challenge: 'Detección proactiva e inmunización automática contra ataques de día cero, inyecciones de código malicioso e intrusiones en infraestructura crítica.',
      solution: 'Módulo de inspección profunda de paquetes con programas de bajo nivel eBPF en Rust, correlación SIEM y mitigación automatizada en menos de 3 segundos.',
      metrics: [
        { label: 'Inspección de Tráfico', value: '100%' },
        { label: 'Auto-Mitigación', value: '< 3s' },
        { label: 'Falsos Positivos', value: '0.01%' },
        { label: 'Uptime Global', value: '99.8%' }
      ],
      stack: ['Rust', 'eBPF', 'Grafana', 'Docker', 'Zero-Trust Framework']
    },
    analytics: {
      title: 'Motor Distribuido de Telemetría y Despacho Automatizado',
      client: 'Vanguard Logistics Corp',
      badge: 'Sistemas',
      image: 'assets/project-logistics.jpg',
      challenge: 'Ingerir y procesar telemetría continua de más de 45,000 sensores distribuidos sin retrasos de visualización.',
      solution: 'Pipeline de datos streaming en tiempo real con Apache Kafka y renderizado WebGL reactivo.',
      metrics: [
        { label: 'Eventos Diarios', value: '2.4B+' },
        { label: 'Dispositivos Activos', value: '45,000+' }
      ],
      stack: ['Go', 'Apache Kafka', 'PostgreSQL']
    }
  },

  init() {
    this.modal = document.getElementById('project-modal');
    this.backdrop = document.getElementById('modal-backdrop');
    this.closeBtn = document.getElementById('modal-close-btn');

    if (!this.modal) return;

    this.bindEvents();
  },

  bindEvents() {
    // Abrir modal desde botones de tarjetas de proyectos
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-project-key]');
      if (trigger) {
        const key = trigger.getAttribute('data-project-key');
        this.open(key, trigger);
      }
    });

    // Cerrar con botón de cierre
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // Cerrar al pulsar el backdrop
    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.close());
    }

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal?.classList.contains('project-modal--open')) {
        this.close();
      }
    });
  },

  open(projectKey, triggerElement) {
    const data = this.projectsData[projectKey];
    if (!data) return;

    this.lastFocusedElement = triggerElement;

    // Poblar datos en el modal
    const imgEl = document.getElementById('modal-project-img');
    const titleEl = document.getElementById('modal-project-title');
    const clientEl = document.getElementById('modal-project-client');
    const badgeEl = document.getElementById('modal-project-badge');
    const challengeEl = document.getElementById('modal-project-challenge');
    const solutionEl = document.getElementById('modal-project-solution');
    const metricsEl = document.getElementById('modal-project-metrics');
    const stackEl = document.getElementById('modal-project-stack');

    if (imgEl && data.image) {
      imgEl.src = data.image;
      imgEl.alt = data.title;
    }
    if (titleEl) titleEl.textContent = data.title;
    if (clientEl) clientEl.textContent = data.client;
    if (badgeEl) badgeEl.textContent = data.badge;
    if (challengeEl) challengeEl.textContent = data.challenge;
    if (solutionEl) solutionEl.textContent = data.solution;

    // Renderizar métricas
    if (metricsEl) {
      metricsEl.innerHTML = data.metrics.map((m) => `
        <div class="modal-metric">
          <span class="modal-metric__val">${m.value}</span>
          <span class="modal-metric__lbl">${m.label}</span>
        </div>
      `).join('');
    }

    // Renderizar stack de tecnologías
    if (stackEl) {
      stackEl.innerHTML = data.stack.map((tech) => `
        <span class="modal-chip">${tech}</span>
      `).join('');
    }

    // Mostrar modal y backdrop
    this.modal.classList.add('project-modal--open', 'is-open');
    if (this.backdrop) {
      this.backdrop.hidden = false;
      this.backdrop.classList.add('modal-backdrop--open');
    }

    document.body.style.overflow = 'hidden';

    // Foco accesible al botón de cierre
    if (this.closeBtn) {
      setTimeout(() => this.closeBtn.focus(), 80);
    }
  },

  close() {
    if (!this.modal) return;

    this.modal.classList.remove('project-modal--open', 'is-open');
    if (this.backdrop) {
      this.backdrop.classList.remove('modal-backdrop--open');
      setTimeout(() => {
        this.backdrop.hidden = true;
      }, 300);
    }

    document.body.style.overflow = '';

    // Restaurar foco al elemento que activó la modal
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
    }
  }
};

/* =============================================================================
   10. MÓDULO DE PREGUNTAS FRECUENTES (ACCORDION ACCESIBLE)
   ============================================================================= */
const FaqModule = {
  triggers: [],

  init() {
    this.triggers = Array.from(document.querySelectorAll('.faq-item__trigger'));
    if (!this.triggers.length) return;

    this.bindEvents();
  },

  bindEvents() {
    this.triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.faq-item');
        const panel = item?.querySelector('.faq-item__panel');
        if (!item || !panel) return;

        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

        // Cerrar todos los demás items para comportamiento de acordeón limpio
        this.triggers.forEach((otherTrigger) => {
          if (otherTrigger !== trigger) {
            const otherItem = otherTrigger.closest('.faq-item');
            const otherPanel = otherItem?.querySelector('.faq-item__panel');
            if (otherItem && otherPanel) {
              otherItem.classList.remove('faq-item--expanded', 'faq-item--open');
              otherTrigger.setAttribute('aria-expanded', 'false');
              otherPanel.style.maxHeight = '0px';
            }
          }
        });

        // Alternar el item actual
        if (isExpanded) {
          item.classList.remove('faq-item--expanded', 'faq-item--open');
          trigger.setAttribute('aria-expanded', 'false');
          panel.style.maxHeight = '0px';
        } else {
          item.classList.add('faq-item--expanded', 'faq-item--open');
          trigger.setAttribute('aria-expanded', 'true');
          panel.style.maxHeight = `${panel.scrollHeight}px`;
        }
      });
    });
  }
};
