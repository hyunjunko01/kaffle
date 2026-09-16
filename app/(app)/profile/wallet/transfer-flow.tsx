"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  getAddress,
  isAddress,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import {
  ActionSheet,
  type ActionSheetStep,
} from "@/components/ui/action-sheet";
import { connectMappedWalletProvider } from "@/lib/auth/web3auth";
import {
  AUTHORIZATION_TTL_SECONDS,
  buildTransferWithAuthorizationTypedData,
  randomAuthorizationNonce,
  serializeTransferWithAuthorizationTypedData,
} from "@/lib/wallet/eip3009";
import type { WalletView } from "./types";

type TransferSheetState = {
  step: ActionSheetStep;
  loadingMessage: string;
  errorMessage: string | null;
  txHash: string | null;
};

type TransferFlowProps = {
  view: WalletView;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onViewUpdate: (view: WalletView) => void;
  onPageError: (message: string | null) => void;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function transferErrorMessage(error: unknown, bodyError?: string) {
  if (bodyError === "unsupported chain") {
    return "Base Sepolia에서만 전송할 수 있습니다.";
  }
  if (bodyError === "unregistered recipient") {
    return "등록된 출금 주소로만 전송할 수 있습니다.";
  }
  if (bodyError === "invalid recipient") {
    return "받는 주소를 확인해 주세요.";
  }
  if (bodyError === "invalid amount") {
    return "전송 수량을 올바르게 입력해 주세요.";
  }
  if (bodyError === "insufficient balance") {
    return "잔액이 부족합니다.";
  }
  if (bodyError === "authorization expired") {
    return "서명이 만료되었습니다. 다시 시도해 주세요.";
  }
  if (bodyError === "relayer insufficient funds") {
    return "플랫폼 relayer에 Base Sepolia ETH가 부족합니다. 관리자에게 relayer 지갑 충전을 요청해 주세요.";
  }
  if (
    bodyError === "ERC3009InvalidSignature" ||
    bodyError === "invalid signature"
  ) {
    return "전송 서명이 올바르지 않습니다. 다시 시도해 주세요.";
  }
  if (bodyError === "token does not support EIP-3009") {
    return "현재 prize token이 EIP-3009를 지원하지 않습니다.";
  }
  if (!(error instanceof Error)) {
    return bodyError ?? "자산을 전송하지 못했습니다.";
  }
  if (error.message === "invalid recipient") {
    return "받는 주소를 확인해 주세요.";
  }
  if (error.message === "unregistered recipient") {
    return "등록된 출금 주소로만 전송할 수 있습니다.";
  }
  if (error.message === "invalid amount") {
    return "전송 수량을 올바르게 입력해 주세요.";
  }
  if (error.message === "insufficient balance") {
    return "잔액이 부족합니다.";
  }
  if (error.message === "wallet mismatch") {
    return "현재 로그인한 지갑과 연결된 지갑이 다릅니다.";
  }
  return bodyError ?? error.message ?? "자산을 전송하지 못했습니다.";
}

function transferSheetTitle(step: ActionSheetStep) {
  switch (step) {
    case "confirm":
      return "전송 내용 확인";
    case "loading":
      return "전송 처리 중";
    case "success":
      return "전송 완료";
    case "error":
      return "전송 실패";
  }
}

function PayoutAddressPicker({
  payoutAddress,
  recipient,
  disabled,
  onSelect,
}: {
  payoutAddress: string;
  recipient: string;
  disabled: boolean;
  onSelect: (address: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected =
    isAddress(recipient) &&
    getAddress(recipient).toLowerCase() ===
      getAddress(payoutAddress).toLowerCase();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-[var(--kaffle-radius-sm)] border border-border bg-transparent px-4 py-3 text-left outline-none transition hover:border-border-strong focus:border-border-strong disabled:opacity-60"
      >
        {selected ? (
          <span className="min-w-0 break-all font-mono text-sm text-foreground">
            {getAddress(payoutAddress)}
          </span>
        ) : (
          <span className="text-sm text-muted">출금 주소를 선택해 주세요</span>
        )}
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="등록된 출금 주소"
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-[var(--kaffle-radius-sm)] border border-border bg-surface shadow-xl"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                onSelect(getAddress(payoutAddress));
                setOpen(false);
              }}
              className={`flex w-full flex-col items-start px-4 py-3 text-left transition hover:bg-surface-elevated/50 ${
                selected ? "bg-accent-soft" : ""
              }`}
            >
              <span className="text-xs font-medium text-muted">
                등록된 출금 주소
              </span>
              <span className="mt-1 break-all font-mono text-sm text-foreground">
                {getAddress(payoutAddress)}
              </span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export function TransferFlow({
  view,
  disabled,
  onBusyChange,
  onViewUpdate,
  onPageError,
}: TransferFlowProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sheet, setSheet] = useState<TransferSheetState | null>(null);

  const canTransfer = view.transferMode === "eip3009";
  const payoutAddress = view.payoutAddress;
  const transferBusy = sheet?.step === "loading";
  const sheetOpen = sheet !== null;
  const sheetStep = sheet?.step ?? "confirm";
  const normalizedRecipient = recipient.trim();
  const checksumRecipient = isAddress(normalizedRecipient)
    ? getAddress(normalizedRecipient)
    : normalizedRecipient;
  const txUrl =
    sheet?.txHash && view.explorerBaseUrl
      ? `${view.explorerBaseUrl}/tx/${sheet.txHash}`
      : null;

  function closeSheet() {
    if (sheet?.step === "loading") {
      return;
    }
    if (sheet?.step === "success") {
      setAmount("");
    }
    setSheet(null);
  }

  function openConfirmSheet() {
    setSheet({
      step: "confirm",
      loadingMessage: "",
      errorMessage: null,
      txHash: null,
    });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canTransfer || !payoutAddress) return;

    const rawRecipient = recipient.trim();
    if (
      !isAddress(rawRecipient) ||
      getAddress(rawRecipient).toLowerCase() !==
        getAddress(payoutAddress).toLowerCase()
    ) {
      onPageError("등록된 출금 주소로만 전송할 수 있습니다.");
      return;
    }

    let tokenAmount: bigint;
    try {
      tokenAmount = parseUnits(amount.trim(), view.decimals);
    } catch {
      onPageError("전송 수량을 올바르게 입력해 주세요.");
      return;
    }
    if (tokenAmount <= BigInt(0)) {
      onPageError("전송 수량을 올바르게 입력해 주세요.");
      return;
    }
    if (tokenAmount > parseUnits(view.balance, view.decimals)) {
      onPageError("잔액이 부족합니다.");
      return;
    }

    onPageError(null);
    openConfirmSheet();
  }

  async function executeTransfer() {
    if (!canTransfer || !payoutAddress) return;

    onBusyChange(true);
    setSheet({
      step: "loading",
      loadingMessage: "지갑에서 서명해 주세요…",
      errorMessage: null,
      txHash: null,
    });

    try {
      const rawRecipient = recipient.trim();
      const tokenAmount = parseUnits(amount.trim(), view.decimals);

      const tokenResponse = await fetch("/api/auth/web3auth-token");
      if (!tokenResponse.ok) {
        throw new Error("지갑 연결용 토큰을 만들지 못했습니다.");
      }
      const { idToken } = (await tokenResponse.json()) as { idToken: string };
      const provider = await connectMappedWalletProvider(idToken);
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as string[];
      const from = accounts[0];
      if (!from || from.toLowerCase() !== view.wallet.toLowerCase()) {
        throw new Error("wallet mismatch");
      }

      const nonce = randomAuthorizationNonce();
      const validAfter = BigInt(0);
      const validBefore = BigInt(
        Math.floor(Date.now() / 1000) + AUTHORIZATION_TTL_SECONDS,
      );
      const typedData = buildTransferWithAuthorizationTypedData({
        chainId: view.chainId,
        token: view.token as Address,
        from: getAddress(from),
        to: getAddress(rawRecipient),
        value: tokenAmount,
        validAfter,
        validBefore,
        nonce,
      });
      const signature = (await provider.request({
        method: "eth_signTypedData_v4",
        params: [
          from,
          JSON.stringify(
            serializeTransferWithAuthorizationTypedData(typedData),
          ),
        ],
      })) as Hex;

      setSheet((current) =>
        current
          ? {
              ...current,
              step: "loading",
              loadingMessage: "전송 처리 중…",
            }
          : current,
      );

      const response = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: getAddress(rawRecipient),
          amount: amount.trim(),
          nonce,
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          signature,
        }),
      });
      const body = (await response.json()) as WalletView & {
        error?: string;
        hash?: string;
      };
      if (!response.ok) {
        throw new Error(
          transferErrorMessage(new Error("transfer failed"), body.error),
        );
      }

      onViewUpdate(body);
      onBusyChange(false);
      setSheet({
        step: "success",
        loadingMessage: "",
        errorMessage: null,
        txHash: body.hash ?? null,
      });
    } catch (caught) {
      onBusyChange(false);
      setSheet({
        step: "error",
        loadingMessage: "",
        errorMessage: transferErrorMessage(caught),
        txHash: null,
      });
    }
  }

  if (!canTransfer) {
    return (
      <>
        <p className="rounded-[var(--kaffle-radius-sm)] bg-surface px-4 py-3 text-sm text-muted">
          자산 전송은 Base Sepolia에서만 지원합니다.
        </p>
        <p className="text-xs leading-5 text-muted">
          잘못된 주소나 지원하지 않는 네트워크로 전송한 자산은 복구할 수
          없습니다.
        </p>
      </>
    );
  }

  if (!payoutAddress) {
    return (
      <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
        <p className="text-sm leading-6 text-muted">
          출금하려면 먼저 출금 주소를 등록해 주세요. 등록된 주소로만 전송할 수
          있습니다.
        </p>
        <Link
          href="/profile/wallet/register"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90"
        >
          출금 주소 등록하기
        </Link>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <p className="text-sm font-medium">출금 주소</p>
          <PayoutAddressPicker
            payoutAddress={payoutAddress}
            recipient={recipient}
            disabled={transferBusy || disabled}
            onSelect={setRecipient}
          />
        </div>
        <label className="block text-sm font-medium">
          전송 수량 ({view.symbol})
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.0"
            disabled={transferBusy || disabled}
            className="mt-2 h-14 w-full rounded-[var(--kaffle-radius-sm)] border border-border bg-transparent px-4 text-base outline-none focus:border-border-strong disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={
            disabled ||
            transferBusy ||
            recipient.trim().length === 0 ||
            amount.trim().length === 0
          }
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
        >
          {`${view.symbol} 전송하기`}
        </button>
      </form>

      <p className="text-xs leading-5 text-muted">
        Base Sepolia에서는 ETH 없이 {view.symbol}만으로 전송할 수 있습니다.
        플랫폼 relayer가 네트워크 수수료를 대신 냅니다. 등록된 출금 주소로만
        보낼 수 있습니다.
      </p>

      <ActionSheet
        open={sheetOpen}
        step={sheetStep}
        title={transferSheetTitle(sheetStep)}
        onClose={closeSheet}
        onConfirm={() => void executeTransfer()}
        onRetry={() =>
          setSheet({
            step: "confirm",
            loadingMessage: "",
            errorMessage: null,
            txHash: null,
          })
        }
        dismissible={sheetStep !== "loading"}
        loadingMessage={sheet?.loadingMessage}
        successMessage="전송이 완료되었습니다."
        errorMessage={sheet?.errorMessage ?? undefined}
        confirmLabel="전송하기"
        cancelLabel="취소"
        closeLabel="확인"
        actionHref={txUrl}
        actionLabel="온체인 트랜잭션 확인"
      >
        <div className="rounded-[var(--kaffle-radius-sm)] bg-surface px-4 py-5 text-center">
          <p className="text-xs text-muted">전송 수량</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {amount.trim()} {view.symbol}
          </p>
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">네트워크</dt>
            <dd className="mt-1 font-medium">{view.network}</dd>
          </div>
          <div>
            <dt className="text-muted">출금 주소</dt>
            <dd className="mt-1 font-medium">
              {shortAddress(checksumRecipient)}
            </dd>
            <dd className="mt-1 break-all font-mono text-xs text-muted">
              {checksumRecipient}
            </dd>
          </div>
        </dl>
        <p className="text-xs leading-5 text-muted">
          잘못된 주소로 보낸 자산은 복구할 수 없습니다. 내용이 맞는지 다시
          확인해 주세요.
        </p>
      </ActionSheet>
    </>
  );
}
