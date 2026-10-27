import { newConversation, simulatedReply, checkEmergency, emergencyText, warningSigns } from './conversation.js';
import { regions } from './symptom-flow.js';

export function setupChat(service) {
    const $ = id => document.getElementById(id);
    let state = newConversation(), busy = false, epoch = 0, controller;
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    $('chat-local-settings').hidden = !local;

    function bubble(role, text) {
        const item = document.createElement('div');
        item.className = `chat-message chat-${role}`;
        const label = document.createElement('strong');
        label.textContent = role === 'user' ? 'You' : 'HealthWell · simulated';
        const content = document.createElement('p'); content.textContent = text;
        item.append(label, content); $('chat-history').append(item);
    }
    function suggestions(values = []) {
        $('chat-suggestions').replaceChildren();
        for (const value of values) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-chip'; button.textContent = value;
            button.addEventListener('click', () => { $('chat-input').value = value; $('chat-input').focus(); });
            $('chat-suggestions').append(button);
        }
    }
    function updateChips() {
        const region = regions.find(r => r.id === state.region);
        $('chat-region').textContent = region.label;
        $('chat-symptoms').replaceChildren();
        // Keep this separate fictional chat compact; check-in entries are never copied here.
        for (const symptom of [...region.chatOptions, 'Something else']) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-chip'; button.textContent = symptom;
            button.setAttribute('aria-label', `Include ${symptom} in conversation`);
            button.setAttribute('aria-pressed', String(state.symptoms.includes(symptom)));
            button.disabled = busy;
            button.addEventListener('click', () => {
                state.symptoms = state.symptoms.includes(symptom) ? state.symptoms.filter(s => s !== symptom) : [...state.symptoms, symptom];
                updateChips();
            });
            $('chat-symptoms').append(button);
        }
    }
    function setBusy(value) {
        busy = value; $('chat-send').disabled = value; $('chat-input').disabled = value;
        $('chat-typing').hidden = !value;
        updateChips();
    }
    function reset(region = 'general') {
        epoch++; controller?.abort(); state = newConversation(); state.region = region;
        $('chat-history').replaceChildren(); $('chat-input').value = ''; $('chat-error').textContent = '';
        $('chat-emergency').hidden = true;
        $('chat-warnings').querySelectorAll('input').forEach(input => { input.checked = false; });
        suggestions(); setBusy(false);
        bubble('assistant', 'Hello. How are you feeling? Try a fictional example, choose one or more symptoms, or use the body diagram. This is a scripted prototype, not a medical assessment.');
    }
    function showEmergency() {
        state.emergency = true; $('chat-emergency').hidden = false; $('chat-emergency').textContent = emergencyText;
        suggestions();
    }
    for (const [id, text] of warningSigns) {
        const label = document.createElement('label'), input = document.createElement('input');
        input.type = 'checkbox'; input.value = id;
        input.addEventListener('change', () => {
            state.warningSigns = [...$('chat-warnings').querySelectorAll('input:checked')].map(i => i.value);
            if (state.warningSigns.length) { epoch++; controller?.abort(); setBusy(false); showEmergency(); }
        });
        label.append(input, document.createTextNode(text)); $('chat-warnings').append(label);
    }
    $('chat-new').addEventListener('click', () => { reset(); $('chat-input').focus(); });
    $('chat-backend').addEventListener('change', () => reset(state.region));
    $('chat-fictional').addEventListener('change', () => { if (!$('chat-fictional').checked) reset(); });
    $('chat-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (busy) return;
        const text = $('chat-input').value.trim();
        $('chat-error').textContent = '';
        if (!$('chat-fictional').checked) { $('chat-error').textContent = 'Confirm that this conversation contains fictional information only.'; return; }
        if (!text) { $('chat-error').textContent = 'Type a short message to continue.'; return; }
        if (text.length > 1000) { $('chat-error').textContent = 'Please keep your message under 1,000 characters.'; return; }
        // Keep every turn until the limit, rather than silently dropping safety context.
        if (state.messages.length >= 8) { $('chat-error').textContent = 'This short demonstration has reached its conversation limit. Start a new conversation.'; return; }
        state.messages.push({ role: 'user', text }); bubble('user', text); $('chat-input').value = '';
        const request = { requestId: crypto.randomUUID(), fictional: true, region: state.region, symptoms: [...state.symptoms], messages: [...state.messages], warningSigns: [...state.warningSigns] };
        if (state.emergency || checkEmergency(request)) {
            showEmergency(); bubble('assistant', emergencyText); state.messages.push({ role: 'assistant', text: emergencyText }); return;
        }
        const attempt = ++epoch; controller = new AbortController(); setBusy(true); suggestions();
        let timer;
        try {
            let result;
            if (local && $('chat-backend').checked) {
                timer = setTimeout(() => controller.abort(), 20000);
                const user = await service.currentUser();
                if (attempt !== epoch) return;
                if (!user?.getIdToken) throw new Error('Please sign in with Firebase to test the local backend.');
                const token = await user.getIdToken();
                if (attempt !== epoch) return;
                const response = await fetch('/api/chat', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(request), signal: controller.signal, cache: 'no-store', credentials: 'omit'
                });
                if (attempt !== epoch) return;
                if (response.status === 404 || response.status === 405) throw new Error('Start the local backend with npm run start:ai, then try a new message.');
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'The local backend is unavailable.');
                result = data;
            } else {
                await new Promise(resolve => setTimeout(resolve, 300));
                result = simulatedReply(request);
            }
            if (attempt !== epoch) return;
            if (typeof result.text !== 'string' || result.text.length > 2000) throw new Error('The response was invalid.');
            if (result.emergency) showEmergency();
            state.messages.push({ role: 'assistant', text: result.text }); bubble('assistant', result.text);
            suggestions(result.suggestions?.filter(v => typeof v === 'string' && v.length < 100).slice(0, 3));
        } catch (error) {
            if (attempt !== epoch) return;
            $('chat-error').textContent = error.name === 'AbortError' ? 'The request timed out. No automatic retry was made.' : error.message;
            // Keep failed message visible and in context; never silently resend it.
        } finally {
            clearTimeout(timer);
            if (attempt === epoch) { setBusy(false); $('chat-input').focus({ preventScroll: true }); }
        }
    });
    reset();
    return {
        clear() { reset(); $('chat-fictional').checked = false; $('chat-backend').checked = false; },
        setRegion(region) { if (region !== state.region) reset(region); },
        addSymptom(symptom) { if (!state.symptoms.includes(symptom)) state.symptoms.push(symptom); updateChips(); },
        setDraft(text) { $('chat-input').value = text.slice(0, 1000); }
    };
}
