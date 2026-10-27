const messages = {
    unauthorized: 'Please sign in again to use the local backend.', auth_unavailable: 'Account verification is unavailable. No AI request was sent.',
    invalid_request: 'Use fictional examples, a valid region, and a short message.', context_limit: 'This conversation is too long. Start a new fictional conversation.',
    daily_limit: 'The daily demonstration limit has been reached. Please try another day.', rate_limit: 'Please wait one minute before sending another message.',
    monthly_limit: 'The monthly demonstration budget has been reached. No further model requests will be made this month.',
    duplicate_request: 'This message was already submitted. It will not be sent again.', busy: 'A request is already in progress. Please wait.',
    provider_timeout: 'The service took too long. There was no automatic retry.', provider_unavailable: 'The service is unavailable. There was no automatic retry.'
};

export function chatHandler(service) {
    return async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        const send = (status, data) => { response.writeHead(status); response.end(JSON.stringify(data)); };
        const host = request.headers.host || '';
        if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host) || request.headers.origin !== `http://${host}`
            || !['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(request.socket.remoteAddress)) return send(403, { error: 'Local same-origin requests only.' });
        if (request.method !== 'POST') return send(405, { error: 'POST required.' });
        if (request.headers['content-type']?.split(';')[0] !== 'application/json') return send(415, { error: 'JSON required.' });
        if (!request.headers.authorization) return send(401, { error: messages.unauthorized });
        let size = 0, chunks = [];
        try {
            for await (const chunk of request) {
                size += chunk.length;
                if (size > 16384) return send(413, { error: 'Request too large.' });
                chunks.push(chunk);
            }
            let data;
            try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
            catch { return send(400, { error: messages.invalid_request }); }
            chunks = [];
            return send(200, await service(request.headers.authorization, data));
        } catch (error) {
            // Never echo provider errors, tokens, prompts, or stack traces to clients/logs.
            return send(error.status || 503, { error: messages[error.code] || 'The local service is paused. Check its configuration before continuing.' });
        }
    };
}
