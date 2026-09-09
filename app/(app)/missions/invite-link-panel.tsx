"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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
      <div className="rounded-sm bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500">초대 코드</p>
        <p className="mt-1 font-mono text-sm">{referralCode}</p>
        <p className="mt-3 text-xs text-zinc-500">초대 링크</p>
        <div className="mt-1 flex items-start gap-2">
          <p className="min-w-0 flex-1 break-all font-mono text-xs leading-5 text-zinc-700 dark:text-zinc-300">
            {inviteLink}
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            aria-label={copied ? "복사됨" : "초대 링크 복사"}
            className="mt-0.5 inline-flex shrink-0 text-zinc-500 transition hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            {copied ? (
              <Check size={14} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          성공 {inviteCount}/{inviteCap}
          {remaining === 0 ? " · 보상 한도 도달" : null}
        </p>
      </div>
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
