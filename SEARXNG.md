# SearXNG Backend

Local SearXNG instance tunneled to Cloudflare via `cloudflared`. Powers grocery search for Sift.

## Architecture

```
Sift frontend → siftapi.workers.dev/api/search → cloudflared tunnel → SearXNG (localhost:8080)
```

## Start Tunnel

```sh
nohup cloudflared tunnel --url http://localhost:8080 > /tmp/cloudflared.log 2>&1 &
```

Check tunnel URL:

```sh
grep -o 'https://[a-z-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

## When Tunnel URL Changes

The trycloudflare URL resets every time the tunnel restarts. Run:

```sh
cd ~/Projects/Sift/workers
pnpm exec wrangler secret put SEARXNG_URL
```

Paste the new URL from the tunnel log. No redeploy needed — secret updates live.

## Restart SearXNG

```sh
cd ~/searxng-docker
docker compose restart
```

## Check Logs

```sh
docker logs searxng
```

## Move to Production

Replace trycloudflare with a named tunnel + real domain:

1. `cloudflared tunnel create searxng`
2. Configure DNS + ingress in `~/.cloudflared/config.yml`
3. `cloudflared tunnel route dns searxng searxng.internal`
4. Set `SEARXNG_URL` to `https://searxng.internal`
5. Replace Worker's `fetch` target from tunnel URL to VPC binding
