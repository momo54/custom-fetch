// launch like this:
// node proxy.js 3000 http://localhost:3001
// include dependencies
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');


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

// 🔐 Configuration du client JWKS
const jwksClient = jwksRsa({
  jwksUri: process.env.JWKS_URI || 'http://localhost:8080/realms/sparql/protocol/openid-connect/certs'
});

// 🔑 Fonction pour récupérer la clé publique
function getKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// 🔒 Middleware de vérification du token
function verifyToken(req, res, next) {
  if (req.method !== 'POST') return next();

  const auth = req.headers.authorization;
  const token = auth && auth.split(' ')[1];

  if (!token) {
    return res.status(401).send('Missing token');
  }

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      return res.status(403).send(`Token verification failed: ${err.message}`);
    }

    // Stocker les infos décodées si besoin
    req.user = decoded;
    next();
  });
}

function verifyDummyToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.split(' ')[1];

  console.log(`verifyDummyToken: ${req.method} ${req.url} {auth: ${token}}`);
  if (token !== 'dummy-token') {
    return res.status(403).send('Invalid token');
  }

  if (req.method !== 'POST') return next();

  next();
}


//app.use('/', verifyDummyToken, exampleProxy);
app.use('/', verifyToken, exampleProxy);

// mount `exampleProxy` in web server
//app.use('/', exampleProxy);
app.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
  console.log(`Proxying requests to ${target}`);
});