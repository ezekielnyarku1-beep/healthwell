import test from 'node:test';
import assert from 'node:assert/strict';
import { createSymptomFlow, regions } from '../js/symptom-flow.js';
import { questionCatalog, symptomProfiles } from '../js/follow-up-questions.js';

const setup = (region, symptoms) => {
    const flow = createSymptomFlow(); flow.selectRegion(region); symptoms.forEach(id => assert.equal(flow.selectSymptom(id), true, id)); return flow;
};
const ids = flow => flow.questions.map(question => question.id);

test('question configuration references real symptoms and valid parent questions; every example gets descriptive follow-ups', () => {
    const knownSymptoms = new Set(regions.flatMap(region => region.groups.flatMap(group => group.symptoms.map(s => s.id))));
    for (const profile of symptomProfiles) {
        assert.ok(profile.symptomIds.every(id => knownSymptoms.has(id)), profile.id);
        assert.ok(profile.questionIds.every(id => Object.hasOwn(questionCatalog, id)), profile.id);
    }
    for (const question of Object.values(questionCatalog)) {
        assert.ok(Object.isFrozen(question));
        if (question.when) assert.ok(questionCatalog[question.when.id].options.includes(question.when.equals));
        if (question.options) { assert.ok(question.options.includes('Prefer not to answer')); assert.equal(new Set(question.options).size, question.options.length); }
    }
    for (const region of regions) for (const option of region.options) {
        const flow = setup(region.id, [option]);
        assert.ok(ids(flow).length >= 7, `${region.id}: ${option}`);
        assert.equal(new Set(ids(flow)).size, ids(flow).length);
    }
});

test('headache plus dizziness combines relevant profiles and asks each shared question once', () => {
    const flow = setup('head', ['Headache', 'Neck pain', 'Dizziness']);
    for (const id of ['onset', 'duration', 'location', 'frequency', 'severity', 'associated', 'pain-feeling', 'pain-intensity', 'head-light', 'dizzy-feeling']) assert.equal(ids(flow).filter(item => item === id).length, 1);
    assert.ok(!ids(flow).includes('breathing-rest'));
    assert.deepEqual(flow.questions.find(q => q.id === 'pain-feeling').appliesTo, ['Headache', 'Neck pain']);
    const changes = setup('head', ['Numbness in the face', 'Weakness in the face', 'Blurred vision']);
    assert.equal(ids(changes).filter(id => id === 'sudden-change').length, 1);
    assert.equal(changes.questions.find(q => q.id === 'sudden-change').appliesTo.length, 3);
});

test('conditional answers reveal detail only for explicit Yes and preserve earlier answers when hidden', () => {
    const flow = setup('back', ['Lower back pain']);
    assert.ok(!ids(flow).includes('pain-spread-location'));
    assert.equal(flow.setDetail('pain-spread-location', 'not yet applicable'), false);
    assert.equal(flow.setDetail('pain-spreads', 'Yes'), true); assert.ok(ids(flow).includes('pain-spread-location'));
    flow.setDetail('pain-spread-location', 'Fictional left thigh'); flow.setDetailNote('pain-spread-location', 'Only after sitting');
    flow.setDetail('pain-spreads', 'No'); assert.ok(!ids(flow).includes('pain-spread-location'));
    const earlier = flow.answerSummary.find(answer => answer.question.id === 'pain-spread-location');
    assert.equal(earlier.active, false); assert.equal(earlier.value, 'Fictional left thigh'); assert.equal(earlier.note, 'Only after sitting');
    assert.equal(flow.setDetail('pain-spread-location', 'Edited earlier answer'), true);
    flow.setDetail('pain-spreads', 'Yes'); assert.equal(flow.state.details['pain-spread-location'], 'Edited earlier answer');
    for (const value of ['No', 'Not sure', 'Prefer not to answer']) { flow.setDetail('pain-spreads', value); assert.ok(!ids(flow).includes('pain-spread-location')); }
    flow.setDetail('pain-spreads', 'Yes'); flow.clearDetail('pain-spreads'); assert.ok(!ids(flow).includes('pain-spread-location'));
});

test('selected symptoms suppress redundant questions; temperature, sleep and vomiting have explicit branches', () => {
    const head = setup('head', ['Headache', 'Sensitivity to light']); assert.ok(!ids(head).includes('head-light'));
    const stomach = setup('abdomen', ['Feeling sick']);
    stomach.setDetail('digestion-vomiting', 'No'); assert.ok(!ids(stomach).includes('vomiting-drinks'));
    stomach.setDetail('digestion-vomiting', 'Yes'); assert.ok(ids(stomach).includes('vomiting-drinks'));
    stomach.selectSymptom('Being sick'); assert.ok(!ids(stomach).includes('digestion-vomiting')); assert.equal(ids(stomach).filter(id => id === 'vomiting-drinks').length, 1);
    const tired = setup('general', ['Feeling tired']); assert.ok(!ids(tired).includes('energy-sleep-detail'));
    tired.setDetail('energy-sleep', 'Yes'); assert.ok(ids(tired).includes('energy-sleep-detail'));
    tired.selectSymptom('Difficulty sleeping'); assert.ok(!ids(tired).includes('energy-sleep')); assert.ok(ids(tired).includes('energy-sleep-detail'));
    const temperature = setup('general', ['Feeling feverish']); assert.ok(!ids(temperature).includes('temperature-reading'));
    temperature.setDetail('temperature-measured', 'Yes'); temperature.setDetail('temperature-reading', 'Fictional 37.5 C at noon');
    assert.equal(temperature.answerSummary.find(a => a.question.id === 'temperature-reading').value, 'Fictional 37.5 C at noon');
});

test('selection changes retain answer context until explicitly edited or confirmed', () => {
    const flow = setup('head', ['Headache']); flow.setDetail('onset', 'Today'); flow.setDetail('pain-feeling', 'Aching');
    flow.selectSymptom('Dizziness');
    let answer = flow.answerSummary.find(a => a.question.id === 'onset'); assert.equal(answer.contextChanged, true); assert.deepEqual(answer.context, ['Headache']);
    flow.confirmDetail('onset'); answer = flow.answerSummary.find(a => a.question.id === 'onset'); assert.equal(answer.contextChanged, false); assert.deepEqual(answer.context, ['Headache', 'Dizziness']);
    flow.toggleSymptom('Headache');
    answer = flow.answerSummary.find(a => a.question.id === 'pain-feeling'); assert.equal(answer.active, false); assert.deepEqual(answer.context, ['Headache']);
    flow.toggleSymptom('Headache'); assert.equal(flow.answerSummary.find(a => a.question.id === 'pain-feeling').value, 'Aching');
});

test('editorial answer flags do not change navigation, assign urgency or invoke triage', () => {
    const flow = setup('chest', ['Shortness of breath']);
    flow.setDetail('breathing-speaking', 'Yes');
    assert.equal(flow.answerSummary.find(a => a.question.id === 'breathing-speaking').review, true);
    assert.equal(flow.state.step, 1); assert.equal(flow.next(), ''); assert.equal(flow.next(), ''); assert.equal(flow.state.step, 3);
    for (const value of ['No', 'Not sure', 'Prefer not to answer']) {
        flow.setDetail('breathing-speaking', value); assert.equal(flow.answerSummary.find(a => a.question.id === 'breathing-speaking').review, false);
    }
    assert.equal(flow.state.risk, undefined); assert.equal(flow.state.diagnosis, undefined);
});

test('notes, answer editing, snapshots, reset and region changes preserve browser-only state integrity', () => {
    const flow = setup('head', ['Dizziness']); flow.setDetail('dizzy-feeling', 'Things seem to spin'); flow.setDetailNote('dizzy-feeling', 'Fictional detail');
    flow.next(); flow.next(); assert.equal(flow.editStep(2), true); assert.equal(flow.state.step, 2);
    flow.setDetail('dizzy-feeling', 'I feel off balance'); flow.back(); flow.next(); flow.next();
    assert.equal(flow.answerSummary.find(a => a.question.id === 'dizzy-feeling').value, 'I feel off balance');
    assert.equal(flow.state.detailNotes['dizzy-feeling'], 'Fictional detail');
    const snapshot = flow.state; snapshot.answerContexts['dizzy-feeling'].push('fake'); snapshot.detailNotes['dizzy-feeling'] = 'fake';
    assert.deepEqual(flow.state.answerContexts['dizzy-feeling'], ['Dizziness']);
    const plan = flow.questions; plan[0].appliesTo.push('fake'); assert.ok(!flow.questions[0].appliesTo.includes('fake'));
    flow.setDetailNote('dizzy-feeling', 'x'.repeat(400)); assert.equal(flow.state.detailNotes['dizzy-feeling'].length, 300);
    for (const id of ['__proto__', 'toString', 'unknown']) { assert.equal(flow.setDetail(id, 'value'), false); assert.equal(flow.setDetailNote(id, 'value'), false); }
    flow.selectRegion('chest'); assert.deepEqual(flow.state.detailNotes, {}); assert.deepEqual(flow.state.answerContexts, {});
    flow.reset(); assert.deepEqual(flow.state, createSymptomFlow().state);
});

test('custom descriptions use general prompts without interpreting free text', () => {
    const flow = createSymptomFlow(); flow.selectRegion('general'); flow.setCustomSymptom('Fictional chest pain and headache');
    assert.deepEqual(ids(flow), ['onset', 'duration', 'frequency', 'severity', 'location', 'associated', 'other-change']);
    flow.setDetail('onset', 'Prefer not to answer'); flow.setDetailNote('onset', '<script>fictional text</script>');
    assert.equal(flow.answerSummary[0].value, 'Prefer not to answer'); assert.equal(flow.answerSummary[0].note, '<script>fictional text</script>');
    flow.clearDetail('onset'); assert.equal(flow.answerSummary.length, 0);
});
