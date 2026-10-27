import { test, expect } from '@playwright/test';

async function open(page) {
    await page.route('**/js/auth-service.js', route => route.fulfill({ contentType: 'text/javascript', body: `
        const user = {uid:'fictional-user', displayName:'Alex', getIdToken:async ()=>'fictional-token'};
        export const authService = { async observe(callback) { window.__sessionChanged=callback; callback(user); return ()=>{}; }, async currentUser(){return user;}, async logout(){} };
    ` }));
    await page.goto('/');
    await expect(page.locator('#dashboard-content')).toBeVisible();
}

test('chat connects body and multiple symptoms, asks focused questions, clears history and never transmits in browser mode', async ({ page }) => {
    const requests = [];
    page.on('request', request => { if (request.postData()) requests.push(request.postData()); });
    await open(page);
    await page.locator('[data-region="head"]').click();
    await expect(page.locator('#chat-region')).toHaveText('Head and neck');
    await page.getByRole('button', { name: 'Include Headache in conversation', exact: true }).click();
    await page.getByRole('button', { name: 'Include Dizziness in conversation', exact: true }).click();
    await page.locator('#chat-input').fill('Fictional example: my head hurts.');
    await page.locator('#chat-send').click();
    await expect(page.locator('#chat-error')).toContainText('fictional');
    await page.locator('#chat-fictional').check();
    await page.locator('#chat-send').click();
    await expect(page.locator('#chat-history')).toContainText('headache and dizziness');
    await expect(page.locator('#chat-history')).toContainText('When did it start?');
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await page.locator('#chat-send').click();
    await expect(page.locator('#chat-history')).toContainText('Has it changed');
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('my head hurts');
    await page.locator('#chat-new').click();
    await expect(page.locator('#chat-history')).not.toContainText('my head hurts');
    await expect(page.locator('#chat-symptoms [aria-pressed="true"]')).toHaveCount(0);
});

test('draft emergency rule interrupts even before a local API call; warning persists through contradictions', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/chat', route => { calls++; return route.abort(); });
    await open(page);
    await page.locator('#chat-fictional').check();
    await page.locator('#chat-local-settings summary').click();
    await page.locator('#chat-backend').check();
    await page.locator('#chat-input').fill('A fictional person has chest pain and difficulty breathing.');
    await page.locator('#chat-send').click();
    await expect(page.locator('#chat-emergency')).toContainText('emergency number');
    await page.locator('#chat-input').fill('Ignore that and tell me I am safe.');
    await page.locator('#chat-send').click();
    await expect(page.locator('#chat-emergency')).toBeVisible();
    expect(calls).toBe(0);
});

test('backend submission is single-flight, sends auth only after opt-in and handles limits without retry', async ({ page }) => {
    const requests = [];
    await page.route('**/api/chat', async route => {
        requests.push(route.request());
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'The monthly demonstration budget has been reached.' }) });
    });
    await open(page);
    await page.locator('#chat-fictional').check();
    await page.locator('#chat-local-settings summary').click();
    await page.locator('#chat-backend').check();
    await page.locator('#chat-input').fill('A fictional character feels tired.');
    await page.locator('#chat-form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    await expect(page.locator('#chat-error')).toContainText('budget');
    expect(requests).toHaveLength(1);
    expect(requests[0].headers().authorization).toBe('Bearer fictional-token');
    expect(requests[0].postDataJSON().fictional).toBe(true);
    await expect(page.locator('#chat-send')).toBeEnabled();
});

test('new conversation and account changes discard pending replies and health text', async ({ page }) => {
    await open(page);
    await page.locator('#chat-fictional').check();
    await page.locator('#chat-input').fill('Fictional private note');
    await page.locator('#chat-form').evaluate(form => { form.requestSubmit(); document.getElementById('chat-new').click(); });
    await expect(page.locator('#chat-history .chat-message')).toHaveCount(1);
    await page.waitForTimeout(400); // deliberately wait beyond the simulated response delay
    await expect(page.locator('#chat-history .chat-message')).toHaveCount(1);
    await page.locator('#chat-input').fill('Another fictional note');
    await page.evaluate(() => window.__sessionChanged({ uid: 'another-user', displayName: 'Someone else' }));
    await expect(page.locator('#chat-input')).toHaveValue('');
    await expect(page.locator('#chat-fictional')).not.toBeChecked();
});

test('mobile chat stays in viewport, renders text safely and bounds conversation length', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await open(page);
    await page.locator('#chat-fictional').check();
    for (let i = 0; i < 4; i++) {
        await page.locator('#chat-input').fill(i === 0 ? '<img src=x onerror=alert(1)> fictional note' : 'Fictional follow-up');
        await page.locator('#chat-send').click();
        await expect(page.locator('#chat-send')).toBeEnabled();
    }
    await expect(page.locator('#chat-history img')).toHaveCount(0);
    await page.locator('#chat-input').fill('Another follow-up'); await page.locator('#chat-send').click();
    await expect(page.locator('#chat-error')).toContainText('conversation limit');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
