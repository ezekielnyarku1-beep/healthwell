export function authErrorMessage(error) {
    const messages = {
        'app/not-configured': 'Account services are not connected yet. You can explore the form, but no details will be sent or saved.',
        'app/sdk-unavailable': 'We couldn’t load account services. Check your connection, then try again.',
        'app/offline': 'You’re offline. Reconnect to use your account.',
        'app/not-signed-in': 'Your session has ended. Please log in again.',
        'app/unsupported-provider': 'That sign-in method isn’t available. Choose Google, Apple, or email.',
        'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site, then select Google or Apple again.',
        'auth/popup-closed-by-user': 'Sign-in was cancelled. You can try again or use another sign-in method.',
        'auth/cancelled-popup-request': 'Another sign-in window was opened. Finish there, or try again.',
        'auth/account-exists-with-different-credential': 'This email uses another sign-in method. Please use the method you originally used for this account.',
        'auth/invalid-oauth-client-id': 'This sign-in provider needs a configuration update. Please use another method for now.',
        'auth/operation-not-supported-in-this-environment': 'This browser can’t open provider sign-in. Try a standard browser window or use email and password.',
        'auth/invalid-email': 'Check your email address and try again.',
        'auth/invalid-credential': 'We couldn’t log you in. Check your email and password, or reset your password.',
        'auth/invalid-login-credentials': 'We couldn’t log you in. Check your email and password, or reset your password.',
        'auth/user-not-found': 'We couldn’t log you in. Check your email and password, or reset your password.',
        'auth/wrong-password': 'We couldn’t log you in. Check your email and password, or reset your password.',
        'auth/email-already-in-use': 'We couldn’t create an account with those details. Try logging in or resetting your password.',
        'auth/weak-password': 'Choose a stronger password that meets the requirements.',
        'auth/password-does-not-meet-requirements': 'Your password doesn’t meet the account requirements. Try a longer password with uppercase and lowercase letters, a number, and a symbol.',
        'auth/too-many-requests': 'Too many attempts. Please wait a little before trying again.',
        'auth/network-request-failed': 'We couldn’t connect. Check your connection and try again.',
        'auth/user-disabled': 'We couldn’t log you in. Please contact the app administrator.',
        'auth/operation-not-allowed': 'This sign-in method isn’t enabled yet. Please use another method or try again later.',
        'auth/unauthorized-domain': 'Account services aren’t available on this website address yet.',
        'auth/invalid-api-key': 'Account services need a configuration update. Please try again later.',
        'auth/app-not-authorized': 'Account services aren’t available on this website address yet.',
        'auth/web-storage-unsupported': 'Your browser is blocking session storage. Allow site storage to log in.',
        'auth/requires-recent-login': 'Please log out and log in again before making this change.'
    };
    // Never show raw SDK messages, which can include internal details.
    return messages[error?.code] || 'Something went wrong. Please try again.';
}
