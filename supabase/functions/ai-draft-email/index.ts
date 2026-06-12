import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface DraftRequest {
  emailSubject?: string;
  emailBody?: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  tone?: "professional" | "friendly" | "concise" | "formal";
  action?: string;
  isReply?: boolean;
  isForward?: boolean;
  language?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: DraftRequest = await req.json();
    const {
      emailSubject,
      emailBody,
      senderName,
      senderEmail,
      recipientName,
      recipientEmail,
      tone = "professional",
      action,
      isReply = false,
      isForward = false,
      language = "English",
    } = body;

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: "OpenAI API key not configured. Add OPENAI_API_KEY to your Supabase Edge Function secrets.",
          draft: null,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = `You are a professional email assistant. You write emails in ${language} with a ${tone} tone. Keep responses concise, clear, and natural. Do not use overly formal language unless "formal" tone is requested. Always include a proper greeting and sign-off.`;

    let userPrompt = "";

    if (isReply) {
      userPrompt = `Write a reply to this email.\n\nOriginal email subject: ${emailSubject || "(No subject)"}\nOriginal email body:\n${emailBody || "(No body)"}\n\nFrom: ${senderName || senderEmail || "Unknown"}\nTo: ${recipientName || recipientEmail || "Unknown"}`;
      if (action) {
        userPrompt += `\n\nThe user wants to: ${action}`;
      }
    } else if (isForward) {
      userPrompt = `Write a brief forward introduction for this email:\n\nSubject: ${emailSubject || "(No subject)"}\nBody:\n${emailBody || "(No body)"}\n\nFrom: ${senderName || senderEmail || "Unknown"}`;
      if (action) {
        userPrompt += `\n\nContext: ${action}`;
      }
    } else {
      userPrompt = `Write a new email.\n\nFrom: ${recipientName || recipientEmail || "Unknown"}\nTo: ${senderName || senderEmail || "Unknown"}\nSubject: ${emailSubject || "(No subject)"}`;
      if (action) {
        userPrompt += `\n\nThe user wants to: ${action}`;
      }
      if (emailBody) {
        userPrompt += `\n\nAdditional context or notes:\n${emailBody}`;
      }
    }

    userPrompt += "\n\nReturn ONLY the email body text. Do not include any explanation, markdown, or the subject line. Just the raw body text ready to be sent.";

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI error:", JSON.stringify(errorData));
      return new Response(
        JSON.stringify({
          error: errorData?.error?.message || "OpenAI API request failed",
          draft: null,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const draft = openaiData?.choices?.[0]?.message?.content?.trim() || "";

    // Log the AI usage
    await supabase.from("ai_logs").insert({
      user_id: user.id,
      action: isReply ? "reply_draft" : isForward ? "forward_draft" : "compose_draft",
      input_length: (emailBody || "").length + (action || "").length,
      output_length: draft.length,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ draft, success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("AI draft error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error", draft: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
