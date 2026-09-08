export function RaffleWheel() {
  return (
    <div
      role="img"
      aria-label="래플 돌림판 미리보기"
      className="relative mx-auto flex aspect-square w-full items-center justify-center rounded-full bg-zinc-100 p-[5%] dark:bg-zinc-900"
    >
      <div
        aria-hidden="true"
        className="h-full w-full rounded-full border-[6px] border-white shadow-lg dark:border-zinc-800"
        style={{
          background:
            "conic-gradient(from -22.5deg, #18181b 0deg 45deg, #a1a1aa 45deg 90deg, #27272a 90deg 135deg, #d4d4d8 135deg 180deg, #18181b 180deg 225deg, #a1a1aa 225deg 270deg, #27272a 270deg 315deg, #d4d4d8 315deg 360deg)",
        }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="flex h-[36%] w-[36%] items-center justify-center rounded-full border-[3px] border-zinc-200 bg-white text-[0.55rem] font-semibold tracking-[0.18em] text-zinc-950 shadow-md dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
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
