"use client";

import { useState } from "react";
import type { Hex } from "viem";
import { normalizeWalletAddress } from "@/lib/wallet/personal-wallet";

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

type RegisterPersonalWalletFormProps = {
  initialAddress: string | null;
};

type ChallengeResponse = {
  address: string;
  nonce: string;
  message: string;
  expiresAt: string;
  error?: string;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function getInjectedProvider(): EthereumProvider | null {
  if (typeof window === "undefined") {
    return null;
  }
  const ethereum = (
    window as Window & { ethereum?: EthereumProvider }
  ).ethereum;
  return ethereum ?? null;
}

function errorMessageFromBody(error?: string) {
  switch (error) {
    case "Invalid address":
      return "지갑 주소가 올바르지 않습니다.";
    case "Address already registered":
      return "이미 다른 계정에 등록된 주소입니다.";
    case "Challenge not found":
      return "인증 요청을 찾을 수 없습니다. 다시 시도해 주세요.";
    case "Challenge already used":
      return "이미 사용된 인증 요청입니다. 다시 시도해 주세요.";
    case "Challenge expired":
      return "인증 요청이 만료되었습니다. 다시 시도해 주세요.";
    case "Invalid signature":
      return "서명이 올바르지 않습니다. 같은 지갑으로 다시 서명해 주세요.";
    case "Unauthorized":
      return "로그인이 필요합니다.";
    default:
      return null;
  }
}

function isUserRejection(error: unknown) {
  return (
    error instanceof Error && /reject|denied|cancel/i.test(error.message)
  );
}

export function RegisterPersonalWalletForm({
  initialAddress,
}: RegisterPersonalWalletFormProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [registeredAddress, setRegisteredAddress] = useState<string | null>(
    initialAddress,
  );
  const [isEditing, setIsEditing] = useState(!initialAddress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isConnected = connectedAddress !== null;

  async function disconnectInjectedWallet() {
    const provider = getInjectedProvider();
    if (!provider) {
      return;
    }

    try {
      await provider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Not all wallets support revoke; local connect state is still cleared.
    }
  }

  async function resetRegistrationState() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      if (registeredAddress) {
        const response = await fetch("/api/me/personal-wallet", {
          method: "DELETE",
        });
        const body = (await response.json()) as { error?: string };

        if (!response.ok) {
          setError(
            errorMessageFromBody(body.error) ??
              "등록된 지갑을 삭제하지 못했습니다.",
          );
          return;
        }
      }

      await disconnectInjectedWallet();
      setRegisteredAddress(null);
      setConnectedAddress(null);
      setIsEditing(true);
    } catch {
      setError("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function connectWallet() {
    setError(null);
    setSuccess(null);

    const provider = getInjectedProvider();
    if (!provider) {
      setError(
        "이더리움 지갑을 연결할 수 없습니다. 지갑을 설치하거나 지원 브라우저에서 다시 시도해 주세요.",
      );
      return;
    }

    setBusy(true);
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = normalizeWalletAddress(accounts[0]);
      if (!address) {
        setError("지갑 주소를 읽지 못했습니다.");
        return;
      }
      setConnectedAddress(address);
    } catch (connectError) {
      setError(
        isUserRejection(connectError)
          ? "지갑 연결이 취소되었습니다."
          : "지갑에 연결하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyOwnership() {
    if (!connectedAddress) {
      setError("먼저 지갑을 연결해 주세요.");
      return;
    }

    const provider = getInjectedProvider();
    if (!provider) {
      setError(
        "이더리움 지갑을 연결할 수 없습니다. 지갑을 설치하거나 지원 브라우저에서 다시 시도해 주세요.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const challengeResponse = await fetch(
        "/api/me/personal-wallet/challenge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: connectedAddress }),
        },
      );
      const challengeBody =
        (await challengeResponse.json()) as ChallengeResponse;

      if (!challengeResponse.ok) {
        setError(
          errorMessageFromBody(challengeBody.error) ??
            "소유권 확인 요청을 만들지 못했습니다.",
        );
        return;
      }

      let signature: Hex;
      try {
        signature = (await provider.request({
          method: "personal_sign",
          params: [challengeBody.message, connectedAddress],
        })) as Hex;
      } catch (signError) {
        setError(
          isUserRejection(signError)
            ? "서명이 취소되었습니다."
            : "메시지 서명에 실패했습니다.",
        );
        return;
      }

      const verifyResponse = await fetch("/api/me/personal-wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: connectedAddress,
          nonce: challengeBody.nonce,
          signature,
        }),
      });
      const verifyBody = (await verifyResponse.json()) as {
        error?: string;
        personalWallet?: { address: string };
      };

      if (!verifyResponse.ok) {
        setError(
          errorMessageFromBody(verifyBody.error) ??
            "지갑 소유권 확인에 실패했습니다.",
        );
        return;
      }

      const nextAddress =
        verifyBody.personalWallet?.address ?? connectedAddress;
      setRegisteredAddress(nextAddress);
      setConnectedAddress(null);
      setIsEditing(false);
      setSuccess("개인 지갑 주소가 등록되었습니다.");
    } catch {
      setError("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function onPrimaryClick() {
    if (isConnected) {
      void verifyOwnership();
      return;
    }
    void connectWallet();
  }

  const primaryLabel = busy
    ? isConnected
      ? "등록 중…"
      : "연결 중…"
    : isConnected
      ? "이 주소로 등록"
      : "지갑 연결";

  return (
    <section className="mt-8 space-y-4">
      {registeredAddress ? (
        <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
          <p className="text-xs font-medium tracking-[0.18em] text-muted">
            등록된 개인 지갑
          </p>
          <p className="mt-2 break-all font-mono text-sm leading-5 text-foreground">
            {registeredAddress}
          </p>
        </div>
      ) : null}

      {!isEditing ? (
        <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
          <p className="text-sm leading-6 text-muted">
            다른 주소로 바꾸려면 등록 상태를 초기화한 뒤 다시 연결해 주세요.
          </p>
          <button
            type="button"
            onClick={() => void resetRegistrationState()}
            disabled={busy}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] border border-accent text-base font-semibold text-accent-ink transition hover:bg-accent-soft disabled:opacity-60"
          >
            {busy ? "초기화 중…" : "등록 상태 초기화"}
          </button>
        </div>
      ) : (
        <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
          <p className="text-sm leading-6 text-muted">
            {isConnected
              ? "지갑 어플리케이션에서의 서명을 통해 이 주소를 등록합니다."
              : "먼저 지갑을 연결해 주세요."}
          </p>

          {connectedAddress ? (
            <p className="mt-4 break-all font-mono text-sm text-foreground">
              연결됨: {shortAddress(connectedAddress)}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onPrimaryClick}
            disabled={busy}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
          >
            {primaryLabel}
          </button>
        </div>
      )}

      {error ? (
        <p className="rounded-[var(--kaffle-radius-sm)] bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-[var(--kaffle-radius-sm)] bg-success-soft px-4 py-3 text-sm text-success-ink">
          {success}
        </p>
      ) : null}
    </section>
  );
}
