import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

async function open(page) {
    await page.route('**/js/auth-service.js', route => route.fulfill({ contentType: 'text/javascript', body: `
        export const authService = { async observe(callback) { window.__sessionChanged=callback; callback({uid:'fictional-user',displayName:'Alex'}); return ()=>{}; }, async logout(){} };
    ` }));
    await page.goto('/'); await expect(page.locator('#dashboard-content')).toBeVisible();
}
const option = (page, id) => page.locator(`#symptom-options [data-symptom="${id}"]`);

test('every body region has grouped examples; search finds aliases and opens matching categories', async ({ page }) => {
    await open(page);
    const ids = await page.locator('[data-region]').evaluateAll(nodes => nodes.map(node => node.dataset.region));
    for (const id of ids) {
        await page.locator(`[data-region="${id}"]`).click();
        const count = await page.locator('.symptom-option').count(); expect(count).toBeGreaterThanOrEqual(15); expect(count).toBeLessThanOrEqual(25);
        await expect(page.locator('.symptom-category[open]')).toHaveCount(1);
        await page.locator('#symptom-search').fill(id.includes('arm') || id.includes('leg') || id === 'back' ? 'pins needles' : id === 'abdomen' ? 'nausea' : id === 'general' ? 'fatigue' : id === 'chest' ? 'breathless' : 'dizzy');
        expect(await page.locator('.symptom-option:visible').count()).toBeGreaterThan(0);
        await expect(page.locator('#symptom-search-status')).toContainText('matching');
    }
    await page.locator('[data-region="head"]').click();
    await page.locator('#symptom-search').fill('ViSiOn changes');
    await expect(page.locator('.symptom-option:visible')).toHaveCount(2);
    await page.locator('#symptom-search-clear').click(); await expect(page.locator('#symptom-search')).toBeFocused();
});

test('multiple selections survive filtering and navigation; removal preserves keyboard focus', async ({ page }) => {
    await open(page); await page.locator('[data-region="head"]').click();
    await option(page, 'headache').click(); await expect(option(page, 'headache')).toBeFocused();
    await page.locator('#symptom-search').fill('dizzy'); await option(page, 'dizziness').click();
    await expect(page.locator('#symptom-selection-count')).toHaveText('2 selected');
    await page.locator('#symptom-search').fill('nothingmatches');
    await expect(page.locator('#symptom-no-results')).toBeVisible();
    await expect(page.locator('#selected-symptoms button')).toHaveCount(2);
    await page.getByRole('button', { name: 'Remove Headache', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Remove Dizziness', exact: true })).toBeFocused();
    await page.locator('#symptom-search-clear').click();
    await option(page, 'headache').click();
    await page.locator('#flow-continue').click(); await page.locator('#flow-continue').click();
    await expect(page.locator('#review-symptom li')).toHaveCount(2);
    await expect(page.locator('#review-symptom')).toContainText('Headache');
    await expect(page.locator('#review-symptom')).toContainText('Dizziness');
    await page.locator('#flow-back').click(); await page.locator('#flow-back').click();
    await expect(option(page, 'headache')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-region="chest"]').click();
    await expect(page.locator('#symptom-selection-count')).toHaveText('0 selected');
    await expect(page.locator('#symptom-search')).toHaveValue('');
});

test('custom-only check-in and optional details stay private and reset on restart/account change/page exit', async ({ page }) => {
    await open(page);
    const requests = [], logs = [], marker = 'FICTIONAL_PRIVATE_SYMPTOM_510';
    page.on('request', request => requests.push(request.url() + (request.postData() || '')));
    page.on('console', message => logs.push(message.text()));
    await page.evaluate(() => {
        window.__writes=[];
        Storage.prototype.setItem = function(key,value){window.__writes.push([key,value]);};
        IDBObjectStore.prototype.add=IDBObjectStore.prototype.put=function(value){window.__writes.push(value);};
    });
    await page.locator('[data-region="left-leg"]').click();
    await page.locator('#custom-symptom-panel summary').click(); await page.locator('#custom-symptom').fill(marker);
    await page.locator('#flow-continue').click(); await page.locator('#follow-up-panel > summary').click();
    for (const [id,value] of [['onset','Today'],['duration','A few minutes'],['frequency','Occasionally'],['severity','Somewhat']]) {
        await page.locator('#follow-up-jump').selectOption(id); await page.locator(`#detail-${id}`).selectOption(value);
    }
    await page.locator('#follow-up-jump').selectOption('location'); await page.locator('#detail-location').fill('Behind the left knee');
    await page.locator('#follow-up-jump').selectOption('associated'); await page.locator('#detail-associated').fill('<img src=x onerror=alert(1)> fictional detail');
    await expect(page.locator('#follow-up-count')).toContainText('6 of');
    await page.locator('#flow-continue').click();
    await expect(page.locator('#review-symptom')).toContainText(marker);
    await expect(page.locator('#review-details')).toContainText('Behind the left knee');
    await expect(page.locator('#review-details img')).toHaveCount(0);
    expect(requests.join(' ')).not.toContain(marker); expect(logs.join(' ')).not.toContain(marker);
    expect(await page.evaluate(() => window.__writes)).toEqual([]);
    await expect(page.locator('#chat-input')).toHaveValue('');
    await expect(page.locator('#chat-history')).not.toContainText(marker);
    await page.locator('#flow-back').click(); await page.locator('#follow-up-jump').selectOption('onset'); await expect(page.locator('#detail-onset')).toHaveValue('Today');
    await page.locator('#flow-continue').click(); await page.locator('#flow-reset').click();
    await expect(page.locator('#custom-symptom')).toHaveValue(''); await expect(page.locator('#follow-up-fields')).toBeEmpty();
    await page.locator('[data-region="head"]').click(); await page.locator('#custom-symptom-panel summary').click(); await page.locator('#custom-symptom').fill(marker);
    await page.evaluate(() => window.__sessionChanged({uid:'another',displayName:'Sam'})); await expect(page.locator('#custom-symptom')).toHaveValue('');
    await page.locator('[data-region="head"]').click(); await page.locator('#symptom-search').fill(marker);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide'))); await expect(page.locator('#symptom-search')).toHaveValue('');
});

test('review markers are descriptive only: selecting emergency-related examples performs no triage or API calls', async ({ page }) => {
    await open(page); let calls = 0; page.on('request', request => { if (request.method() === 'POST') calls++; });
    await page.locator('[data-region="chest"]').click(); await page.locator('#symptom-search').fill('severe difficulty');
    await expect(option(page, 'severe-difficulty-breathing')).toContainText('Clinical review');
    await option(page, 'severe-difficulty-breathing').click();
    await expect(page.locator('#chat-emergency')).toBeHidden();
    await expect(page.locator('.emergency-notice')).toContainText('local emergency number');
    await expect(page.locator('#symptom-review-note')).toContainText('not an urgency rating');
    await expect(page.locator('#chat-symptoms [aria-pressed="true"]')).toHaveCount(0);
    expect(calls).toBe(0);
});

for (const width of [320, 390, 768, 1024, 1440]) {
    test(`populated symptom picker ${width}px supports keyboard controls and light/dark accessibility`, async ({ page }) => {
        await page.setViewportSize({width,height:900}); await open(page);
        await page.locator('[data-region="head"]').focus(); await page.keyboard.press('Enter');
        await option(page, 'headache').focus(); await page.keyboard.press('Space'); await expect(option(page, 'headache')).toHaveAttribute('aria-pressed','true');
        await page.locator('[data-category="eyes"]').focus(); await page.keyboard.press('Enter');
        await expect(option(page, 'blurred-vision')).toBeVisible();
        await page.locator('#custom-symptom-panel summary').click(); await page.locator('#custom-symptom').fill('Fictional example');
        for (const theme of ['light','dark']) {
            await page.evaluate(value => { document.documentElement.dataset.theme=value; },theme);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            const audit = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
            expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
            if ([390,1440].includes(width)) { await mkdir('test-results/screenshots',{recursive:true}); await page.locator('.workspace').screenshot({path:`test-results/screenshots/symptoms-${width}-${theme}.png`}); }
        }
        await page.locator('#flow-continue').click(); await page.locator('#follow-up-panel > summary').click();
        await page.locator('#follow-up-jump').selectOption('severity');
        await page.locator('#detail-severity').selectOption('Somewhat');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const audit = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); expect(audit.violations.map(v=>v.id)).toEqual([]);
    });
}
