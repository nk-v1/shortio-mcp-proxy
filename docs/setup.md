# Setup and recovery reference

## Existing deployment

| Item | Value |
| --- | --- |
| Worker name | `shortio-mcp-proxy` |
| Worker URL | `https://shortio-mcp-proxy.cohort-c62.workers.dev` |
| Upstream | `https://ai-assistant.short.io/mcp` |
| Remote secret | `SHORTIO_API_KEY` |
| Client authentication | No Auth |

The existing remote secret should be preserved. Repository preparation does not require a Worker deployment, secret update, or a running local server.

## Required configuration

Preserve these settings in `wrangler.jsonc`:

```json
{
  "name": "shortio-mcp-proxy",
  "main": "worker.js",
  "compatibility_date": "2026-09-09",
  "compatibility_flags": ["global_fetch_strictly_public"],
  "preview_urls": false,
  "observability": {
    "enabled": true,
    "logs": { "enabled": true }
  }
}
```

The original dashboard workflow could not add the required compatibility flag. Wrangler deploys this local configuration. Earlier local defaults used preview URLs enabled and observability disabled, while the working remote settings were the reverse. Explicit values prevent accidental changes during deployment.

## Rebuild procedure

1. Restore the repository files into a project directory. Verify that `worker.js` is non-empty with `type worker.js` and includes `export default` with an asynchronous `fetch` handler.
2. Install Node.js/npm if needed. From the project directory, run `npx wrangler login`, then `npx wrangler whoami`. Confirm the account that owns the existing Worker.
3. Confirm that `wrangler.jsonc` matches the configuration above. Preserve the Worker name and owning account to target the existing deployment.
4. For a new deployment without the secret, run `npx wrangler secret put SHORTIO_API_KEY` and enter the key interactively. Do not replace the existing secret during routine recovery or place the value in a command, file, or Git commit.
5. When a deployment is necessary, run `npx wrangler deploy`. No local process must stay running afterward.
6. Run `curl.exe -i https://shortio-mcp-proxy.cohort-c62.workers.dev`. A raw GET previously returned a Short.io 400 response with Short.io-specific headers. This confirms upstream reachability only, not full MCP functionality.
7. Configure the MCP client with the Worker root URL and No Auth. Do not append `/mcp`. Verify an actual MCP connection in the client.

A deployment in another Cloudflare account will have a different account subdomain; use the URL returned by Wrangler for that separate deployment.

## Troubleshooting sequence

- **Cloudflare error 1042:** In this setup, outbound fetching to Short.io failed until `global_fetch_strictly_public` was deployed through Wrangler. Check that the flag remains in the configuration used for deployment.
- **Cloudflare error 10021:** The message was `No event handlers were registered. This script does nothing.` The known cause was an empty local `worker.js`. Run `type worker.js`, restore the code, then deploy if needed.
- **Configuration mismatch warning:** Check `preview_urls`, `observability.enabled`, and `observability.logs.enabled` against the values above before deploying.
- **Raw GET returns 400:** Check for Short.io-specific response headers, including `Shortio-message-id` in `access-control-expose-headers` and rate-limit headers. This is an acceptable diagnostic result for an incomplete MCP request only. Investigate actual MCP session failures separately.

## Security boundaries

The Worker overwrites the caller's Authorization header with the secret and removes the incoming Host header before fetching the fixed upstream endpoint. Responses are streamed back without intentional modification.

The public Worker URL has no client authentication. Knowledge of that URL can permit use of the proxy with the Short.io credential's permissions. Keep actual credentials out of Git; `.gitignore` excludes `.env`, `.env.*`, `.dev.vars`, and `.dev.vars.*`, along with local Wrangler state.

Future hardening may validate a separate bearer `PROXY_TOKEN` before replacing Authorization for Short.io. That design is documentation only and is not implemented here.
