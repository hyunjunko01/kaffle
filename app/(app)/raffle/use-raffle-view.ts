"use client";

import { useCallback, useEffect, useState } from "react";
import type { RaffleView } from "./types";

export function useRaffleView() {
  const [view, setView] = useState<RaffleView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/raffle");
      const body = (await res.json()) as RaffleView & { error?: string };
      if (!res.ok) {
        setView(null);
        setPageError(
          body.error?.includes("is not set")
            ? "온체인 설정이 없습니다. CHAIN과 컨트랙트 주소가 .env에 있는지 확인하세요."
            : (body.error ?? "래플 상태를 읽지 못했습니다."),
        );
        return;
      }
      setView(body);
    } finally {
      setLoading(false);
    }
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
