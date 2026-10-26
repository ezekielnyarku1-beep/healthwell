import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../js/local-preview.js', import.meta.url), 'utf8');
function run(href) {
    const url = new URL(href);
    let target = null;
    vm.runInNewContext(source, {
        URL,
        window: { location: { href, hostname: url.hostname, protocol: url.protocol, replace: value => { target = value; } } }
    });
    return target;
}

test('Live Server loopback uses the Firebase-authorized host without losing the route', () => {
    assert.equal(run('http://127.0.0.1:5500/signup.html?preview=1#main-content'), 'http://localhost:5500/signup.html?preview=1#main-content');
    assert.equal(run('http://[::1]:4173/index.html'), 'http://localhost:4173/index.html');
});
test('authorized localhost, production, and file addresses are not redirected', () => {
    for (const url of ['http://localhost:4173/', 'https://healthwell-1c869.web.app/', 'file:///C:/healthwell/index.html', 'https://127.0.0.1.example.org/']) {
        assert.equal(run(url), null);
    }
});
