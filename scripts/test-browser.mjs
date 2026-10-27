// Own the preview in this process: avoids Windows shell-child teardown hanging Playwright.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDevServer } from './dev-server.mjs';

const server = createDevServer();
server.on('error', () => { console.error('Browser test port 4176 is unavailable. Stop the previous test preview first.'); process.exitCode = 1; });
server.listen(4176, '127.0.0.1', () => {
    const cli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
    const child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
        stdio: 'inherit', env: { ...process.env, HEALTHWELL_TEST_SERVER: 'external' }
    });
    const close = code => { server.closeAllConnections(); server.close(() => { process.exitCode = code; }); };
    child.on('error', () => close(1));
    child.on('exit', code => close(code ?? 1));
    process.on('SIGINT', () => child.kill());
    process.on('SIGTERM', () => child.kill());
});
