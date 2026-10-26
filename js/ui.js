export function setMessage(element, text, kind = 'info') {
    element.textContent = text;
    element.dataset.kind = kind;
    element.hidden = !text;
}

export function setBusy(form, busy) {
    form.setAttribute('aria-busy', String(busy));
    form.querySelectorAll('input, button').forEach(control => { control.disabled = busy; });
    const button = form.querySelector('[type="submit"]');
    if (button) {
        button.dataset.label ||= button.textContent.trim();
        button.textContent = busy ? 'Please wait…' : button.dataset.label;
    }
}

export function setupPasswordToggles() {
    document.querySelectorAll('[data-toggle]').forEach(button => {
        button.addEventListener('click', () => {
            const input = document.getElementById(button.dataset.toggle);
            const visible = input.type === 'password';
            input.type = visible ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(visible));
            button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${input.id === 'confirm-password' ? 'confirm password' : 'password'}`);
        });
    });
}

export function setupNetworkStatus() {
    const status = document.getElementById('network-status');
    if (!status) return;
    function update() {
        setMessage(status, navigator.onLine ? '' : 'You’re offline. Account actions need an internet connection.', 'warning');
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
}
