import { firebaseConfig } from '../config/firebase-config.js';

export function isFirebaseConfigured(config = firebaseConfig) {
    return Boolean(config && ['apiKey', 'authDomain', 'projectId', 'appId'].every(
        key => typeof config[key] === 'string' && config[key].trim().length > 0
    ));
}

let connection;

export function getFirebase() {
    if (!isFirebaseConfigured()) {
        return Promise.reject(Object.assign(new Error('Missing web app configuration'), { code: 'app/not-configured' }));
    }
    if (!connection) {
        connection = initialize().catch(error => {
            connection = undefined; // A failed load can be retried without reloading the page.
            throw error;
        });
    }
    return connection;
}

async function initialize() {
    let appSDK;
    let sdk;
    try {
        // Pinned official modular SDK; load only App and Authentication for this stage.
        [appSDK, sdk] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')
        ]);
    } catch {
        throw Object.assign(new Error('SDK load failed'), { code: 'app/sdk-unavailable' });
    }
    const app = appSDK.getApps().length ? appSDK.getApp() : appSDK.initializeApp(firebaseConfig);
    const auth = sdk.getAuth(app);
    auth.languageCode = 'en';
    await auth.authStateReady();
    return { auth, sdk };
}
