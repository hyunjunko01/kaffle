export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-center font-prize text-base font-normal leading-none tracking-[0.2em] text-accent ${className}`.trim()}
    >
      KAFFLE
    </p>
  );
}
