# Design — Neo-Brutalist Design System

This is the single source of truth for visual design. Every screen is checked against this file, not against taste.

## 1. Core Rules (apply to every element, no exceptions)
- **Border:** `border: 3px solid #0A0A0A; border-radius: 4px;` — 4px is the max radius, ever.
- **Shadow:** `box-shadow: 5px 5px 0 #0A0A0A;` — flat, no blur, no spread, 100% opacity black only.
- No blurred/soft shadows anywhere (`0 4px 12px rgba(...)` is forbidden).
- No gradients as primary backgrounds.
- No soft muted grays (`#eee`, `#f0f0f0`) — every color is intentional and strong.
- State (error/success/disabled) is never color-only — pair with shape or icon change.

## 2. Color Palette
| Role | Color | Hex |
|---|---|---|
| Background | Paper beige | `#FFFEF0` |
| Primary text / borders / shadows | Black | `#0A0A0A` |
| Card surface | White | `#FFFFFF` |
| Accent | Electric Yellow | `#FFE600` |
| Accent | Hot Magenta | `#FF3EA5` |
| Accent | Vivid Cyan | `#00C2CB` |
| Accent | Deep Purple | `#7B2FBE` |
| Accent | Signal Green | `#00C853` |
| Accent | Bright Orange | `#FF6B35` |

Rule: rotate only **2–3 accent colors per page**, max 3. No two adjacent cards share the same accent color.

## 3. Typography
- Font family: Space Grotesk or Inter.
- **Display / H1:** `clamp(40px, 6vw, 72px)`, weight 900, UPPERCASE, letter-spacing `-0.03em`.
- **H2:** `clamp(28px, 4vw, 44px)`, weight 900, UPPERCASE, letter-spacing `-0.03em`.
- **H3:** `clamp(20px, 2.5vw, 28px)`, weight 800, letter-spacing `-0.02em`.
- **Body:** 16–18px, weight 400–500, line-height 1.6, color `#333`.
- **Label/Meta:** 12–13px, weight 700, UPPERCASE, letter-spacing `0.08–0.12em`.
- Display headings must always render UPPERCASE — lowercase breaks the system, including for dynamic content (question titles, usernames at display scale, etc.) unless it's body text.

## 4. Buttons
- Default state: 3px border, `5px 5px 0` offset shadow, `12px 24px` padding, font-weight 700.
- Hover: `transform: translate(2px, 2px); box-shadow: 3px 3px 0 #0A0A0A;`
- Active/pressed: `transform: translate(5px, 5px); box-shadow: 0 0 0 #0A0A0A;`
- **Primary:** yellow (`#FFE600`) background, black text.
- **Dark:** black background, white text.
- **Secondary/outline:** white background, black border/text.
- **Contextual/accent:** any single accent color background per the palette rules above.
- Hover transforms are disabled on touch devices (tap should go straight to active/pressed feedback).

## 5. Cards
- Standard: white background, 3px black border, 4px radius, `5px 5px 0` shadow, 28px padding.
- Hover: `transform: translate(-3px, -3px);` shadow grows to `8px 8px 0 #0A0A0A;` (desktop only).
- Accent cards: pastel or vivid backgrounds from the palette, rotated so no two adjacent cards match.

## 6. Inputs
- 3px solid black border, 4px radius, white background, `12px 16px` padding.
- Focus: `box-shadow: 4px 4px 0 #0A0A0A;`
- Error state: border-color `#FF3EA5`, shadow in `#FF3EA5` — always paired with an inline error message and icon, never color alone.

## 7. Spacing (strict 8pt grid)
`4px` micro · `8px` tight · `12px` grid gaps · `16px` internal · `24px` between components · `32px` sub-sections · `48px` mobile sections · `64px` desktop sections. Never use an odd/off-grid value.

## 8. Layout Components
- **Navbar:** white background, 3px bottom border, sticky, 60px height. Left = logo + brand (UPPERCASE, clickable → home). Center = nav links. Right = "Log in" ghost link + "Sign up" yellow button.
- **Quiz question card:** white, hard border, hard shadow; question text, 4 answer options, submit button.
- **Results section:** final score large and in an accent color; brief session summary; full incorrect-answer list (user's choice, correct choice, explanation, why-wrong reasoning).
- **Progress dashboard:** cumulative score, sessions completed/locked/unlocked, Session 11 (Final Takeover) status.
- **Section tags:** 11px, black background, white text, UPPERCASE, `5px 14px` padding — used to label section purpose (e.g. "SESSION 3", "REVIEW").

## 9. Responsive Behavior
- Grids: 3-column → 2-column → 1-column as viewport shrinks.
- Single-column stack on mobile.
- All display text sizes use `clamp()`.
- Hover effects (translate/shadow changes) are disabled on touch devices; tap feedback uses the active/pressed state instead.

## 10. Forbidden List (fails design review immediately)
- Structural border-radius > 4px.
- Any blurred/soft box-shadow.
- Gradient primary backgrounds.
- Center-aligned body text (hero headings and full-bleed sections are the only exception).
- More than 3 accent colors on one page.
- Soft grays (`#eee`, `#f0f0f0`, etc.).
- Color-only state communication.
