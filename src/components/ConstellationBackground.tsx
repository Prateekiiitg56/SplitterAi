import { ConstellationField } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

interface ConstellationBackgroundProps {
  /** When false the canvas is fully unmounted — no render cost. @default true */
  enabled?: boolean;
}

/**
 * Full-viewport particle-network background layer.
 * Renders behind all app content via fixed positioning + z-index: 0.
 * Uses the ConstellationField component from @designcodeio/threeui with the
 * "particle-network" variant — a sharp, thin-stroke particle network with
 * crisp retina trails.
 *
 * Pass `enabled={false}` to skip mounting the canvas entirely (not just
 * opacity: 0) so there is zero GPU / render cost on pages that don't need it.
 */
export default function ConstellationBackground({
  enabled = true,
}: ConstellationBackgroundProps) {
  if (!enabled) return null;

  return (
    <div
      className="constellation-bg"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <ConstellationField
        variant="particle-network"
        mode="dark"
        speed={1.0}
        size={1.0}
        length={1.0}
        density={1.0}
        opacity={1.0}
        hue={0}
        saturation={1.0}
        brightness={1.0}
      />
    </div>
  );
}
