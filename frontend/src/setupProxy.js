const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Proxy for standard API requests (HTTP)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
    })
  );

  // Proxy for WebSocket requests
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://backend:8000',
      ws: true, // This is the key line to enable WebSockets!
    })
  );
};
