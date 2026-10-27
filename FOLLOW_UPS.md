# Configurable symptom follow-ups

The body check-in now uses a local, deterministic question engine. It does not call an AI model, backend, analytics service, or storage API. The original 199 symptom examples, nine body regions, body diagram, authentication, themes, and three-step check-in remain available.

## Configuration

`js/follow-up-questions.js` contains 45 question definitions and 21 symptom profiles. It builds on the six general prompts in `js/symptom-library.js`. Profiles list explicit symptom IDs and optional region restrictions; custom free text is never interpreted to infer symptoms. Unmapped examples and custom descriptions receive the general questions plus a free-text prompt about what brings them on or changes them.

The general prompts cover onset, duration, frequency, impact on usual activities, precise location and associated symptoms. Tailored prompts cover pain quality/intensity/spread; dizziness and position changes; numbness, weakness and vision changes; movement/stiffness; swelling; breathing/cough; heartbeat sensations; digestive/bowel/bladder changes; tiredness/sleep; temperature; skin; ears; nose; and throat.

Question IDs are stable keys for answers. A profile references a question ID, not a copy of the question. Shared questions merge their symptom context and appear once for combinations. Explicit `unlessAny` lists suppress questions that repeat an already-selected symptom. For example, selecting sensitivity to light alongside headache removes the question asking whether light bothers the user. Selecting vomiting removes the question asking whether vomiting is happening.

`when: { id, equals }` reveals a detail only when its parent is present in the current question path and has the specified answer. No free-text matching, diagnoses, disease predictions, numerical severity scales, risk scores or care recommendations are used. Example branches include where pain spreads after a Yes answer, a temperature reading after the user says they measured it, and sleep details after a reported sleep change.

Choice questions include **Prefer not to answer**. Yes/No questions also include **Not sure**. These explicit responses are saved verbatim and never treated as No. Every question is optional. Text entries retain their existing bounded lengths, and each answer supports an additional 300-character note to explain differences between symptoms.

## Interaction and editing

Step two presents one question at a time inside the optional question panel. The progress label, Previous/Next buttons, Skip for now, and a labeled question selector let users navigate at their own pace. Continue can open the final summary at any time. Skip moves forward without deleting an existing answer; Clear this answer and note is a separate explicit action.

The summary preserves selected symptoms, the custom symptom description, general notes, answered questions, Prefer not to answer responses, and per-answer notes. Each answer has an Edit button that returns directly to its question with focus on the input. Edit symptoms and Edit description controls remain available.

Changing a parent answer or removing a symptom does not silently delete an earlier answer. It is kept in an **Earlier answers** section with its original symptom context, and can still be edited or cleared. Restoring the relevant selection/condition restores that answer to the active path. The current question selector includes saved earlier answers with a clear label.

An answer records the exact selected symptom labels it referred to. If the current question's context later changes, the interface shows the original scope and offers explicit confirmation before attributing the saved answer to the new symptom combination. The summary identifies answers that have not been reconfirmed. Notes can distinguish symptoms with different timing, duration or other characteristics.

The existing region-change behavior is retained: choosing a different body region starts a new region-specific selection and clears its answers/notes, while keeping the general description. Starting a new check-in, logging out, changing accounts or leaving the page clears all check-in state and rendered question/summary fields. No health text is copied into the separate fictional chat.

## Clinical-review metadata

Some explicit answer choices have a `reviewAnswers` list. A match adds an editorial **future qualified clinical review** note beside the answer and in the summary. These are draft content-review markers, not urgency classifications. They never change navigation, invoke chat emergency logic, assign risk, or generate medical instructions. Earlier marked answers remain clearly labeled as earlier answers. Editing or clearing an answer updates its marker.

The prominent, general emergency-care guidance remains visible. An unmarked answer is not a statement of safety. Qualified clinical review is needed for all prompts and branches before describing the questionnaire as clinically validated, particularly sudden changes, fainting, difficulty speaking while breathing, blood-related questions and difficulty keeping drinks down. The prototype does not establish clinical accuracy or completeness.

Official reference pages consulted for wording and editorial context: [NHS dizziness](https://www.nhs.uk/symptoms/dizziness/), [NHS headaches](https://www.nhs.uk/symptoms/headaches/), and [NHS shortness of breath](https://www.nhs.uk/symptoms/shortness-of-breath/). Consulting these sources is not qualified clinical review.

## Files and verification

- `js/follow-up-questions.js`: question catalog, profile matching, deduplication, conditions, answer summaries and review metadata.
- `js/follow-up-ui.js`: progressive question navigation, notes, focus management and editable summary.
- `js/symptom-flow.js`: bounded in-memory answers, notes, context, confirmation and reset.
- `js/symptom-picker.js`, `js/dashboard.js`, `index.html`, `dashboard.css`: integration into the existing check-in.
- `tests/follow-ups.test.js`: configuration coverage, combinations, conditional branches, earlier answers, context changes, preferences, review metadata and state integrity.
- `browser-tests/follow-ups.spec.js`: navigation/editing, branch preservation, privacy, literal rendering, review markers, keyboard controls and light/dark accessibility at mobile/tablet/desktop widths.
- `browser-tests/symptom-library.spec.js`: updated regression tests for progressive question navigation.

Run `npm run check`, `npm test`, `npm run test:browser`, and `npm run build`. Tests use fictional information and mocked authentication. The external Firebase SDK connectivity test remains opt-in as documented in `LOCAL_AI.md`; automated accessibility checks do not replace assistive-technology user testing.
