import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { getPokemonAggregate, getPokemonList } from "@/lib/pokeapi/client";

const PAGE_SIZE = 20;

type PokedexPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export const runtime = "nodejs";

export default async function PokedexPage({ searchParams }: PokedexPageProps) {
  const { page } = await searchParams;
  const currentPage = page ? Math.max(1, Number(page)) : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const list = await getPokemonList({ limit: PAGE_SIZE, offset });
  if (!Array.isArray(list.results)) {
    return notFound();
  }

  const totalPages = Math.ceil(list.count / PAGE_SIZE);
  const pokemon = await Promise.all(
    list.results.map((p) => getPokemonAggregate(p.name))
  );

  const prevHref = currentPage > 1 ? `/pokedex?page=${currentPage - 1}` : null;
  const nextHref =
    currentPage < totalPages ? `/pokedex?page=${currentPage + 1}` : null;

  return (
    <main className="container mx-auto my-16 px-4 md:px-6">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="font-bold text-4xl">Pokedex</h1>
        <p className="text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
      </div>

      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pokemon.map((p) => (
          <li className="rounded-2xl border bg-card p-5" key={p.name}>
            <Link className="block" href={`/pokedex/${p.name}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">#{p.id}</p>
                  <h2 className="mt-1 font-semibold text-xl capitalize">
                    {p.name}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.types.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                {p.sprite ? (
                  // biome-ignore lint/performance/noImgElement: sprite from remote
                  <img alt={p.name} className="h-20 w-20" src={p.sprite} />
                ) : (
                  <div className="h-20 w-20 rounded bg-muted" />
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                {Object.entries(p.stats)
                  .slice(0, 6)
                  .map(([name, value]) => (
                    <div className="rounded-lg bg-muted/40 p-2" key={name}>
                      <p className="text-muted-foreground text-xs">{name}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex items-center justify-between gap-4">
        <Button asChild disabled={!prevHref} variant="secondary">
          <Link aria-disabled={!prevHref} href={prevHref ?? "/pokedex?page=1"}>
            Previous
          </Link>
        </Button>

        <Button asChild disabled={!nextHref} variant="secondary">
          <Link aria-disabled={!nextHref} href={nextHref ?? `/pokedex?page=${totalPages}`}>
            Next
          </Link>
        </Button>
      </div>
    </main>
  );
}

