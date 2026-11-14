"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Balances, Offer, Position, RheaClient, Series } from "@rhea/sdk";
import { useRhea } from "./context";

export type PolledState<T> = {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  reload: () => void;
};

type Snapshot<T> = { key: string; data?: T; error?: string };

export function usePolled<T>(fetcher: (client: RheaClient) => Promise<T>, intervalMs: number, key = ""): PolledState<T> {
  const { client, version } = useRhea();
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetcherRef.current(client);
        if (!cancelled) setSnapshot({ key, data });
      } catch (cause) {
        if (!cancelled) setSnapshot({ key, error: cause instanceof Error ? cause.message : "Request failed" });
      }
    };

    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [client, version, tick, intervalMs, key]);

  const current = snapshot && snapshot.key === key ? snapshot : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: current === null,
    reload,
  };
}

export function useNow(intervalMs = 1000): number {
  const { client } = useRhea();
  const [now, setNow] = useState(() => client.nowMs());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(client.nowMs()), intervalMs);
    return () => window.clearInterval(timer);
  }, [client, intervalMs]);

  return now;
}

export function useTermStart(maturityMs: number, deployedAt: string): number {
  const { client } = useRhea();
  const [firstSeen] = useState(() => client.nowMs());
  const deployed = Date.parse(deployedAt);
  if (Number.isFinite(deployed) && deployed > 0 && deployed < maturityMs) return deployed;
  return Math.min(firstSeen, maturityMs);
}

export function usePollMs(): number {
  const { mode } = useRhea();
  return mode === "fake" ? 5000 : 10_000;
}

export function useSeries(intervalMs?: number): PolledState<Series> {
  const pollMs = usePollMs();
  return usePolled((client) => client.series(), intervalMs ?? pollMs);
}

export function useBalances(): PolledState<Balances | null> {
  const { account } = useRhea();
  return usePolled((client) => (account ? client.balances(account) : Promise.resolve(null)), usePollMs(), account ?? "none");
}

export function usePosition(): PolledState<Position | null> {
  const { account } = useRhea();
  return usePolled((client) => (account ? client.position(account) : Promise.resolve(null)), usePollMs(), account ?? "none");
}

export function useOffers(kind?: "Pt" | "Yt"): PolledState<Offer[]> {
  return usePolled((client) => client.offers(kind ? { kind } : undefined), usePollMs(), kind ?? "all");
}
