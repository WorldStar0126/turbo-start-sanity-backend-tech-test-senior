import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { SearchResult } from "@/lib/opensearch/types";
import { useDebounce } from "./use-debounce";

const SEARCH_DEBOUNCE_MS = 400;
const CACHE_STALE_TIME_MS = 30_000;

async function searchBlog(query: string, signal: AbortSignal) {
  if (!query.trim()) {
    return { results: [] as SearchResult[] };
  }

  const response = await fetch(
    `/api/search?q=${encodeURIComponent(query)}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("Failed to search");
  }

  return response.json() as Promise<{ results: SearchResult[] }>;
}

export function useBlogSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const hasQuery = debouncedQuery.trim().length > 0;
  const { data, isLoading, error } = useQuery({
    queryKey: ["blog-search", debouncedQuery],
    queryFn: ({ signal }) => searchBlog(debouncedQuery, signal),
    enabled: hasQuery,
    staleTime: CACHE_STALE_TIME_MS,
  });

  const results = data?.results ?? [];
  const blogResults = results.filter((r) => r.kind === "blog");
  const pokemonResults = results.filter((r) => r.kind === "pokemon");

  return {
    searchQuery,
    setSearchQuery,
    results,
    blogResults,
    pokemonResults,
    isSearching: isLoading,
    error,
    hasQuery,
  };
}
