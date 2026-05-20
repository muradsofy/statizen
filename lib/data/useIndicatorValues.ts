"use client";

import { useEffect, useState } from "react";
import type { ValueRow, ValuesFile } from "@/types/data";

type CacheEntry =
  | { status: "loading"; promise: Promise<ValueRow[]> }
  | { status: "ready"; values: ValueRow[] }
  | { status: "error"; error: Error };

const cache = new Map<string, CacheEntry>();

function fetchValues(indicatorId: string): Promise<ValueRow[]> {
  const cached = cache.get(indicatorId);
  if (cached?.status === "ready") return Promise.resolve(cached.values);
  if (cached?.status === "loading") return cached.promise;

  const promise = fetch(`/data/values/${indicatorId}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${indicatorId}`);
      return res.json() as Promise<ValuesFile>;
    })
    .then((file) => {
      cache.set(indicatorId, { status: "ready", values: file.values });
      return file.values;
    })
    .catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      cache.set(indicatorId, { status: "error", error });
      throw error;
    });

  cache.set(indicatorId, { status: "loading", promise });
  return promise;
}

export interface IndicatorValuesState {
  status: "loading" | "ready" | "error";
  values: ValueRow[];
  error: Error | null;
}

const EMPTY: ValueRow[] = [];

/** Lazy-load + cache values for one indicator. Null id = idle (no fetch). */
export function useIndicatorValues(
  indicatorId: string | null,
): IndicatorValuesState {
  const [state, setState] = useState<IndicatorValuesState>(() => {
    if (!indicatorId) return { status: "ready", values: EMPTY, error: null };
    const cached = cache.get(indicatorId);
    if (cached?.status === "ready") {
      return { status: "ready", values: cached.values, error: null };
    }
    return { status: "loading", values: EMPTY, error: null };
  });

  useEffect(() => {
    if (!indicatorId) {
      setState({ status: "ready", values: EMPTY, error: null });
      return;
    }
    const cached = cache.get(indicatorId);
    if (cached?.status === "ready") {
      setState({ status: "ready", values: cached.values, error: null });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", values: EMPTY, error: null });
    fetchValues(indicatorId)
      .then((values) => {
        if (!cancelled) {
          setState({ status: "ready", values, error: null });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({ status: "error", values: EMPTY, error });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [indicatorId]);

  return state;
}
