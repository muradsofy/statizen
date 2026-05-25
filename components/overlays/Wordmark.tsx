/**
 * Brand wordmark in the top-left. Clicking it returns the user to the
 * default home state — a regular `<a href="/">` triggers a full nav
 * so the URL params (selected region, indicator, year, theme) clear
 * out and `useUrlSync` re-hydrates the store from a clean URL.
 */
export function Wordmark() {
  return (
    // Deliberate plain <a> over next/link: a real navigation to "/"
    // triggers a full page reload that clears URL search params
    // (region/indicator/year/lang/theme), which is exactly the "back
    // to default home" intent. Next/Link does client-side nav and
    // would preserve the in-memory store state.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      href="/"
      aria-label="statizen — back to home"
      // Bigger on mobile (28px) → tighter on desktop (22px). Mobile
      // headers have less competing chrome so the wordmark can carry
      // more visual weight; desktop already has dropdowns + pills
      // demanding attention beside it.
      className="text-[28px] md:text-[22px]"
      style={{
        fontWeight: 500,
        // Pure black/white (--c-wordmark), not the generic --c-text
        // which is #0a0a0a in light — wordmark should read as a hard
        // brand mark, not just a body-text colour.
        color: "var(--c-wordmark)",
        letterSpacing: "-0.4px",
        userSelect: "none",
        textDecoration: "none",
        cursor: "pointer",
        // Grayscale anti-aliasing keeps strokes from looking washed
        // out on light bgs (default sub-pixel AA reads as medium gray
        // for thin/regular weights against near-white).
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      statizen
    </a>
  );
}
