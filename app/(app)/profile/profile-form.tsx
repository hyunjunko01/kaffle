"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";

export function ProfileForm({
  nickname: initialNickname,
  canChangeNickname,
}: {
  nickname: string;
  canChangeNickname: boolean;
}) {
  const router = useRouter();
  const dialogTitleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(initialNickname);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(initialNickname);
  }, [initialNickname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openEditor() {
    setMessage(null);
    setError(null);
    setNickname(initialNickname);
    setOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setOpen(false);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/me/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error);
      }
      setMessage("닉네임이 변경되었습니다.");
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error &&
          caught.message === "nickname change exhausted"
          ? "닉네임은 한 번만 변경할 수 있습니다."
          : "닉네임을 변경하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {initialNickname}
        </h1>
        <button
          type="button"
          onClick={openEditor}
          aria-label="닉네임 수정"
          className="inline-flex h-9 w-9 items-center justify-center text-muted transition hover:text-foreground"
        >
          <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </header>

      {message && !open ? (
        <p className="mt-4 rounded-[var(--kaffle-radius-lg)] bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {message}
        </p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0 bg-foreground/40"
            onClick={closeEditor}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 w-full max-w-[20rem] rounded-[var(--kaffle-radius-lg)] border border-border bg-surface-elevated p-4 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id={dialogTitleId} className="text-base font-semibold">
                닉네임 변경
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                aria-label="닫기"
                className="inline-flex h-7 w-7 items-center justify-center text-muted transition hover:text-foreground disabled:opacity-60"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={(event) => void save(event)}
              className="mt-3 space-y-2.5"
            >
              {error ? (
                <p className="rounded-[var(--kaffle-radius-lg)] bg-danger-soft px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={nickname}
                  maxLength={20}
                  aria-label="닉네임"
                  onChange={(event) => setNickname(event.target.value)}
                  disabled={!canChangeNickname || saving}
                  className="h-10 min-w-0 flex-1 rounded-[var(--kaffle-radius-lg)] border border-border bg-transparent px-3 text-sm outline-none focus:border-border-strong disabled:bg-surface"
                />
                {canChangeNickname ? (
                  <button
                    type="submit"
                    disabled={saving || nickname.trim() === initialNickname}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--kaffle-radius-lg)] bg-foreground px-3 text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? "저장 중…" : "변경"}
                  </button>
                ) : null}
              </div>
              <p className="text-xs leading-5 text-muted">
                {canChangeNickname
                  ? "가입 후 닉네임을 한 번 변경할 수 있습니다."
                  : "닉네임 변경 기회를 모두 사용했습니다."}
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
