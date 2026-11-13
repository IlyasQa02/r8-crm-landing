/* Счётчики и рекламные пиксели R8 CRM.
   ID задаются в index.html в window.R8_TRACKING. Пустой ID — счётчик не загружается.

   Цели (одинаковые имена во всех системах):
     lead            — отправлена любая форма (обратный звонок или демо), параметр form: callback | demo
     phone_click     — клик по номеру телефона
     whatsapp_click  — клик по кнопке WhatsApp
     email_click     — клик по почте
   main.js вызывает window.r8track('lead', {form}) после успешной отправки. */
(function () {
  var C = window.R8_TRACKING || {};
  function load(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }

  /* ---------- Google Analytics 4 + Google Ads (один gtag.js) ---------- */
  var gId = C.ga4 || C.googleAds;
  if (gId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    if (C.ga4) gtag('config', C.ga4);
    if (C.googleAds) gtag('config', C.googleAds);
    load('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gId));
  }

  /* ---------- Яндекс Метрика ---------- */
  if (C.yandexMetrika) {
    window.ym = window.ym || function () { (ym.a = ym.a || []).push(arguments); };
    ym.l = +new Date();
    load('https://mc.yandex.ru/metrika/tag.js');
    ym(+C.yandexMetrika, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }

  /* ---------- Meta Pixel (Facebook / Instagram) ---------- */
  if (C.metaPixel) {
    var f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
    if (!window._fbq) window._fbq = f;
    f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
    load('https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.metaPixel);
    fbq('track', 'PageView');
  }

  /* ---------- TikTok Pixel ---------- */
  if (C.tiktokPixel) {
    var t = window.ttq = window.ttq || [];
    t.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    t.setAndDefer = function (o, m) { o[m] = function () { o.push([m].concat([].slice.call(arguments, 0))); }; };
    for (var i = 0; i < t.methods.length; i++) t.setAndDefer(t, t.methods[i]);
    load('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(C.tiktokPixel) + '&lib=ttq');
    ttq.page();
  }

  /* ---------- единая отправка целей во все подключённые системы ---------- */
  window.r8track = function (name, params) {
    params = params || {};
    try {
      if (window.gtag) {
        if (name === 'lead') {
          gtag('event', 'generate_lead', { form: params.form, currency: 'KZT' });
          if (C.googleAds && C.googleAdsLead) gtag('event', 'conversion', { send_to: C.googleAds + '/' + C.googleAdsLead });
        } else {
          gtag('event', name, params);
        }
      }
      if (window.ym && C.yandexMetrika) {
        ym(+C.yandexMetrika, 'reachGoal', name, params);
        if (name === 'lead' && params.form) ym(+C.yandexMetrika, 'reachGoal', 'lead_' + params.form);
      }
      if (window.fbq) {
        if (name === 'lead') fbq('track', 'Lead', { content_name: params.form });
        else fbq('track', 'Contact', { content_name: name });
      }
      if (window.ttq && window.ttq.track) {
        ttq.track(name === 'lead' ? 'SubmitForm' : 'Contact', { content_name: params.form || name });
      }
    } catch (_) { /* аналитика не должна ломать страницу */ }
  };

  /* ---------- клики по контактам ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    if (h.indexOf('tel:') === 0) r8track('phone_click');
    else if (h.indexOf('https://wa.me/') === 0) r8track('whatsapp_click');
    else if (h.indexOf('mailto:') === 0) r8track('email_click');
  });
})();
