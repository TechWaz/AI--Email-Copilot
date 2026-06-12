import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function base64Encode(str: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}

function buildSmtpCommand(cmd: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(cmd + "\r\n");
}

async function smtpSend(
  host: string,
  port: number,
  email: string,
  password: string,
  fromName: string,
  to: string,
  cc: string | undefined,
  bcc: string | undefined,
  subject: string,
  bodyHtml: string,
  bodyText: string,
  inReplyTo: string | undefined,
  references: string | undefined
): Promise<string> {
  console.log(`[SMTP] Connecting to ${host}:${port}...`);
  const conn = await Deno.connectTls({ hostname: host, port });
  console.log("[SMTP] TLS connection established");

  const decoder = new TextDecoder();
  const buf = new Uint8Array(65536);
  let bufLen = 0;
  let bufPos = 0;

  async function readLine(): Promise<string> {
    while (true) {
      for (let i = bufPos; i < bufLen - 1; i++) {
        if (buf[i] === 13 && buf[i + 1] === 10) {
          const line = decoder.decode(buf.slice(bufPos, i));
          bufPos = i + 2;
          return line;
        }
      }
      if (bufPos > 0 && bufPos < bufLen) {
        buf.copyWithin(0, bufPos, bufLen);
        bufLen -= bufPos;
        bufPos = 0;
      } else if (bufPos >= bufLen) {
        bufLen = 0;
        bufPos = 0;
      }
      const n = await conn.read(buf.subarray(bufLen));
      if (n === null) throw new Error("Connection closed by server");
      bufLen += n;
    }
  }

  async function sendCmd(cmd: string): Promise<string> {
    await conn.write(buildSmtpCommand(cmd));
    return await readLine();
  }

  // Read greeting
  const greeting = await readLine();
  console.log("[SMTP] Greeting:", greeting.slice(0, 150));
  if (!greeting.startsWith("220")) {
    throw new Error(`SMTP greeting unexpected: ${greeting.slice(0, 200)}`);
  }

  // EHLO
  const ehloResp = await sendCmd("EHLO readdy");
  console.log("[SMTP] EHLO:", ehloResp.slice(0, 150));

  // AUTH LOGIN
  const authResp = await sendCmd("AUTH LOGIN");
  if (!authResp.startsWith("334")) {
    throw new Error(`AUTH LOGIN not accepted: ${authResp.slice(0, 200)}`);
  }

  const userResp = await sendCmd(base64Encode(email));
  if (!userResp.startsWith("334")) {
    throw new Error(`Username rejected: ${userResp.slice(0, 200)}`);
  }

  const passResp = await sendCmd(base64Encode(password));
  if (!passResp.startsWith("235")) {
    throw new Error(`SMTP authentication failed: ${passResp.slice(0, 300)}. Check your email and password.`);
  }
  console.log("[SMTP] Authenticated successfully");

  // MAIL FROM
  const mailFromResp = await sendCmd(`MAIL FROM:<${email}>`);
  if (!mailFromResp.startsWith("250")) {
    throw new Error(`MAIL FROM failed: ${mailFromResp.slice(0, 200)}`);
  }

  // RCPT TO
  const recipients = [to];
  if (cc) cc.split(",").forEach((r) => recipients.push(r.trim()));
  if (bcc) bcc.split(",").forEach((r) => recipients.push(r.trim()));

  for (const rcpt of recipients) {
    const rcptResp = await sendCmd(`RCPT TO:<${rcpt.trim()}>`);
    if (!rcptResp.startsWith("250") && !rcptResp.startsWith("251")) {
      console.warn(`[SMTP] RCPT TO ${rcpt} warning: ${rcptResp.slice(0, 150)}`);
    }
  }

  // DATA
  const dataResp = await sendCmd("DATA");
  if (!dataResp.startsWith("354")) {
    throw new Error(`DATA command failed: ${dataResp.slice(0, 200)}`);
  }

  // Build MIME message
  const boundary = `----=_Readdy_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const date = new Date().toUTCString();
  const msgId = `<${Date.now()}-${Math.random().toString(36).slice(2, 10)}@readdy>`;

  let headers = "";
  headers += `From: ${fromName} <${email}>\r\n`;
  headers += `To: ${to}\r\n`;
  if (cc) headers += `Cc: ${cc}\r\n`;
  headers += `Subject: =?UTF-8?B?${base64Encode(subject)}?=\r\n`;
  headers += `Date: ${date}\r\n`;
  headers += `Message-ID: ${msgId}\r\n`;
  if (inReplyTo) headers += `In-Reply-To: <${inReplyTo}>\r\n`;
  if (references) headers += `References: <${references}>\r\n`;
  headers += `MIME-Version: 1.0\r\n`;
  headers += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
  headers += `\r\n`;

  let body = "";
  body += `--${boundary}\r\n`;
  body += `Content-Type: text/plain; charset="UTF-8"\r\n`;
  body += `Content-Transfer-Encoding: base64\r\n`;
  body += `\r\n`;
  body += `${base64Encode(bodyText)}\r\n`;
  body += `\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Type: text/html; charset="UTF-8"\r\n`;
  body += `Content-Transfer-Encoding: base64\r\n`;
  body += `\r\n`;
  body += `${base64Encode(bodyHtml)}\r\n`;
  body += `\r\n`;
  body += `--${boundary}--\r\n`;

  const message = headers + body;
  const finalMsg = message + ".\r\n";

  await conn.write(buildSmtpCommand(finalMsg));

  const resp = await readLine();
  console.log("[SMTP] Send response:", resp.slice(0, 150));

  if (!resp.startsWith("250")) {
    throw new Error(`Failed to send message: ${resp.slice(0, 300)}`);
  }

  // QUIT
  try {
    await sendCmd("QUIT");
  } catch { /* ignore */ }

  conn.close();
  return msgId;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Send email request received`);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: {
      accountId?: string;
      to?: string;
      cc?: string;
      bcc?: string;
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      inReplyTo?: string;
      references?: string;
    } = {};

    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, inReplyTo, references } = body;

    if (!accountId || !to || !subject) {
      return new Response(JSON.stringify({ error: "accountId, to, and subject are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up account
    const { data: account, error: acctErr } = await supabase
      .from("email_accounts")
      .select("id, user_id, email_address, display_name, smtp_host, smtp_port, encrypted_password")
      .eq("id", accountId)
      .single();

    if (acctErr || !account) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (account.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = account.display_name || account.email_address.split("@")[0];
    const html = bodyHtml || bodyText?.replace(/\n/g, "<br/>") || "";
    const text = bodyText || "";

    console.log(`[${requestId}] Sending from ${account.email_address} to ${to} via ${account.smtp_host}:${account.smtp_port}`);

    const msgId = await smtpSend(
      account.smtp_host,
      account.smtp_port,
      account.email_address,
      account.encrypted_password,
      displayName,
      to,
      cc || undefined,
      bcc || undefined,
      subject,
      html,
      text,
      inReplyTo || undefined,
      references || undefined
    );

    console.log(`[${requestId}] Email sent successfully, Message-ID: ${msgId}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Email sent successfully",
      messageId: msgId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error(`[${requestId}] Send error:`, errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
