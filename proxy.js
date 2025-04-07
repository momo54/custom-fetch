const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Buffer } = require('buffer');

// Lire les arguments de la ligne de commande
// Exemple d'utilisation : node proxy.js --port=4000 --target=https://query.wikidata.org/sparql
// Exemple d'utilisation : node proxy.js --port=3000 --target=https://dbpedia.org/sparql
const args = require('minimist')(process.argv.slice(2));
const PORT = args.port || 3000;
const TARGET = args.target || 'https://dbpedia.org/sparql';

const app = express();

app.use(express.text({ type: '*/*' }));

app.use((req, res, next) => {
  console.log('=== Requête entrante ===');
  console.log('Méthode :', req.method);
  console.log('URL :', req.originalUrl);
  console.log('Headers :', req.headers);
  console.log('Body :', req.body);
  next();
});

app.use('/sparql', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    if (req.body) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

app.listen(PORT, () => {
  console.log(`Proxy lancé sur http://localhost:${PORT}/sparql → ${TARGET}`);
});
