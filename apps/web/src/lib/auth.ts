import { env } from "@workspace/env/server";

export function assertReindexAuth(request: Request) {
  const token = env.REINDEX_TOKEN;
  if (!token) {
    return { ok: false as const, status: 503 as const, message: "Not configured" };
  }

  const header = request.headers.get("authorization");
  if (!header) {
    return { ok: false as const, status: 401 as const, message: "Missing auth" };
  }

  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || value !== token) {
    return { ok: false as const, status: 403 as const, message: "Invalid auth" };
  }

  return { ok: true as const };
}

