import { readFile, readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
async function checkJavaScript(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && !['node_modules', 'dist', 'test-results', 'playwright-report'].includes(entry.name)) {
            await checkJavaScript(path.join(folder, entry.name));
        } else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) {
            const result = spawnSync(process.execPath, ['--check', path.join(folder, entry.name)], { encoding: 'utf8' });
            if (result.status !== 0) throw new Error(result.stderr);
            checked++;
        }
    }
}
await checkJavaScript(root);

for (const page of ['index.html', 'login.html', 'signup.html', 'reset-password.html', 'account.html']) {
    const html = await readFile(path.join(root, page), 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    if (new Set(ids).size !== ids.length) throw new Error(`${page}: duplicate IDs`);
    for (const [, references] of html.matchAll(/(?:for|aria-describedby|aria-labelledby)="([^"]+)"/g)) {
        for (const id of references.split(' ')) {
            if (!ids.includes(id)) throw new Error(`${page}: missing label/description ${id}`);
        }
    }
    for (const [, target] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (target.startsWith('#')) {
            if (!ids.includes(target.slice(1))) throw new Error(`${page}: broken anchor ${target}`);
        } else if (!target.startsWith('https://')) {
            await access(path.join(root, target));
        }
    }
    console.log(`${page}: local links, assets, IDs, and label references passed`);
}
console.log(`${checked} JavaScript files passed syntax checks.`);
