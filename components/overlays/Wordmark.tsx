import { color } from "@/lib/ui/tokens";

export function Wordmark() {
  return (
    <span
      style={{
        fontSize: 16,
        fontWeight: 500,
        color: color.text,
        letterSpacing: "-0.2px",
        userSelect: "none",
      }}
    >
      statizen
    </span>
  );
}
