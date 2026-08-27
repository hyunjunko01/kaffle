"use client";

import { useState } from "react";

export function InviteLinkPanel({
  inviteLink,
  referralCode,
  ticketsPerInvite,
  inviteCount,
  inviteCap,
}: {
  inviteLink: string;
  referralCode: string;
  ticketsPerInvite: number;
  inviteCount: number;
  inviteCap: number;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(inviteCap - inviteCount, 0);

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("복사에 실패했습니다. 링크를 길게 눌러 복사해 주세요.");
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500">초대 코드</p>
        <p className="mt-1 font-mono text-sm">{referralCode}</p>
        <p className="mt-3 text-xs text-zinc-500">초대 링크</p>
        <p className="mt-1 break-all font-mono text-xs leading-5 text-zinc-700 dark:text-zinc-300">
          {inviteLink}
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          성공 {inviteCount}/{inviteCap}
          {remaining === 0 ? " · 보상 한도 도달" : null}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="h-11 w-full rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {copied ? "복사됨" : "링크 복사"}
      </button>
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      ) : null}
      <p className="text-xs leading-5 text-zinc-500">
        친구가 링크로 처음 가입하면 당신과 친구 각{" "}
        {ticketsPerInvite}장. 공유만으로는 지급되지 않으며, 당신의 보상은
        최대 {inviteCap}회입니다.
      </p>
    </div>
  );
}
