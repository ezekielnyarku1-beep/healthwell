// Shared prototype behavior. Draft rules are NOT clinically reviewed or exhaustive.
export const safetyVersion = 'draft-2026-10-27';
export const emergencyText = 'If these warning signs describe you or someone else now or recently, call your local emergency number immediately. Do not wait for this chat or drive yourself. This prototype cannot assess an emergency.';
export const warningSigns = [
    ['sudden-headache', 'Sudden, extremely severe headache'],
    ['chest-breathing', 'Chest pain with difficulty breathing'],
    ['stroke-signs', 'New face drooping, arm weakness or speech difficulty'],
    ['severe-breathing', 'Severe difficulty breathing'],
    ['unconscious', 'Unconscious or not responding']
];

export function checkEmergency({ messages = [], symptoms = [], warningSigns: flags = [] }) {
    if (flags.length) return true;
    // Deliberately conservative: negated/quoted/historical mentions can also trigger.
    // Never interpret absence of a match as reassurance or permission to delay care.
    const text = [...messages.filter(m => m.role === 'user').map(m => m.text), ...symptoms].join(' ').toLowerCase();
    return /(?:sudden|worst|thunderclap).{0,45}(?:headache|head pain)|(?:headache|head pain).{0,45}(?:sudden|worst|extremely severe)|(?:face|facial).{0,20}droop|slurred speech|(?:one[- ]sided|arm).{0,20}weakness|(?:severe|struggling|gasping|cannot|can't).{0,25}(?:breath|breathe)|unconscious|not responding|lost consciousness|passed out/.test(text)
        || (/chest.{0,20}(?:pain|pressure|tight)/.test(text) && /breath|breathe/.test(text));
}

export function simulatedReply(request) {
    if (checkEmergency(request)) return { text: emergencyText, emergency: true, suggestions: [] };
    const users = request.messages.filter(m => m.role === 'user');
    const last = users.at(-1)?.text || '';
    if (/diagnos|prescri|dosage|dose|probability|percent|ignore.{0,20}(?:rule|instruction)/i.test(last)) {
        return { text: 'I cannot diagnose, prescribe medication, or estimate disease probabilities. A qualified healthcare professional can assess your concerns. This is a scripted demonstration.', suggestions: [] };
    }
    if (/actually|correction|not sure|earlier i said/i.test(last)) return { text: 'Thank you for clarifying. Which details should I correct in this conversation?', suggestions: [] };
    const subject = request.symptoms.length ? request.symptoms.join(' and ').toLowerCase() : 'what you are experiencing';
    if (users.length <= 1) return { text: `I'm sorry you're dealing with ${subject}. When did it start?`, suggestions: ['Today', 'A few days ago', 'I am not sure'] };
    if (users.length === 2) return { text: 'Thank you. Has it changed since it started, and is anything else bothering you?', suggestions: ['It has changed', 'About the same', 'Something else'] };
    return { text: 'Symptoms can have many causes, and this demonstration cannot identify the cause or decide how urgently you need care. A qualified healthcare professional can assess symptoms that persist, worsen, or concern you. What would you like to clarify?', suggestions: [] };
}

export function newConversation() {
    return { region: 'general', symptoms: [], messages: [], warningSigns: [], emergency: false };
}
