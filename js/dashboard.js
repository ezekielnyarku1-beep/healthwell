import { authService } from './auth-service.js';
import { authErrorMessage } from './auth-errors.js';
import { createSymptomFlow, regions } from './symptom-flow.js';

export async function setupDashboard(service = authService) {
    const $ = id => document.getElementById(id);
    const flow = createSymptomFlow();
    const description = $('symptom-description');
    const profile = $('profile-menu');
    let unsubscribe;
    let connecting = false;
    let connectionAttempt = 0;
    let activeUserId = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function focusQuestion() {
        const title = $('question-title');
        title.focus({ preventScroll: true });
        const bounds = title.getBoundingClientRect();
        if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
            title.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
        }
    }

    function animatePanel() {
        if (reducedMotion.matches) return;
        const panel = document.querySelector('.question-panel');
        panel.getAnimations().forEach(animation => animation.cancel());
        panel.animate([{ opacity: .65, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
    }

    for (const region of regions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'region-button';
        button.dataset.region = region.id;
        button.textContent = region.label;
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => selectRegion(region.id));
        $('region-list').append(button);
    }

    function showOptions() {
        const state = flow.state;
        const region = regions.find(item => item.id === state.region);
        $('symptom-options').replaceChildren();
        for (const option of region?.options || []) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'symptom-option';
            button.textContent = option;
            button.setAttribute('aria-pressed', String(state.symptom === option));
            button.addEventListener('click', () => {
                flow.selectSymptom(option);
                $('flow-error').textContent = '';
                // Keep the clicked button focused rather than replacing it.
                for (const sibling of $('symptom-options').children) {
                    sibling.setAttribute('aria-pressed', String(sibling === button));
                }
            });
            $('symptom-options').append(button);
        }
    }

    function render({ focus = false, options = false } = {}) {
        const state = flow.state;
        const region = regions.find(item => item.id === state.region);
        for (const button of document.querySelectorAll('[data-region]')) {
            button.setAttribute('aria-pressed', String(button.dataset.region === state.region));
        }
        for (const hit of document.querySelectorAll('[data-body-region]')) {
            hit.setAttribute('aria-pressed', String(hit.dataset.bodyRegion === state.region || state.region === 'general'));
        }
        $('body-front').hidden = state.view !== 'front';
        $('body-back').hidden = state.view !== 'back';
        // Explicit attributes also work in browsers without SVGElement.hidden.
        $('body-front').toggleAttribute('hidden', state.view !== 'front');
        $('body-back').toggleAttribute('hidden', state.view !== 'back');
        for (const button of document.querySelectorAll('[data-view]')) {
            button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
        }
        const onOtherSide = (state.region === 'back' && state.view === 'front') || (['chest', 'abdomen'].includes(state.region) && state.view === 'back');
        $('selection-caption').textContent = region ? `${region.label}${onOtherSide ? ' · highlighted on the other view' : ' selected'}` : 'No area selected yet';
        $('step-label').textContent = `STEP ${state.step} OF 3`;
        $('step-name').textContent = ['Your symptoms', 'Your description', 'Your summary'][state.step - 1];
        document.querySelectorAll('.step-progress span').forEach((element, index) => element.classList.toggle('complete', index < state.step));
        $('question-region').textContent = region?.label || 'Your check-in';
        $('question-title').textContent = state.step === 1 ? (region ? 'What are you experiencing?' : 'Where shall we start?') : state.step === 2 ? 'Anything you’d like to add?' : 'Your check-in, at a glance';
        $('question-intro').textContent = state.step === 1 ? (region ? 'Choose one option. These are interface examples, not medically validated questions.' : 'Choose an area to see a few example options.') : state.step === 2 ? 'A little context, in your own words. This is optional.' : 'Here is what you selected. Nothing has been saved.';
        $('step-one').hidden = state.step !== 1;
        $('step-two').hidden = state.step !== 2;
        $('step-three').hidden = state.step !== 3;
        $('empty-prompt').hidden = Boolean(region);
        $('notes-preview').textContent = state.description.trim() || 'No description added. You can leave this blank.';
        $('review-region').textContent = region?.label || '';
        $('review-symptom').textContent = state.symptom || '';
        $('review-description').textContent = state.description.trim() || 'No description added.';
        $('flow-back').hidden = state.step === 1;
        $('flow-continue').hidden = state.step === 3;
        $('flow-reset').hidden = state.step !== 3;
        $('flow-error').textContent = '';
        if (options) showOptions();
        if (focus) { focusQuestion(); animatePanel(); }
    }

    function selectRegion(id) {
        // Repeated taps keep the existing question and keyboard focus stable.
        if (flow.state.region === id && flow.state.step === 1) {
            if (id === 'back') flow.setView('back');
            if (['chest', 'abdomen'].includes(id)) flow.setView('front');
            render();
            return;
        }
        if (!flow.selectRegion(id)) return;
        render({ options: true });
        animatePanel();
    }

    function clearSymptoms() {
        flow.reset();
        description.value = '';
        render({ options: true });
    }

    document.querySelectorAll('[data-body-region]').forEach(hit => {
        hit.addEventListener('click', () => selectRegion(hit.dataset.bodyRegion));
        hit.addEventListener('keydown', event => {
            if (['Enter', ' '].includes(event.key)) {
                event.preventDefault();
                selectRegion(hit.dataset.bodyRegion);
            }
        });
    });
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
        flow.setView(button.dataset.view);
        render();
    }));
    description.addEventListener('input', () => {
        flow.setDescription(description.value);
        $('notes-preview').textContent = description.value.trim() || 'No description added. You can leave this blank.';
        $('review-description').textContent = description.value.trim() || 'No description added.';
    });
    $('use-description').addEventListener('click', () => {
        flow.setDescription(description.value);
        // No keyword interpretation: a description starts in the general category.
        selectRegion(flow.state.region || 'general');
        focusQuestion();
    });
    $('edit-description').addEventListener('click', () => description.focus());
    $('flow-continue').addEventListener('click', () => {
        const error = flow.next();
        if (error) {
            $('flow-error').textContent = error;
            (flow.state.region ? $('symptom-options').querySelector('button') : $('region-list').querySelector('button')).focus();
            return;
        }
        render({ focus: true });
    });
    $('flow-back').addEventListener('click', () => { flow.back(); render({ focus: true, options: true }); });
    $('flow-reset').addEventListener('click', () => { clearSymptoms(); $('region-list').querySelector('button').focus(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && profile.open) { profile.open = false; profile.querySelector('summary').focus(); } });
    document.addEventListener('click', event => { if (!profile.contains(event.target)) profile.open = false; });
    $('dashboard-logout').addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = 'Logging out…';
        clearSymptoms();
        try {
            await service.logout();
            window.location.replace('login.html');
        } catch (error) {
            $('session-status').hidden = false;
            $('session-message').textContent = authErrorMessage(error);
        } finally {
            button.disabled = false;
            button.textContent = 'Log out';
        }
    });

    function connectionError(error) {
        clearSymptoms();
        $('dashboard-content').hidden = true;
        profile.hidden = true;
        $('session-status').hidden = false;
        $('session-message').textContent = authErrorMessage(error);
        $('session-retry').hidden = false;
        $('session-login').hidden = false;
    }
    async function connect() {
        if (connecting) return;
        connecting = true;
        const attempt = ++connectionAttempt;
        $('session-retry').hidden = true;
        $('session-message').textContent = 'Connecting to your account…';
        unsubscribe?.();
        // A slow SDK connection should not leave a permanent spinner.
        const timeout = window.setTimeout(() => {
            if (attempt !== connectionAttempt) return;
            connectionAttempt++;
            connecting = false;
            connectionError({ code: 'auth/network-request-failed' });
        }, 15000);
        try {
            const stop = await service.observe(user => {
                if (attempt !== connectionAttempt) return;
                clearTimeout(timeout);
                connecting = false;
                if (!user) {
                    clearSymptoms();
                    $('dashboard-content').hidden = true;
                    profile.hidden = true;
                    window.location.replace('login.html');
                    return;
                }
                if (activeUserId !== user.uid) clearSymptoms();
                activeUserId = user.uid;
                const name = user.displayName?.trim() || 'friend';
                $('greeting').textContent = `Hello, ${name}.`;
                $('header-name').textContent = name;
                $('profile-initial').textContent = [...name][0].toUpperCase();
                profile.hidden = false;
                $('session-status').hidden = true;
                $('dashboard-content').hidden = false;
            }, error => {
                if (attempt !== connectionAttempt) return;
                clearTimeout(timeout);
                connecting = false;
                connectionError(error);
            });
            if (attempt === connectionAttempt) unsubscribe = stop;
            else stop();
        } catch (error) {
            if (attempt !== connectionAttempt) return;
            clearTimeout(timeout);
            connecting = false;
            connectionError(error);
        }
    }
    $('session-retry').addEventListener('click', connect);
    window.addEventListener('pagehide', () => {
        connectionAttempt++;
        unsubscribe?.();
        clearSymptoms();
    });
    render({ options: true });
    await connect();
}
