import { NextResponse } from "next/server";

import { assertReindexAuth } from "@/lib/auth";
import { ensureContentIndex, upsertDoc } from "@/lib/opensearch/client";
import type { BlogSearchDoc } from "@/lib/opensearch/types";
import { sanityFetch } from "@/lib/sanity/live";
import { queryAllBlogDataForSearch } from "@/lib/sanity/query";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = assertReindexAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const ensured = await ensureContentIndex();
  if (!ensured.ok) {
    return NextResponse.json(
      { error: "OpenSearch not configured" },
      { status: 503 }
    );
  }

  const { data } = await sanityFetch({
    query: queryAllBlogDataForSearch,
    stega: false,
  });

  if (!Array.isArray(data)) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  let indexed = 0;
  for (const blog of data) {
    const doc: BlogSearchDoc = {
      type: "blog",
      _id: blog._id,
      title: blog.title,
      description: blog.description,
      slug: blog.slug,
      publishedAt: blog.publishedAt,
      // matches query fragment: authors is a single object (authors[0]->{...})
      authors: blog.authors ?? null,
      image: blog.image,
    };

    await upsertDoc(`blog:${doc._id}`, doc as unknown as Record<string, unknown>);
    indexed += 1;
  }

  return NextResponse.json({ ok: true, indexed });
}

