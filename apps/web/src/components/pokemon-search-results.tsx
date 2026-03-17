"use client";

import Link from "next/link";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import type { PokemonSearchDoc } from "@/lib/opensearch/types";

export function PokemonSearchResults({
  className,
  results,
}: {
  className?: string;
  results: PokemonSearchDoc[];
}) {
  if (results.length === 0) {
    return null;
  }

  return (
    <section className={cn("mt-10", className)}>
      <div className="mb-6">
        <h3 className="font-semibold text-lg">Pokemon</h3>
        <p className="text-muted-foreground text-sm">
          {results.length} result{results.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {results.map((p) => (
          <li
            className="rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
            key={p.name}
          >
            <Link className="flex items-center gap-4" href={`/pokedex/${p.name}`}>
              {p.sprite ? (
                // biome-ignore lint/performance/noImgElement: sprite from remote
                <img alt={p.name} className="h-16 w-16" src={p.sprite} />
              ) : (
                <div className="h-16 w-16 rounded bg-muted" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium capitalize">{p.name}</p>
                  <span className="text-muted-foreground text-xs">#{p.id}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.types.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

