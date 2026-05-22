// Simple local dev server with live reload — run with: node serve.js
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.css':  'text/css',
};

// Live-reload: keep a list of connected SSE clients
const clients = new Set();

// Watch the whole directory for any file change
fs.watch(ROOT, { recursive: true }, (event, filename) => {
  if (!filename || filename.includes('node_modules')) return;
  console.log(`[reload] ${filename} changed`);
  for (const res of clients) {
    res.write('data: reload\n\n');
  }
});

http.createServer((req, res) => {
  // Live-reload SSE endpoint
  if (req.url === '/__livereload') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('data: connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`MailCal running at http://localhost:${PORT}`);
  console.log('Live reload active — saves trigger automatic browser refresh.');
});
