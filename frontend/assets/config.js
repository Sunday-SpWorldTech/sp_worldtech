(function () {
  const host = window.location.hostname;
  const origin = window.location.origin;
  const isFilePreview = window.location.protocol === 'file:';
  const localhost = ['localhost', '127.0.0.1', ''].includes(host) || isFilePreview;
  const injected = window.__SP_WORLDTECH_CONFIG__ || {};
  const explicit =
    injected.SP_WORLDTECH_API_BASE_URL ||
    injected.API_BASE_URL ||
    injected.service_BASE_URL ||
    window.SP_WORLDTECH_API_BASE_URL ||
    window.SPW_service_BASE_URL ||
    window.SP_WORLDTECH_service_BASE_URL ||
    localStorage.getItem('SP_WORLDTECH_API_BASE_URL') ||
    localStorage.getItem('SP_WORLDTECH_service_BASE_URL') ||
    '';
  const renderPlatform =
    injected.RENDER_BACKEND_URL ||
    injected.SP_WORLDTECH_API_BASE_URL ||
    window.SP_WORLDTECH_RENDER_BACKEND_URL ||
    window.SP_WORLDTECH_API_BASE_URL ||
    localStorage.getItem('SP_WORLDTECH_RENDER_BACKEND_URL') ||
    localStorage.getItem('SP_WORLDTECH_API_BASE_URL') ||
    'https://sp-worldtech-backend.onrender.com/api';
  const sameOriginApi = `${origin}/api`;
  const looksLikePlatform = /platform|api/i.test(host) || localhost;
  const looksLikeStaticRender = /\.onrender\.com$/i.test(host) && !/platform|api/i.test(host);

  let apiBase;
  if (explicit) apiBase = explicit;
  else if (isFilePreview) apiBase = renderPlatform;
  else if (localhost) apiBase = 'http://localhost:5000/api';
  else if (looksLikeStaticRender) apiBase = renderPlatform;
  else apiBase = renderPlatform;

  apiBase = String(apiBase).replace(/\/$/, '');
  const fallbackApiBase = apiBase === renderPlatform.replace(/\/$/, '') ? '' : renderPlatform.replace(/\/$/, '');

  window.APP_CONFIG = {
    service_BASE_URL: apiBase,
    FALLBACK_service_BASE_URL: fallbackApiBase,
    SITE_URL: injected.SITE_URL || 'https://spworldtech.com',
    PUBLIC_DOMAIN: injected.PUBLIC_DOMAIN || 'spworldtech.com',
    BRAND: 'SP WorldTech',
    PRODUCT_NAME: 'SP WorldTech — The World 🌎 Web, Applications & Software Solutions'
  };

  window.spApiUrl = function spApiUrl(path = '') {
    const clean = String(path || '').startsWith('/') ? path : `/${path}`;
    return `${window.APP_CONFIG.service_BASE_URL}${clean}`;
  };

  window.spFetch = async function spFetch(path, options = {}) {
    const url = window.spApiUrl(path);
    try {
      return await fetch(url, options);
    } catch (primaryError) {
      const fallback = window.APP_CONFIG.FALLBACK_service_BASE_URL;
      if (!fallback) throw primaryError;
      const clean = String(path || '').startsWith('/') ? path : `/${path}`;
      return fetch(`${fallback}${clean}`, options);
    }
  };
})();
