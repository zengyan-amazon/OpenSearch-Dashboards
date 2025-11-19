#!/usr/bin/env node

/*
 * Simple dev server for webpack 5 micro-frontend testing
 * 
 * Serves:
 * - HTML test page at http://localhost:5602/
 * - Webpack 5 shared bundles at http://localhost:5602/shared-deps/
 * - Static assets and CSS themes
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { REPO_ROOT } = require('@osd/utils');

const PORT = 5602;
const BASE_DIR = path.resolve(REPO_ROOT, 'poc-microfrontend');
const DIST_DIR = path.resolve(BASE_DIR, 'dist');
const HTML_FILE = path.resolve(BASE_DIR, 'dev-server/src/index.html'); // Module testing page
const OSD_SHELL_FILE = path.resolve(BASE_DIR, 'dev-server/src/osd-shell.html'); // OSD application

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - File Not Found');
      return;
    }
    
    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  console.log(`📨 ${req.method} ${pathname}`);
  
  // Serve main HTML page (module testing)
  if (pathname === '/' || pathname === '/index.html') {
    serveFile(HTML_FILE, res);
    return;
  }
  
  // Serve OSD shell application
  if (pathname === '/app' || pathname === '/osd-shell.html') {
    serveFile(OSD_SHELL_FILE, res);
    return;
  }
  
  // Serve webpack 5 shared dependencies built assets
  if (pathname.startsWith('/shared-deps/')) {
    const fileName = pathname.replace('/shared-deps/', '');
    const filePath = path.resolve(DIST_DIR, 'shared-deps', fileName);
    serveFile(filePath, res);
    return;
  }
  
  // Serve webpack 5 core bundle assets
  if (pathname.startsWith('/core/')) {
    const fileName = pathname.replace('/core/', '');
    const filePath = path.resolve(DIST_DIR, 'core', fileName);
    serveFile(filePath, res);
    return;
  }
  
  // Serve translation files from source directory
  if (pathname.startsWith('/translations/')) {
    const fileName = pathname.replace('/translations/', '');
    const filePath = path.resolve(REPO_ROOT, 'src/translations', fileName);
    serveFile(filePath, res);
    return;
  }
  
  // Serve Module Federation chunks (requested from root by remoteEntry.js)
  const sharedChunkFile = path.resolve(DIST_DIR, 'shared-deps', pathname.slice(1));
  if (fs.existsSync(sharedChunkFile)) {
    serveFile(sharedChunkFile, res);
    return;
  }
  
  const coreChunkFile = path.resolve(DIST_DIR, 'core', pathname.slice(1));
  if (fs.existsSync(coreChunkFile)) {
    serveFile(coreChunkFile, res);
    return;
  }
  
  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 - Not Found');
});

server.listen(PORT, () => {
  console.log('🚀 Webpack 5 Micro-Frontend Dev Server started!');
  console.log(`   URL: http://localhost:${PORT}/`);
  console.log(`   Serving:`);
  console.log(`     - HTML: ${HTML_FILE}`);
  console.log(`     - Assets: ${DIST_DIR}`);
  console.log('');
  console.log('📊 Available endpoints:');
  console.log(`   - http://localhost:${PORT}/                     (Module testing page)`);
  console.log(`   - http://localhost:${PORT}/app                  (🚀 OSD Shell Application)`);
  console.log(`   - http://localhost:${PORT}/shared-deps/osd-ui-shared-deps.js    (Main bundle)`);
  console.log(`   - http://localhost:${PORT}/shared-deps/osd-ui-shared-deps.v8.light.css (Theme CSS)`);
  console.log('');
  console.log('🔗 Compare with existing OSD: http://localhost:5601/');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Webpack 5 dev server...');
  server.close(() => {
    console.log('✅ Server stopped.');
    process.exit(0);
  });
});
