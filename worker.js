export default {
  async fetch(request, env) {
    // Official Short.io MCP endpoint.
    const upstreamUrl = "https://ai-assistant.short.io/mcp";

    // Copy incoming headers.
    const headers = new Headers(request.headers);

    // Inject the Short.io API key stored as a Cloudflare secret.
    headers.set("Authorization", env.SHORTIO_API_KEY);

    // Remove the incoming Host header.
    headers.delete("host");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    // Forward MCP request bodies.
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    // Send request to Short.io.
    const response = await fetch(upstreamUrl, init);

    // Return Short.io's response unchanged.
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
