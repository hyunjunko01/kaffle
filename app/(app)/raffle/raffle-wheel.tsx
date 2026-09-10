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

const SEGMENT_COLORS = ["#18181b", "#a1a1aa", "#27272a", "#d4d4d8"] as const;
const LIGHT_SEGMENTS = new Set([1, 3]);
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
  if (count <= 0) {
    return "conic-gradient(from -22.5deg, #18181b 0deg 45deg, #a1a1aa 45deg 90deg, #27272a 90deg 135deg, #d4d4d8 135deg 180deg, #18181b 180deg 225deg, #a1a1aa 225deg 270deg, #27272a 270deg 315deg, #d4d4d8 315deg 360deg)";
  }

  const slice = 360 / count;
  const parts = Array.from({ length: count }, (_, index) => {
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
  peek = false,
  className = "",
  label = "래플 돌림판",
  onStopComplete,
}: {
  phase?: WheelPhase;
  slots?: WheelSlot[];
  targetIndex?: number | null;
  /** Show only the top arc (~32% of diameter). */
  peek?: boolean;
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
  const slice = count > 0 ? 360 / count : 45;
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

  const disk = (
    <div
      aria-hidden="true"
      className="relative h-full w-full overflow-hidden rounded-full border-[6px] border-surface-elevated shadow-lg will-change-transform"
      style={diskStyle}
    >
      {count > 0 && showLabel ? (
        <ul className="absolute inset-0">
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
      ) : null}

      {!peek ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-[30%] w-[30%] items-center justify-center rounded-full border-[3px] border-border bg-surface-elevated text-[0.55rem] font-semibold tracking-[0.18em] text-foreground shadow-md sm:text-[0.65rem]">
            KAFFLE
          </div>
        </div>
      ) : null}
    </div>
  );

  if (peek) {
    return (
      <div
        role="img"
        aria-label={label}
        aria-busy={phase === "spinning" || phase === "stopping"}
        className={`relative mx-auto w-full max-w-lg ${className}`}
      >
        <div className="relative h-36 overflow-hidden rounded-[var(--kaffle-radius-md)] border border-border bg-surface sm:h-40">
          <div className="absolute left-1/2 top-0 w-[min(150%,28rem)] -translate-x-1/2">
            <div className="relative aspect-square w-full">{disk}</div>
          </div>
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[2px] border-x-[7px] border-t-[16px] border-x-transparent border-t-amber-400 drop-shadow-sm"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      aria-busy={phase === "spinning" || phase === "stopping"}
      className={`relative mx-auto flex aspect-square w-full items-center justify-center rounded-full bg-surface p-[4%] ${className}`}
    >
      {disk}
      <span
        aria-hidden="true"
        className="absolute -top-0.5 left-1/2 z-10 -translate-x-1/2 border-x-[7px] border-t-[16px] border-x-transparent border-t-amber-400 drop-shadow-sm"
      />
    </div>
  );
}
