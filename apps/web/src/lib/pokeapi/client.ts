import "server-only";

import type {
  PokeApiEvolutionChain,
  PokeApiPokemon,
  PokeApiSpecies,
  PokemonAggregate,
  PokemonListItem,
} from "./types";

import { upsertDoc } from "@/lib/opensearch/client";
import type { PokemonSearchDoc } from "@/lib/opensearch/types";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const DEFAULT_REVALIDATE_SECONDS = 60 * 60 * 24; // 24h

async function fetchJson<T>(url: string, opts?: { revalidate?: number }) {
  const res = await fetch(url, {
    next: { revalidate: opts?.revalidate ?? DEFAULT_REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`PokeAPI error (${res.status}) for ${url}`);
  }
  return (await res.json()) as T;
}

export async function getPokemonList(params: { limit: number; offset: number }) {
  const url = `${POKEAPI_BASE}/pokemon?limit=${params.limit}&offset=${params.offset}`;
  const data = await fetchJson<{ count: number; results: PokemonListItem[] }>(
    url
  );
  return data;
}

export async function getPokemonRaw(name: string) {
  return await fetchJson<PokeApiPokemon>(`${POKEAPI_BASE}/pokemon/${name}`);
}

export async function getPokemonSpeciesRaw(name: string) {
  return await fetchJson<PokeApiSpecies>(
    `${POKEAPI_BASE}/pokemon-species/${name}`
  );
}

export async function getEvolutionChainRaw(url: string) {
  return await fetchJson<PokeApiEvolutionChain>(url);
}

function parseEvolutionNames(chain: PokeApiEvolutionChain["chain"]) {
  const names: string[] = [];
  const queue: Array<PokeApiEvolutionChain["chain"]> = [chain];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) {
      continue;
    }
    names.push(node.species.name);
    for (const next of node.evolves_to ?? []) {
      queue.push(next);
    }
  }
  // Stable unique
  return [...new Set(names)];
}

export async function getPokemonAggregate(name: string): Promise<PokemonAggregate> {
  const pokemon = await getPokemonRaw(name);
  const species = await getPokemonSpeciesRaw(name);

  const evolutionUrl = species.evolution_chain?.url ?? null;
  const evolution =
    evolutionUrl !== null
      ? parseEvolutionNames((await getEvolutionChainRaw(evolutionUrl)).chain)
      : [pokemon.name];

  const sprite =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  const aggregate: PokemonAggregate = {
    id: pokemon.id,
    name: pokemon.name,
    sprite,
    types: pokemon.types.map((t) => t.type.name),
    stats: Object.fromEntries(
      pokemon.stats.map((s) => [s.stat.name, s.base_stat] as const)
    ),
    abilities: pokemon.abilities.map((a) => a.ability.name),
    evolution,
  };

  // Best-effort indexing; ignore if OpenSearch is not configured/unavailable.
  const doc: PokemonSearchDoc = {
    type: "pokemon",
    id: aggregate.id,
    name: aggregate.name,
    sprite: aggregate.sprite,
    types: aggregate.types,
    stats: aggregate.stats,
    abilities: aggregate.abilities,
    evolution: aggregate.evolution,
  };
  void upsertDoc(`pokemon:${doc.name}`, doc as unknown as Record<string, unknown>);

  return aggregate;
}

