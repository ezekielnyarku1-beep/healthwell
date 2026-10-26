import test from 'node:test';
import assert from 'node:assert/strict';
import { createSymptomFlow, regions } from '../js/symptom-flow.js';

test('all nine regions have selectable options and can complete a check-in', () => {
    assert.equal(regions.length, 9);
    for (const region of regions) {
        const flow = createSymptomFlow();
        assert.equal(flow.selectRegion(region.id), true);
        assert.equal(flow.selectSymptom(region.options[0]), true);
        assert.equal(flow.next(), '');
        assert.equal(flow.state.step, 2);
        assert.equal(flow.next(), '');
        assert.equal(flow.state.step, 3);
        flow.next();
        assert.equal(flow.state.step, 3);
    }
});
test('incomplete and invalid answers never advance the flow', () => {
    const flow = createSymptomFlow();
    assert.match(flow.next(), /region/);
    assert.equal(flow.selectRegion('unknown'), false);
    flow.selectRegion('head');
    assert.match(flow.next(), /option/);
    assert.equal(flow.selectSymptom('Bloating'), false);
    assert.equal(flow.state.step, 1);
});
test('changing regions resets incompatible answers but preserves optional notes', () => {
    const flow = createSymptomFlow();
    flow.selectRegion('head'); flow.selectSymptom('Headache');
    flow.setDescription('An example note'); flow.next(); flow.next();
    flow.selectRegion('abdomen');
    assert.deepEqual(flow.state, { region: 'abdomen', symptom: null, description: 'An example note', step: 1, view: 'front' });
});
test('back navigation and front/back views preserve answers without clinical inference', () => {
    const flow = createSymptomFlow();
    flow.selectRegion('back');
    assert.equal(flow.state.view, 'back');
    flow.selectSymptom('Stiffness'); flow.next(); flow.next(); flow.back();
    flow.setView('front');
    assert.equal(flow.state.symptom, 'Stiffness');
    assert.equal(flow.state.step, 2);
    flow.back(); flow.back();
    assert.equal(flow.state.step, 1);
    flow.selectRegion('chest');
    assert.equal(flow.state.view, 'front');
});
test('state is isolated, bounded and fully erased when reset', () => {
    const flow = createSymptomFlow();
    flow.setDescription('a'.repeat(1200));
    assert.equal(flow.state.description.length, 1000);
    const snapshot = flow.state;
    snapshot.description = 'changed externally';
    assert.notEqual(flow.state.description, snapshot.description);
    assert.equal(createSymptomFlow().state.description, '');
    flow.selectRegion('general'); flow.selectSymptom('Feeling tired'); flow.next();
    flow.reset();
    assert.deepEqual(flow.state, createSymptomFlow().state);
});
