# Short.io MCP Proxy

A Cloudflare Worker proxy that allows MCP clients such as ChatGPT to connect to Short.io's MCP server while keeping the Short.io API key inside Cloudflare Secrets.

## Architecture

```text
ChatGPT / MCP Client
        ↓
Cloudflare Worker
        ↓
Short.io MCP
```

The Worker forwards requests to `https://ai-assistant.short.io/mcp`, replaces the incoming `Authorization` header with `SHORTIO_API_KEY`, and streams the upstream response back to the client. Request methods and bodies are preserved; GET and HEAD have no body. Redirects are returned to the client rather than followed.

## Why this exists

Short.io's MCP endpoint requires an Authorization API key. Cloudflare Secrets provides a place to store that credential and inject it into upstream requests. The current public endpoint has no client authentication; credential storage alone does not prevent unauthorized use of the proxy.

## Requirements

- A Cloudflare account with Cloudflare Workers access
- Node.js and npm
- Wrangler, invoked through `npx`
- A Short.io API key
- An MCP client such as ChatGPT

## Files

- `worker.js`: MCP request and response forwarding.
- `wrangler.jsonc`: Worker identity, entry point, compatibility, and logging configuration.
- `.gitignore`: excludes local secrets, dependencies, and generated state.
- `README.md`: setup, usage, and security overview.
- `docs/setup.md`: detailed recovery and troubleshooting reference.

## Cloudflare Secret

The required secret is `SHORTIO_API_KEY`. For a new deployment, enter its value at the interactive prompt:

```powershell
npx wrangler secret put SHORTIO_API_KEY
```

The existing deployment already has this secret. It does not need to be replaced during repository setup. Never put its value in source files, Wrangler configuration, documentation, or committed environment files.

## Local setup

Open a terminal in the cloned project directory and authenticate with Cloudflare:

```powershell
npx wrangler login
npx wrangler whoami
```

Verify the intended Cloudflare account before deploying.

## Deployment

```powershell
npx wrangler deploy
```

Wrangler is used for deployment and configuration. No local process needs to remain running after deployment. Preparing or cloning this repository does not require redeploying the working Worker.

## Compatibility flag

`global_fetch_strictly_public` is retained in `wrangler.jsonc` because this setup encountered Cloudflare error 1042 when fetching the Short.io MCP endpoint without it. Deploying the flag through Wrangler resolved that routing issue. The dashboard did not allow this flag to be added directly in the original setup.

## Testing

For the current deployment:

```powershell
curl.exe -i https://shortio-mcp-proxy.cohort-c62.workers.dev
```

The previously observed diagnostic response was `HTTP/1.1 400 Bad Request`, with Short.io-specific headers such as `access-control-expose-headers: Shortio-message-id`, `x-ratelimit-limit`, and `x-ratelimit-remaining`. Those headers indicate that the proxy reached Short.io.

A 400 is acceptable only for this raw, non-MCP GET diagnostic: it is not a complete MCP initialization request. HTTP 400 is not generally a success response, and this check does not establish that a full MCP session works. Validate full integration through the MCP client.

## ChatGPT setup

Configure the connection as follows:

| Setting | Value |
| --- | --- |
| Name | `short.io` |
| Connection | Server URL |
| Server URL | `https://shortio-mcp-proxy.cohort-c62.workers.dev` |
| Authentication | No Auth |

Do not append `/mcp` with the current Worker code. The Worker root already forwards to `https://ai-assistant.short.io/mcp`.

## Security

The current deployment exposes a public Worker URL with no client authentication. The Short.io API key remains stored in Cloudflare Secrets and is injected only into the upstream request, but someone with the Worker URL may potentially use the Worker as a proxy with that credential's permissions.

Optional future hardening could require `Authorization: Bearer PROXY_TOKEN`, validate that token at the Worker, then replace the header with `SHORTIO_API_KEY` before forwarding. **PROXY_TOKEN authentication is not implemented in this version.**

## Troubleshooting

### Error 1042

This project encountered an outbound routing issue when fetching Short.io. Preserve the `global_fetch_strictly_public` compatibility flag and deploy configuration changes through Wrangler. See [setup notes](docs/setup.md) for recovery checks.

### Error 10021

`No event handlers were registered. This script does nothing.` occurred because the local `worker.js` was empty. Check its contents:

```powershell
type worker.js
```

Restore the Worker implementation before deploying.

### Wrangler remote/local configuration warning

`preview_urls: false` and enabled `observability` / `observability.logs` explicitly preserve the working remote settings. Earlier local defaults differed from the remote deployment. Retain these values to avoid unintentionally changing preview URLs or logging.

### Empty worker.js

Run `type worker.js` from the project directory and verify that it contains an exported `fetch` handler. An empty file cannot serve the proxy and caused error 10021 in this project.

## Recovery / Rebuild

1. Clone this repository, or restore `worker.js` and `wrangler.jsonc` from a known good commit.
2. Run `npx wrangler login` and `npx wrangler whoami` to verify the Cloudflare account.
3. Preserve the Worker name, entry point, compatibility date and flag, preview URL setting, and observability settings.
4. For a new deployment only, set `SHORTIO_API_KEY` interactively. Reuse the existing remote secret when recovering the current Worker.
5. If deployment is needed, run `npx wrangler deploy`.
6. Run the raw GET diagnostic, then verify an MCP session using the client settings above.

See [docs/setup.md](docs/setup.md) for the exact configuration and recovery details.
