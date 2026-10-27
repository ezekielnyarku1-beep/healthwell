import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './browser-tests',
    timeout: 30000,
    workers: 2,
    fullyParallel: true,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4176',
        browserName: 'chromium',
        channel: 'chrome',
        headless: true,
        trace: 'off',
        screenshot: 'only-on-failure'
    },
    webServer: process.env.HEALTHWELL_TEST_SERVER === 'external' ? undefined : {
        command: 'node scripts/dev-server.mjs',
        env: { PORT: '4176' },
        url: 'http://localhost:4176/login.html',
        reuseExistingServer: false
    }
});
