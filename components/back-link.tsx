import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="mb-6 inline-flex h-9 w-9 items-center justify-center text-muted transition hover:text-foreground"
    >
      <ChevronLeft size={22} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );
}
