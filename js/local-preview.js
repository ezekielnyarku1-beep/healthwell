// Firebase authorizes localhost for this project. VS Code Live Server may open
// 127.0.0.1 instead, which is a different origin and blocks provider sign-in.
// Run before Firebase loads so all local sessions use one consistent address.
(() => {
    if (!['http:', 'https:'].includes(window.location.protocol)) return;
    if (!['127.0.0.1', '[::1]'].includes(window.location.hostname)) return;
    const localUrl = new URL(window.location.href);
    localUrl.hostname = 'localhost';
    window.location.replace(localUrl.href);
})();
