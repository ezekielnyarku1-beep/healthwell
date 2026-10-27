export function setupFollowUps(flow, onEdit) {
    const $ = id => document.getElementById(id);
    let currentId = 'onset', region = null;

    function allEntries() {
        const active = flow.questions;
        const earlier = flow.answerSummary.filter(answer => !answer.active).map(answer => ({ ...answer.question, section: 'Earlier answer', appliesTo: answer.context, earlier: true }));
        return [...active, ...earlier];
    }
    function focusInput() { $(`detail-${currentId}`)?.focus({ preventScroll: false }); }
    function jump(id, focus = true) { currentId = id; $('follow-up-panel').open = true; render(); if (focus) focusInput(); }

    function updateCount() {
        const active = new Set(flow.questions.map(q => q.id));
        const count = flow.answerSummary.filter(answer => active.has(answer.question.id)).length;
        $('follow-up-count').textContent = `${count} of ${active.size} answered · All optional`;
    }
    function updateReviewNote(id) {
        const answer = flow.answerSummary.find(item => item.question.id === id);
        $('answer-review-note').hidden = !answer?.review;
        $('answer-context-note').hidden = !answer?.contextChanged;
        $('answer-context-original').textContent = answer?.context.join(', ') || 'No earlier symptom context recorded';
    }

    function render() {
        if (region !== flow.state.region || !flow.state.region) { region = flow.state.region; currentId = 'onset'; }
        const entries = allEntries();
        if (!entries.some(q => q.id === currentId)) currentId = entries[0]?.id || 'onset';
        const index = entries.findIndex(q => q.id === currentId), question = entries[index];
        $('follow-up-jump').replaceChildren();
        for (const entry of entries) {
            const option = document.createElement('option'); option.value = entry.id;
            option.textContent = `${entry.earlier ? 'Earlier answer: ' : ''}${entry.label}`;
            $('follow-up-jump').append(option);
        }
        $('follow-up-jump').value = currentId;
        $('follow-up-controls').hidden = !question;
        $('follow-up-fields').replaceChildren();
        updateCount();
        if (!question) { $('follow-up-progress').textContent = 'Choose symptoms to see optional questions.'; $('answer-review-note').hidden = true; $('answer-context-note').hidden = true; return; }
        $('follow-up-progress').textContent = `Question ${index + 1} of ${entries.length} · ${question.section}`;
        $('follow-up-context').textContent = question.earlier ? 'This earlier answer is retained for accuracy. It is not part of the current question path.' : `About: ${question.appliesTo.join(', ')}${question.id === 'onset' ? '. If symptoms started at different times, add a note below.' : ''}`;
        const label = document.createElement('label'); label.htmlFor = `detail-${question.id}`; label.textContent = question.label;
        const input = document.createElement(question.options ? 'select' : 'textarea'); input.id = label.htmlFor;
        input.setAttribute('aria-describedby', 'follow-up-context');
        if (question.options) {
            for (const value of ['', ...question.options]) {
                const option = document.createElement('option'); option.value = value; option.textContent = value || 'Leave unanswered'; input.append(option);
            }
        } else {
            input.rows = 3; input.maxLength = question.maxLength; input.placeholder = question.placeholder || 'Add a short detail, if you wish'; input.autocomplete = 'off'; input.spellcheck = false;
            input.setAttribute('data-gramm', 'false'); input.setAttribute('data-enable-grammarly', 'false');
        }
        input.value = flow.state.details[question.id] || '';
        input.addEventListener(question.options ? 'change' : 'input', () => {
            flow.setDetail(question.id, input.value);
            // Only choices affect branches. Re-render those after saving, then restore focus.
            if (question.options) { render(); focusInput(); }
            else { updateCount(); updateReviewNote(question.id); }
        });
        const notePanel = document.createElement('details'); notePanel.className = 'answer-note';
        notePanel.open = Boolean(flow.state.detailNotes[question.id]);
        const noteSummary = document.createElement('summary'); noteSummary.textContent = 'Add a detail or explain differences (optional)';
        const noteLabel = document.createElement('label'); noteLabel.htmlFor = `note-${question.id}`; noteLabel.textContent = 'Your note about this answer';
        const note = document.createElement('textarea'); note.id = noteLabel.htmlFor; note.rows = 2; note.maxLength = 300; note.autocomplete = 'off'; note.spellcheck = false;
        note.setAttribute('data-gramm', 'false'); note.setAttribute('data-enable-grammarly', 'false');
        note.value = flow.state.detailNotes[question.id] || '';
        note.addEventListener('input', () => { flow.setDetailNote(question.id, note.value); updateCount(); updateReviewNote(question.id); });
        notePanel.append(noteSummary, noteLabel, note);
        $('follow-up-fields').append(label, input, notePanel);
        $('follow-up-previous').disabled = index <= 0;
        $('follow-up-next').textContent = index === entries.length - 1 ? 'Review summary' : 'Next question';
        $('follow-up-skip').hidden = Boolean(question.earlier);
        updateReviewNote(question.id);
    }

    $('follow-up-jump').addEventListener('change', event => jump(event.target.value));
    $('follow-up-previous').addEventListener('click', () => { const entries = allEntries(); const index = entries.findIndex(q => q.id === currentId); if (index > 0) jump(entries[index - 1].id); });
    function advance() {
        const entries = allEntries(), index = entries.findIndex(q => q.id === currentId);
        if (index < entries.length - 1) jump(entries[index + 1].id);
        else $('flow-continue').click();
    }
    $('follow-up-next').addEventListener('click', advance);
    $('follow-up-skip').addEventListener('click', advance); // Skipping never erases a saved answer.
    $('follow-up-clear').addEventListener('click', () => { flow.clearDetail(currentId); render(); focusInput(); });
    $('answer-context-confirm').addEventListener('click', () => { flow.confirmDetail(currentId); render(); focusInput(); });

    function renderSummary() {
        const answers = flow.answerSummary;
        $('review-details').replaceChildren(); $('review-earlier-details').replaceChildren();
        $('review-flag-list').replaceChildren();
        for (const answer of answers) {
            const { question, value, note, active, context, contextChanged, review } = answer;
            const term = document.createElement('dt'); term.textContent = question.label;
            const definition = document.createElement('dd');
            const response = document.createElement('p'); response.textContent = value || 'No option selected'; definition.append(response);
            if (note) { const extra = document.createElement('p'); extra.textContent = `Your note: ${note}`; definition.append(extra); }
            const scope = document.createElement('small'); scope.className = 'answer-scope'; scope.textContent = `Answered for: ${context.join(', ') || 'No symptom context recorded'}${contextChanged ? '. Selections have changed; this answer has not been reconfirmed.' : ''}`;
            definition.append(scope);
            const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'text-button'; edit.textContent = 'Edit answer'; edit.setAttribute('aria-label', `Edit answer: ${question.label}`);
            edit.addEventListener('click', () => { flow.editStep(2); onEdit(); jump(question.id); }); definition.append(edit);
            (active ? $('review-details') : $('review-earlier-details')).append(term, definition);
            if (review) {
                const item = document.createElement('li'); item.textContent = `${question.label} — ${value}${active ? '' : ' (earlier answer; not in the current question path)'}`; $('review-flag-list').append(item);
            }
        }
        $('review-details-empty').hidden = answers.some(answer => answer.active);
        $('review-earlier-section').hidden = !answers.some(answer => !answer.active);
        $('review-answer-flags').hidden = !$('review-flag-list').children.length;
        const count = flow.questions.filter(question => !answers.some(answer => answer.question.id === question.id)).length;
        $('review-unanswered').textContent = count ? `${count} optional ${count === 1 ? 'question was' : 'questions were'} left unanswered.` : 'All current optional questions have an answer or note.';
    }
    return { render, renderSummary };
}
