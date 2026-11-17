# Q01 visual hierarchy and semantic colors

Baseline: `f7e00acdb9423fb212486931a0cb354e227e41ec`

## Implemented

- Added action, information, success, warning, error, and neutral foreground/background tokens. Existing `green`, `mint`, `orange`, `orangeLight`, `blue`, and `red` names remain available as compatibility aliases.
- Added caption, compact, body, large body, heading, and title sizes, plus reusable heading/body/caption text styles. Existing `type.title` and `type.label` remain available.
- Shared `Notice` supports info, warning, error, and neutral tones with a distinct icon. `StatusPill` pairs each of passing, excluded, and unknown with a text label, icon, and semantic color.
- Existing assessment decisions and labels are unchanged. `ResultCard.StatusBadge` already renders “Checks pass,” “Excluded,” or “Needs more evidence” as text beside a marker, so color is not its only distinction.

## Examples

These are implementation examples, not captured app screenshots:

| Mode       | Text example                                                      | Shared control example                                                       |
| ---------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Normal     | `type.body` at 14 px, 21 px line height; `type.heading` at 20 px  | `Notice` info or warning with icon and readable text                         |
| Compact    | `textScale.compact` at 12 px                                      | `StatusPill` with icon and label; spacing starts at 4/8/12 px                |
| Large text | `Text` and `TextInput` retain React Native's default font scaling | Button, field, notice and status text scale with system/browser font scaling |

## Contrast check

Calculated WCAG relative-luminance contrast ratios from the defined hex colors (foreground against the listed background):

| Pair                               |   Ratio |
| ---------------------------------- | ------: |
| Ink `#101828` / paper `#F4F6F9`    | 16.39:1 |
| Muted `#667085` / paper `#F4F6F9`  |  4.59:1 |
| Action `#1765D1` / white           |  5.50:1 |
| Success `#16704A` / white          |  6.09:1 |
| Warning `#A15C00` / white          |  5.19:1 |
| Error `#B42335` / white            |  6.50:1 |
| Neutral `#475467` / white          |  7.69:1 |
| Action / information on light tint |  4.97:1 |
| Success on light tint              |  5.45:1 |
| Warning on light tint              |  4.78:1 |
| Error on light tint                |  5.73:1 |
| Neutral on light tint              |  6.85:1 |

Ratios were computed from sRGB hex values with the WCAG relative-luminance formula. This is a token-level check; it does not cover every screen composition or disabled/pressed state.

## Before/after captures and mounted inspection

The worker's initial local server attempt was unavailable. Subsequent integrator captures at 390×844 and 1280×900 are in `.artifacts/quality-run/`, compared with the baseline setup/settings inspection from the planning pass. The Q02 mounted follow-up also exercised these shared primitives at actual Chromium tab zoom 2 (effective 640×450 CSS px), retained before/after captures and measured hit targets. See [Q02 evidence](quality-q02.md). The tables above remain implementation examples, not screenshots. Spoken screen-reader and native-device evidence remain separate Q38 gates.

## Verification

- `npm run typecheck` (from `apps/mobile`): passed (`tsc --noEmit`).
- No assessment status mapping, safety calculation, or source/evidence logic was changed.
