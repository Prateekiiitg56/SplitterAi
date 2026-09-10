import React, { Component, ReactNode } from "react";
import { ConstellationField } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

interface ConstellationBackgroundProps {
  /** When false the canvas is fully unmounted — no render cost. @default true */
  enabled?: boolean;
}

class ConstellationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("ConstellationField canvas failed to render:", error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Full-viewport particle-network background layer.
 * Renders behind all app content via fixed positioning + z-index: 0.
 * Uses the ConstellationField component from @designcodeio/threeui with the
 * "particle-network" variant — a sharp, thin-stroke particle network with
 * crisp retina trails.
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
      <ConstellationErrorBoundary>
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
      </ConstellationErrorBoundary>
    </div>
  );
}

