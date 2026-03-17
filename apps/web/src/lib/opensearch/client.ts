import { env } from "@workspace/env/server";
import { Logger } from "@workspace/logger";
import { Client } from "@opensearch-project/opensearch";

const logger = new Logger("OpenSearch");

function getClient(): Client | null {
  if (!env.OPENSEARCH_NODE) {
    return null;
  }

  const hasAuth = env.OPENSEARCH_USERNAME && env.OPENSEARCH_PASSWORD;
  return new Client({
    node: env.OPENSEARCH_NODE,
    ...(hasAuth
      ? {
          auth: {
            username: env.OPENSEARCH_USERNAME as string,
            password: env.OPENSEARCH_PASSWORD as string,
          },
        }
      : {}),
    ssl: env.OPENSEARCH_NODE.startsWith("https://")
      ? {
          rejectUnauthorized: true,
        }
      : undefined,
  });
}

export const OPENSEARCH_INDEX = "content";

export async function isOpenSearchConfigured() {
  return Boolean(env.OPENSEARCH_NODE);
}

export async function ensureContentIndex() {
  const client = getClient();
  if (!client) {
    return { ok: false as const, reason: "not_configured" as const };
  }

  const index = OPENSEARCH_INDEX;
  const exists = await client.indices.exists({ index });
  if (exists.statusCode === 200) {
    return { ok: true as const };
  }

  await client.indices.create({
    index,
    body: {
      settings: {
        index: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
      },
      mappings: {
        dynamic: "strict",
        properties: {
          type: { type: "keyword" },

          // Blog
          _id: { type: "keyword" },
          title: { type: "text" },
          description: { type: "text" },
          slug: { type: "keyword" },
          publishedAt: { type: "date" },
          authors: {
            type: "object",
            dynamic: true as any,
            properties: {
              _id: { type: "keyword" },
              name: { type: "text" },
            },
          },

          // Pokemon
          name: { type: "text" },
          id: { type: "integer" },
          sprite: { type: "keyword" },
          types: { type: "keyword" },
          abilities: { type: "keyword" },
          evolution: { type: "keyword" },
          // stats contains dynamic keys (hp, attack, etc). Allow dynamic fields.
          stats: { type: "object", dynamic: true as any},
        },
      },
    },
  });

  logger.info(`Created index "${index}"`);
  return { ok: true as const };
}

export async function upsertDoc(docId: string, body: Record<string, unknown>) {
  const client = getClient();
  if (!client) {
    return { ok: false as const, reason: "not_configured" as const };
  }

  await ensureContentIndex();
  await client.index({
    index: OPENSEARCH_INDEX,
    id: docId,
    body,
    refresh: true,
  });

  return { ok: true as const };
}

export async function deleteDoc(docId: string) {
  const client = getClient();
  if (!client) {
    return { ok: false as const, reason: "not_configured" as const };
  }

  try {
    await client.delete({
      index: OPENSEARCH_INDEX,
      id: docId,
      refresh: true,
    });
  } catch (err: unknown) {
    // Ignore deletes for missing docs
    logger.warn("Delete failed (ignored)", err);
  }
  return { ok: true as const };
}

export async function searchContent(q: string, opts?: { limit?: number }) {
  const client = getClient();
  if (!client) {
    return { ok: false as const, reason: "not_configured" as const };
  }

  await ensureContentIndex();
  const limit = opts?.limit ?? 20;

  const res = await client.search({
    index: OPENSEARCH_INDEX,
    body: {
      size: limit,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: q,
                fields: [
                  "title^3",
                  "description^2",
                  "authors.name^2",
                  "name^3",
                  "types^2",
                  "abilities",
                  "evolution",
                ],
                fuzziness: "AUTO",
              },
            },
          ],
        },
      },
    },
  });

  const hits = (res.body?.hits?.hits ?? []) as Array<{
    _id: string;
    _score?: number;
    _source?: Record<string, unknown>;
  }>;

  return {
    ok: true as const,
    hits: hits.map((h) => ({ id: h._id, score: h._score, source: h._source })),
  };
}

