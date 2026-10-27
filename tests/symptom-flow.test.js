import test from 'node:test';
import assert from 'node:assert/strict';
import { createSymptomFlow, regions } from '../js/symptom-flow.js';
import { searchSymptoms, followUpQuestions } from '../js/symptom-library.js';

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
    flow.setCustomSymptom('A fictional head symptom'); flow.setDetail('location', 'Left temple');
    flow.selectRegion('abdomen');
    assert.equal(flow.state.region, 'abdomen');
    assert.deepEqual(flow.state.symptoms, []);
    assert.equal(flow.state.customSymptom, '');
    assert.ok(Object.values(flow.state.details).every(value => value === ''));
    assert.equal(flow.state.description, 'An example note');
    assert.equal(flow.state.step, 1);
});
test('back navigation and front/back views preserve answers without clinical inference', () => {
    const flow = createSymptomFlow();
    flow.selectRegion('back');
    assert.equal(flow.state.view, 'back');
    flow.selectSymptom('Stiffness'); flow.next(); flow.next(); flow.back();
    flow.setView('front');
    assert.deepEqual(flow.state.symptoms, ['stiffness']);
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

test('each library region has 15–25 grouped, unique, immutable examples with explicit review metadata', () => {
    for (const region of regions) {
        const symptoms = region.groups.flatMap(group => group.symptoms);
        assert.ok(symptoms.length >= 15 && symptoms.length <= 25, `${region.id}: ${symptoms.length}`);
        assert.equal(new Set(symptoms.map(symptom => symptom.id)).size, symptoms.length);
        assert.equal(new Set(region.groups.map(group => group.id)).size, region.groups.length);
        assert.ok(symptoms.every(symptom => typeof symptom.reviewRequired === 'boolean' && symptom.label && symptom.id));
        assert.ok(region.groups.every(group => group.symptoms.length && group.label));
        assert.ok(region.chatOptions.every(label => region.options.includes(label)));
        assert.ok(Object.isFrozen(region.groups[0].symptoms[0]));
    }
    assert.deepEqual(regions.find(r => r.id === 'left-arm').options, regions.find(r => r.id === 'right-arm').options);
    assert.deepEqual(regions.find(r => r.id === 'left-leg').options, regions.find(r => r.id === 'right-leg').options);
});

test('search handles aliases, case, whitespace, multiple words and region boundaries without mutation', () => {
    const labels = (region, query) => searchSymptoms(region, query).flatMap(group => group.symptoms.map(symptom => symptom.label));
    assert.deepEqual(labels('head', '  DiZzY  '), ['Dizziness']);
    assert.deepEqual(labels('left-arm', 'pins needles'), ['Tingling']);
    assert.deepEqual(labels('abdomen', 'nausea'), ['Feeling sick']);
    assert.deepEqual(labels('general', 'fatigue'), ['Feeling tired']);
    assert.deepEqual(labels('head', 'vision changes'), ['Blurred vision', 'Double vision']);
    assert.deepEqual(labels('head', 'knee'), []);
    assert.deepEqual(labels('unknown', 'pain'), []);
    assert.deepEqual(labels('head', '<script>'), []);
    assert.equal(labels('head', '').length, regions[0].options.length);
});

test('multiple selections toggle independently, never duplicate and cannot mutate snapshots', () => {
    const flow = createSymptomFlow(); flow.selectRegion('head');
    flow.selectSymptom('Headache'); flow.selectSymptom('Headache'); flow.toggleSymptom('Dizziness');
    assert.deepEqual(flow.state.symptoms, ['headache', 'dizziness']);
    flow.toggleSymptom('headache'); assert.deepEqual(flow.state.symptoms, ['dizziness']);
    assert.equal(flow.toggleSymptom('Knee pain'), false);
    const snapshot = flow.state; snapshot.symptoms.push('fake'); snapshot.details.location = 'fake';
    assert.deepEqual(flow.state.symptoms, ['dizziness']); assert.equal(flow.state.details.location, '');
    flow.selectRegion('head'); assert.deepEqual(flow.state.symptoms, ['dizziness']);
    flow.next(); flow.back(); assert.deepEqual(flow.state.symptoms, ['dizziness']);
    flow.reset(); assert.deepEqual(flow.state, createSymptomFlow().state);
});

test('a custom description alone can complete a check-in; optional fields are bounded and validated', () => {
    const flow = createSymptomFlow(); flow.selectRegion('general');
    flow.setCustomSymptom('   '); assert.match(flow.next(), /option/);
    flow.setCustomSymptom('A fictional symptom not listed'); assert.equal(flow.next(), '');
    for (const question of followUpQuestions) {
        assert.equal(flow.setDetail(question.id, question.options?.[0] || 'Fictional detail'), true);
    }
    assert.equal(flow.setDetail('severity', '80% risk'), false);
    assert.equal(flow.setDetail('diagnosis', 'fake'), false);
    assert.equal(flow.next(), ''); assert.equal(flow.state.step, 3);
    flow.setCustomSymptom('x'.repeat(400)); assert.equal(flow.state.customSymptom.length, 200);
    flow.setDetail('location', 'x'.repeat(400)); assert.equal(flow.state.details.location.length, 200);
    flow.setDetail('associated', 'x'.repeat(400)); assert.equal(flow.state.details.associated.length, 300);
});
