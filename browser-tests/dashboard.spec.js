import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

// Replace only the service boundary in an isolated browser. Production files
// always use Firebase. No real credentials, account changes or health data.
async function mockAccount(page, scenario = 'signed-in') {
    await page.addInitScript(value => { window.__scenario = value; }, scenario);
    await page.route('**/js/auth-service.js', route => route.fulfill({
        contentType: 'text/javascript',
        body: `const user = { uid: 'test-alex', displayName: 'Alex', email: 'alex@example.test', emailVerified: true, providerData: [{providerId:'google.com'}] };
        let calls = 0;
        export const authService = {
            async observe(callback) {
                window.__sessionChanged = callback;
                if (window.__scenario === 'slow') return new Promise(() => {});
                if (window.__scenario === 'retry' && calls++ === 0) throw {code:'auth/network-request-failed'};
                callback(window.__scenario === 'signed-out' ? null : user);
                return () => {};
            },
            async currentUser() { return window.__scenario === 'signed-out' ? null : user; },
            async logout() { window.__scenario = 'signed-out'; },
            async login() { window.__scenario = 'signed-in'; },
            async prepareProviderSignIn() { return async provider => { window.__provider = provider; }; }
        };`
    }));
}
async function openDashboard(page) {
    await mockAccount(page);
    await page.goto('/');
    await expect(page.locator('#dashboard-content')).toBeVisible();
}

test('all regions, both views, SVG keyboard targets and full navigation work', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await openDashboard(page);
    await expect(page.locator('#greeting')).toHaveText('Hello, Alex.');
    await page.locator('#flow-continue').click();
    await expect(page.locator('#flow-error')).toContainText('region');
    const regions = await page.locator('[data-region]').evaluateAll(nodes => nodes.map(node => node.dataset.region));
    expect(regions).toHaveLength(9);
    for (const region of regions) {
        const button = page.locator(`[data-region="${region}"]`);
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(await page.locator('.symptom-option').count()).toBeGreaterThanOrEqual(3);
        if (region === 'back') await expect(page.locator('#body-back')).toBeVisible();
        if (['chest', 'abdomen'].includes(region)) await expect(page.locator('#body-front')).toBeVisible();
    }
    for (const view of ['front', 'back']) {
        await page.locator(`[data-view="${view}"]`).click();
        const targets = page.locator(`#body-${view} [data-body-region]`);
        for (let i = 0; i < await targets.count(); i++) {
            const target = targets.nth(i);
            await target.focus();
            await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
            await expect(target).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator(`[data-region="${await target.getAttribute('data-body-region')}"]`)).toHaveAttribute('aria-pressed', 'true');
        }
    }
    await page.locator('[data-region="head"]').click();
    await page.locator('#flow-continue').click();
    await expect(page.locator('#flow-error')).toContainText('option');
    await page.getByRole('button', { name: 'Headache', exact: true }).click();
    await page.locator('#flow-continue').click();
    await expect(page.locator('#step-two')).toBeVisible();
    await page.locator('#edit-description').click();
    await expect(page.locator('#symptom-description')).toBeFocused();
    await page.locator('#symptom-description').fill('<img src=x onerror=alert(1)> Example only');
    await page.locator('#flow-continue').click();
    await expect(page.locator('#step-three')).toBeVisible();
    await expect(page.locator('#review-description')).toHaveText('<img src=x onerror=alert(1)> Example only');
    await expect(page.locator('#review-description img')).toHaveCount(0);
    await page.locator('#flow-back').click();
    await expect(page.locator('#step-two')).toBeVisible();
    await page.locator('#flow-back').click();
    await expect(page.getByRole('button', { name: 'Headache', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-region="abdomen"]').click();
    await expect(page.locator('.symptom-option[aria-pressed="true"]')).toHaveCount(0);
    await page.locator('.symptom-option').first().click();
    await page.locator('#flow-continue').click(); await page.locator('#flow-continue').click();
    await page.locator('#flow-reset').click();
    await expect(page.locator('#symptom-description')).toHaveValue('');
    await expect(page.locator('[data-region][aria-pressed="true"]')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('symptoms are never persisted, sent, or logged and are cleared on leaving', async ({ page }) => {
    await openDashboard(page);
    const requests = [], logs = [];
    page.on('request', req => requests.push(req.url() + (req.postData() || '')));
    page.on('console', msg => logs.push(msg.text()));
    await page.evaluate(() => {
        window.__writes = [];
        Storage.prototype.setItem = function(key, value) { window.__writes.push([key, value]); };
        IDBObjectStore.prototype.add = IDBObjectStore.prototype.put = function(value) { window.__writes.push(value); };
    });
    const marker = 'PRIVATE_SYNTHETIC_CHECK_872';
    await page.locator('#symptom-description').fill(marker);
    await page.locator('#use-description').click();
    await expect(page.locator('[data-region="general"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.symptom-option').first().click();
    await page.locator('#flow-continue').click(); await page.locator('#flow-continue').click();
    expect(await page.evaluate(() => window.__writes)).toEqual([]);
    expect(requests.join(' ')).not.toContain(marker);
    expect(logs.join(' ')).not.toContain(marker);
    await page.evaluate(() => window.__sessionChanged({uid:'different-test-user',displayName:'Sam'}));
    await expect(page.locator('#symptom-description')).toHaveValue('');
    await page.locator('#symptom-description').fill(marker);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expect(page.locator('#symptom-description')).toHaveValue('');
    await expect(page.locator('#review-description')).not.toContainText(marker);
});

test.describe('mobile touchscreen', () => {
    test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    test('every visible SVG region accepts a tap on front and back', async ({page}) => {
        await openDashboard(page);
        for (const view of ['front','back']) {
            await page.locator(`[data-view="${view}"]`).tap();
            const hits = page.locator(`#body-${view} [data-body-region]`);
            for (let i=0; i<await hits.count(); i++) {
                await hits.nth(i).tap();
                await expect(hits.nth(i)).toHaveAttribute('aria-pressed','true');
            }
        }
    });
});

test('real Firebase SDK loads and signed-out visitors see ready login controls', async ({page}) => {
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/');
    await expect(page).toHaveURL(/login\.html$/, {timeout:25000});
    await expect(page.locator('[data-provider="google"]')).toBeEnabled({timeout:20000});
    await expect(page.locator('[data-provider="apple"]')).toHaveCount(0);
    await page.goto('/signup.html');
    await expect(page.locator('[data-provider="google"]')).toBeEnabled({timeout:20000});
    await expect(page.locator('[data-provider="apple"]')).toHaveCount(0);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    expect(errors).toEqual([]);
});

test('signed-out visitors reach login first; errors and slow connections recover', async ({ page }) => {
    await mockAccount(page, 'signed-out'); await page.goto('/');
    await expect(page).toHaveURL(/login\.html$/);
    await expect(page.locator('body')).toHaveAttribute('data-page', 'login');
    await page.unroute('**/js/auth-service.js');
    await mockAccount(page, 'retry'); await page.goto('/');
    await expect(page.locator('#session-retry')).toBeVisible();
    await expect(page.locator('#dashboard-content')).toBeHidden();
    await page.locator('#session-retry').click();
    await expect(page.locator('#dashboard-content')).toBeVisible();
    await page.unroute('**/js/auth-service.js');
    await mockAccount(page, 'slow'); await page.clock.install(); await page.goto('/');
    await page.clock.fastForward(16000);
    await expect(page.locator('#session-retry')).toBeVisible();
    await page.evaluate(() => { window.__scenario = 'signed-in'; });
    await page.locator('#session-retry').click();
    await expect(page.locator('#dashboard-content')).toBeVisible();
});

test('profile menu, theme toggle and logout work', async ({ page }) => {
    await openDashboard(page);
    const theme = await page.locator('html').getAttribute('data-theme');
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
    await page.locator('#profile-menu summary').click();
    await expect(page.getByRole('link', {name:'Manage your account'})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#profile-menu')).not.toHaveAttribute('open');
    await page.locator('#profile-menu summary').click();
    await page.locator('#dashboard-logout').click();
    await expect(page).toHaveURL(/login\.html$/);
});

for (const width of [1440, 1024, 768, 390, 320]) {
    test(`responsive ${width}px, light/dark accessibility and screenshot`, async ({ page }) => {
        await page.setViewportSize({width, height:900});
        await openDashboard(page);
        for (const theme of ['light', 'dark']) {
            await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            const columns = await page.locator('.body-layout').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
            expect(columns).toBe(width > 850 ? 3 : width > 600 ? 2 : 1);
            const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
            expect(results.violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))).toEqual([]);
            if ([1440,390].includes(width)) {
                await mkdir('test-results/screenshots', {recursive:true});
                await page.screenshot({path:`test-results/screenshots/dashboard-${width}-${theme}.png`, fullPage:true});
            }
        }
        await page.emulateMedia({reducedMotion:'reduce'});
        expect(await page.locator('.body-hit').first().evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s');
    });
}
