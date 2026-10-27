export function readConfig(env = process.env) {
    function number(name, fallback, min, max) {
        const value = env[name] === undefined ? fallback : Number(env[name]);
        if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
        return value;
    }
    if (env.HEALTHWELL_AI_MODE && env.HEALTHWELL_AI_MODE !== 'mock') {
        throw new Error('Live AI is locked pending budget, provider terms, privacy and clinical review. Use mock mode.');
    }
    const model = env.HEALTHWELL_AI_MODEL || 'gemini-2.5-flash-lite';
    // No silent model fallback or reuse of another model's prices.
    const prices = { 'gemini-2.5-flash-lite': { input: 100, output: 400 } }; // nanodollars/token
    if (!prices[model]) throw new Error('Model requires a reviewed price configuration.');
    const integer = (name, fallback, min, max) => {
        const result = number(name, fallback, min, max);
        if (!Number.isInteger(result)) throw new Error(`Invalid ${name}`);
        return result;
    };
    return Object.freeze({
        mode: 'mock', model, prices: prices[model],
        monthlyNano: Math.floor(number('HEALTHWELL_MONTHLY_USD', 0.30, 0, 0.30) * 1e9),
        daily: integer('HEALTHWELL_DAILY_REQUESTS', 20, 1, 20),
        userDaily: integer('HEALTHWELL_USER_DAILY_REQUESTS', 10, 1, 10),
        perMinute: 2, maxInput: 2048, maxOutput: 256, maxMessages: 8,
        timeoutMs: 8000, margin: 1.25
    });
}

export function estimatedCost(input, output, config) {
    if (![input, output].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('Invalid usage');
    return Math.ceil((input * config.prices.input + output * config.prices.output) * config.margin);
}
