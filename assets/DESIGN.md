# Design System Specification: The Studio Perspective

## 1. Creative North Star: "The Gallery of Precision"

Meridian is a sophisticated, invisible craftsman. This system rejects "hacker" tropes and cyberpunk aggression in favor of a high-end design studio aesthetic—minimalist, centered, and refined.

**Key Principles:**

- **Centered Authority:** Core messaging and hero elements are centered to create a balanced, global feel.
- **Human-Centric Tech:** Use Sentence Case for headers to feel approachable. Mono font is a secondary tool, not a personality.
- **Sophisticated Softness:** A consistent 8px radius replaces the industrial 0px edge, aligning with Linear/Framer standards.

---

## 2. Colors & Surface Logic

- **Master Background:** `#05070A` (Deep Obsidian).
- **Primary Accent:** `#1D5EFF` (Signal Blue). Used for functional triggers and small status indicators.
- **Surface:** Transparent containers defined by `1px solid #1E293B` (Subtle Slate) borders. No background color blocks between sections.
- **Shadows:** Use sharp, high-opacity black shadows (`0 10px 30px -10px rgba(0,0,0,1)`) to create elevation without "glow."

---

## 3. Typography: The Interface Voice

- **Headlines (Inter Tight):** 600 weight. Sentence case only. Tracking: -0.03em.
- **UI Labels & Navigation (Manrope):** 500 weight. Used for all buttons, nav links, and metadata. This replaces the previous monospaced labels.
- **Technical Data (JetBrains Mono):** Reserved strictly for terminal output, code snippets, and raw JSON data.

| Level              | Font           | Weight | Case          |
| :----------------- | :------------- | :----- | :------------ |
| **Hero Heading**   | Inter Tight    | 600    | Sentence      |
| **Section Header** | Inter Tight    | 600    | Sentence      |
| **UI / Buttons**   | Manrope        | 500    | Sentence/Caps |
| **Code Snippets**  | JetBrains Mono | 400    | N/A           |

---

## 4. Layout & Structure

- **Global Flow:** One continuous obsidian canvas. No alternating background colors.
- **Hero:** Entirely centered stack. No background dots or patterns.
- **The Masonry Gallery:** A Pinterest-style grid used for visualizing tool outputs (CSS diffs, JSON files). Use staggered heights to break the "standard grid" feel.
- **Whitespace:** High vertical padding (120px+) to emphasize the "Gallery" feel.

---

## 5. Components

- **Buttons:** `8px` border radius. Primary button is solid `#1D5EFF`.
- **The Terminal:** Deep black (#000) with `8px` radius. Minimal chrome—no traffic lights, just the code.

---

## 6. Do’s and Don’ts

- **Do:** Use sentence case for a welcoming, professional tone.
- **Do:** Keep the background a pure, solid #05070A.
- **Don't:** Use JetBrains Mono for anything other than actual code.

## 7. Motion & Animation (GSAP Specifications)

**The Motion DNA: "High-Frequency Precision"**
Animations must feel mechanical and intentional. Avoid "bouncy" or "playful" easing. Use `power4.out` or custom spring eases.

- **Page Load (The Unveil):**

  - Hero text should "slide up" from a 10px offset with an opacity fade (Duration: 0.8s, Ease: power4.out).
  - Terminal elements type in at a realistic "variable" speed (not a steady rhythm).

- **Scroll Triggers (The Reveal):**

  - **The Horizontal Filmstrip:** As the user scrolls vertically, the feature row should move on the X-axis using `scrub: true`.
  - **Masonry Stagger:** Cards in the Pinterest grid should fade in and scale from 0.95 to 1.0 as they enter the viewport, staggered by 0.1s.

- **Micro-Interactions:**
  - **Border Trace:** On hover of a feature card, the 1px #1E293B border should "trace" itself in #1D5EFF blue (use GSAP `drawSVG` or a CSS stroke-dashoffset transition).
  - **Terminal Cursor:** A constant 1Hz blink on the blue `_` character.
