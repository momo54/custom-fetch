// launch like this:
// node proxy.js 3000 http://localhost:3001
// include dependencies
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// récupérer les paramètres depuis la ligne de commande
const args = process.argv.slice(2);
const port = parseInt(args[0], 10) || 3000;
const target = args[1] || 'http://localhost:3001';

const app = express();

// create the proxy
/** @type {import('http-proxy-middleware/dist/types').RequestHandler<express.Request, express.Response>} */
const exampleProxy = createProxyMiddleware({
  target: target, // target host with the same base path
  changeOrigin: true, // needed for virtual hosted sites
  logLevel: 'debug',
});

// Ajoute un petit log de chaque requête entrante (avant proxy)
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  console.log(`[Request] Headers: ${JSON.stringify(req.headers)}`);
  console.log(`[Request] Body: ${JSON.stringify(req.body)}`);
  console.log(`[Request] Query: ${JSON.stringify(req.query)}`);
  next();
});

// mount `exampleProxy` in web server
app.use('/', exampleProxy);
app.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
  console.log(`Proxying requests to ${target}`);
});