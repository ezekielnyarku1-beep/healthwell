// Local-only UI test harness. Does not change the production authentication flow.
// Run: node scripts/preview-dashboard.mjs, open http://localhost:4175/__checks
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createDevServer } from './dev-server.mjs';
const app = createDevServer();
const handler = app.listeners('request')[0];
const fixture = `import { setupDashboard } from '/js/dashboard.js';
window.fixtureErrors = [];
window.addEventListener('error', e => window.fixtureErrors.push(e.message));
window.addEventListener('unhandledrejection', () => window.fixtureErrors.push('Unhandled rejection'));
window.fixtureWrites = [];
Storage.prototype.setItem = function(key) { window.fixtureWrites.push(key); };
const service = { observe: async callback => { callback({ displayName: 'Alex' }); return () => {}; }, logout: async () => {} };
await setupDashboard(service);
window.fixtureReady = true;`;
const checks = `const results = document.getElementById('results');
function check(condition, label) { const li = document.createElement('li'); li.textContent = (condition ? 'PASS: ' : 'FAIL: ') + label; li.style.color = condition ? '#126e67' : '#a52d35'; results.append(li); }
const frame = document.querySelector('iframe');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
while (!frame.contentWindow.fixtureReady) await wait(50);
const doc = frame.contentDocument;
const click = selector => doc.querySelector(selector).click();
check(doc.getElementById('greeting').textContent === 'Hello, Alex.', 'Firebase-style profile greeting');
click('#flow-continue'); check(!!doc.getElementById('flow-error').textContent, 'Missing region shows error');
for (const button of doc.querySelectorAll('[data-region]')) {
 button.click();
 check(button.getAttribute('aria-pressed') === 'true' && doc.querySelectorAll('.symptom-option').length >= 3, button.textContent + ' selection and options');
}
click('[data-region="back"]'); check(!doc.getElementById('body-back').hasAttribute('hidden'), 'Back selection switches illustration');
click('[data-region="head"]'); click('[data-view="front"]');
const head = doc.querySelector('#body-front [data-body-region="head"]');
head.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
check(head.getAttribute('aria-pressed') === 'true', 'SVG keyboard selection highlights region');
click('#flow-continue'); check(!!doc.getElementById('flow-error').textContent, 'Missing symptom shows error');
click('.symptom-option'); click('#flow-continue');
check(!doc.getElementById('step-two').hidden, 'Continue opens optional description');
const input = doc.getElementById('symptom-description'); input.value = '<img src=x onerror=alert(1)> sample'; input.dispatchEvent(new frame.contentWindow.Event('input'));
click('#flow-continue');
check(!doc.getElementById('step-three').hidden && !doc.getElementById('review-description').querySelector('img'), 'Summary displays text safely');
click('#flow-back'); check(!doc.getElementById('step-two').hidden, 'Back navigation works');
click('#flow-continue'); click('#flow-reset');
check(input.value === '' && doc.getElementById('review-description').textContent === 'No description added.', 'Restart clears symptom details');
check(frame.contentWindow.fixtureWrites.length === 0, 'No symptom storage writes');
for (const width of [1440, 1024, 768, 390, 320]) {
 frame.style.width = width + 'px'; await wait(80);
 check(doc.documentElement.scrollWidth <= width, width + 'px: no horizontal overflow');
 const columns = getComputedStyle(doc.querySelector('.body-layout')).gridTemplateColumns.split(' ').length;
 check(columns === (width > 850 ? 3 : width > 600 ? 2 : 1), width + 'px: responsive column layout');
}
click('[data-theme-toggle]'); check(['light','dark'].includes(doc.documentElement.dataset.theme), 'Theme control works');
input.value = 'Temporary example'; input.dispatchEvent(new frame.contentWindow.Event('input'));
frame.contentWindow.dispatchEvent(new frame.contentWindow.Event('pagehide'));
check(input.value === '', 'Leaving page clears notes');
check(frame.contentWindow.fixtureErrors.length === 0, 'No browser runtime errors');
frame.style.width = '100%';
document.getElementById('status').textContent = 'Checks complete';`;
const server = http.createServer(async (request, response) => {
    const route = new URL(request.url, 'http://localhost').pathname;
    if (!['/__fixture', '/__fixture.js', '/__checks', '/__checks.js'].includes(route)) return handler(request, response);
    response.setHeader('Cache-Control', 'no-store');
    if (route === '/__fixture') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end((await readFile(new URL('../index.html', import.meta.url), 'utf8')).replace('src="script.js"', 'src="/__fixture.js"'));
    } else if (route === '/__checks') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>HealthWell dashboard checks</title><h1>Dashboard browser checks</h1><p id="status">Running…</p><ol id="results"></ol><iframe title="Dashboard test fixture" src="/__fixture" style="width:1440px;height:1100px;border:1px solid #ccc"></iframe><script type="module" src="/__checks.js"></script></html>');
    } else {
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.end(route === '/__fixture.js' ? fixture : checks);
    }
});
server.listen(4175, '127.0.0.1', () => console.log('Dashboard checks: http://localhost:4175/__checks (mock account; no Firebase requests)'));
