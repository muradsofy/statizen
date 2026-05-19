import { AzerbaijanMap } from "@/components/map/AzerbaijanMap";
import { Overlays } from "@/components/overlays/Overlays";

export default function Home() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a0b",
        overflow: "hidden",
      }}
    >
      <AzerbaijanMap />
      <Overlays />
    </main>
  );
}
