import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in is required." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    // Supabase provides these standard variables automatically to Edge Functions.
    // Keep support for the newer key collections as well.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? publishableKeys.default;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? secretKeys.default;
    const metaToken = Deno.env.get("META_WHATSAPP_TOKEN");
    const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");
    const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") ?? "v23.0";
    const templateName = Deno.env.get("META_TEMPLATE_NAME") ?? "jivaan_footwear_token";
    const templateLanguage = Deno.env.get("META_TEMPLATE_LANGUAGE") ?? "en";

    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Supabase server configuration is incomplete." }, 500);
    if (!metaToken || !phoneNumberId) return json({ error: "WhatsApp Cloud API is not configured yet." }, 503);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Your staff session is invalid. Sign in again." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: profile, error: profileError } = await admin
      .from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
    if (profileError) return json({ error: "Could not verify staff permission." }, 500);
    if (!profile || !["admin", "supervisor", "staff"].includes(profile.role)) {
      return json({ error: "This account is not approved to send customer tokens." }, 403);
    }

    const body = await req.json();
    const tokenId = String(body.tokenId ?? "").trim();
    const mobile = String(body.mobile ?? "").replace(/\D/g, "");
    const imageData = String(body.imageData ?? "");
    if (!tokenId || !/^[6-9]\d{9}$/.test(mobile)) return json({ error: "A valid token and 10-digit mobile number are required." }, 400);
    if (!imageData.startsWith("data:image/png;base64,")) return json({ error: "Token image must be a PNG image." }, 400);
    const base64 = imageData.slice("data:image/png;base64,".length);
    if (base64.length > 6_500_000) return json({ error: "Token image is too large to send." }, 413);

    const { data: deposit, error: depositError } = await admin
      .from("deposits")
      .select("token_id,mobile,bag_code,expires_at")
      .eq("token_id", tokenId).maybeSingle();
    if (depositError) return json({ error: "Could not verify the saved deposit." }, 500);
    if (!deposit || String(deposit.mobile).replace(/\D/g, "").slice(-10) !== mobile) {
      return json({ error: "The saved deposit does not match this mobile number." }, 404);
    }

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "image/png");
    form.append("file", new Blob([bytes], { type: "image/png" }), "jivaan-token.png");

    const uploadResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${metaToken}` },
      body: form,
    });
    const upload = await uploadResponse.json();
    if (!uploadResponse.ok || !upload.id) {
      return json({ error: "WhatsApp image upload failed.", details: upload.error?.message ?? "Meta did not return a media ID." }, 502);
    }

    const recipient = "91" + mobile;
    const expiry = new Date(deposit.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const messageResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${metaToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [
            { type: "header", parameters: [{ type: "image", image: { id: upload.id } }] },
            { type: "body", parameters: [
              { type: "text", text: String(deposit.bag_code) },
              { type: "text", text: tokenId },
              { type: "text", text: expiry },
            ] },
          ],
        },
      }),
    });
    const sent = await messageResponse.json();
    if (!messageResponse.ok) {
      return json({ error: "WhatsApp did not accept the token message.", details: sent.error?.message ?? "Template may not be approved or the recipient may not be eligible." }, 502);
    }

    return json({ success: true, messageId: sent.messages?.[0]?.id ?? null, status: "accepted_by_whatsapp" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected server error." }, 500);
  }
});
