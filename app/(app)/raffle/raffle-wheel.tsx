"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { WheelSlot } from "./wheel-slots";
import { targetRotationForSlot } from "./wheel-slots";
import { wheelSound } from "./wheel-sound";

type WheelPhase = "idle" | "spinning" | "stopping" | "stopped";
type WheelVariant = "teaser" | "reveal";

const SEGMENT_COLORS = ["#18181b", "#a1a1aa", "#27272a", "#d4d4d8"] as const;
const LIGHT_SEGMENTS = new Set([1, 3]);
/** Decorative segment count when no slots are provided (teaser idle). */
const IDLE_SEGMENT_COUNT = 16;
/** Constant spin speed while waiting for on-chain result. */
const SPIN_DEG_PER_MS = 360 / 700;
/**
 * Decelerate onto the winner. Ease-out cubic starts at spin velocity when
 * duration ≈ 3 * distance / spinSpeed; keep a long floor for tension.
 */
const STOP_EXTRA_TURNS = 5;
const MIN_STOP_MS = 7200;
const EASE_OUT_START_DERIV = 3;

function truncateLabel(value: string, max = 6) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function buildConicGradient(count: number) {
  const n = count > 0 ? count : IDLE_SEGMENT_COUNT;
  const slice = 360 / n;
  const parts = Array.from({ length: n }, (_, index) => {
    const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
    const start = index * slice;
    const end = (index + 1) * slice;
    return `${color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(from ${-slice / 2}deg, ${parts.join(", ")})`;
}

/** Which slot sits under the top pointer for a given disk rotation. */
function slotIndexAtPointer(rotationDeg: number, slotCount: number) {
  if (slotCount <= 0) return 0;
  const slice = 360 / slotCount;
  const mod = ((rotationDeg % 360) + 360) % 360;
  return (
    Math.floor((((( -mod + slice / 2) % 360) + 360) % 360) / slice) %
    slotCount
  );
}

function playTickForRotation(
  rotationDeg: number,
  slotCount: number,
  lastSlotRef: { current: number | null },
) {
  if (slotCount <= 0) return;
  const index = slotIndexAtPointer(rotationDeg, slotCount);
  if (lastSlotRef.current === null) {
    lastSlotRef.current = index;
    return;
  }
  if (lastSlotRef.current !== index) {
    lastSlotRef.current = index;
    wheelSound.playTick();
  }
}

export function RaffleWheel({
  phase = "idle",
  slots = [],
  targetIndex = null,
  variant,
  className = "",
  label = "래플 돌림판",
  onStopComplete,
}: {
  phase?: WheelPhase;
  slots?: WheelSlot[];
  targetIndex?: number | null;
  /** teaser — main page top arc; reveal — winner-draw sheet top arc */
  variant: WheelVariant;
  className?: string;
  label?: string;
  onStopComplete?: () => void;
}) {
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const lastTickSlotRef = useRef<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const onStopCompleteRef = useRef(onStopComplete);
  onStopCompleteRef.current = onStopComplete;

  const segments = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        label: truncateLabel(slot.nickname),
      })),
    [slots],
  );
  const count = segments.length;
  const slice = count > 0 ? 360 / count : 360 / IDLE_SEGMENT_COUNT;
  const showLabel = count > 0 && slice >= 7;

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    if (phase === "spinning" || phase === "stopping") {
      void wheelSound.unlock();
      lastTickSlotRef.current = slotIndexAtPointer(rotationRef.current, count);
    } else {
      lastTickSlotRef.current = null;
    }
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "spinning") {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current == null) {
        lastTsRef.current = ts;
      }
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;
      const next = rotationRef.current + delta * SPIN_DEG_PER_MS;
      rotationRef.current = next;
      playTickForRotation(next, count, lastTickSlotRef);
      setRotation(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
    };
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "stopping") {
      return;
    }

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;

    const startRotation = rotationRef.current;
    const finalRotation = targetRotationForSlot(
      targetIndex ?? 0,
      count,
      startRotation,
      STOP_EXTRA_TURNS,
    );
    const distance = Math.max(finalRotation - startRotation, 1);
    const matchedMs = (EASE_OUT_START_DERIV * distance) / SPIN_DEG_PER_MS;
    const durationMs = Math.max(MIN_STOP_MS, matchedMs);
    const startMs = performance.now();
    let completed = false;

    const tick = (ts: number) => {
      const elapsed = ts - startMs;
      const t = Math.min(1, elapsed / durationMs);
      // Ease-out cubic: matches continuous spin speed at t=0, then slows hard.
      const eased = 1 - (1 - t) ** 3;
      const next = startRotation + distance * eased;
      rotationRef.current = next;
      playTickForRotation(next, count, lastTickSlotRef);
      setRotation(next);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!completed) {
        completed = true;
        rotationRef.current = finalRotation;
        setRotation(finalRotation);
        wheelSound.playStop();
        onStopCompleteRef.current?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, targetIndex, count]);

  const diskStyle: CSSProperties = {
    background: buildConicGradient(count),
    transform: `rotate(${rotation}deg)`,
  };

  const labels =
    count > 0 && showLabel ? (
      <ul className="absolute inset-0 z-[1]">
        {segments.map((segment, index) => {
          const angle = index * slice;
          const light = LIGHT_SEGMENTS.has(index % SEGMENT_COLORS.length);
          return (
            <li
              key={`${segment.nickname}-${index}`}
              className="absolute inset-0 flex justify-center"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <span
                className={`mt-[11%] max-w-[42%] truncate text-center text-[0.62rem] font-semibold leading-none sm:text-xs ${
                  light ? "text-zinc-950" : "text-zinc-50"
                }`}
              >
                {segment.label}
              </span>
            </li>
          );
        })}
      </ul>
    ) : null;

  const disk = (
    <div
      aria-hidden="true"
      className="relative h-full w-full overflow-hidden rounded-full border-[6px] border-surface-elevated shadow-lg will-change-transform"
      style={diskStyle}
    >
      {labels}
    </div>
  );

  if (variant === "reveal") {
    // Winner sheet: same proportion as teaser (clip ≈ 38% of diameter), framed.
    return (
      <div
        role="img"
        aria-label={label}
        aria-busy={phase === "spinning" || phase === "stopping"}
        className={`relative mx-auto w-full max-w-lg ${className}`}
      >
        <div className="overflow-hidden rounded-[var(--kaffle-radius-sm)] border border-border bg-surface">
          <div className="relative aspect-[100/38] w-full overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 w-full -translate-x-1/2"
              style={{ height: 0, paddingBottom: "100%" }}
            >
              <div className="absolute inset-0">{disk}</div>
            </div>
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[2px] border-x-[12px] border-t-[26px] border-x-transparent border-t-accent drop-shadow-sm"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent"
            />
          </div>
        </div>
      </div>
    );
  }

  // Main page teaser: clip ≈ 34% of diameter.
  return (
    <div
      role="img"
      aria-label={label}
      aria-busy={phase === "spinning" || phase === "stopping"}
      className={`relative mx-auto w-full ${className}`}
    >
      <div className="relative aspect-[100/34] w-full overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 w-full -translate-x-1/2"
          style={{ height: 0, paddingBottom: "100%" }}
        >
          <div className="absolute inset-0">{disk}</div>
        </div>
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[3px] border-x-[14px] border-t-[30px] border-x-transparent border-t-accent drop-shadow-md"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent"
        />
      </div>
    </div>
  );
}
