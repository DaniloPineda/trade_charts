// frontend/src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Redirige las peticiones que empiezan con /api
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
    })
  );

  // Redirige las peticiones que empiezan con /ws
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://backend:8000',
      ws: true, // Habilita el proxy para WebSockets
    })
  );
};
