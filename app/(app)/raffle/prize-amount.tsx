"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Bebas Neue's em-box is much taller than the visible caps.
 * Clip to this fraction of font-size so the empty metric space
 * does not overlap the round/status row above.
 */
const CAP_BOX_RATIO = 0.72;
/** Fit to this fraction of the row width (1 = full width). */
const WIDTH_FILL = 0.75;

/**
 * Fit prize text to the row width by adjusting font-size only.
 * Observes a stable outer width box — never mutates that box's size.
 * Measures an inline-block so scrollWidth is the text width, not the row width.
 */
export function PrizeAmount({
  amount,
  symbol,
}: {
  amount: string;
  symbol: string;
}) {
  const widthRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const widthBox = widthRef.current;
    const frame = frameRef.current;
    const text = textRef.current;
    if (!widthBox || !frame || !text) return;

    let raf = 0;

    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const width = widthBox.clientWidth;
        if (width <= 0) return;

        // Measure intrinsic text width at a known size (inline-block).
        text.style.fontSize = "100px";
        const measured = text.scrollWidth;
        if (measured <= 0) return;

        const fontSizePx = ((width * WIDTH_FILL) / measured) * 100;
        text.style.fontSize = `${fontSizePx}px`;
        // Clip the oversized font metrics to roughly the visible caps.
        frame.style.height = `${fontSizePx * CAP_BOX_RATIO}px`;
      });
    };

    fit();
    void document.fonts.ready.then(fit);

    const observer = new ResizeObserver(fit);
    observer.observe(widthBox);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [amount, symbol]);

  return (
    <div ref={widthRef} className="w-full text-center">
      <div className="inline-flex flex-col items-stretch">
        <div
          ref={frameRef}
          className="flex items-center justify-center overflow-hidden"
        >
          <span
            ref={textRef}
            className="inline-block whitespace-nowrap font-prize text-4xl font-normal leading-none tracking-[0.02em] text-accent sm:text-5xl"
          >
            {amount}{" "}
            <span className="text-[0.55em] tracking-[0.06em]">{symbol}</span>
          </span>
        </div>
        <div aria-hidden="true" className="mt-1 h-px w-full bg-border" />
      </div>
    </div>
  );
}
