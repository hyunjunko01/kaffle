export function RaffleWheel() {
  return (
    <div
      role="img"
      aria-label="래플 돌림판 미리보기"
      className="relative mx-auto flex aspect-square w-full items-center justify-center rounded-full bg-surface p-[5%]"
    >
      <div
        aria-hidden="true"
        className="h-full w-full rounded-full border-[6px] border-surface-elevated shadow-lg"
        style={{
          background:
            "conic-gradient(from -22.5deg, #18181b 0deg 45deg, #a1a1aa 45deg 90deg, #27272a 90deg 135deg, #d4d4d8 135deg 180deg, #18181b 180deg 225deg, #a1a1aa 225deg 270deg, #27272a 270deg 315deg, #d4d4d8 315deg 360deg)",
        }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="flex h-[36%] w-[36%] items-center justify-center rounded-full border-[3px] border-border bg-surface-elevated text-[0.55rem] font-semibold tracking-[0.18em] text-foreground shadow-md">
            KAFFLE
          </div>
        </div>
      </div>
      <span
        aria-hidden="true"
        className="absolute -top-0.5 left-1/2 -translate-x-1/2 border-x-[6px] border-t-[14px] border-x-transparent border-t-amber-400 drop-shadow-sm"
      />
    </div>
  );
}
