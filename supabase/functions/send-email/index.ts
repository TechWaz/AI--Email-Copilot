import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

// Safe base64 for any size string — chunked to avoid max-call-stack on large bodies
function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Raw bytes → base64 (for attachments already in binary)
function base64EncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Wrap base64 at 76 chars as required by MIME spec
function mimeB64(str: string): string {
  const b64 = base64Encode(str);
  return b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
}

function mimeB64Bytes(bytes: Uint8Array): string {
  const b64 = base64EncodeBytes(bytes);
  return b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
}

// Ensure every byte is written — conn.write() may do a partial write for large buffers
async function writeAll(conn: Deno.TlsConn, data: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < data.length) {
    offset += await conn.write(data.subarray(offset));
  }
}

interface Attachment {
  name: string;
  type: string;
  data: string; // base64 from browser FileReader
}

interface InlineImage {
  cid: string;
  type: string;
  b64: string;
}

// Extract data: URI images from HTML, replace with cid: references
function extractInlineImages(html: string): { html: string; images: InlineImage[] } {
  const images: InlineImage[] = [];
  const updated = html.replace(
    /(<img[^>]*?)\ssrc="data:([^;]+);base64,([^"]*)"/gi,
    (_match, prefix: string, mimeType: string, b64: string) => {
      const cid = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}@readdy`;
      images.push({ cid, type: mimeType, b64 });
      return `${prefix} src="cid:${cid}"`;
    },
  );
  return { html: updated, images };
}

function buildAltPart(bodyText: string, htmlWithCids: string, altBoundary: string): string {
  let part = `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n`;
  part += `\r\n`;
  part += `--${altBoundary}\r\n`;
  part += `Content-Type: text/plain; charset="UTF-8"\r\n`;
  part += `Content-Transfer-Encoding: base64\r\n`;
  part += `\r\n`;
  part += `${mimeB64(bodyText)}\r\n`;
  part += `\r\n`;
  part += `--${altBoundary}\r\n`;
  part += `Content-Type: text/html; charset="UTF-8"\r\n`;
  part += `Content-Transfer-Encoding: base64\r\n`;
  part += `\r\n`;
  part += `${mimeB64(htmlWithCids)}\r\n`;
  part += `\r\n`;
  part += `--${altBoundary}--\r\n`;
  return part;
}

function buildRelatedPart(
  bodyText: string,
  htmlWithCids: string,
  altBoundary: string,
  relBoundary: string,
  inlineImages: InlineImage[],
): string {
  let part = `Content-Type: multipart/related; boundary="${relBoundary}"\r\n`;
  part += `\r\n`;
  part += `--${relBoundary}\r\n`;
  part += buildAltPart(bodyText, htmlWithCids, altBoundary);
  for (const img of inlineImages) {
    const imgBytes = Uint8Array.from(atob(img.b64), c => c.charCodeAt(0));
    part += `\r\n--${relBoundary}\r\n`;
    part += `Content-Type: ${img.type}\r\n`;
    part += `Content-Transfer-Encoding: base64\r\n`;
    part += `Content-Disposition: inline\r\n`;
    part += `Content-ID: <${img.cid}>\r\n`;
    part += `\r\n`;
    part += `${mimeB64Bytes(imgBytes)}\r\n`;
  }
  part += `\r\n--${relBoundary}--\r\n`;
  return part;
}

function buildMimeMessage(
  email: string,
  fromName: string,
  to: string,
  cc: string | undefined,
  subject: string,
  bodyHtml: string,
  bodyText: string,
  inReplyTo: string | undefined,
  references: string | undefined,
  msgId: string,
  attachments: Attachment[],
): string {
  const { html: htmlWithCids, images: inlineImages } = extractInlineImages(bodyHtml);

  const altBoundary = `alt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const relBoundary = `rel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const mixedBoundary = `mix_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const date = new Date().toUTCString();

  const hasAttachments = attachments.length > 0;
  const hasInlineImages = inlineImages.length > 0;

  let msg = "";
  msg += `From: ${fromName} <${email}>\r\n`;
  msg += `To: ${to}\r\n`;
  if (cc) msg += `Cc: ${cc}\r\n`;
  msg += `Subject: =?UTF-8?B?${base64Encode(subject)}?=\r\n`;
  msg += `Date: ${date}\r\n`;
  msg += `Message-ID: ${msgId}\r\n`;
  if (inReplyTo) msg += `In-Reply-To: <${inReplyTo}>\r\n`;
  if (references) msg += `References: <${references}>\r\n`;
  msg += `MIME-Version: 1.0\r\n`;

  if (hasAttachments) {
    // multipart/mixed wraps everything; body goes in first part
    msg += `Content-Type: multipart/mixed; boundary="${mixedBoundary}"\r\n`;
    msg += `\r\n`;
    msg += `--${mixedBoundary}\r\n`;
    if (hasInlineImages) {
      msg += buildRelatedPart(bodyText, htmlWithCids, altBoundary, relBoundary, inlineImages);
    } else {
      msg += buildAltPart(bodyText, htmlWithCids, altBoundary);
    }
    for (const att of attachments) {
      const attBytes = Uint8Array.from(atob(att.data), c => c.charCodeAt(0));
      msg += `\r\n--${mixedBoundary}\r\n`;
      msg += `Content-Type: ${att.type}; name="${att.name}"\r\n`;
      msg += `Content-Transfer-Encoding: base64\r\n`;
      msg += `Content-Disposition: attachment; filename="${att.name}"\r\n`;
      msg += `\r\n`;
      msg += `${mimeB64Bytes(attBytes)}\r\n`;
    }
    msg += `\r\n--${mixedBoundary}--\r\n`;
  } else if (hasInlineImages) {
    // multipart/related for HTML + inline images, no file attachments
    msg += buildRelatedPart(bodyText, htmlWithCids, altBoundary, relBoundary, inlineImages);
  } else {
    // Plain text + HTML only
    msg += buildAltPart(bodyText, htmlWithCids, altBoundary);
  }

  return msg;
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
  references: string | undefined,
  attachments: Attachment[],
): Promise<string> {
  // Build entire MIME message BEFORE opening the SMTP connection so there is
  // zero delay between DATA 354 and writing the body — Hostinger times out otherwise.
  const msgId = `<${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}@readdy>`;
  const mimeMessage = buildMimeMessage(
    email, fromName, to, cc, subject,
    bodyHtml, bodyText, inReplyTo, references, msgId, attachments,
  );

  console.log(`[SMTP] Connecting to ${host}:${port}…`);
  const conn = await Deno.connectTls({ hostname: host, port });

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const buf = new Uint8Array(65536);
  let bufLen = 0;
  let bufPos = 0;

  async function readLine(): Promise<string> {
    while (true) {
      for (let i = bufPos; i < bufLen - 1; i++) {
        if (buf[i] === 13 && buf[i + 1] === 10) {
          const line = dec.decode(buf.slice(bufPos, i));
          bufPos = i + 2;
          return line;
        }
      }
      if (bufPos > 0) {
        buf.copyWithin(0, bufPos, bufLen);
        bufLen -= bufPos;
        bufPos = 0;
      }
      const n = await conn.read(buf.subarray(bufLen));
      if (n === null) throw new Error("Connection closed by server");
      bufLen += n;
    }
  }

  // Reads a potentially multi-line SMTP response (250-... lines) and returns the last one
  async function readResponse(): Promise<string> {
    let line = await readLine();
    while (line.length >= 4 && line[3] === "-") line = await readLine();
    return line;
  }

  async function cmd(command: string): Promise<string> {
    await writeAll(conn, enc.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
    const greeting = await readResponse();
    if (!greeting.startsWith("220")) throw new Error(`Bad greeting: ${greeting.slice(0, 120)}`);

    const ehlo = await cmd("EHLO mail.readdy.app");
    console.log("[SMTP] EHLO:", ehlo.slice(0, 80));

    // AUTH LOGIN
    const authResp = await cmd("AUTH LOGIN");
    if (!authResp.startsWith("334")) throw new Error(`AUTH LOGIN rejected: ${authResp.slice(0, 120)}`);

    const userResp = await cmd(base64Encode(email));
    if (!userResp.startsWith("334")) throw new Error(`Username rejected: ${userResp.slice(0, 120)}`);

    const passResp = await cmd(base64Encode(password));
    if (!passResp.startsWith("235")) throw new Error(`Authentication failed: ${passResp.slice(0, 200)}`);
    console.log("[SMTP] Authenticated");

    // MAIL FROM
    const mailFrom = await cmd(`MAIL FROM:<${email}>`);
    if (!mailFrom.startsWith("250")) throw new Error(`MAIL FROM rejected: ${mailFrom.slice(0, 120)}`);

    // RCPT TO for every recipient
    const recipients = [
      to,
      ...(cc?.split(",").map(r => r.trim()).filter(Boolean) ?? []),
      ...(bcc?.split(",").map(r => r.trim()).filter(Boolean) ?? []),
    ];
    for (const rcpt of recipients) {
      const r = await cmd(`RCPT TO:<${rcpt}>`);
      if (!r.startsWith("250") && !r.startsWith("251")) {
        console.warn(`[SMTP] RCPT TO <${rcpt}>: ${r.slice(0, 80)}`);
      }
    }

    // DATA — write pre-built message immediately; use writeAll to guarantee
    // every byte is transmitted (partial writes cause Hostinger's 421 timeout)
    const dataResp = await cmd("DATA");
    if (!dataResp.startsWith("354")) throw new Error(`DATA rejected: ${dataResp.slice(0, 120)}`);

    await writeAll(conn, enc.encode(mimeMessage + ".\r\n"));

    const sendResp = await readResponse();
    if (!sendResp.startsWith("250")) throw new Error(`Failed to send message: ${sendResp.slice(0, 250)}`);
    console.log("[SMTP] Sent OK");

    try { await cmd("QUIT"); } catch { /* ignore */ }
    return msgId;
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const rid = crypto.randomUUID().slice(0, 8);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: {
      accountId?: string;
      to?: string; cc?: string; bcc?: string;
      subject?: string; bodyHtml?: string; bodyText?: string;
      inReplyTo?: string; references?: string;
      attachments?: Attachment[];
    } = {};

    try { body = await req.json(); }
    catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, inReplyTo, references, attachments } = body;

    if (!accountId || !to) {
      return new Response(JSON.stringify({ error: "accountId and to are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: account, error: acctErr } = await supabase
      .from("email_accounts")
      .select("id, user_id, email_address, display_name, smtp_host, smtp_port, encrypted_password")
      .eq("id", accountId)
      .single();

    if (acctErr || !account) {
      return new Response(JSON.stringify({ error: "Email account not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (account.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = account.display_name || account.email_address.split("@")[0];
    const html = bodyHtml || bodyText?.replace(/\n/g, "<br>") || "";
    const text = bodyText || "";

    console.log(`[${rid}] Sending ${account.email_address} → ${to} via ${account.smtp_host}:${account.smtp_port}`);

    const msgId = await smtpSend(
      account.smtp_host, account.smtp_port,
      account.email_address, account.encrypted_password,
      displayName, to, cc, bcc,
      subject || "(No Subject)",
      html, text,
      inReplyTo, references,
      attachments ?? [],
    );

    console.log(`[${rid}] OK msgId=${msgId}`);
    return new Response(JSON.stringify({ success: true, message: "Email sent successfully", messageId: msgId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error(`[${rid}] Error:`, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
