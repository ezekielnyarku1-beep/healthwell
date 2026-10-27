import { regions, followUpQuestions } from './symptom-library.js';
import { questionCatalog, getQuestionPlan, getAnswerSummary } from './follow-up-questions.js';
export { regions } from './symptom-library.js';

export function createSymptomFlow() {
    let state;
    const emptyDetails = () => Object.fromEntries(followUpQuestions.map(question => [question.id, '']));
    const reset = () => { state = { region: null, symptoms: [], customSymptom: '', description: '', details: emptyDetails(), detailNotes: {}, answerContexts: {}, step: 1, view: 'front' }; };
    const findSymptom = value => regions.find(region => region.id === state.region)?.groups.flatMap(category => category.symptoms).find(symptom => symptom.id === value || symptom.label === value);
    reset();
    return {
        get state() { return structuredClone(state); },
        get questions() { return structuredClone(getQuestionPlan(state)); },
        get answerSummary() { return structuredClone(getAnswerSummary(state)); },
        reset,
        selectRegion(id) {
            if (!regions.some(region => region.id === id)) return false;
            if (state.region !== id) { state.symptoms = []; state.customSymptom = ''; state.details = emptyDetails(); state.detailNotes = {}; state.answerContexts = {}; }
            state.region = id;
            state.step = 1;
            if (id === 'back') state.view = 'back';
            if (['chest', 'abdomen'].includes(id)) state.view = 'front';
            return true;
        },
        selectSymptom(value) {
            const symptom = findSymptom(value);
            if (!symptom) return false;
            if (!state.symptoms.includes(symptom.id)) state.symptoms.push(symptom.id);
            return true;
        },
        toggleSymptom(value) {
            const symptom = findSymptom(value);
            if (!symptom) return false;
            state.symptoms = state.symptoms.includes(symptom.id) ? state.symptoms.filter(id => id !== symptom.id) : [...state.symptoms, symptom.id];
            return true;
        },
        setCustomSymptom(value) { state.customSymptom = String(value).slice(0, 200); },
        setDetail(id, value) {
            if (!Object.hasOwn(questionCatalog, id)) return false;
            const current = getQuestionPlan(state).find(question => question.id === id);
            const question = current || ((state.details[id] || state.detailNotes[id]) ? questionCatalog[id] : undefined);
            if (!question || typeof value !== 'string' || (question.options && value !== '' && !question.options.includes(value))) return false;
            state.details[id] = value.slice(0, question.maxLength || 100);
            if (current) state.answerContexts[id] = [...current.appliesTo];
            return true;
        },
        setDetailNote(id, value) {
            const current = getQuestionPlan(state).find(question => question.id === id);
            if ((!current && !state.details[id] && !state.detailNotes[id]) || typeof value !== 'string' || !Object.hasOwn(questionCatalog, id)) return false;
            state.detailNotes[id] = value.slice(0, 300);
            if (current) state.answerContexts[id] = [...current.appliesTo];
            return true;
        },
        confirmDetail(id) {
            const current = getQuestionPlan(state).find(question => question.id === id);
            if (!current) return false;
            state.answerContexts[id] = [...current.appliesTo];
            return true;
        },
        clearDetail(id) {
            if (!Object.hasOwn(questionCatalog, id)) return false;
            state.details[id] = ''; delete state.detailNotes[id]; delete state.answerContexts[id];
            return true;
        },
        editStep(step) {
            if (![1, 2].includes(step) || !state.region || (!state.symptoms.length && !state.customSymptom.trim())) return false;
            state.step = step; return true;
        },
        setDescription(value) { state.description = String(value).slice(0, 1000); },
        setView(view) { if (['front', 'back'].includes(view)) state.view = view; },
        next() {
            if (!state.region) return 'Choose a body region to continue.';
            if (!state.symptoms.length && !state.customSymptom.trim()) return 'Choose at least one option or describe your own symptom to continue.';
            state.step = Math.min(3, state.step + 1);
            return '';
        },
        back() { state.step = Math.max(1, state.step - 1); }
    };
}
