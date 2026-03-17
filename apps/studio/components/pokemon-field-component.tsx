import { SearchIcon } from "@sanity/icons";
import { Box, Button, Flex, Stack, Text, TextInput } from "@sanity/ui";
import { useCallback, useMemo, useState } from "react";
import { type ObjectFieldProps, set, unset } from "sanity";

type PokemonValue = {
  name?: string;
  id?: number;
  types?: string[];
};

type PokeApiPokemon = {
  id: number;
  name: string;
  types: { type: { name: string } }[];
  sprites?: {
    front_default?: string | null;
    other?: { ["official-artwork"]?: { front_default?: string | null } };
  };
};

async function fetchPokemon(name: string) {
  const safe = name.trim().toLowerCase();
  if (!safe) {
    throw new Error("Pokemon name is required");
  }
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${safe}`);
  if (!res.ok) {
    throw new Error(`Pokemon not found (${res.status})`);
  }
  return (await res.json()) as PokeApiPokemon;
}

export function PokemonFieldComponent(props: ObjectFieldProps<PokemonValue>) {
  const {
    inputProps: { onChange, value, readOnly },
    title,
    description,
  } = props;

  const [query, setQuery] = useState(value?.name ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sprite = useMemo(() => {
    const s = (value as any)?.sprite as string | undefined;
    return s;
  }, [value]);

  const applyValue = useCallback(
    (next?: PokemonValue & { sprite?: string | null }) => {
      if (!next) {
        onChange(unset());
        return;
      }
      onChange(set({ _type: "pokemonLink", ...next }));
    },
    [onChange]
  );

  const onLookup = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const p = await fetchPokemon(query);
      const spriteUrl =
        p.sprites?.other?.["official-artwork"]?.front_default ??
        p.sprites?.front_default ??
        null;
      applyValue({
        name: p.name,
        id: p.id,
        types: p.types.map((t) => t.type.name),
        sprite: spriteUrl,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setIsLoading(false);
    }
  }, [applyValue, query]);

  const onClear = useCallback(() => {
    setQuery("");
    setError(null);
    applyValue(undefined);
  }, [applyValue]);

  return (
    <Stack space={3}>
      {(title || description) && (
        <Stack space={2}>
          {title && (
            <Text size={1} weight="semibold">
              {title}
            </Text>
          )}
          {description && (
            <Text muted size={1}>
              {description}
            </Text>
          )}
        </Stack>
      )}

      <Flex align="center" gap={2}>
        <Box flex={1}>
          <TextInput
            disabled={readOnly}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search by Pokemon name (e.g. charizard)"
            value={query}
          />
        </Box>
        <Button
          disabled={readOnly || isLoading || !query.trim()}
          icon={SearchIcon}
          mode="default"
          onClick={onLookup}
          text={isLoading ? "Searching…" : "Search"}
          tone="primary"
        />
        <Button
          disabled={readOnly || isLoading || !(value?.name || query)}
          mode="ghost"
          onClick={onClear}
          text="Clear"
        />
      </Flex>

      {error && (
        <Text size={1} tone="critical">
          {error}
        </Text>
      )}

      {value?.name && (
        <Flex align="center" gap={3}>
          {sprite ? (
            // eslint-disable-next-line @next/next/no-img-element
            // biome-ignore lint/performance/noImgElement: Studio-only preview
            <img alt={value.name} height={48} src={sprite} width={48} />
          ) : (
            <div style={{ height: 48, width: 48, background: "#eee" }} />
          )}
          <Stack space={1}>
            <Text size={1} weight="medium">
              {value.name} (#{value.id})
            </Text>
            <Text muted size={1}>
              {(value.types ?? []).join(", ")}
            </Text>
          </Stack>
        </Flex>
      )}
    </Stack>
  );
}

