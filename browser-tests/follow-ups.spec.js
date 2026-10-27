import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

async function open(page, region = 'head', symptomIds = ['headache']) {
    await page.route('**/js/auth-service.js', route => route.fulfill({ contentType: 'text/javascript', body: `
        export const authService = {async observe(callback){window.__sessionChanged=callback;callback({uid:'fictional-user',displayName:'Alex'});return ()=>{};},async logout(){}};
    ` }));
    await page.goto('/'); await expect(page.locator('#dashboard-content')).toBeVisible();
    await page.locator(`[data-region="${region}"]`).click();
    for (const id of symptomIds) {
        const button = page.locator(`[data-symptom="${id}"]`);
        await button.evaluate(node => { node.closest('details').open = true; }); await button.click();
    }
    await page.locator('#flow-continue').click(); await page.locator('#follow-up-panel > summary').click();
}
async function view(page, id) { await page.locator('#follow-up-jump').selectOption(id); }
async function answer(page, id, value) { await view(page,id); await page.locator(`#detail-${id}`).selectOption(value); }

test('combined symptoms share general questions, reveal one question at a time and support skip/previous', async ({page}) => {
    await open(page, 'head', ['headache','dizziness']);
    const options = await page.locator('#follow-up-jump option').evaluateAll(nodes=>nodes.map(node=>node.value));
    expect(options.filter(id=>id==='onset')).toHaveLength(1); expect(options.filter(id=>id==='pain-feeling')).toHaveLength(1);
    expect(options).toContain('dizzy-feeling'); expect(options).not.toContain('breathing-rest');
    await expect(page.locator('#follow-up-fields > select, #follow-up-fields > textarea')).toHaveCount(1);
    await expect(page.locator('#detail-onset')).toBeVisible();
    await page.locator('#detail-onset').selectOption('Today'); await page.locator('#follow-up-next').click();
    await expect(page.locator('#detail-duration')).toBeFocused();
    await page.locator('#follow-up-skip').click(); await expect(page.locator('#detail-frequency')).toBeVisible();
    await page.locator('#follow-up-previous').click(); await page.locator('#follow-up-previous').click();
    await expect(page.locator('#detail-onset')).toHaveValue('Today');
    await answer(page,'dizzy-feeling','Things seem to spin');
    await page.locator('#flow-continue').click();
    await expect(page.locator('#review-details')).toContainText('Things seem to spin');
    await expect(page.locator('#review-unanswered')).toContainText('left unanswered');
});

test('conditional questions preserve hidden answers and notes in an editable earlier-answer summary', async ({page}) => {
    await open(page, 'back', ['lower-back-pain']);
    await expect(page.locator('#follow-up-jump option[value="pain-spread-location"]')).toHaveCount(0);
    await answer(page,'pain-spreads','Yes'); await view(page,'pain-spread-location');
    await page.locator('#detail-pain-spread-location').fill('Fictional left thigh');
    await page.locator('.answer-note summary').click(); await page.locator('#note-pain-spread-location').fill('Only after sitting');
    await answer(page,'pain-spreads','No'); await page.locator('#flow-continue').click();
    await expect(page.locator('#review-earlier-section')).toBeVisible();
    await expect(page.locator('#review-earlier-details')).toContainText('Fictional left thigh');
    await expect(page.locator('#review-earlier-details')).toContainText('Only after sitting');
    await page.getByRole('button',{name:'Edit answer: Where does the pain or discomfort spread?',exact:true}).click();
    await expect(page.locator('#detail-pain-spread-location')).toBeFocused();
    await expect(page.locator('#follow-up-context')).toContainText('earlier answer');
    await page.locator('#detail-pain-spread-location').fill('Edited fictional thigh detail');
    await answer(page,'pain-spreads','Yes'); await view(page,'pain-spread-location');
    await expect(page.locator('#detail-pain-spread-location')).toHaveValue('Edited fictional thigh detail');
    await expect(page.locator('#note-pain-spread-location')).toHaveValue('Only after sitting');
    await page.locator('#flow-continue').click(); await expect(page.locator('#review-earlier-section')).toBeHidden();
    await expect(page.locator('#review-details')).toContainText('Edited fictional thigh detail');
});

test('summary edits preserve preferences and make changed symptom context explicit', async ({page}) => {
    await open(page);
    await answer(page,'onset','Today'); await answer(page,'head-light','Prefer not to answer'); await page.locator('#flow-continue').click();
    await expect(page.locator('#review-details')).toContainText('Prefer not to answer');
    await page.getByRole('button',{name:'Edit answer: When did it start?',exact:true}).click();
    await expect(page.locator('#detail-onset')).toHaveValue('Today'); await page.locator('#detail-onset').selectOption('Yesterday');
    await page.locator('#flow-continue').click(); await page.locator('#review-edit-symptoms').click();
    await page.locator('#symptom-search').fill('dizzy'); await page.locator('[data-symptom="dizziness"]').click();
    await page.locator('#flow-continue').click(); await view(page,'onset');
    await expect(page.locator('#answer-context-note')).toContainText('Headache');
    await expect(page.locator('#detail-onset')).toHaveValue('Yesterday');
    await page.locator('#answer-context-confirm').click(); await expect(page.locator('#answer-context-note')).toBeHidden();
    await page.locator('#flow-continue').click();
    await expect(page.locator('#review-details')).toContainText('Answered for: Headache, Dizziness');
    await expect(page.locator('#review-details')).toContainText('Prefer not to answer');
});

test('review flags are editorial only and update when answers are edited', async ({page}) => {
    await open(page, 'chest', ['shortness-of-breath']);
    let calls = 0; page.on('request',request=>{if(request.method()==='POST')calls++;});
    await answer(page,'breathing-speaking','Yes');
    await expect(page.locator('#answer-review-note')).toContainText('future qualified clinical review');
    await expect(page.locator('#chat-emergency')).toBeHidden();
    await page.locator('#flow-continue').click();
    await expect(page.locator('#review-answer-flags')).toContainText('Yes');
    await expect(page.locator('.emergency-notice')).toContainText('local emergency number');
    await page.getByRole('button',{name:'Edit answer: Does the breathing difficulty make it hard to get words out?',exact:true}).click();
    await page.locator('#detail-breathing-speaking').selectOption('Not sure');
    await expect(page.locator('#answer-review-note')).toBeHidden();
    await page.locator('#flow-continue').click(); await expect(page.locator('#review-answer-flags')).toBeHidden(); expect(calls).toBe(0);
});

test('question answers and notes remain in memory, render literally, and clear after account changes and exit', async ({page}) => {
    await open(page);
    const marker='FICTIONAL_FOLLOW_UP_PRIVATE_728', requests=[], logs=[];
    page.on('request',request=>requests.push(request.url()+(request.postData()||''))); page.on('console',message=>logs.push(message.text()));
    await page.evaluate(()=>{
        window.__writes=[];Storage.prototype.setItem=function(key,value){window.__writes.push([key,value]);};
        IDBObjectStore.prototype.add=IDBObjectStore.prototype.put=function(value){window.__writes.push(value);};
    });
    await view(page,'location'); await page.locator('#detail-location').fill(marker);
    await page.locator('.answer-note summary').click(); await page.locator('#note-location').fill('<img src=x onerror=alert(1)> fictional note');
    await page.locator('#flow-continue').click(); await expect(page.locator('#review-details')).toContainText(marker);
    await expect(page.locator('#review-details img')).toHaveCount(0);
    expect(requests.join(' ')).not.toContain(marker); expect(logs.join(' ')).not.toContain(marker);
    expect(await page.evaluate(()=>window.__writes)).toEqual([]);
    await expect(page.locator('#chat-input')).toHaveValue('');
    await page.evaluate(()=>window.__sessionChanged({uid:'another-user',displayName:'Sam'}));
    await expect(page.locator('#review-details')).toBeEmpty(); await expect(page.locator('#follow-up-fields')).toBeEmpty();
    await page.locator('[data-region="head"]').click(); await page.locator('[data-symptom="headache"]').click();
    await page.locator('#flow-continue').click(); await page.locator('#follow-up-panel > summary').click();
    await view(page,'location'); await page.locator('#detail-location').fill(marker);
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expect(page.locator('#review-details')).toBeEmpty(); await expect(page.locator('#follow-up-fields')).toBeEmpty();
});

for (const width of [320,390,768,1440]) {
    test(`personalized follow-ups at ${width}px support keyboard navigation, light/dark accessibility and editable summary`,async({page})=>{
        await page.setViewportSize({width,height:900}); await open(page,'general',['feeling-feverish']);
        await view(page,'temperature-measured'); await page.locator('#detail-temperature-measured').focus();
        await page.keyboard.press('y'); await page.keyboard.press('Enter');
        // Native select key behavior varies, so finish with a deterministic user-level selection.
        await page.locator('#detail-temperature-measured').selectOption('Yes');
        await view(page,'temperature-reading'); await page.locator('#detail-temperature-reading').fill('Fictional reading in C, at noon');
        for(const theme of ['light','dark']) {
            await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
            expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
            const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
            if([390,1440].includes(width)){await mkdir('test-results/screenshots',{recursive:true});await page.locator('.question-panel').screenshot({path:`test-results/screenshots/follow-ups-${width}-${theme}.png`});}
        }
        await page.locator('#flow-continue').click();
        const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); expect(audit.violations.map(v=>v.id)).toEqual([]);
        await page.getByRole('button',{name:'Edit answer: What was the reading, including the unit, and when was it taken?',exact:true}).click();
        await expect(page.locator('#detail-temperature-reading')).toBeFocused();
        await expect(page.locator('#detail-temperature-reading')).toHaveValue('Fictional reading in C, at noon');
    });
}
