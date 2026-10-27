import { createDevServer } from './dev-server.mjs';
import { firebaseConfig } from '../config/firebase-config.js';
import { readConfig } from '../server/config.mjs';
import { fileLedger, createBudget } from '../server/budget.mjs';
import { firebaseVerifier } from '../server/auth.mjs';
import { createChatService } from '../server/chat-service.mjs';
import { chatHandler } from '../server/http.mjs';
import { fileURLToPath } from 'node:url';

const config = readConfig();
const storage = fileLedger(fileURLToPath(new URL('../.local-ai/', import.meta.url)));
let server;
try {
    const service = createChatService({ config, budget: createBudget(config, storage), verifyUser: firebaseVerifier(firebaseConfig.projectId) });
    server = createDevServer({ chat: chatHandler(service) });
    server.requestTimeout = 15000;
    server.headersTimeout = 10000;
    server.on('error', () => { console.error('Local server could not start. Check the port.'); storage.close(); process.exitCode = 1; });
    server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`HealthWell local MOCK backend: http://localhost:${server.address().port}. Gemini traffic is disabled.`));
    const stop = () => { server.closeAllConnections(); server.close(() => { storage.close(); process.exit(0); }); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
} catch (error) { storage.close(); throw error; }
