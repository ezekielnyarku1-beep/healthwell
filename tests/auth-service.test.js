import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../js/auth-service.js';

function mockService(failures = {}) {
    const calls = [];
    const user = { uid: 'test-only', emailVerified: false };
    const auth = { currentUser: user };
    const sdk = { browserSessionPersistence: 'session', browserLocalPersistence: 'local' };
    class Provider {
        constructor(providerId = 'google.com') { this.providerId = providerId; this.scopes = []; }
        setCustomParameters(parameters) { this.parameters = parameters; }
        addScope(scope) { this.scopes.push(scope); }
    }
    sdk.GoogleAuthProvider = Provider;
    sdk.OAuthProvider = Provider;
    for (const method of ['setPersistence', 'createUserWithEmailAndPassword', 'updateProfile', 'sendEmailVerification', 'signInWithEmailAndPassword', 'sendPasswordResetEmail', 'signOut', 'reload', 'getIdToken', 'signInWithPopup']) {
        sdk[method] = async (...args) => {
            calls.push({ method, args });
            if (failures[method]) throw { code: failures[method] };
            return { user };
        };
    }
    return { service: createAuthService(async () => ({ auth, sdk })), calls, auth, user };
}

test('login sets session persistence first, trims email, and preserves password exactly', async () => {
    const { service, calls } = mockService();
    await service.login({ email: ' ama@example.com ', password: ' password ' });
    assert.deepEqual(calls.map(call => call.method), ['setPersistence', 'signInWithEmailAndPassword']);
    assert.equal(calls[0].args[1], 'session');
    assert.equal(calls[1].args[1], 'ama@example.com');
    assert.equal(calls[1].args[2], ' password ');
});
test('remember me explicitly enables persistent sessions', async () => {
    const { service, calls } = mockService();
    await service.login({ email: 'ama@example.com', password: 'sample-password', remember: true });
    assert.equal(calls[0].args[1], 'local');
});
test('failed persistence prevents credential submission', async () => {
    const { service, calls } = mockService({ setPersistence: 'auth/web-storage-unsupported' });
    await assert.rejects(service.login({ email: 'ama@example.com', password: 'sample-password' }));
    assert.equal(calls.length, 1);
});
test('registration updates the profile and sends verification only after account creation', async () => {
    const { service, calls } = mockService();
    const result = await service.register({ name: ' Ama ', email: 'ama@example.com', password: 'sample-password' });
    assert.deepEqual(calls.map(call => call.method), ['setPersistence', 'createUserWithEmailAndPassword', 'updateProfile', 'sendEmailVerification']);
    assert.deepEqual(calls[2].args[1], { displayName: 'Ama' });
    assert.deepEqual(result.notices, []);
});
test('verification and profile failures preserve successful registration without recreating accounts', async () => {
    const { service, calls } = mockService({ updateProfile: 'auth/network-request-failed', sendEmailVerification: 'auth/network-request-failed' });
    const result = await service.register({ name: 'Ama', email: 'ama@example.com', password: 'sample-password' });
    assert.equal(result.notices.length, 2);
    assert.equal(calls.filter(call => call.method === 'createUserWithEmailAndPassword').length, 1);
});
test('failed account creation does not try profile updates or send email', async () => {
    const { service, calls } = mockService({ createUserWithEmailAndPassword: 'auth/email-already-in-use' });
    await assert.rejects(service.register({ name: 'Ama', email: 'ama@example.com', password: 'sample-password' }));
    assert.deepEqual(calls.map(call => call.method), ['setPersistence', 'createUserWithEmailAndPassword']);
});
test('reset does not reveal an unregistered email but does report connection failures', async () => {
    await mockService({ sendPasswordResetEmail: 'auth/user-not-found' }).service.resetPassword('ama@example.com');
    await assert.rejects(mockService({ sendPasswordResetEmail: 'auth/network-request-failed' }).service.resetPassword('ama@example.com'));
});
test('profile writes require an authenticated user', async () => {
    const { service, auth, calls } = mockService();
    auth.currentUser = null;
    await assert.rejects(service.updateName('Ama'), { code: 'app/not-signed-in' });
    assert.equal(calls.length, 0);
});
test('verified users do not receive another verification email', async () => {
    const { service, user, calls } = mockService();
    user.emailVerified = true;
    await service.sendVerification();
    assert.equal(calls.length, 0);
});
test('verification refresh reloads the user and refreshes the token', async () => {
    const { service, calls } = mockService();
    await service.refreshUser();
    assert.deepEqual(calls.map(call => call.method), ['reload', 'getIdToken']);
    assert.equal(calls[1].args[1], true);
});
test('logout delegates session cleanup to Firebase', async () => {
    const { service, calls } = mockService();
    await service.logout();
    assert.equal(calls[0].method, 'signOut');
});

test('Google popup starts synchronously after preparation without email/password submission', async () => {
    const { service, calls } = mockService();
    const signIn = await service.prepareProviderSignIn();
    assert.deepEqual(calls.map(call => call.method), ['setPersistence']);
    const result = signIn('google');
    assert.equal(calls[1].method, 'signInWithPopup');
    assert.equal(calls[1].args[1].providerId, 'google.com');
    assert.deepEqual(calls[1].args[1].parameters, { prompt: 'select_account' });
    assert.deepEqual(calls[1].args[1].scopes, []);
    assert.equal(calls[0].args[1], 'session');
    await result;
});
test('Google respects remember me', async () => {
    const { service, calls } = mockService();
    const signIn = await service.prepareProviderSignIn({ remember: true });
    await signIn('google');
    assert.equal(calls[0].args[1], 'local');
    assert.equal(calls[1].args[1].providerId, 'google.com');
    assert.deepEqual(calls[1].args[1].scopes, []);
    assert.deepEqual(calls.map(call => call.method), ['setPersistence', 'signInWithPopup']);
});
test('popup errors propagate without retrying or switching accounts automatically', async () => {
    for (const code of ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/account-exists-with-different-credential']) {
        const { service, calls } = mockService({ signInWithPopup: code });
        const signIn = await service.prepareProviderSignIn();
        await assert.rejects(signIn('google'), { code });
        assert.equal(calls.filter(call => call.method === 'signInWithPopup').length, 1);
    }
});
test('failed provider persistence cannot open a sign-in window', async () => {
    const { service, calls } = mockService({ setPersistence: 'auth/web-storage-unsupported' });
    await assert.rejects(service.prepareProviderSignIn());
    assert.deepEqual(calls.map(call => call.method), ['setPersistence']);
});
test('unsupported providers are rejected without invoking OAuth', async () => {
    const { service, calls } = mockService();
    const signIn = await service.prepareProviderSignIn();
    assert.throws(() => signIn('unknown'), { code: 'app/unsupported-provider' });
    assert.throws(() => signIn('apple'), { code: 'app/unsupported-provider' });
    assert.equal(calls.length, 1);
});
