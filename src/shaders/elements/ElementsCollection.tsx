/**
 * ElementsCollection — routing component for ThreeUI variants.
 *
 * Maps the `variant` prop to the correct underlying component.
 * Currently only "generative-tree" is registered.
 */

import type { CSSProperties } from "react";
import { GenerativeTree } from "./GenerativeTree";

export interface ElementsCollectionProps {
  variant: "generative-tree";
  speed?: number;
  size?: number;
  particleAmount?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}

export function ElementsCollection({
  variant,
  ...props
}: ElementsCollectionProps) {
  switch (variant) {
    case "generative-tree":
      return <GenerativeTree {...props} />;
    default:
      return null;
  }
}

export default ElementsCollection;
