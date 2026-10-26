import { authService } from './auth-service.js';
import { authErrorMessage } from './auth-errors.js';
import { isFirebaseConfigured } from './firebase.js';
import { validateEmail, validateName, validatePassword, validateConfirmation } from './validation.js';
import { setMessage, setBusy } from './ui.js';

export async function setupAuthPage() {
    const mode = document.body.dataset.page;
    const form = document.querySelector('form');
    if (!form) return;
    const fields = [...form.querySelectorAll('input:not([type="checkbox"])')];
    const message = document.getElementById('form-message');
    const status = document.getElementById('service-status');
    const ready = document.getElementById('account-ready');
    const providerSection = document.getElementById('provider-signin');
    const providerButtons = [...document.querySelectorAll('[data-provider]')];
    const providerMessage = document.getElementById('provider-message');
    const providerRetry = document.getElementById('provider-retry');
    const touched = new Set();
    let submitted = false;
    let busy = false;
    let completed = false;
    let startProviderSignIn = null;
    let preparationVersion = 0;

    function updateProviderButtons() {
        providerButtons.forEach(button => {
            button.disabled = busy || completed || !startProviderSignIn;
        });
        if (providerRetry) providerRetry.disabled = busy || completed;
    }

    async function prepareProviders() {
        if (!providerSection || completed) return;
        const version = ++preparationVersion;
        startProviderSignIn = null;
        updateProviderButtons();
        providerRetry.hidden = true;
        setMessage(providerMessage, 'Getting sign-in options ready…');
        try {
            const start = await authService.prepareProviderSignIn({ remember: form.elements.remember.checked });
            if (version !== preparationVersion || completed) return;
            startProviderSignIn = start;
            setMessage(providerMessage, '');
        } catch (error) {
            if (version !== preparationVersion || completed) return;
            setMessage(providerMessage, authErrorMessage(error), 'warning');
            providerRetry.hidden = false;
        } finally {
            if (version === preparationVersion) updateProviderButtons();
        }
    }

    function validate(input) {
        const errors = {
            fullname: () => validateName(input.value),
            email: () => validateEmail(input.value),
            password: () => validatePassword(input.value, mode === 'signup'),
            'confirm-password': () => validateConfirmation(input.value, form.elements.password.value)
        };
        const error = errors[input.id]();
        document.getElementById(`${input.id}-error`).textContent = error;
        input.setAttribute('aria-invalid', String(Boolean(error)));
        return !error;
    }

    function showAccount(text) {
        // Keep feedback outside the form so hiding the form does not hide the message.
        setMessage(status, text, 'success');
        form.reset();
        form.hidden = true;
        if (providerSection) providerSection.hidden = true;
        ready.hidden = false;
        completed = true;
        ready.querySelector('a').focus();
    }

    providerRetry?.addEventListener('click', prepareProviders);
    form.elements.remember?.addEventListener('change', prepareProviders);
    providerButtons.forEach(button => {
        button.addEventListener('click', async () => {
            if (busy || completed || !startProviderSignIn) return;
            if (!navigator.onLine) {
                setMessage(providerMessage, authErrorMessage({ code: 'app/offline' }), 'warning');
                providerMessage.focus();
                return;
            }
            busy = true;
            setBusy(form, true);
            updateProviderButtons();
            providerSection.setAttribute('aria-busy', 'true');
            setMessage(message, '');
            setMessage(status, '');
            setMessage(providerMessage, `Continue in the ${button.dataset.provider === 'google' ? 'Google' : 'Apple'} sign-in window.`);
            try {
                // No await before this call: keep the popup tied to the click.
                await startProviderSignIn(button.dataset.provider);
                form.reset();
                completed = true;
                window.location.assign('index.html');
            } catch (error) {
                setMessage(providerMessage, authErrorMessage(error), error.code === 'auth/popup-closed-by-user' ? 'info' : 'error');
                providerMessage.focus();
            } finally {
                busy = false;
                setBusy(form, false);
                providerSection.setAttribute('aria-busy', 'false');
                updateProviderButtons();
            }
        });
    });

    fields.forEach(input => {
        input.addEventListener('blur', () => {
            touched.add(input.id);
            validate(input);
        });
        input.addEventListener('input', () => {
            if (submitted || touched.has(input.id)) validate(input);
            if (input.id === 'password' && mode === 'signup' && (submitted || touched.has('confirm-password'))) {
                validate(document.getElementById('confirm-password'));
            }
            setMessage(message, '');
        });
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy || completed) return;
        submitted = true;
        setMessage(message, '');
        const results = fields.map(validate);
        if (results.includes(false)) {
            fields[results.indexOf(false)].focus();
            return;
        }
        if (!isFirebaseConfigured()) {
            setMessage(message, authErrorMessage({ code: 'app/not-configured' }), 'warning');
            message.focus();
            return;
        }
        if (!navigator.onLine) {
            setMessage(message, authErrorMessage({ code: 'app/offline' }), 'warning');
            message.focus();
            return;
        }
        const email = form.elements.email.value.trim();
        busy = true;
        setBusy(form, true);
        updateProviderButtons();
        setMessage(status, '');
        try {
            if (mode === 'reset') {
                await authService.resetPassword(email);
                setMessage(message, 'If an account uses this email, you’ll receive a password reset link. Check your inbox and spam folder.', 'success');
            } else {
                const details = {
                    email,
                    password: form.elements.password.value,
                    remember: form.elements.remember.checked
                };
                if (mode === 'signup') {
                    const result = await authService.register({ ...details, name: form.elements.fullname.value });
                    showAccount(result.notices.length
                        ? `Your account is ready. ${result.notices.join(' ')}`
                        : 'Your account is ready. Check your inbox for a verification email.');
                } else {
                    await authService.login(details);
                    form.reset();
                    completed = true;
                    window.location.assign('index.html');
                }
            }
        } catch (error) {
            setMessage(message, authErrorMessage(error), 'error');
            message.focus();
        } finally {
            busy = false;
            setBusy(form, false);
            updateProviderButtons();
        }
    });

    // Validation remains usable if configuration or the network is unavailable.
    form.querySelector('[type="submit"]').disabled = false;
    if (!isFirebaseConfigured()) {
        setMessage(status, 'Preview mode · Account services are not connected. No account details will be sent or saved.', 'warning');
        return;
    }
    try {
        const user = await authService.currentUser();
        // A submit may have started while the SDK was loading; do not overwrite its state.
        if (busy || completed) return;
        setMessage(status, '');
        if (user && mode !== 'reset') showAccount('You’re already signed in on this device.');
    } catch (error) {
        if (!busy && !completed) setMessage(status, authErrorMessage(error), 'warning');
    }
    if (!completed) await prepareProviders();
}
