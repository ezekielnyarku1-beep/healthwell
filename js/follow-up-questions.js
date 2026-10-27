import { regions, followUpQuestions } from './symptom-library.js';

// Descriptive branching only. These prompts and editorial review flags are drafts.
// No diagnoses, urgency levels, clinical thresholds, recommendations or scores.
export const questionVersion = 'descriptive-v1';
const prefer = 'Prefer not to answer';
const yesNo = ['Yes', 'No', 'Not sure', prefer];
const choice = (id, label, options = yesNo, extra = {}) => ({ id, label, options, ...extra });
const text = (id, label, extra = {}) => ({ id, label, maxLength: 200, ...extra });
const profile = (id, label, symptomIds, questionIds, regionIds) => ({ id, label, symptomIds, questionIds, regionIds });

const specificQuestions = [
    choice('pain-feeling', 'How would you describe the pain or discomfort?', ['Aching', 'Sharp', 'Throbbing', 'Burning', 'Cramping', 'Pressure or tightness', 'It varies', 'Not sure', prefer]),
    choice('pain-intensity', 'How strong does the pain or discomfort feel?', ['Mild', 'Moderate', 'Severe', 'It varies', 'Not sure', prefer]),
    choice('pain-movement', 'Does moving the area change the pain or discomfort?'),
    choice('pain-spreads', 'Does the pain or discomfort spread to another area?'),
    text('pain-spread-location', 'Where does the pain or discomfort spread?', { when: { id: 'pain-spreads', equals: 'Yes' } }),
    choice('head-light', 'When your head hurts, does light bother you?', yesNo, { unlessAny: ['sensitivity-to-light'] }),
    choice('dizzy-feeling', 'What does the dizziness feel like?', ['Things seem to spin', 'I feel lightheaded', 'I feel off balance', 'More than one of these', 'Not sure', prefer]),
    choice('dizzy-position', 'Does changing position bring on the dizziness?'),
    choice('dizzy-fainting', 'Have you fainted or lost consciousness with the dizziness?', yesNo, { unlessAny: ['fainting-or-loss-of-consciousness'], reviewAnswers: ['Yes'] }),
    choice('sensation-area', 'Is the numbness or tingling in one place or several?', ['One place', 'Several places on the same side', 'Both sides', 'It varies', 'Not sure', prefer]),
    choice('sudden-change', 'Did the change in feeling, strength or vision start suddenly?', yesNo, { reviewAnswers: ['Yes'] }),
    choice('weakness-task', 'Has the weakness changed how you move or hold things?'),
    choice('movement-time', 'Is the stiffness or movement difficulty different after resting?'),
    choice('swelling-change', 'Has the swelling changed since you first noticed it?', ['It has increased', 'It has decreased', 'About the same', 'It comes and goes', 'Not sure', prefer]),
    choice('swelling-warmth', 'Does the swollen area feel warmer than the surrounding skin?', yesNo, { unlessAny: ['warm-skin'] }),
    choice('vision-eyes', 'Is the change in vision in one eye or both?', ['Left eye', 'Right eye', 'Both eyes', 'It varies', 'Not sure', prefer]),
    choice('breathing-rest', 'Do you notice the breathing difficulty while resting?'),
    choice('breathing-speaking', 'Does the breathing difficulty make it hard to get words out?', yesNo, { reviewAnswers: ['Yes'] }),
    choice('cough-change', 'Has your cough changed since it started?'),
    text('cough-change-detail', 'What has changed about your cough?', { when: { id: 'cough-change', equals: 'Yes' } }),
    choice('cough-blood', 'Have you noticed blood when coughing?', yesNo, { reviewAnswers: ['Yes'] }),
    choice('heartbeat-pattern', 'What do you notice about your heartbeat?', ['It feels fast', 'It feels uneven', 'It pounds', 'It flutters', 'More than one of these', 'Not sure', prefer]),
    choice('heartbeat-activity', 'Do you notice the heartbeat sensation during usual activities, rest, or both?', ['During activity', 'At rest', 'Both', 'Not sure', prefer]),
    choice('digestion-meals', 'Does the digestive discomfort change around meals?', ['Before eating', 'While eating', 'After eating', 'No clear link', 'Not sure', prefer]),
    choice('digestion-vomiting', 'Have you been sick or vomited with the digestive discomfort?', yesNo, { unlessAny: ['being-sick'] }),
    choice('vomiting-drinks', 'Have you had trouble keeping drinks down?', yesNo, { reviewAnswers: ['Yes'] }),
    choice('bowel-change', 'Has your usual bowel pattern changed?', ['Going more often', 'Going less often', 'A change in how poo looks or feels', 'More than one change', 'No change', 'Not sure', prefer]),
    choice('bowel-blood', 'Have you noticed blood in poo or vomit?', yesNo, { unlessAny: ['blood-in-poo-or-vomit'], reviewAnswers: ['Yes'] }),
    choice('bladder-pattern', 'What has changed when you pee?', ['Going more often', 'Pain or burning', 'Both', 'Something else', 'Not sure', prefer]),
    choice('energy-sleep', 'Have you noticed a change in your sleep along with the tiredness?'),
    text('energy-sleep-detail', 'What has changed about your sleep?', { when: { id: 'energy-sleep', equals: 'Yes' } }),
    choice('temperature-measured', 'Have you measured your temperature?'),
    text('temperature-reading', 'What was the reading, including the unit, and when was it taken?', { when: { id: 'temperature-measured', equals: 'Yes' }, placeholder: 'For example: a fictional reading in °C or °F, and the time' }),
    choice('skin-change', 'Has the skin change spread or changed in appearance?', ['It has spread', 'Its appearance has changed', 'Both', 'No change', 'Not sure', prefer]),
    choice('skin-itch', 'Does the affected skin itch?', yesNo, { unlessAny: ['itchy-skin', 'itchy-scalp'] }),
    choice('ear-side', 'Which ear is affected?', ['Left', 'Right', 'Both', 'Not sure', prefer]),
    choice('nose-pattern', 'Is your nose mainly blocked, runny, or both?', ['Blocked', 'Runny', 'Both', 'Not sure', prefer]),
    choice('throat-swallowing', 'Does swallowing change the throat discomfort?'),
    text('other-change', 'Is there anything that brings this on or changes it?')
];

// Explicit symptom IDs, rather than interpreting custom text or making medical inferences.
export const symptomProfiles = [
    profile('pain', 'Pain and discomfort', ['discomfort', 'headache', 'face-or-sinus-pressure', 'neck-pain', 'jaw-or-tooth-pain', 'chest-pain', 'tenderness', 'pressure-or-tightness', 'burning-feeling', 'pain-when-moving', 'pain-when-breathing', 'stomach-or-belly-pain', 'cramping', 'period-cramps', 'sudden-severe-belly-pain', 'sudden-extremely-severe-headache', 'upper-back-pain', 'middle-back-pain', 'lower-back-pain', 'pain-between-the-shoulders', 'pain-near-the-tailbone', 'pain-when-twisting', 'pain-after-sitting', 'pain-when-standing', 'pain-spreading-toward-a-leg', 'shoulder-pain', 'upper-arm-pain', 'elbow-pain', 'wrist-pain', 'hand-or-finger-pain', 'hip-pain', 'thigh-pain', 'knee-pain', 'calf-pain', 'ankle-pain', 'foot-or-toe-pain', 'body-aches', 'joint-aches', 'muscle-soreness'], ['pain-feeling', 'pain-intensity', 'pain-movement', 'pain-spreads', 'pain-spread-location']),
    profile('headache', 'Head discomfort', ['headache', 'sudden-extremely-severe-headache'], ['head-light']),
    profile('dizziness', 'Dizziness and balance', ['dizziness', 'feeling-lightheaded'], ['dizzy-feeling', 'dizzy-position', 'dizzy-fainting']),
    profile('sensation', 'Changes in feeling', ['numbness', 'tingling', 'numbness-in-the-face', 'numbness-in-several-areas', 'tingling-in-several-areas', 'unusual-cold-feeling'], ['sensation-area', 'sudden-change']),
    profile('weakness', 'Changes in strength', ['weakness', 'weakness-in-the-face', 'weakness-in-a-leg', 'weakness-throughout-the-body'], ['sudden-change', 'weakness-task']),
    profile('movement', 'Movement and stiffness', ['stiffness', 'neck-stiffness', 'muscle-tightness', 'muscle-spasms', 'muscle-cramps', 'difficulty-bending', 'difficulty-lifting-the-arm', 'difficulty-gripping-things', 'difficulty-walking', 'difficulty-putting-weight-on-the-foot', 'shaking-hands'], ['movement-time']),
    profile('swelling', 'Swelling', ['swelling', 'neck-swelling', 'belly-swelling', 'swelling-in-several-areas', 'a-lump-or-bump'], ['swelling-change', 'swelling-warmth']),
    profile('vision', 'Eyes and vision', ['eye-discomfort', 'blurred-vision', 'double-vision', 'sensitivity-to-light'], ['vision-eyes', 'sudden-change']),
    profile('breathing', 'Breathing', ['shortness-of-breath', 'wheezing', 'severe-difficulty-breathing'], ['breathing-rest', 'breathing-speaking']),
    profile('cough', 'Cough', ['dry-cough', 'cough-with-mucus'], ['cough-change', 'cough-change-detail', 'cough-blood']),
    profile('heartbeat', 'Heartbeat sensations', ['pounding-heartbeat', 'fluttering-heartbeat', 'heartbeat-feels-faster-than-usual', 'heartbeat-feels-uneven'], ['heartbeat-pattern', 'heartbeat-activity']),
    profile('digestion', 'Digestion', ['bloating', 'gas', 'indigestion', 'feeling-sick', 'being-sick', 'feeling-full-quickly', 'burping', 'stomach-or-belly-pain', 'cramping', 'reduced-appetite'], ['digestion-meals', 'digestion-vomiting'], ['abdomen']),
    profile('vomiting', 'Being sick', ['being-sick'], ['vomiting-drinks']),
    profile('bowel', 'Bowel changes', ['loose-or-watery-poo', 'hard-poo-or-difficulty-pooing', 'blood-in-poo-or-vomit', 'new-loss-of-bladder-or-bowel-control'], ['bowel-change', 'bowel-blood']),
    profile('bladder', 'Bladder changes', ['needing-to-pee-more-often', 'pain-or-burning-when-peeing', 'new-loss-of-bladder-or-bowel-control'], ['bladder-pattern']),
    profile('energy', 'Energy and sleep', ['feeling-tired', 'low-energy', 'feeling-sleepy-in-the-daytime', 'difficulty-sleeping'], ['energy-sleep', 'energy-sleep-detail']),
    profile('temperature', 'Temperature and sweating', ['feeling-feverish', 'chills-or-shivering', 'sweating-more-than-usual', 'night-sweats'], ['temperature-measured', 'temperature-reading']),
    profile('skin', 'Skin changes', ['itchy-skin', 'itchy-scalp', 'rash', 'redness', 'bruising', 'warm-skin'], ['skin-change', 'skin-itch']),
    profile('ears', 'Ears and hearing', ['ear-discomfort', 'ringing-in-the-ears', 'reduced-hearing'], ['ear-side']),
    profile('nose', 'Nose', ['blocked-or-runny-nose', 'sneezing'], ['nose-pattern']),
    profile('throat', 'Throat', ['sore-throat', 'difficulty-swallowing'], ['throat-swallowing'])
];

export const questionCatalog = Object.fromEntries([
    ...followUpQuestions.map(question => ({ ...question, options: question.options ? [...question.options, prefer] : undefined })),
    ...specificQuestions
].map(question => [question.id, question]));

function freeze(value) {
    Object.values(value).forEach(item => { if (item && typeof item === 'object') freeze(item); });
    return Object.freeze(value);
}
freeze(questionCatalog); freeze(symptomProfiles);

export function getQuestionPlan(state) {
    const region = regions.find(item => item.id === state.region);
    if (!region || (!state.symptoms.length && !state.customSymptom.trim())) return [];
    const selected = region.groups.flatMap(group => group.symptoms).filter(symptom => state.symptoms.includes(symptom.id));
    const sharedContext = selected.map(symptom => symptom.label);
    if (state.customSymptom.trim()) sharedContext.push(`Your description: ${state.customSymptom.trim()}`);
    const plan = new Map(followUpQuestions.map(question => [question.id, { ...questionCatalog[question.id], section: 'The overall picture', appliesTo: sharedContext }]));
    const matched = symptomProfiles.filter(profile => (!profile.regionIds || profile.regionIds.includes(state.region)) && profile.symptomIds.some(id => state.symptoms.includes(id)));
    const uncovered = selected.filter(symptom => !matched.some(profile => profile.symptomIds.includes(symptom.id)));
    for (const profile of matched) {
        const appliesTo = selected.filter(symptom => profile.symptomIds.includes(symptom.id)).map(symptom => symptom.label);
        for (const id of profile.questionIds) {
            const question = questionCatalog[id];
            if (question.unlessAny?.some(symptom => state.symptoms.includes(symptom))) continue;
            if (id === 'energy-sleep' && state.symptoms.includes('difficulty-sleeping')) continue;
            const configured = id === 'energy-sleep-detail' && state.symptoms.includes('difficulty-sleeping') ? { ...question, when: undefined } : question;
            const existing = plan.get(id);
            plan.set(id, { ...configured, section: existing ? 'Changes in feeling, strength or vision' : profile.label, appliesTo: [...new Set([...(existing?.appliesTo || []), ...appliesTo])] });
        }
    }
    // Additional detail about vomiting only when explicitly reported in an answer.
    if (plan.has('digestion-vomiting') && state.details['digestion-vomiting'] === 'Yes' && !plan.has('vomiting-drinks')) {
        plan.set('vomiting-drinks', { ...questionCatalog['vomiting-drinks'], when: { id: 'digestion-vomiting', equals: 'Yes' }, section: 'Digestion', appliesTo: plan.get('digestion-vomiting').appliesTo });
    }
    if (uncovered.length || state.customSymptom.trim()) plan.set('other-change', { ...questionCatalog['other-change'], section: 'In your own words', appliesTo: [...uncovered.map(s => s.label), ...(state.customSymptom.trim() ? [`Your description: ${state.customSymptom.trim()}`] : [])] });
    // Conditions require both the parent question and its explicit current answer.
    const active = new Map();
    for (const [id, question] of plan) {
        if (!question.when || (active.has(question.when.id) && state.details[question.when.id] === question.when.equals)) active.set(id, question);
    }
    return [...active.values()];
}

export function getAnswerSummary(state) {
    const active = new Map(getQuestionPlan(state).map(question => [question.id, question]));
    return Object.values(questionCatalog).filter(question => (state.details[question.id] || '').trim() || (state.detailNotes[question.id] || '').trim()).map(question => {
        const current = active.get(question.id);
        const context = state.answerContexts[question.id] || [];
        return {
            question, value: state.details[question.id] || '', note: state.detailNotes[question.id] || '', active: Boolean(current), context,
            contextChanged: Boolean(current && JSON.stringify([...context].sort()) !== JSON.stringify([...current.appliesTo].sort())),
            review: Boolean(question.reviewAnswers?.includes(state.details[question.id]))
        };
    });
}
