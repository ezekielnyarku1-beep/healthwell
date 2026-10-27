// Descriptive examples only. Editorial review flags never trigger scoring or triage.
const example = (label, aliases = [], reviewRequired = false) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), label, aliases, reviewRequired
});
const review = (label, aliases = []) => example(label, aliases, true);
const group = (id, label, values) => ({ id, label, symptoms: values.map(value => typeof value === 'string' ? example(value) : value) });
const armGroups = () => [
    group('pain', 'Pain and discomfort', ['Discomfort', 'Shoulder pain', 'Upper arm pain', 'Elbow pain', 'Wrist pain', 'Hand or finger pain']),
    group('movement', 'Movement and strength', ['Stiffness', 'Difficulty lifting the arm', 'Difficulty gripping things', review('Weakness'), 'Shaking hands']),
    group('sensation', 'Changes in feeling', [review('Numbness'), example('Tingling', ['pins and needles']), 'Burning feeling', 'Unusual cold feeling']),
    group('appearance', 'Swelling and skin changes', ['Swelling', 'Bruising', 'Redness', 'Warm skin', 'Itchy skin', 'A lump or bump'])
];
const legGroups = () => [
    group('pain', 'Pain and discomfort', ['Discomfort', 'Hip pain', 'Thigh pain', 'Knee pain', 'Calf pain', 'Ankle pain', 'Foot or toe pain']),
    group('movement', 'Movement and strength', ['Stiffness', 'Muscle cramps', review('Weakness'), 'Difficulty walking', 'Difficulty putting weight on the foot']),
    group('sensation', 'Changes in feeling', [review('Numbness'), example('Tingling', ['pins and needles']), 'Burning feeling', 'Unusual cold feeling']),
    group('appearance', 'Swelling and skin changes', [review('Swelling'), 'Bruising', 'Redness', 'Warm skin', 'Itchy skin', 'A lump or bump'])
];
const definitions = [
    { id: 'head', label: 'Head and neck', chatOptions: ['Headache', 'Dizziness', 'Eye discomfort', 'Ear discomfort'], groups: [
        group('pain', 'Pain and discomfort', ['Headache', 'Face or sinus pressure', 'Neck pain', 'Neck stiffness', 'Sore throat', 'Jaw or tooth pain']),
        group('balance', 'Balance and feeling', [example('Dizziness', ['dizzy', 'spinning', 'vertigo']), example('Feeling lightheaded', ['faint']), review('Numbness in the face'), review('Weakness in the face')]),
        group('eyes', 'Eyes and vision', ['Eye discomfort', review('Blurred vision', ['blurry', 'vision changes']), review('Double vision', ['vision changes']), 'Sensitivity to light']),
        group('ears', 'Ears, nose and throat', ['Ear discomfort', example('Ringing in the ears', ['tinnitus']), 'Reduced hearing', 'Blocked or runny nose', 'Sneezing', review('Difficulty swallowing')]),
        group('appearance', 'Swelling and other changes', ['Neck swelling', 'Itchy scalp', review('Sudden, extremely severe headache'), review('New trouble speaking')])
    ] },
    { id: 'chest', label: 'Chest', chatOptions: ['Discomfort', 'Tenderness'], groups: [
        group('pain', 'Pain and discomfort', ['Discomfort', 'Tenderness', review('Chest pain'), review('Pressure or tightness'), 'Burning feeling', 'Pain when moving']),
        group('breathing', 'Breathing and cough', [review('Shortness of breath', ['breathless', 'breathing difficulty']), example('Wheezing', ['whistling breath']), 'Dry cough', 'Cough with mucus', review('Pain when breathing'), review('Severe difficulty breathing')]),
        group('heartbeat', 'Heartbeat sensations', [example('Pounding heartbeat', ['palpitations']), 'Fluttering heartbeat', 'Heartbeat feels faster than usual', 'Heartbeat feels uneven']),
        group('surface', 'Skin, muscles and swelling', ['Muscle soreness', 'Swelling', 'Itchy skin', 'Rash', 'A lump or bump'])
    ] },
    { id: 'abdomen', label: 'Abdomen', chatOptions: ['Discomfort', 'Bloating'], groups: [
        group('pain', 'Pain and discomfort', ['Discomfort', 'Stomach or belly pain', 'Cramping', 'Tenderness', 'Burning feeling', 'Period cramps']),
        group('digestion', 'Digestion and appetite', ['Bloating', 'Gas', 'Indigestion', example('Feeling sick', ['nausea', 'queasy']), example('Being sick', ['vomiting', 'throwing up']), 'Feeling full quickly', 'Reduced appetite', 'Burping']),
        group('toilet', 'Bowel and bladder changes', [example('Loose or watery poo', ['diarrhea', 'diarrhoea']), example('Hard poo or difficulty pooing', ['constipation']), 'Needing to pee more often', 'Pain or burning when peeing', review('Blood in poo or vomit')]),
        group('other', 'Swelling and other changes', ['Belly swelling', 'A lump or bump', review('Sudden, severe belly pain')])
    ] },
    { id: 'back', label: 'Back', chatOptions: ['Discomfort', 'Stiffness'], groups: [
        group('pain', 'Pain and discomfort', ['Discomfort', 'Upper back pain', 'Middle back pain', 'Lower back pain', 'Pain between the shoulders', 'Pain near the tailbone']),
        group('movement', 'Movement and muscles', ['Stiffness', 'Muscle tightness', example('Muscle spasms', ['twitching']), 'Difficulty bending', 'Pain when twisting', 'Pain after sitting', 'Pain when standing']),
        group('sensation', 'Changes in feeling', ['Burning feeling', review('Numbness'), example('Tingling', ['pins and needles']), 'Pain spreading toward a leg', review('Weakness in a leg')]),
        group('appearance', 'Skin and other changes', ['Tenderness', 'Swelling', 'Bruising', 'Itchy skin', review('New loss of bladder or bowel control')])
    ] },
    { id: 'left-arm', label: 'Left arm', chatOptions: ['Discomfort', 'Stiffness'], groups: armGroups() },
    { id: 'right-arm', label: 'Right arm', chatOptions: ['Discomfort', 'Stiffness'], groups: armGroups() },
    { id: 'left-leg', label: 'Left leg', chatOptions: ['Discomfort', 'Stiffness'], groups: legGroups() },
    { id: 'right-leg', label: 'Right leg', chatOptions: ['Discomfort', 'Stiffness'], groups: legGroups() },
    { id: 'general', label: 'Whole body / general', chatOptions: ['Feeling tired', 'Feeling unwell'], groups: [
        group('energy', 'Energy, sleep and strength', [example('Feeling tired', ['fatigue', 'exhausted']), 'Feeling unwell', 'Low energy', 'Feeling sleepy in the daytime', 'Difficulty sleeping', review('Weakness throughout the body')]),
        group('temperature', 'Temperature and sweating', [example('Feeling feverish', ['fever', 'high temperature', 'hot']), 'Chills or shivering', 'Sweating more than usual', 'Night sweats']),
        group('aches', 'Aches and changes in feeling', ['Body aches', 'Joint aches', 'Muscle soreness', 'Dizziness', example('Tingling in several areas', ['pins and needles']), review('Numbness in several areas')]),
        group('other', 'Appetite, skin and other changes', ['Reduced appetite', 'Feeling unusually thirsty', 'Itchy skin', 'Rash', 'Swelling in several areas', review('Fainting or loss of consciousness'), review('Sudden confusion')])
    ] }
];
function freeze(value) {
    Object.values(value).forEach(item => { if (item && typeof item === 'object') freeze(item); });
    return Object.freeze(value);
}
export const regions = freeze(definitions.map(region => ({ ...region, options: region.groups.flatMap(category => category.symptoms.map(symptom => symptom.label)) })));
const normalize = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function searchSymptoms(regionId, query = '') {
    const words = normalize(query).split(' ').filter(Boolean);
    return (regions.find(region => region.id === regionId)?.groups || []).map(category => ({
        ...category,
        symptoms: category.symptoms.filter(symptom => {
            const text = normalize([symptom.label, ...symptom.aliases, category.label].join(' '));
            return words.every(word => text.includes(word));
        })
    })).filter(category => category.symptoms.length);
}
// Optional descriptive prompts: no clinical branching or numerical scales.
export const followUpQuestions = freeze([
    { id: 'onset', label: 'When did it start?', options: ['Today', 'Yesterday', 'A few days ago', 'A week or more ago', 'I am not sure'] },
    { id: 'duration', label: 'How long does it last each time?', options: ['A few seconds', 'A few minutes', 'Several hours', 'It is there all the time', 'It varies', 'I am not sure'] },
    { id: 'frequency', label: 'How often does it happen?', options: ['This is the first time', 'Occasionally', 'Several times a day', 'Every day', 'It is there all the time', 'I am not sure'] },
    { id: 'severity', label: 'How does it affect your usual activities?', options: ['A little', 'Somewhat', 'A lot', 'I cannot do my usual activities', 'I am not sure'] },
    { id: 'location', label: 'Where exactly do you feel it?', placeholder: 'For example: behind the left knee', maxLength: 200 },
    { id: 'associated', label: 'Anything else happening at the same time?', placeholder: 'Describe any other symptoms, if you wish', maxLength: 300 }
]);
