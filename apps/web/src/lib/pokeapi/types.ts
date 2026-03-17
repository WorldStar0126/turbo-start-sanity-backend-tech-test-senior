export type PokemonListItem = {
  name: string;
  url: string;
};

export type PokemonTypeEntry = {
  slot: number;
  type: { name: string; url: string };
};

export type PokemonStatEntry = {
  base_stat: number;
  stat: { name: string; url: string };
};

export type PokemonAbilityEntry = {
  is_hidden: boolean;
  ability: { name: string; url: string };
};

export type PokeApiPokemon = {
  id: number;
  name: string;
  sprites?: {
    front_default?: string | null;
    other?: { ["official-artwork"]?: { front_default?: string | null } };
  };
  types: PokemonTypeEntry[];
  stats: PokemonStatEntry[];
  abilities: PokemonAbilityEntry[];
};

export type PokeApiSpecies = {
  evolution_chain?: { url: string } | null;
};

export type PokeApiEvolutionChainNode = {
  species: { name: string };
  evolves_to: PokeApiEvolutionChainNode[];
};

export type PokeApiEvolutionChain = {
  chain: PokeApiEvolutionChainNode;
};

export type PokemonAggregate = {
  id: number;
  name: string;
  sprite: string | null;
  types: string[];
  stats: Record<string, number>;
  abilities: string[];
  evolution: string[];
};

