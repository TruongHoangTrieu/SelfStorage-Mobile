// Lightweight CORS & Dev Proxy for Mobile Web (translates localhost:8081 -> deployed Render backend with whitelisted origin)
const http = require('http');
const https = require('https');
const { URL } = require('url');

const TARGET = 'https://selfstorage-be-1.onrender.com';
const PORT = 5000;

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const targetUrl = new URL(req.url, TARGET);
  const clientReq = https.request(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
        origin: 'http://localhost:3000', // Whitelisted origin on deployed Render backend
      },
    },
    (backendRes) => {
      res.writeHead(backendRes.statusCode, {
        ...backendRes.headers,
        'access-control-allow-origin': req.headers.origin || '*',
        'access-control-allow-credentials': 'true',
      });
      backendRes.pipe(res);
    }
  );

  clientReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
  });

  req.pipe(clientReq);
});

server.listen(PORT, () => {
  console.log(`[Proxy] Running on http://localhost:${PORT} -> ${TARGET}`);
});
