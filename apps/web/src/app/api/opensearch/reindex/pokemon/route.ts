import { NextResponse } from "next/server";

import { assertReindexAuth } from "@/lib/auth";
import { ensureContentIndex } from "@/lib/opensearch/client";
import { getPokemonAggregate, getPokemonList } from "@/lib/pokeapi/client";

export const runtime = "nodejs";

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
) {
  const results: R[] = [];
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i;
      i += 1;
      results[idx] = await fn(items[idx] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  const auth = assertReindexAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const ensured = await ensureContentIndex();
  if (!ensured.ok) {
    return NextResponse.json(
      { error: "OpenSearch not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    2000,
    Math.max(1, Number(searchParams.get("limit") ?? "151"))
  );

  const list = await getPokemonList({ limit, offset: 0 });
  const names = list.results.map((r) => r.name);

  // Each `getPokemonAggregate` also upserts into OpenSearch (best-effort).
  await mapWithConcurrency(names, 6, (n) => getPokemonAggregate(n));

  return NextResponse.json({ ok: true, indexed: names.length });
}

