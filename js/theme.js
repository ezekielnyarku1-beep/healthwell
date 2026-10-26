// Run before the stylesheet to avoid a flash of the wrong theme.
(() => {
    const key = 'healthwell-theme';
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    let preference = null;
    try { preference = localStorage.getItem(key); } catch { /* Storage can be blocked. */ }
    if (!['light', 'dark'].includes(preference)) preference = null;

    function apply(theme) {
        document.documentElement.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101f25' : '#f7faf9');
        const button = document.querySelector('[data-theme-toggle]');
        if (button) {
            button.setAttribute('aria-pressed', String(theme === 'dark'));
            button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            button.querySelector('span').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
        }
    }
    apply(preference || (system.matches ? 'dark' : 'light'));
    document.addEventListener('DOMContentLoaded', () => {
        apply(document.documentElement.dataset.theme);
        document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
            preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem(key, preference); } catch { /* Theme still works in memory. */ }
            apply(preference);
        });
    }, { once: true });
    system.addEventListener('change', event => {
        if (!preference) apply(event.matches ? 'dark' : 'light');
    });
    window.addEventListener('storage', event => {
        if (event.key !== key && event.key !== null) return;
        preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
        apply(preference || (system.matches ? 'dark' : 'light'));
    });
})();
