import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevServer } from '../scripts/dev-server.mjs';

test('preview serves app files but not tests, tooling, or arbitrary project files', async () => {
    const server = createDevServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        for (const resource of ['/', '/index.html', '/login.html', '/signup.html', '/account.html', '/reset-password.html', '/script.js', '/dashboard.css', '/js/dashboard.js', '/js/symptom-flow.js', '/js/local-preview.js', '/js/auth-service.js', '/config/firebase-config.js', '/assets/logo.svg']) {
            const result = await fetch(base + resource);
            assert.equal(result.status, 200, resource);
            assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
            assert.match(result.headers.get('content-security-policy'), /script-src 'self' https:\/\/www\.gstatic\.com https:\/\/apis\.google\.com;/);
        }
        for (const route of ['/login.html']) {
            const html = await (await fetch(base + route)).text();
            assert.match(html, /data-page="login"/);
            assert.match(html, /href="signup.html">Create an account/);
            assert.ok(html.indexOf('>Log in</a>') < html.indexOf('>Sign up</a>'));
        }
        assert.match(await (await fetch(base + '/signup.html')).text(), /data-page="signup"/);
        for (const route of ['/', '/index.html']) {
            const html = await (await fetch(base + route)).text();
            assert.match(html, /data-page="dashboard"/);
            assert.match(html, /id="dashboard-content" hidden/);
            assert.ok(html.indexOf('Emergency information') < html.indexOf('id="region-list"'));
        }
        for (const resource of ['/package.json', '/README.md', '/tests/auth-service.test.js', '/.env', '/js/..%2fpackage.json']) {
            assert.equal((await fetch(base + resource)).status, 404, resource);
        }
        assert.equal((await fetch(base, { method: 'POST', body: 'test' })).status, 405);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
