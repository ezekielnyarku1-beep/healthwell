import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = new Set(['/index.html', '/login.html', '/signup.html', '/reset-password.html', '/account.html', '/style.css', '/dashboard.css', '/script.js', '/wellness-garden.svg', '/config/firebase-config.js']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

export function createDevServer({ chat } = {}) {
    return http.createServer(async (request, response) => {
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://www.gstatic.com https://apis.google.com; connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://apis.google.com; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
        if (request.url === '/api/chat' && chat) { await chat(request, response); return; }
        if (!['GET', 'HEAD'].includes(request.method)) {
            response.writeHead(405, { Allow: 'GET, HEAD' });
            response.end('Method not allowed');
            return;
        }
        try {
            let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            if (pathname === '/') pathname = '/index.html';
            const allowed = pages.has(pathname) || /^\/js\/[\w-]+\.js$/.test(pathname) || /^\/assets\/[\w-]+\.svg$/.test(pathname);
            if (!allowed) { response.writeHead(404); response.end('Not found'); return; }
            const body = await readFile(path.join(root, pathname));
            response.writeHead(200, { 'Content-Type': types[path.extname(pathname)] });
            response.end(request.method === 'HEAD' ? undefined : body);
        } catch (error) {
            response.writeHead(error.code === 'ENOENT' ? 404 : 400);
            response.end('Not found');
        }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const port = Number(process.env.PORT || 4173);
    const server = createDevServer();
    server.on('error', error => {
        console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the other preview or choose a different PORT.` : error.message);
        process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => console.log(`HealthWell Unity: http://localhost:${port}`));
}
