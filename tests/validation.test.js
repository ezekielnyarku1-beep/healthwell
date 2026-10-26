import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, validateName, validatePassword, validateConfirmation } from '../js/validation.js';
import { authErrorMessage } from '../js/auth-errors.js';
import { isFirebaseConfigured } from '../js/firebase.js';

test('names support international characters and single names', () => {
    for (const name of ['Ama', 'João Mensah', '李明', '  Abena Owusu  ']) assert.equal(validateName(name), '');
    assert.notEqual(validateName('   '), '');
    assert.notEqual(validateName('a'.repeat(101)), '');
});
test('email validation catches malformed input and permits plus addressing', () => {
    for (const email of ['', '   ', 'bad', 'a@@b.com', 'a b@c.com', 'a@b']) assert.notEqual(validateEmail(email), '');
    assert.equal(validateEmail('  ama+health@example.org  '), '');
});
test('signup password rules do not lock out existing users with shorter passwords', () => {
    assert.notEqual(validatePassword('short', true), '');
    assert.equal(validatePassword('short', false), '');
    assert.equal(validatePassword('long password with spaces', true), '');
    assert.notEqual(validatePassword('', false), '');
});
test('confirmation compares the exact password, including whitespace', () => {
    assert.equal(validateConfirmation(' pass word ', ' pass word '), '');
    assert.notEqual(validateConfirmation('pass word', ' pass word '), '');
    assert.notEqual(validateConfirmation('', ''), '');
});
test('configuration requires the actual mandatory web fields', () => {
    assert.equal(isFirebaseConfigured(null), false);
    assert.equal(isFirebaseConfigured({}), false);
    assert.equal(isFirebaseConfigured({ apiKey: '', authDomain: 'x', projectId: 'x', appId: 'x' }), false);
});
test('login messages do not distinguish unknown email from wrong password', () => {
    assert.equal(authErrorMessage({ code: 'auth/user-not-found' }), authErrorMessage({ code: 'auth/wrong-password' }));
});
test('unknown errors never disclose raw SDK messages', () => {
    const message = authErrorMessage({ code: 'unexpected', message: 'sensitive internal information' });
    assert.equal(message.includes('sensitive'), false);
});

test('provider failures give specific recovery instructions without raw details', () => {
    assert.match(authErrorMessage({ code: 'auth/popup-blocked' }), /Allow pop-ups/);
    assert.match(authErrorMessage({ code: 'auth/popup-closed-by-user' }), /cancelled/);
    assert.match(authErrorMessage({ code: 'auth/account-exists-with-different-credential' }), /originally used/);
    assert.match(authErrorMessage({ code: 'auth/operation-not-allowed' }), /sign-in method/);
});
