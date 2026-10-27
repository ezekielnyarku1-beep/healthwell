import { regions, searchSymptoms } from './symptom-library.js';
import { setupFollowUps } from './follow-up-ui.js';

export function setupSymptomPicker(flow, onEdit) {
    const $ = id => document.getElementById(id);
    let activeRegion = null;
    const expanded = new Map();
    const followUps = setupFollowUps(flow, onEdit);
    const allSymptoms = () => regions.find(region => region.id === flow.state.region)?.groups.flatMap(group => group.symptoms) || [];

    function updateSelection() {
        const state = flow.state, symptoms = allSymptoms();
        const chosen = symptoms.filter(symptom => state.symptoms.includes(symptom.id));
        $('symptom-selection-count').textContent = `${chosen.length} selected${state.customSymptom.trim() ? ' + your description' : ''}`;
        for (const button of $('symptom-options').querySelectorAll('[data-symptom]')) {
            button.setAttribute('aria-pressed', String(state.symptoms.includes(button.dataset.symptom)));
        }
        for (const summary of $('symptom-options').querySelectorAll('[data-category]')) {
            const category = regions.find(region => region.id === state.region).groups.find(item => item.id === summary.dataset.category);
            const selected = category.symptoms.filter(symptom => state.symptoms.includes(symptom.id)).length;
            summary.querySelector('.category-count').textContent = selected ? `${selected} selected · ${category.symptoms.length} examples` : `${category.symptoms.length} examples`;
        }
        $('selected-symptoms').replaceChildren();
        for (const symptom of chosen) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'selected-symptom';
            button.textContent = `${symptom.label} ×`; button.setAttribute('aria-label', `Remove ${symptom.label}`);
            button.addEventListener('click', () => {
                const index = [...$('selected-symptoms').children].indexOf(button);
                flow.toggleSymptom(symptom.id); updateSelection();
                ($('selected-symptoms').children[index] || $('selected-symptoms').lastElementChild || $('symptom-search')).focus();
            });
            $('selected-symptoms').append(button);
        }
        $('selected-symptoms').hidden = !chosen.length;
    }

    function showOptions() {
        const region = regions.find(item => item.id === flow.state.region);
        const query = $('symptom-search').value;
        const groups = searchSymptoms(region?.id, query);
        $('symptom-options').replaceChildren();
        const count = groups.reduce((total, group) => total + group.symptoms.length, 0);
        $('symptom-search-status').textContent = region ? (query.trim() ? `${count} matching ${count === 1 ? 'example' : 'examples'} in ${region.label}.` : `${region.options.length} examples in ${region.label}. Open a group to explore.`) : '';
        $('symptom-no-results').hidden = !region || count > 0;
        $('symptom-search-clear').hidden = !query;
        for (const category of groups) {
            const details = document.createElement('details'); details.className = 'symptom-category';
            const key = `${region.id}:${category.id}`;
            details.open = query.trim() ? true : (expanded.get(key) ?? region.groups[0].id === category.id);
            details.addEventListener('toggle', () => { if (!query.trim() && details.isConnected) expanded.set(key, details.open); });
            const summary = document.createElement('summary'); summary.dataset.category = category.id;
            const title = document.createElement('span'); title.textContent = category.label;
            const meta = document.createElement('small'); meta.className = 'category-count'; summary.append(title, meta);
            const choices = document.createElement('div'); choices.className = 'category-choices';
            for (const symptom of category.symptoms) {
                const button = document.createElement('button'); button.type = 'button'; button.className = 'symptom-option'; button.dataset.symptom = symptom.id;
                button.setAttribute('aria-pressed', String(flow.state.symptoms.includes(symptom.id)));
                const label = document.createElement('span'); label.textContent = symptom.label; button.append(label);
                if (symptom.reviewRequired) {
                    const marker = document.createElement('small'); marker.className = 'symptom-review-marker'; marker.textContent = 'Clinical review';
                    button.append(marker); button.setAttribute('aria-describedby', 'symptom-review-note');
                }
                button.addEventListener('click', () => { flow.toggleSymptom(symptom.id); $('flow-error').textContent = ''; updateSelection(); });
                choices.append(button);
            }
            details.append(summary, choices); $('symptom-options').append(details);
        }
        updateSelection();
    }

    $('symptom-search').addEventListener('input', showOptions);
    $('symptom-search-clear').addEventListener('click', () => { $('symptom-search').value = ''; showOptions(); $('symptom-search').focus(); });
    $('custom-symptom').addEventListener('input', () => { flow.setCustomSymptom($('custom-symptom').value); $('flow-error').textContent = ''; updateSelection(); });

    return {
        render() {
            const state = flow.state;
            if (activeRegion !== state.region || !state.region) {
                activeRegion = state.region; $('symptom-search').value = '';
                $('custom-symptom-panel').open = false; $('follow-up-panel').open = false;
            }
            if (!state.region) expanded.clear();
            $('symptom-picker').hidden = !state.region;
            $('custom-symptom').value = state.customSymptom;
            if (state.customSymptom.trim()) $('custom-symptom-panel').open = true;
            showOptions();
        },
        renderQuestions: followUps.render,
        renderSummary() {
            const state = flow.state;
            $('review-symptom').replaceChildren();
            const labels = allSymptoms().filter(symptom => state.symptoms.includes(symptom.id)).map(symptom => symptom.label);
            if (state.customSymptom.trim()) labels.push(`Your own description: ${state.customSymptom.trim()}`);
            for (const label of labels) { const item = document.createElement('li'); item.textContent = label; $('review-symptom').append(item); }
            followUps.renderSummary();
        }
    };
}
