const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Meta verifies a webhook with a GET request and expects the challenge as plain text.
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response("Webhook verification failed", { status: 403 });
  }

  // Meta sends webhook notifications with POST requests.
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      console.log("WhatsApp webhook event received", JSON.stringify(payload));
      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: { Allow: "GET, POST" },
  });
});
