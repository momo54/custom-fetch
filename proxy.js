const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Buffer } = require('buffer');

const app = express();

// Middleware pour parser tous les bodies (text, JSON, etc.)
app.use(express.text({ type: '*/*' }));

// Middleware pour afficher les headers et le body
app.use((req, res, next) => {
  console.log('=== Requête entrante ===');
  console.log('Méthode :', req.method);
  console.log('URL :', req.originalUrl);
  console.log('Headers :', req.headers);
  console.log('Body :', req.body);
  next();
});

// Cible vers laquelle on redirige les requêtes
const TARGET = 'https://dbpedia.org/sparql';

app.use('/sparql', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  logLevel: 'debug',

  // Important : forward body
  onProxyReq: (proxyReq, req, res) => {
    if (req.body) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));


// Lancer le serveur
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Proxy lancé sur http://localhost:${PORT}/sparql → ${TARGET}`);
});
