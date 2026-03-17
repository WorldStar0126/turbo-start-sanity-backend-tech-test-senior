import Fuse from "fuse.js";
import { NextResponse } from "next/server";

import { searchContent } from "@/lib/opensearch/client";
import type { SearchResult } from "@/lib/opensearch/types";
import { sanityFetch } from "@/lib/sanity/live";
import { queryAllBlogDataForSearch } from "@/lib/sanity/query";

export const runtime = "nodejs";
export const revalidate = 60;

function normalizeHit(hit: {
  id: string;
  score?: number;
  source?: Record<string, unknown>;
}): SearchResult | null {
  const type = hit.source?.type;
  if (type === "blog") {
    return {
      kind: "blog",
      score: hit.score,
      doc: hit.source as any,
    };
  }
  if (type === "pokemon") {
    return {
      kind: "pokemon",
      score: hit.score,
      doc: hit.source as any,
    };
  }
  return null;
}

async function fuseFallback(query: string): Promise<SearchResult[]> {
  const { data } = await sanityFetch({
    query: queryAllBlogDataForSearch,
    stega: false,
  });

  if (!Array.isArray(data)) {
    return [];
  }

  const fuse = new Fuse(data, {
    keys: ["title", "description", "slug", "authors.name"],
    threshold: 0.3,
  });

  const results = fuse.search(query, { limit: 10 });
  return results.map((r) => ({
    kind: "blog" as const,
    score: r.score ? 1 - r.score : undefined,
    doc: {
      ...r.item,
      type: "blog",
    },
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const query = q.trim();

  if (!query) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  try {
    const res = await searchContent(query, { limit: 20 });
    if (!res.ok) {
      const fallback = await fuseFallback(query);
      return NextResponse.json({ results: fallback, degraded: true });
    }
    const normalized = res.hits
      .map((h) => normalizeHit({ id: h.id, score: h.score, source: h.source }))
      .filter(Boolean) as SearchResult[];
    return NextResponse.json({ results: normalized });
  } catch {
    const fallback = await fuseFallback(query);
    return NextResponse.json({ results: fallback, degraded: true });
  }
}

