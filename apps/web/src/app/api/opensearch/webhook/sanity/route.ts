import { NextResponse } from "next/server";

import { deleteDoc, ensureContentIndex, upsertDoc } from "@/lib/opensearch/client";
import type { BlogSearchDoc } from "@/lib/opensearch/types";
import { sanityFetch } from "@/lib/sanity/live";
import { queryBlogByIdForSearch } from "@/lib/sanity/query";
import { verifyWebhookOrThrow } from "@/lib/webhooks";

export const runtime = "nodejs";

type SanityWebhookPayload = {
  _id?: string;
  id?: string;
  documentId?: string;
  _type?: string;
  type?: string;
  operation?: "create" | "update" | "delete";
};

function extractDocId(body: SanityWebhookPayload) {
  return body._id ?? body.id ?? body.documentId ?? null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    verifyWebhookOrThrow({ headers: request.headers, rawBody });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const ensured = await ensureContentIndex();
  if (!ensured.ok) {
    return NextResponse.json(
      { error: "OpenSearch not configured" },
      { status: 503 }
    );
  }

  let body: SanityWebhookPayload;
  try {
    body = JSON.parse(rawBody) as SanityWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const docId = extractDocId(body);
  const docType = body._type ?? body.type;
  const operation = body.operation ?? "update";

  if (!docId || !docType) {
    return NextResponse.json(
      { error: "Missing document id or type" },
      { status: 400 }
    );
  }

  // For this test we sync only blog documents through Sanity webhooks.
  if (docType !== "blog") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (operation === "delete") {
    await deleteDoc(`blog:${docId}`);
    return NextResponse.json({ ok: true, deleted: docId });
  }

  const { data } = await sanityFetch({
    query: queryBlogByIdForSearch,
    params: { id: docId },
    stega: false,
  });

  if (!data) {
    // If the document is missing, treat it as a delete.
    await deleteDoc(`blog:${docId}`);
    return NextResponse.json({ ok: true, deleted: docId });
  }

  const doc: BlogSearchDoc = {
    type: "blog",
    _id: data._id,
    title: data.title,
    description: data.description,
    slug: data.slug,
    publishedAt: data.publishedAt,
    authors: data.authors ?? null,
    image: data.image,
  };

  await upsertDoc(`blog:${doc._id}`, doc as unknown as Record<string, unknown>);
  return NextResponse.json({ ok: true, upserted: doc._id });
}

