import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { buildSite } from '../scripts/build.mjs';

test('deployable build contains app assets, never tests or tooling, with preserved security headers', async () => {
    const files = await buildSite();
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('js/dashboard.js'));
    for (const file of files) {
        assert.doesNotMatch(file, /test|fixture|scripts\/|README|package|firebase\.json/);
    }
    assert.ok(!(await readdir(new URL('../dist/', import.meta.url))).includes('scripts'));
    assert.equal(await readFile(new URL('../dist/index.html', import.meta.url), 'utf8'), await readFile(new URL('../index.html', import.meta.url), 'utf8'));
    const config = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
    assert.equal(config.hosting.public, 'dist');
    assert.equal(config.hosting.site, 'healthwell-1c869');
    const headers = Object.fromEntries(config.hosting.headers[0].headers.map(header => [header.key, header.value]));
    assert.equal(headers['Cache-Control'], 'no-store');
    assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
    assert.doesNotMatch(headers['Content-Security-Policy'], /unsafe-inline|unsafe-eval/);
});
