"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({
  nickname: initialNickname,
  canChangeNickname,
}: {
  nickname: string;
  canChangeNickname: boolean;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === "nickname change exhausted"
          ? "닉네임은 한 번만 변경할 수 있습니다."
          : "닉네임을 변경하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="mt-8 space-y-4">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </p>
      ) : null}
      <label className="block text-sm font-medium">
        닉네임
        <input
          type="text"
          value={nickname}
          maxLength={20}
          onChange={(event) => setNickname(event.target.value)}
          disabled={!canChangeNickname || saving}
          className="mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 outline-none focus:border-zinc-500 disabled:bg-zinc-100 dark:border-zinc-800 dark:disabled:bg-zinc-900"
        />
      </label>
      <p className="text-xs leading-5 text-zinc-500">
        {canChangeNickname
          ? "가입 후 닉네임을 한 번 변경할 수 있습니다."
          : "닉네임 변경 기회를 모두 사용했습니다."}
      </p>
      {canChangeNickname ? (
        <button
          type="submit"
          disabled={saving || nickname.trim() === initialNickname}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {saving ? "저장 중…" : "닉네임 변경"}
        </button>
      ) : null}
    </form>
  );
}
