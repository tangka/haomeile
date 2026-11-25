(() => {
  const id = document.currentScript?.dataset.ga4MeasurementId;
  if (!id || !/^G-[A-Z0-9]{10}$/.test(id)) return;

  window.dataLayer ||= [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  // The tag sends its own page_view when it starts, and ignores page settings
  // given later in config. They must be set first, and no second page_view sent.
  gtag('set', {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: location.origin + location.pathname,
    page_referrer: document.referrer ? new URL(document.referrer).origin : '',
    page_title: location.pathname,
  });
  gtag('js', new Date());
  gtag('config', id);

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.append(tag);
})();
