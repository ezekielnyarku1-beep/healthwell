// Shared entry point. Each page loads only the controller it needs.
import { setupPasswordToggles, setupNetworkStatus } from './js/ui.js';

setupPasswordToggles();
setupNetworkStatus();

if (document.body.dataset.page === 'dashboard') {
    const { setupDashboard } = await import('./js/dashboard.js');
    await setupDashboard();
} else if (document.body.dataset.page === 'account') {
    const { setupAccountPage } = await import('./js/account-page.js');
    await setupAccountPage();
} else {
    const { setupAuthPage } = await import('./js/auth-page.js');
    await setupAuthPage();
}

// Re-check sessions when returning to a page preserved by the browser.
window.addEventListener('pageshow', event => {
    if (event.persisted) window.location.reload();
});
