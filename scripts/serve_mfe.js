#!/usr/bin/env node

/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    pluginId: null,
    port: 9001,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--plugin-id=')) {
      options.pluginId = arg.split('=')[1];
    } else if (arg === '--plugin-id' && i + 1 < args.length) {
      options.pluginId = args[++i];
    } else if (arg.startsWith('--port=')) {
      options.port = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--port' && i + 1 < args.length) {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node serve_mfe.js --plugin-id=<pluginId> [--port=<port>]

Serves Module Federation remote entries for local development.

Options:
  --plugin-id    Required. The ID of the plugin to serve (e.g., mfeExample)
  --port         Optional. Port to serve on (default: 9001)
  --help, -h     Show this help message

Example:
  node scripts/serve_mfe.js --plugin-id=mfeExample --port=9001

This will serve the MFE bundle from:
  examples/mfe_example/target/public/mfe/

The remote entry will be available at:
  http://localhost:9001/remoteEntry.js

Configure OpenSearch Dashboards to load this remote in opensearch_dashboards.yml:
  mfe.remotes:
    - name: mfeExample
      url: http://localhost:9001/remoteEntry.js
`);
      process.exit(0);
    }
  }

  if (!options.pluginId) {
    console.error('Error: --plugin-id is required');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  return options;
}

// Get MIME type based on file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.html': 'text/html',
    '.map': 'application/json',
    '.txt': 'text/plain',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Find the plugin directory
function findPluginDir(pluginId) {
  // Convert pluginId from camelCase to snake_case for directory name
  const snakeCase = pluginId.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

  // Possible plugin locations
  const possiblePaths = [
    path.resolve(__dirname, '..', 'examples', snakeCase, 'target', 'public', 'mfe'),
    path.resolve(__dirname, '..', 'plugins', snakeCase, 'target', 'public', 'mfe'),
    path.resolve(__dirname, '..', 'src', 'plugins', snakeCase, 'target', 'public', 'mfe'),
    // Also try the exact pluginId in case it's not snake_case
    path.resolve(__dirname, '..', 'examples', pluginId, 'target', 'public', 'mfe'),
    path.resolve(__dirname, '..', 'plugins', pluginId, 'target', 'public', 'mfe'),
    path.resolve(__dirname, '..', 'src', 'plugins', pluginId, 'target', 'public', 'mfe'),
  ];

  for (const pluginPath of possiblePaths) {
    if (fs.existsSync(pluginPath)) {
      return pluginPath;
    }
  }

  return null;
}

// Create HTTP server
async function createServer(options) {
  const { pluginId, port } = options;

  // Find the plugin's MFE directory
  const mfeDir = findPluginDir(pluginId);

  if (!mfeDir) {
    console.error(`Error: Could not find MFE build output for plugin "${pluginId}"`);
    console.error('Make sure you have built the plugin with: yarn build:mfe --plugin-id=' + pluginId);
    console.error('\nLooked in:');
    console.error('  - examples/' + pluginId + '/target/public/mfe/');
    console.error('  - plugins/' + pluginId + '/target/public/mfe/');
    console.error('  - src/plugins/' + pluginId + '/target/public/mfe/');
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    // Enable CORS for all origins (development only!)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Only handle GET requests
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    // Parse the URL and remove query parameters
    const urlPath = req.url.split('?')[0];

    // Remove leading slash and use as relative path
    const relativePath = urlPath.replace(/^\//, '') || 'remoteEntry.js';
    const filePath = path.join(mfeDir, relativePath);

    try {
      // Check if file exists and is within the MFE directory
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(mfeDir))) {
        throw new Error('Path traversal attempt');
      }

      const fileStat = await stat(resolvedPath);
      if (!fileStat.isFile()) {
        throw new Error('Not a file');
      }

      // Read and serve the file
      const content = await readFile(resolvedPath);
      const mimeType = getMimeType(resolvedPath);

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': content.length,
        'Cache-Control': 'no-cache', // Disable caching for development
      });
      res.end(content);

      console.log(`[200] ${req.method} ${req.url} -> ${relativePath}`);
    } catch (error) {
      // File not found or other error
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      console.log(`[404] ${req.method} ${req.url} -> ${relativePath}`);
    }
  });

  server.listen(port, () => {
    console.log(`\nMFE Development Server Started`);
    console.log('================================');
    console.log(`Plugin ID: ${pluginId}`);
    console.log(`Serving from: ${mfeDir}`);
    console.log(`Server URL: http://localhost:${port}`);
    console.log(`Remote Entry: http://localhost:${port}/remoteEntry.js`);
    console.log('\nAdd this to your opensearch_dashboards.yml:');
    console.log('```yaml');
    console.log('mfe.remotes:');
    console.log(`  - name: ${pluginId}`);
    console.log(`    url: http://localhost:${port}/remoteEntry.js`);
    console.log('```');
    console.log('\nPress Ctrl+C to stop the server\n');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  });
}

// Main function
async function main() {
  const options = parseArgs();
  await createServer(options);
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});