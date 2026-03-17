## AWS architecture (proposed)

This is how I’d deploy this repo to AWS with **CloudFront** + **WAF** in front, while supporting:

- Next.js 16 App Router (SSR + dynamic routes + API routes)
- pnpm workspaces + Turborepo build
- Sanity Studio (frontend only; Sanity backend is SaaS)
- OpenSearch-backed search with webhook-driven indexing
- `/api/og` image generation (currently “edge” in code, but deployable as Node compute in AWS)

### Assumptions

- Primary deployment target is AWS (the test asks for AWS design; Vercel is optional for a live demo).
- Traffic profile is typical for a content site (bursty reads, low write volume).
- Editors publish in Sanity; the website is the only consumer of OpenSearch.

### Compute

#### Recommended: ECS/Fargate for `apps/web`

**Why ECS here**

- Handles **monorepo builds** cleanly (pnpm + turbo in one Docker build context).
- No edge-runtime constraints: `/api/og` and webhooks run as **Node.js**.
- Simple VPC placement so the app can talk privately to OpenSearch.

**Shape**

- **ECS Service** (Fargate) running `next start`
- **ALB** in front of ECS (HTTP → HTTPS redirect at CloudFront, or at ALB)
- App tasks in private subnets; ALB in public subnets

**Build**

- Multi-stage Dockerfile (repo root):
  - `pnpm install --frozen-lockfile`
  - `turbo run build --filter=web`
  - Copy `.next/` + `node_modules/` (or do a production install) into the runtime stage

#### Alternative: Lambda with OpenNext / SST

This is viable if the toolchain supports **Next.js 16 + the monorepo** end-to-end, but it’s higher integration risk for this particular repo. I’d choose it only if the client explicitly wants serverless and accepts the constraints (cold starts, packaging complexity, edge runtime parity).

#### Sanity Studio (`apps/studio`)

Studio is a static build:

- Build with `sanity build`
- Host on **S3** behind **CloudFront**
- Protect with WAF, and optionally restrict by auth/IP if required

### CDN (CloudFront)

One distribution, two origins:

- **Origin A (web)**: ALB → ECS (Next.js)
- **Origin B (studio)**: S3 (static)

#### Cache behaviors (practical defaults)

- **`/_next/static/*`**
  - Cache: **1 year**
  - Forward: none (no cookies, no query strings)
  - Reason: content-hashed assets

- **Images**
  - Sanity CDN images: respect origin caching; CloudFront TTL **days–months**
  - Next Image (`/_next/image`): cache **days**; include query string in cache key

- **`/api/*`**
  - Default cache: **0 seconds**
  - Forward: query string (for search), minimal headers
  - Exception: safe endpoints can have short caching (e.g. 30–60s) *if* you set a precise cache key and accept staleness.

- **HTML**
  - Default cache: short (0–60s) unless you implement ISR-style rules explicitly.
  - In practice: let Next.js control freshness; keep CDN caching conservative for HTML.

### WAF (attached to CloudFront)

I’d attach a Web ACL with:

- **Rate limiting (API)**
  - Scope-down: URI path starts with `/api/`
  - Threshold: **300 requests / 5 minutes / IP** (tune after observing real traffic)
  - Rationale: protects `/api/search` from abuse while allowing typing + retries.

- **Managed rules**
  - `AWSManagedRulesCommonRuleSet` (includes many common exploit patterns, incl. XSS vectors)
  - `AWSManagedRulesSQLiRuleSet`

- **IP reputation**
  - `AWSManagedRulesAmazonIpReputationList`

Optional (budget-dependent):

- Bot Control managed rule set
- Geo restriction if the site’s audience is limited to specific regions

### OpenSearch

- **Service**: Amazon OpenSearch Service
- **Networking**: private subnets in the same VPC as ECS/Lambda
- **Access**:
  - Prefer IAM-based access controls where possible
  - Otherwise store credentials in **Secrets Manager** and restrict access via security groups

### Data flow (Sanity → index → user)

1. Editor publishes/updates/deletes a blog post in **Sanity**
2. Sanity calls a webhook on the site:
   - `POST /api/opensearch/webhook/sanity`
   - Verified using `SANITY_WEBHOOK_SECRET` (shared secret or HMAC signature)
3. The handler fetches the canonical doc from Sanity (by `_id`) and:
   - upserts the OpenSearch document, or
   - deletes it if removed/unpublished
4. Users search:
   - UI calls `GET /api/search?q=...`
   - API queries OpenSearch and returns combined results (blogs + pokemon)
5. Caching & invalidation:
   - Static assets: CloudFront long TTL
   - PokeAPI: server-side caching (revalidate window)
   - Search freshness: webhook upsert/delete is the invalidation mechanism

### Diagram

```mermaid
flowchart LR
  U[User Browser] -->|HTTPS| CF[CloudFront + WAF]

  CF -->|/studio/*| S3[(S3: Studio static build)]
  CF -->|Web + /api/*| ALB[ALB]
  ALB --> ECS[ECS/Fargate: Next.js web]

  ECS -->|read content| SANITY[Sanity API/CDN]
  ECS -->|search query| OS[(OpenSearch)]
  ECS -->|PokeAPI fetch (cached)| POKE[PokeAPI]

  SANITY -->|publish webhook| CF --> ECS
```

### Monitoring & alerting (what I’d actually set)

- **CloudFront**:
  - 5xx error rate alarm (origin errors)
  - WAF blocked requests anomaly alarm (sudden spikes)
- **ECS/ALB**:
  - ALB target 5xx + target response time
  - ECS CPU/memory + task restarts
- **OpenSearch**:
  - Cluster health (red/yellow), JVM memory pressure, free storage
- **Application-level**:
  - Alert on sustained failures indexing webhooks or OpenSearch query errors

