// Small, pure functions: usable by the browser and Node's built-in tests.
export function validateEmail(value) {
    const email = value.trim();
    if (!email) return 'Enter your email address.';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Enter a valid email address, like you@example.com.';
    }
    return '';
}

export function validateName(value) {
    if (!value.trim()) return 'Enter your name.';
    if (value.trim().length > 100) return 'Use 100 characters or fewer.';
    return '';
}

export function validatePassword(value, isSignup = false) {
    // Do not trim or otherwise alter passwords before sending them to Firebase.
    if (!value) return 'Enter your password.';
    if (isSignup && value.length < 8) return 'Use at least 8 characters.';
    if (value.length > 4096) return 'Use a password of 4,096 characters or fewer.';
    return '';
}

export function validateConfirmation(value, password) {
    if (!value) return 'Confirm your password.';
    return value === password ? '' : 'Your passwords don’t match.';
}
