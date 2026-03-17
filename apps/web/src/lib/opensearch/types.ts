export type SearchIndexName = "content";

export type SearchDocType = "blog" | "pokemon";

export type BlogSearchDoc = {
  type: "blog";
  _id: string;
  title: string;
  description?: string | null;
  slug: string;
  publishedAt?: string | null;
  authors?: { _id: string; name?: string | null } | null;
  image?: unknown;
};

export type PokemonSearchDoc = {
  type: "pokemon";
  name: string;
  id: number;
  sprite?: string | null;
  types: string[];
  stats: Record<string, number>;
  abilities: string[];
  evolution: string[];
};

export type SearchDoc = BlogSearchDoc | PokemonSearchDoc;

export type SearchResult =
  | {
      kind: "blog";
      score?: number;
      doc: BlogSearchDoc;
    }
  | {
      kind: "pokemon";
      score?: number;
      doc: PokemonSearchDoc;
    };

