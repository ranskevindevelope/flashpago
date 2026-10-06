// Google Analytics (GA4) solo en la landing pública: no se carga en app.flashpago.co ni en /panel (datos de clientes).
// Va en un archivo aparte porque la CSP del servidor no permite scripts en línea.
(function () {
  var ID = 'G-G5QENPBZXF';
  var host = location.hostname;
  var esLanding = (host === 'flashpago.co' || host === 'www.flashpago.co') && location.pathname.indexOf('/panel') !== 0;
  if (!esLanding) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', ID);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
})();
