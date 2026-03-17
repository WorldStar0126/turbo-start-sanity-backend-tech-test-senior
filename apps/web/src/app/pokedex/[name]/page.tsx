import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { getPokemonAggregate } from "@/lib/pokeapi/client";

export const runtime = "nodejs";

export default async function PokemonDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const safeName = name.trim().toLowerCase();
  if (!safeName) {
    return notFound();
  }

  const p = await getPokemonAggregate(safeName);

  return (
    <main className="container mx-auto my-16 px-4 md:px-6">
      <div className="mb-10 flex items-center justify-between gap-4">
        <Button asChild variant="secondary">
          <Link href="/pokedex">Back</Link>
        </Button>
        <p className="text-muted-foreground text-sm">#{p.id}</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <div className="rounded-2xl border bg-card p-6">
          {p.sprite ? (
            // biome-ignore lint/performance/noImgElement: sprite from remote
            <img alt={p.name} className="mx-auto h-48 w-48" src={p.sprite} />
          ) : (
            <div className="mx-auto h-48 w-48 rounded bg-muted" />
          )}

          <h1 className="mt-4 text-center font-bold text-3xl capitalize">
            {p.name}
          </h1>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {p.types.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="font-semibold text-xl">Base stats</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
              {Object.entries(p.stats).map(([stat, value]) => (
                <div className="rounded-xl border bg-card p-4" key={stat}>
                  <p className="text-muted-foreground text-xs">{stat}</p>
                  <p className="mt-1 font-semibold text-lg">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-xl">Abilities</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.abilities.map((a) => (
                <Badge key={a} variant="outline">
                  {a}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-xl">Evolution chain</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.evolution.map((evo) => (
                <Button asChild key={evo} size="sm" variant="secondary">
                  <Link href={`/pokedex/${evo}`}>{evo}</Link>
                </Button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

