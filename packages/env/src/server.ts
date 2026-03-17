import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

const env = createEnv({
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },

  server: {
    SANITY_API_READ_TOKEN: z.string().min(1),
    SANITY_API_WRITE_TOKEN: z.string().min(1),
    /**
     * OpenSearch (or compatible) endpoint and credentials.
     * In local Docker dev, this is typically `http://localhost:9200`.
     */
    OPENSEARCH_NODE: z.string().url().optional(),
    OPENSEARCH_USERNAME: z.string().min(1).optional(),
    OPENSEARCH_PASSWORD: z.string().min(1).optional(),
    /**
     * Shared secret to validate Sanity webhook calls into Next.js.
     * If unset, webhook routes will reject requests by default.
     */
    SANITY_WEBHOOK_SECRET: z.string().min(16).optional(),
    /**
     * Simple bearer token used to protect admin-only reindex endpoints.
     */
    REINDEX_TOKEN: z.string().min(16).optional(),
  },

  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
  },

  extends: [vercel()],
});

export { env };
