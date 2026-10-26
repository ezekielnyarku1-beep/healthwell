// Prototype state is deliberately memory-only. No clinical inference or persistence.
export const regions = [
    { id: 'head', label: 'Head and neck', options: ['Headache', 'Dizziness', 'Eye discomfort', 'Ear discomfort', 'Something else'] },
    { id: 'chest', label: 'Chest', options: ['Discomfort', 'Tenderness', 'Something else'] },
    { id: 'abdomen', label: 'Abdomen', options: ['Discomfort', 'Bloating', 'Something else'] },
    { id: 'back', label: 'Back', options: ['Discomfort', 'Stiffness', 'Something else'] },
    { id: 'left-arm', label: 'Left arm', options: ['Discomfort', 'Stiffness', 'Something else'] },
    { id: 'right-arm', label: 'Right arm', options: ['Discomfort', 'Stiffness', 'Something else'] },
    { id: 'left-leg', label: 'Left leg', options: ['Discomfort', 'Stiffness', 'Something else'] },
    { id: 'right-leg', label: 'Right leg', options: ['Discomfort', 'Stiffness', 'Something else'] },
    { id: 'general', label: 'Whole body / general', options: ['Feeling tired', 'Feeling unwell', 'Something else'] }
];

export function createSymptomFlow() {
    let state;
    const reset = () => { state = { region: null, symptom: null, description: '', step: 1, view: 'front' }; };
    reset();
    return {
        get state() { return { ...state }; },
        reset,
        selectRegion(id) {
            if (!regions.some(region => region.id === id)) return false;
            if (state.region !== id) state.symptom = null;
            state.region = id;
            state.step = 1;
            if (id === 'back') state.view = 'back';
            if (['chest', 'abdomen'].includes(id)) state.view = 'front';
            return true;
        },
        selectSymptom(value) {
            if (!regions.find(region => region.id === state.region)?.options.includes(value)) return false;
            state.symptom = value;
            return true;
        },
        setDescription(value) { state.description = String(value).slice(0, 1000); },
        setView(view) { if (['front', 'back'].includes(view)) state.view = view; },
        next() {
            if (!state.region) return 'Choose a body region to continue.';
            if (!state.symptom) return 'Choose an option to continue.';
            state.step = Math.min(3, state.step + 1);
            return '';
        },
        back() { state.step = Math.max(1, state.step - 1); }
    };
}
