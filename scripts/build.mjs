import { copyFile, mkdir, readdir, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function buildSite() {
    const output = path.resolve(root, 'dist');
    // Only this generated, in-project directory may be replaced.
    if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') throw new Error('Invalid build directory');
    const existing = await lstat(output).catch(error => { if (error.code !== 'ENOENT') throw error; });
    if (existing?.isSymbolicLink()) throw new Error('Build directory must not be a symlink');
    await rm(output, { recursive: true, force: true });
    await mkdir(output, { recursive: true });
    const files = ['index.html', 'login.html', 'signup.html', 'reset-password.html', 'account.html', 'style.css', 'dashboard.css', 'script.js', 'wellness-garden.svg', 'config/firebase-config.js'];
    for (const folder of ['js', 'assets']) {
        for (const entry of await readdir(path.join(root, folder), {withFileTypes:true})) {
            if (entry.isFile() && (folder === 'js' ? /^[\w-]+\.js$/ : /^[\w-]+\.svg$/).test(entry.name)) files.push(`${folder}/${entry.name}`);
        }
    }
    for (const file of files) {
        const destination = path.join(output, file);
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(path.join(root, file), destination);
    }
    return files;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    console.log(`Prepared ${(await buildSite()).length} application files in dist/`);
}
