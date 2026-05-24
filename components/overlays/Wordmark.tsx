export function Wordmark() {
  return (
    <span
      style={{
        fontSize: 16,
        fontWeight: 500,
        // Pure black/white (--c-wordmark), not the generic --c-text
        // which is #0a0a0a in light — wordmark should read as a hard
        // brand mark, not just a body-text colour.
        color: "var(--c-wordmark)",
        letterSpacing: "-0.2px",
        userSelect: "none",
      }}
    >
      statizen
    </span>
  );
}
