# Rules — Build Standards

These are non-negotiable rules for anyone (human or AI coding assistant) working on this codebase. If a change violates one of these, it doesn't ship.

## 1. Design System Compliance (hard rule)
Every UI element, with no exceptions, must follow `design.md`:
- `border: 3px solid #0A0A0A; border-radius: 4px;` (never more than 4px radius, never less than 3px border).
- `box-shadow: 5px 5px 0 #0A0A0A;` — flat offset shadow only. **No blur, no spread, no rgba softness.** `box-shadow: 0 4px 12px rgba(0,0,0,0.1)` is forbidden anywhere in the codebase.
- No border-radius > 4px on structural elements (cards, buttons, inputs, nav).
- No gradients as primary backgrounds.
- No soft/muted grays (`#eee`, `#f0f0f0`, etc.) — every color used must come from the defined palette in `design.md`.
- Max 3 accent colors visible on any single page.
- State (error/success/disabled) must never be color-only — always pair with a shape or icon change too.
- Display/H1/H2 text must be UPPERCASE — no exceptions, even for dynamic/user-generated titles rendered at that scale.
- Spacing must come from the 8pt grid (4/8/12/16/24/32/48/64px) — no arbitrary values like `10px` or `18px` margin/padding.

## 2. Code Organization
- TypeScript everywhere; no implicit `any`.
- One component per file; component files match the component name.
- Shared design tokens (colors, spacing, shadow, border) live in a single CSS-variables file — components reference tokens, never hardcode hex/px values inline.
- API routes validate all input server-side, regardless of client-side validation.
- No business logic in React components beyond UI state — scoring, session-locking, and question-selection logic live in server/lib functions, unit-testable in isolation.

## 3. Data Integrity Rules
- Never store a generated question with fewer/more than 4 options, or with `correct_index` outside 0–3.
- Never let a session's `question_ids` snapshot change after the attempt has started — a session in progress must always serve the same 50/100 questions it started with.
- Session N+1 must be provably locked server-side (checked in the API route, not just hidden in the UI) until session N is completed.

## 4. Accessibility & Responsiveness
- All interactive elements (buttons, nav links, quiz options) must be reachable and operable via keyboard.
- Hover-only effects (translate/shadow-shrink) must be disabled on touch devices — never rely on hover to reveal required information.
- All images have `alt` text; all form inputs have associated labels.
- Every clickable element (logo, phone number, email address — see Phase 6 checklist) must be a real functioning link/action, never dead markup.

## 5. Error & Empty States
- Every async action (upload, extraction, generation, submit) has a defined loading state, success state, and error state — no silent failures.
- Error messages are specific and actionable (e.g. "This PDF appears to be a scanned image with no readable text — try a clearer photo" rather than "Error").
- No placeholder/lorem-ipsum text ships to production — see Phase 6 QA checklist.

## 6. Git / Change Hygiene
- Small, reviewable commits scoped to one phase item at a time (see `phases.md`).
- No feature outside the MVP scope defined in `prd.md` gets built without an explicit scope-change decision.
- Any deviation from `architecture.md`'s stack assumption must be called out and this doc set updated to match.

## 7. Definition of Done (per feature)
A feature is not "done" until:
1. It matches `design.md` visually.
2. It matches the functional spec in `prd.md`.
3. It has a loading, success, and error state.
4. It works on mobile, tablet, and desktop.
5. It's covered by the relevant Phase 6 QA item if applicable.
