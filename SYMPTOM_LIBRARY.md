# Body check-in symptom library

The body check-in uses a descriptive library in `js/symptom-library.js`. The existing SVG, front/back views, nine regions, Firebase authentication, themes, and three-step flow remain in place. No backend or AI-provider configuration is changed by this feature.

## Content and maintenance

Each region has 21–24 plain-language examples arranged in four or five groups. Left and right arms share one content definition; left and right legs share another. The active region preserves which side was selected. This is a broad example library, not an exhaustive medical questionnaire.

Each example defines a stable slug identifier, a visible label, optional search aliases, and a `reviewRequired` editorial flag. Keep identifiers stable if labels change. Groups define their own identifier and label. The flat `options` list is generated from groups for existing consumers; do not maintain a second copy in HTML. The separate fictional chat uses the explicitly configured compact `chatOptions` list so the expanded check-in does not create an overwhelming chat chip list.

Examples can be added through `example(label, aliases)` or `review(label, aliases)`. Review any new content for plain language, region relevance, duplication, and emergency-related wording. Search covers labels, aliases and group names within the active region, ignores case and punctuation, and requires all typed words to match. For example, “pins needles” finds “Tingling,” “fatigue” finds “Feeling tired,” and “nausea” finds “Feeling sick.”

## Interaction

- The first group opens initially. Other groups expand with native keyboard-accessible disclosure controls. Search temporarily opens matching groups; clearing it restores browsing state.
- Any number of listed examples can be selected. Selected entries remain visible above results, including when search hides the corresponding options. Choose a selected chip to remove it.
- A custom description, up to 200 characters, can be used alone or with examples. Search has an empty state pointing to this option.
- Step two combines six general prompts with configurable symptom-specific questions, presented one at a time. Shared prompts are deduplicated, optional answers can reveal descriptive detail questions, and every answer is editable from the summary. See [FOLLOW_UPS.md](FOLLOW_UPS.md) for the question configuration and data-preservation rules. No answer is required and no numerical scale or score is computed.
- Step three lists all selected symptoms, the custom description, optional answers, and the existing general notes. Text is rendered literally, never as HTML.
- Answers that no longer belong to the current question path are retained as clearly labeled earlier answers. Original symptom context and per-answer notes remain editable; a changed symptom combination requires confirmation before an old answer is attributed to it.
- Back navigation, front/back body views, and repeated selection of the same region retain entries. Changing regions clears region-specific selections, custom text, search, and optional answers; general notes remain editable. Starting again clears everything.

## Privacy and clinical boundaries

Check-in selections, custom descriptions, search terms and follow-up answers live only in browser memory. They are not copied into the separate chat, submitted to a backend, logged, or written to browser storage. The selected body region still updates the separate chat's region, as before. Restart, logout, account change and page exit clear check-in state and rendered fields. Firebase account sessions and the existing theme preference retain their existing behavior.

“Clinical review” markers identify examples that may overlap with emergency warning signs. They are static editorial metadata, never triage categories or risk ratings. They do not trigger emergency inference, alter questions, assign urgency, make a diagnosis, or invoke the separate chat's safety engine. Unmarked examples are not a claim of safety. The prominent general emergency-care notice remains available before authentication and throughout the check-in.

Qualified clinical review is required before presenting this as a clinically validated questionnaire. Review the whole library and optional prompts, especially sudden severe head/belly pain, speech/vision changes, breathing/chest symptoms, numbness/weakness, fainting/confusion, and changes in bladder/bowel control. Review markers are not an exhaustive list of clinical concerns and should not be used for decisions about care.

Reference material checked for editorial context: [NHS symptom index](https://www.nhs.uk/symptoms/), [NHS chest pain](https://www.nhs.uk/symptoms/chest-pain/), and [NHS stroke symptoms](https://www.nhs.uk/conditions/stroke/symptoms/). These references do not constitute qualified clinical review of this implementation.

## Validation

`npm run check`, `npm test`, `npm run test:browser`, and `npm run build` validate syntax, links, library structure, state transitions, search aliases, multiple selection, custom-only completion, optional fields, literal rendering, privacy, reset behavior, and deployment assets. Browser coverage includes all nine regions, both body views, keyboard controls and populated pickers at 320, 390, 768, 1024 and 1440 pixels, with automated light/dark accessibility checks. These tests use fictional examples and mocked authentication; they do not establish clinical validity or replace testing with assistive-technology users.
