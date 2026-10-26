import { authService } from './auth-service.js';
import { authErrorMessage } from './auth-errors.js';
import { validateName } from './validation.js';
import { setMessage, setBusy } from './ui.js';

export async function setupAccountPage() {
    const content = document.getElementById('account-content');
    const status = document.getElementById('account-status');
    const recovery = document.getElementById('account-recovery');
    const profileForm = document.getElementById('profile-form');
    const profileMessage = document.getElementById('profile-message');
    const verificationMessage = document.getElementById('verification-message');
    const name = document.getElementById('profile-name');
    let busy = false;
    let verificationTimer;

    function render(user) {
        if (!user) {
            content.hidden = true;
            profileForm.reset();
            window.location.replace('login.html');
            return;
        }
        document.getElementById('display-name').textContent = user.displayName || 'friend';
        document.getElementById('account-email').textContent = user.email || '';
        const providers = user.providerData.map(provider => provider.providerId);
        const names = { 'google.com': 'Google', 'apple.com': 'Apple', password: 'Email and password' };
        document.getElementById('signin-methods').textContent = `Sign-in method: ${providers.map(id => names[id] || 'Connected provider').join(', ')}`;
        document.getElementById('password-reset-link').hidden = !providers.includes('password');
        name.value = user.displayName || '';
        document.getElementById('verification-description').textContent = user.emailVerified
            ? 'Your email address is verified.'
            : 'Please verify your email address. Open the verification link in your inbox, then check the status here.';
        document.getElementById('verification-actions').hidden = user.emailVerified;
        content.hidden = false;
        setMessage(status, '');
    }

    async function runAction(button, output, action) {
        if (busy) return;
        busy = true;
        const label = button.textContent;
        button.disabled = true;
        button.textContent = 'Please wait…';
        setMessage(output, '');
        try {
            if (!navigator.onLine) throw { code: 'app/offline' };
            await action();
        } catch (error) {
            setMessage(output, authErrorMessage(error), 'error');
        } finally {
            busy = false;
            button.disabled = false;
            button.textContent = label;
        }
    }

    profileForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy) return;
        const error = validateName(name.value);
        document.getElementById('profile-name-error').textContent = error;
        name.setAttribute('aria-invalid', String(Boolean(error)));
        if (error) { name.focus(); return; }
        const value = name.value;
        const button = profileForm.querySelector('button');
        await runAction(button, profileMessage, async () => {
            setBusy(profileForm, true);
            try {
                const user = await authService.updateName(value);
                render(user);
                setMessage(profileMessage, 'Your name has been updated.', 'success');
            } finally {
                setBusy(profileForm, false);
            }
        });
    });

    document.getElementById('logout-button').addEventListener('click', async event => {
        // Let Firebase attempt logout even when offline; it can clear local sessions.
        if (busy) return;
        busy = true;
        event.currentTarget.disabled = true;
        try {
            await authService.logout();
            content.hidden = true;
            window.location.replace('login.html');
        } catch (error) {
            setMessage(status, authErrorMessage(error), 'error');
        } finally {
            busy = false;
            document.getElementById('logout-button').disabled = false;
        }
    });

    document.getElementById('send-verification').addEventListener('click', async event => {
        const button = event.currentTarget;
        let sent = false;
        await runAction(button, verificationMessage, async () => {
            await authService.sendVerification();
            sent = true;
            setMessage(verificationMessage, 'Verification email sent. Check your inbox and spam folder. You can send another in one minute.', 'success');
        });
        if (sent) {
            button.disabled = true;
            verificationTimer = window.setTimeout(() => { button.disabled = false; }, 60000);
        }
    });

    document.getElementById('refresh-verification').addEventListener('click', async event => {
        await runAction(event.currentTarget, verificationMessage, async () => {
            const user = await authService.refreshUser();
            render(user);
            setMessage(verificationMessage, user.emailVerified
                ? 'Your email is verified. You’re all set.'
                : 'Your email isn’t verified yet. Open the link in your email, then try again.', user.emailVerified ? 'success' : 'info');
        });
    });

    document.getElementById('retry-connection').addEventListener('click', () => window.location.reload());
    try {
        const unsubscribe = await authService.observe(render, error => {
            content.hidden = true;
            recovery.hidden = false;
            setMessage(status, authErrorMessage(error), 'error');
        });
        window.addEventListener('pagehide', event => {
            // Preserve the observer when the page is kept in the back-forward cache.
            if (!event.persisted) { unsubscribe(); clearTimeout(verificationTimer); }
        });
    } catch (error) {
        content.hidden = true;
        recovery.hidden = false;
        setMessage(status, authErrorMessage(error), 'warning');
    }
}
