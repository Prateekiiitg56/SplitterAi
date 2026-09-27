DESIGN GUIDE (every web deliverable must meet this; the verifier checks it in a real browser)

Visual direction
- Pick one clear direction that fits the product (e.g. calm and minimal, bold and editorial, playful) and apply it consistently. It must look like a finished, modern product, never like unstyled HTML or a tutorial demo.
- Use the design tokens for every color, radius, shadow and font. One accent color for primary actions and highlights; neutrals for everything else. Text contrast at least 4.5:1 (3:1 for large text).
- Typography: at most two font families. Clear hierarchy with a type scale (e.g. 14/16/20/28/40px), tight letter-spacing on large headings, line-height 1.5 for body text, max ~70 characters per line.
- Spacing on a 4/8px grid. Generous whitespace; group related things, separate unrelated things. Align everything to a grid; no ragged edges.
- Depth with subtle borders and soft shadows, not heavy outlines. Rounded corners from the tokens.

Layout
- Mobile first. Must work from 360px to 1440px wide with no horizontal scrolling. Use flex/grid, never fixed pixel widths for page sections.
- Center focused tools (calculator, form, card) on the page with a comfortable max width. Landing pages: hero, clear sections, footer.
- Keypads, galleries and dashboards use CSS grid with consistent gaps. Buttons that belong to one grid have one size unless a key spans cells on purpose (e.g. "0" or "=").

Interaction
- Every interactive element has hover, active (pressed), focus-visible and disabled styles. Focus rings must be visible.
- Transitions of 150-250ms on color, background, transform and shadow. Small press feedback (e.g. scale 0.97). Respect prefers-reduced-motion.
- Keyboard: everything works with the keyboard. Tools with an obvious keyboard mapping support it (calculator: digits, operators, Enter/=, Backspace, Escape).
- Handle edge cases visibly: empty states, invalid input, errors (e.g. divide by zero shows an error state, never "Infinity" or "NaN"), long values (truncate or scale text, never overflow the container).
- Give immediate feedback for every action (state change, toast, highlight). No dead buttons: every visible control does something.

Content and accessibility
- Real, specific content for the product. No lorem ipsum, "Item 1", TODO or placeholder images. Icons as inline SVG.
- Semantic HTML: header/main/section/footer, button for actions, labels for inputs, alt text for images, aria-label for icon-only buttons, aria-live for values that update (a calculator display).
- The page title and favicon-free head are fine; do not load external images or fonts that may fail. System font stack or one Google Font via <link> is allowed.

Before you finish
- Open the page with browser_check: no console errors, no failed requests, every main interaction works, and the screenshot looks polished at desktop and mobile width.
