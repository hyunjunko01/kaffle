"use client";

import { useCallback, useEffect, useState } from "react";
import type { WalletView } from "./types";

export function useWalletView() {
  const [view, setView] = useState<WalletView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    const response = await fetch("/api/wallet");
    const body = (await response.json()) as WalletView & { error?: string };
    if (!response.ok) {
      setView(null);
      setPageError(
        body.error?.includes("is not set")
          ? "네트워크 또는 토큰 설정이 없습니다."
          : (body.error ?? "지갑 정보를 불러오지 못했습니다."),
      );
      setLoading(false);
      return;
    }
    setView(body);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    view,
    setView,
    loading,
    pageError,
    setPageError,
    reload: load,
  };
}
