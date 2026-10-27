import { regions } from '../js/symptom-flow.js';
import { checkEmergency, emergencyText, warningSigns, safetyVersion } from '../js/conversation.js';
import { fail } from './budget.mjs';
import { inputEstimate, mockProvider } from './providers.mjs';

export function validateRequest(data, config) {
    const allowed = ['requestId', 'fictional', 'region', 'symptoms', 'messages', 'warningSigns'];
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(k => !allowed.includes(k))
        || data.fictional !== true || typeof data.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(data.requestId)
        || !regions.some(r => r.id === data.region)
        || !Array.isArray(data.symptoms) || data.symptoms.length > 6
        || !data.symptoms.every(s => typeof s === 'string' && s.trim() && s.length <= 80)
        || !Array.isArray(data.warningSigns) || data.warningSigns.length > 5
        || !data.warningSigns.every(s => warningSigns.some(([id]) => id === s))
        || !Array.isArray(data.messages) || !data.messages.length || data.messages.length > config.maxMessages
        || !data.messages.every(m => m && Object.keys(m).length === 2 && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string' && m.text.trim() && m.text.length <= 1000)
        || data.messages.at(-1)?.role !== 'user') throw fail('invalid_request', 400);
    return data;
}

export function createChatService({ config, budget, verifyUser, provider = mockProvider }) {
    let inFlight = false;
    return async (authorization, body) => {
        const uid = await verifyUser(authorization);
        const request = validateRequest(body, config);
        // Local draft rules take priority even when budget/provider is unavailable.
        if (checkEmergency(request)) return { text: emergencyText, emergency: true, suggestions: [], mode: 'mock', safetyVersion };
        if (inputEstimate(request, config) > config.maxInput) throw fail('context_limit', 413);
        if (inFlight) throw fail('busy', 429);
        inFlight = true;
        try {
            const reservation = budget.reserve(uid, request.requestId);
            let timer;
            const result = await Promise.race([
                Promise.resolve().then(() => provider(request)),
                new Promise((_, reject) => { timer = setTimeout(() => reject(fail('provider_timeout', 504)), config.timeoutMs * 2 + 100); })
            ]).finally(() => clearTimeout(timer));
            budget.settle(reservation, result.usage);
            return { text: result.text, suggestions: result.suggestions || [], emergency: false, mode: 'mock', usageSource: result.usageSource, safetyVersion };
        } catch (error) {
            if (error.status) throw error;
            throw fail('provider_unavailable', 503);
        } finally { inFlight = false; }
    };
}
