import { createPublicKey, verify } from 'node:crypto';
import { fail } from './budget.mjs';

// Google's documented JWT verification path; no service-account credential needed locally.
// Validates signature and claims, but does not check revoked/disabled accounts (launch gate).
export function firebaseVerifier(projectId, fetcher = fetch, now = () => Date.now()) {
    let certificates = {}, expires = 0, pending;
    async function keys() {
        if (now() < expires) return certificates;
        if (!pending) pending = (async () => {
            const response = await fetcher('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', { signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw fail('auth_unavailable', 503);
            certificates = await response.json();
            const age = Math.min(3600, Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 60));
            expires = now() + age * 1000;
            return certificates;
        })().finally(() => { pending = undefined; });
        return pending;
    }
    return async authorization => {
        try {
            if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization) || authorization.length > 8192) throw fail('unauthorized', 401);
            const parts = authorization.slice(7).split('.');
            if (parts.length !== 3) throw fail('unauthorized', 401);
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const seconds = Math.floor(now() / 1000);
            if (header.alg !== 'RS256' || typeof header.kid !== 'string'
                || claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`
                || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128
                || ![claims.exp, claims.iat, claims.auth_time].every(Number.isInteger)
                || claims.exp <= seconds || claims.iat > seconds || claims.auth_time > seconds) throw fail('unauthorized', 401);
            const certs = await keys();
            if (!Object.hasOwn(certs, header.kid)) throw fail('unauthorized', 401);
            if (!verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), createPublicKey(certs[header.kid]), Buffer.from(parts[2], 'base64url'))) throw fail('unauthorized', 401);
            return claims.sub;
        } catch (error) {
            if (error.code === 'auth_unavailable') throw error;
            throw fail('unauthorized', 401);
        }
    };
}
