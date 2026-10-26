import { getFirebase } from './firebase.js';

// The loader parameter lets tests exercise our behavior without real accounts.
export function createAuthService(load = getFirebase) {
    async function setPersistence(auth, sdk, remember) {
        await sdk.setPersistence(auth, remember ? sdk.browserLocalPersistence : sdk.browserSessionPersistence);
    }

    function requireUser(auth) {
        if (!auth.currentUser) {
            throw Object.assign(new Error('No authenticated user'), { code: 'app/not-signed-in' });
        }
        return auth.currentUser;
    }

    return {
        async currentUser() {
            const { auth } = await load();
            return auth.currentUser;
        },
        async observe(callback, onError) {
            const { auth, sdk } = await load();
            return sdk.onAuthStateChanged(auth, callback, onError);
        },
        async register({ name, email, password, remember = false }) {
            const { auth, sdk } = await load();
            await setPersistence(auth, sdk, remember);
            const { user } = await sdk.createUserWithEmailAndPassword(auth, email.trim(), password);
            const notices = [];
            // Account creation has succeeded. Later failures must not ask the user to register again.
            try {
                await sdk.updateProfile(user, { displayName: name.trim() });
            } catch {
                notices.push('Your account was created, but your name wasn’t saved. You can update it in your account.');
            }
            try {
                await sdk.sendEmailVerification(user);
            } catch {
                notices.push('Your verification email couldn’t be sent. You can send it again from your account.');
            }
            return { user, notices };
        },
        async login({ email, password, remember = false }) {
            const { auth, sdk } = await load();
            await setPersistence(auth, sdk, remember);
            return sdk.signInWithEmailAndPassword(auth, email.trim(), password);
        },
        async prepareProviderSignIn({ remember = false } = {}) {
            const { auth, sdk } = await load();
            await setPersistence(auth, sdk, remember);
            // Prepare before the click so the popup opens directly from a user gesture.
            // Firebase handles OAuth credentials and creates new accounts when needed.
            return providerName => {
                let provider;
                if (providerName === 'google') {
                    provider = new sdk.GoogleAuthProvider();
                    provider.setCustomParameters({ prompt: 'select_account' });
                } else {
                    throw Object.assign(new Error('Unsupported sign-in method'), { code: 'app/unsupported-provider' });
                }
                // No provider access tokens are extracted, logged, or stored by the app.
                return sdk.signInWithPopup(auth, provider);
            };
        },
        async resetPassword(email) {
            const { auth, sdk } = await load();
            try {
                await sdk.sendPasswordResetEmail(auth, email.trim());
            } catch (error) {
                // Give the same response for unknown and registered addresses.
                if (error.code !== 'auth/user-not-found') throw error;
            }
        },
        async logout() {
            const { auth, sdk } = await load();
            await sdk.signOut(auth);
        },
        async updateName(name) {
            const { auth, sdk } = await load();
            await sdk.updateProfile(requireUser(auth), { displayName: name.trim() });
            return auth.currentUser;
        },
        async sendVerification() {
            const { auth, sdk } = await load();
            const user = requireUser(auth);
            if (!user.emailVerified) await sdk.sendEmailVerification(user);
        },
        async refreshUser() {
            const { auth, sdk } = await load();
            const user = requireUser(auth);
            await sdk.reload(user);
            await sdk.getIdToken(user, true);
            return auth.currentUser;
        }
    };
}

export const authService = createAuthService();
