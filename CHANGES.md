# CHANGES.md

## 2026-07-16

### Redeploy Sift after shelving

- Deleted old Worker `siftapi` and D1 `sift` (both already gone from Cloudflare)
- Created new D1 database `sift` in WEUR region
  - New database_id: `695c35a2-4800-4730-b699-97a698e17e73`
  - Updated `workers/wrangler.toml:14`
- Applied schema (`workers/schema.sql`) — 7 tables created
- Set secrets:
  - `ADMIN_SECRET` — new value generated
  - `JWT_SECRET` — new value generated
  - `GOOGLE_CLIENT_ID` — reused from `src/components/AuthContext.tsx:43`
  - `RESEND_API_KEY` — removed (unused)
- Deployed Worker: `https://siftapi.blackmesa.workers.dev`
  - Cron trigger: `0 6 * * *`
  - Bindings: D1 `DB` → `sift`
