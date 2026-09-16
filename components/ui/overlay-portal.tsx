"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** Paint overlays on `document.body` so they cover the fixed app footer. */
export function OverlayPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}
