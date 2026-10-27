import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { estimatedCost } from './config.mjs';

export const fail = (code, status = 429) => Object.assign(new Error(code), { code, status });
const hash = value => createHash('sha256').update(value).digest('hex');
const empty = () => ({ version: 1, stopped: false, records: [] });

// Single local process only. Exclusive lock rejects a second writer. Never stores prompts/tokens.
export function fileLedger(folder) {
    mkdirSync(folder, { recursive: true });
    const lock = path.join(folder, 'usage.lock');
    const handle = openSync(lock, 'wx');
    const file = path.join(folder, 'usage.json');
    try {
        let initial;
        try { initial = JSON.parse(readFileSync(file, 'utf8')); }
        catch (error) { if (error.code !== 'ENOENT') throw error; initial = empty(); }
        return {
            initial,
            save(state) {
                writeFileSync(file + '.tmp', JSON.stringify(state), { mode: 0o600, flush: true });
                renameSync(file + '.tmp', file);
            },
            close() { closeSync(handle); unlinkSync(lock); }
        };
    } catch (error) { closeSync(handle); unlinkSync(lock); throw error; }
}

export function createBudget(config, storage = { initial: empty(), save() {} }, now = () => Date.now()) {
    let state = structuredClone(storage.initial);
    const validRecord = r => r && /^[a-f0-9]{64}$/.test(r.key) && /^[a-f0-9]{64}$/.test(r.user)
        && [r.time, r.nano, r.input, r.output].every(n => Number.isSafeInteger(n) && n >= 0)
        && typeof r.settled === 'boolean';
    if (state?.version !== 1 || typeof state.stopped !== 'boolean' || !Array.isArray(state.records) || !state.records.every(validRecord)) throw fail('ledger_invalid', 503);
    function commit(next) {
        try { storage.save(next); state = next; }
        catch { state.stopped = true; throw fail('ledger_unavailable', 503); }
    }
    return {
        reserve(uid, requestId) {
            if (state.stopped) throw fail('budget_unavailable', 503);
            const time = now();
            const month = new Date(time).toISOString().slice(0, 7);
            const day = new Date(time).toISOString().slice(0, 10);
            const user = hash(uid), key = hash(uid + ':' + requestId);
            const records = state.records.filter(r => new Date(r.time).toISOString().slice(0, 7) === month);
            if (records.some(r => r.key === key)) throw fail('duplicate_request', 409);
            const daily = records.filter(r => new Date(r.time).toISOString().slice(0, 10) === day);
            if (daily.length >= config.daily || daily.filter(r => r.user === user).length >= config.userDaily) throw fail('daily_limit');
            if (records.filter(r => r.user === user && time - r.time < 60000).length >= config.perMinute) throw fail('rate_limit');
            const nano = estimatedCost(config.maxInput, config.maxOutput, config);
            if (records.reduce((sum, r) => sum + r.nano, 0) + nano > config.monthlyNano) throw fail('monthly_limit');
            // Keep reservations after failure/timeout/restart: provider may have billed the call.
            records.push({ key, user, time, nano, input: 0, output: 0, settled: false });
            commit({ ...state, records });
            return key;
        },
        settle(key, usage) {
            const next = structuredClone(state);
            const record = next.records.find(r => r.key === key);
            if (!record || record.settled) throw fail('ledger_invalid', 503);
            const cost = estimatedCost(usage.input, usage.output, config);
            record.input = usage.input; record.output = usage.output; record.settled = true;
            // Do not refund conservative reservations; record actual usage for audit.
            if (cost > record.nano || usage.input > config.maxInput || usage.output > config.maxOutput) next.stopped = true;
            record.nano = Math.max(record.nano, cost);
            commit(next);
            if (next.stopped) throw fail('usage_exceeded', 503);
        },
        snapshot() { return structuredClone(state); }
    };
}
