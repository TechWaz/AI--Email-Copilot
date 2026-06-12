
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

interface EmailAccount {
  id: string;
  user_id: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  encrypted_password: string;
}

function decodeBase64(raw: string): string {
  try {
    const cleaned = raw.replace(/[\s\r\n]+/g, "");
    const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return raw;
  }
}

function decodeQuotedPrintable(raw: string): string {
  return raw
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeContent(raw: string, encoding: string): string {
  if (encoding === "base64") return decodeBase64(raw);
  if (encoding === "quoted-printable") return decodeQuotedPrintable(raw);
  return raw;
}

interface ParsedEmail {
  messageId: string;
  inReplyTo: string | null;
  references: string | null;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml: string | null;
}

function parseEmail(raw: string): ParsedEmail {
  const headerEnd = raw.indexOf("\r\n\r\n");
  const headerSection = headerEnd === -1 ? raw : raw.slice(0, headerEnd);
  const bodySection = headerEnd === -1 ? "" : raw.slice(headerEnd + 4);

  const headers: Record<string, string> = {};
  let currentHeader = "";
  let currentValue = "";

  const headerLines = headerSection.split("\r\n");
  for (const line of headerLines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      currentValue += " " + line.trim();
    } else {
      if (currentHeader) {
        headers[currentHeader.toLowerCase()] = currentValue.trim();
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        currentHeader = line.slice(0, colonIdx);
        currentValue = line.slice(colonIdx + 1).trim();
      }
    }
  }
  if (currentHeader) {
    headers[currentHeader.toLowerCase()] = currentValue.trim();
  }

  const parseAddr = (rawAddr: string): { name: string; email: string } => {
    const nameMatch = rawAddr.match(/^"?([^"]*)"?\s*<([^>]+)>/);
    if (nameMatch) {
      return { name: nameMatch[1].trim(), email: nameMatch[2].trim() };
    }
    const emailMatch = rawAddr.match(/([^\s<]+@[^\s>]+)/);
    return { name: "", email: emailMatch ? emailMatch[1] : rawAddr.trim() };
  };

  const from = parseAddr(headers["from"] || "");
  const to = parseAddr(headers["to"] || "");

  let bodyText = "";
  let bodyHtml: string | null = null;

  const contentType = headers["content-type"] || "text/plain";
  const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = bodySection.split(`--${boundary}`);
    for (const part of parts) {
      if (part.trim() === "--" || part.trim() === "") continue;
      const partHeaderEnd = part.indexOf("\r\n\r\n");
      const partHeaders = partHeaderEnd === -1 ? "" : part.slice(0, partHeaderEnd);
      const partBody = partHeaderEnd === -1 ? part : part.slice(partHeaderEnd + 4);
      const partCT = partHeaders.match(/content-type:\s*([^\r\n;]+)/i);
      const partEncoding = partHeaders.match(/content-transfer-encoding:\s*([^\r\n]+)/i);
      const encoding = partEncoding ? partEncoding[1].trim().toLowerCase() : "";
      const ct = partCT ? partCT[1].trim().toLowerCase() : "";

      const decoded = decodeContent(partBody.trim(), encoding);

      if (ct.includes("text/plain") && !bodyText) {
        bodyText = decoded;
      } else if (ct.includes("text/html") && !bodyHtml) {
        bodyHtml = decoded;
      }
    }
  } else {
    const encoding = headers["content-transfer-encoding"] || "";
    const decoded = decodeContent(bodySection, encoding.trim().toLowerCase());
    if (contentType.includes("text/html")) {
      bodyHtml = decoded;
    } else {
      bodyText = decoded;
    }
  }

  if (!bodyText && bodyHtml) {
    bodyText = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  return {
    messageId: headers["message-id"]?.replace(/[<>]/g, "") || "",
    inReplyTo: headers["in-reply-to"]?.replace(/[<>]/g, "") || null,
    references: headers["references"]?.replace(/[<>]/g, "") || null,
    fromName: from.name,
    fromEmail: from.email,
    toEmail: to.email,
    cc: headers["cc"] || null,
    bcc: headers["bcc"] || null,
    subject: headers["subject"] || "(No Subject)",
    date: headers["date"] || new Date().toISOString(),
    bodyText,
    bodyHtml,
  };
}

function deriveThreadId(messageId: string, inReplyTo: string | null, references: string | null): string {
  if (inReplyTo) return inReplyTo;
  if (references) {
    const refs = references.split(/\s+/).filter(Boolean);
    if (refs.length > 0) return refs[0];
  }
  return messageId;
}

function categorizeEmail(subject: string, bodyText: string): string {
  const lower = (subject + " " + bodyText.slice(0, 500)).toLowerCase();
  if (lower.includes("invoice") || lower.includes("payment") || lower.includes("billing") || lower.includes("receipt")) return "Finance";
  if (lower.includes("meeting") || lower.includes("schedule") || lower.includes("calendar") || lower.includes("appointment")) return "Scheduling";
  if (lower.includes("support") || lower.includes("help") || lower.includes("issue") || lower.includes("bug") || lower.includes("ticket")) return "Support";
  if (lower.includes("newsletter") || lower.includes("unsubscribe") || lower.includes("promo") || lower.includes("offer")) return "Marketing";
  if (lower.includes("linkedin") || lower.includes("twitter") || lower.includes("facebook") || lower.includes("instagram") || lower.includes("social")) return "Social";
  if (lower.includes("security") || lower.includes("verify") || lower.includes("password") || lower.includes("login") || lower.includes("2fa")) return "Security";
  if (lower.includes("proposal") || lower.includes("contract") || lower.includes("partnership") || lower.includes("client")) return "Client";
  return "General";
}

function estimateImportance(subject: string): number {
  let score = 5;
  const lower = subject.toLowerCase();
  const highPriority = ["urgent", "asap", "critical", "important", "action required", "deadline", "overdue"];
  const lowPriority = ["newsletter", "promo", "spam", "update", "digest", "weekly", "monthly", "notification"];
  for (const kw of highPriority) { if (lower.includes(kw)) { score += 3; break; } }
  for (const kw of lowPriority) { if (lower.includes(kw)) { score -= 2; break; } }
  return Math.max(1, Math.min(10, score));
}

function buildImapCommand(tag: string, command: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`${tag} ${command}\r\n`);
}

async function imapSync(host: string, port: number, email: string, password: string): Promise<{ rawEmails: string[]; errors: string[]; total: number }> {
  const errors: string[] = [];
  const rawEmails: string[] = [];
  let tagSeq = 0;
  const decoder = new TextDecoder();

  console.log(`[IMAP] Connecting to ${host}:${port}...`);
  const conn = await Deno.connectTls({ hostname: host, port });
  console.log("[IMAP] TLS connection established");

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
    tagSeq++;
    const tag = `A${String(tagSeq).padStart(4, "0")}`;
    await conn.write(buildImapCommand(tag, cmd));
    return tag;
  }

  async function readUntilTag(expectedTag: string): Promise<{ lines: string[]; status: string }> {
    const lines: string[] = [];
    while (true) {
      const line = await readLine();
      if (line.startsWith(expectedTag)) {
        return { lines, status: line };
      }
      lines.push(line);
    }
  }

  async function readMultiLineUntilTag(expectedTag: string): Promise<{ lines: string[]; raw: string; status: string }> {
    const lines: string[] = [];
    while (true) {
      const line = await readLine();
      lines.push(line);
      if (line.startsWith(expectedTag)) {
        return { lines, raw: lines.join("\r\n"), status: line };
      }
    }
  }

  const greeting = await readLine();
  console.log("[IMAP] Server greeting:", greeting.slice(0, 200));

  // Try LOGIN first
  const escapedPassword = password.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const loginTag = await sendCmd(`LOGIN "${email}" "${escapedPassword}"`);
  const loginResp = await readUntilTag(loginTag);
  const loginStatus = loginResp.status;
  console.log("[IMAP] Login full response:", loginStatus);

  // Collect all server messages for better error diagnostics
  const serverMessages = loginResp.lines.filter(l => l.trim().length > 0 && !l.startsWith("*"));
  const allLoginLines = [...serverMessages, loginStatus].join(" | ");

  if (!loginStatus.includes("OK")) {
    const isGmail = host.includes("gmail") || host.includes("google");
    const isHostinger = host.includes("hostinger");

    // Try to extract the specific error code/message from server response
    const codeMatch = loginStatus.match(/\[([A-Z_]+)\]/);
    const serverCode = codeMatch ? codeMatch[1] : null;

    let errorMsg = "";
    if (isGmail && serverCode === "AUTHENTICATIONFAILED") {
      errorMsg = `Gmail authentication failed: invalid credentials. Google no longer allows regular passwords for IMAP. Go to https://myaccount.google.com/apppasswords to generate a 16-character App Password, then update this account's password with the App Password. Server: ${allLoginLines.slice(0, 300)}`;
    } else if (isGmail && serverCode === "WEBLOGIN") {
      errorMsg = `Gmail requires web login verification. Visit https://accounts.google.com/DisplayUnlockCaptcha to unlock your account for IMAP access, then try syncing again. Server: ${allLoginLines.slice(0, 300)}`;
    } else if (isGmail) {
      errorMsg = `Gmail IMAP login failed. Google requires an App Password (not your regular password) for third-party email clients. Generate one at https://myaccount.google.com/apppasswords (16 characters), then update this account with it. Server response: ${allLoginLines.slice(0, 300)}`;
    } else if (isHostinger) {
      errorMsg = `Hostinger IMAP login failed: check your email address and password. Make sure you're using the full email address (${email}) and the correct password. Server response: ${allLoginLines.slice(0, 300)}`;
    } else {
      errorMsg = `IMAP login failed for ${host}. Server response: ${allLoginLines.slice(0, 300)}`;
    }

    throw new Error(errorMsg);
  }

  const selectTag = await sendCmd('SELECT "INBOX"');
  const selectResp = await readUntilTag(selectTag);
  console.log("[IMAP] Select INBOX:", selectResp.status);

  if (!selectResp.status.includes("OK")) {
    throw new Error(`Failed to select INBOX. Server response: ${selectResp.status}`);
  }

  let exists = 0;
  for (const line of selectResp.lines) {
    const m = line.match(/^\* (\d+) EXISTS/);
    if (m) { exists = parseInt(m[1]); break; }
  }
  console.log(`[IMAP] INBOX has ${exists} messages`);

  if (exists === 0) {
    try {
      const logoutTag = await sendCmd("LOGOUT");
      await readUntilTag(logoutTag);
    } catch { /* ignore */ }
    return { rawEmails: [], errors: [], total: 0 };
  }

  const searchTag = await sendCmd("SEARCH ALL");
  const searchResp = await readUntilTag(searchTag);
  let seqNums: number[] = [];
  for (const line of searchResp.lines) {
    if (line.startsWith("* SEARCH")) {
      const nums = line.replace("* SEARCH", "").trim();
      if (nums) {
        const all = nums.split(/\s+/).map(Number).filter((n) => !isNaN(n));
        seqNums = all.slice(-Math.min(50, all.length));
      }
    }
  }

  const total = seqNums.length;
  console.log(`[IMAP] Fetching ${total} emails...`);

  for (const seqNum of seqNums) {
    try {
      const fetchTag = await sendCmd(`FETCH ${seqNum} (BODY.PEEK[])`);
      const fetchResp = await readMultiLineUntilTag(fetchTag);
      if (!fetchResp.status.includes("OK")) continue;

      const prefix = `* ${seqNum} FETCH (BODY[] {`;
      const idx = fetchResp.raw.indexOf(prefix);
      if (idx === -1) continue;
      const sizeEnd = fetchResp.raw.indexOf("}", idx);
      if (sizeEnd === -1) continue;
      const size = parseInt(fetchResp.raw.slice(idx + prefix.length, sizeEnd));
      if (isNaN(size)) continue;
      const bodyStart = sizeEnd + 2;
      const rawBody = fetchResp.raw.slice(bodyStart, bodyStart + size);

      if (rawBody.length > 0) {
        rawEmails.push(rawBody);
      }
    } catch (e) {
      errors.push(`Seq ${seqNum}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  try {
    const logoutTag = await sendCmd("LOGOUT");
    await readUntilTag(logoutTag);
  } catch { /* ignore */ }

  console.log(`[IMAP] Done: ${rawEmails.length} fetched, ${errors.length} errors`);
  return { rawEmails, errors, total };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] ${req.method} request received`);

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

    console.log(`[${requestId}] User authenticated: ${user.email}`);

    let body: { accountId?: string } = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { accountId } = body;
    if (!accountId) {
      return new Response(JSON.stringify({ error: "accountId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Looking up account: ${accountId}`);

    const { data: account, error: acctErr } = await supabase
      .from("email_accounts")
      .select("id, user_id, email_address, imap_host, imap_port, encrypted_password")
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

    const typedAccount = account as unknown as EmailAccount;
    console.log(`[${requestId}] Syncing: ${typedAccount.email_address} via ${typedAccount.imap_host}:${typedAccount.imap_port}`);

    // Update status to syncing
    await supabase.from("email_accounts").update({ sync_status: "syncing" }).eq("id", accountId);

    let synced = 0;
    let total = 0;
    const dbErrors: string[] = [];

    try {
      const result = await imapSync(
        typedAccount.imap_host,
        typedAccount.imap_port,
        typedAccount.email_address,
        typedAccount.encrypted_password
      );

      total = result.total;
      dbErrors.push(...result.errors);

      for (const raw of result.rawEmails) {
        try {
          const parsed = parseEmail(raw);

          if (parsed.messageId) {
            const { data: existing } = await supabase
              .from("emails")
              .select("id")
              .eq("message_id", parsed.messageId)
              .maybeSingle();
            if (existing) continue;
          }

          const threadId = deriveThreadId(parsed.messageId, parsed.inReplyTo, parsed.references);
          const category = categorizeEmail(parsed.subject, parsed.bodyText);
          const importance = estimateImportance(parsed.subject);

          let receivedAt: string;
          try {
            receivedAt = new Date(parsed.date).toISOString();
          } catch {
            receivedAt = new Date().toISOString();
          }

          const { error: insertErr } = await supabase.from("emails").insert({
            account_id: accountId,
            user_id: user.id,
            message_id: parsed.messageId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            thread_id: threadId,
            sender_name: parsed.fromName || null,
            sender_email: parsed.fromEmail || null,
            recipient_email: parsed.toEmail || typedAccount.email_address,
            cc: parsed.cc || null,
            bcc: parsed.bcc || null,
            subject: parsed.subject,
            body_text: parsed.bodyText || null,
            body_html: parsed.bodyHtml || null,
            received_at: receivedAt,
            is_read: false,
            importance_score: importance,
            ai_category: category,
          });

          if (insertErr) {
            dbErrors.push(insertErr.message);
          } else {
            synced++;
          }
        } catch (e) {
          dbErrors.push(e instanceof Error ? e.message : "Parse error");
        }
      }
    } catch (imapErr) {
      const errMsg = imapErr instanceof Error ? imapErr.message : "IMAP connection failed";
      console.error(`[${requestId}] IMAP error:`, errMsg);

      await supabase.from("email_accounts").update({ sync_status: "error" }).eq("id", accountId);

      return new Response(JSON.stringify({ error: errMsg, errorType: "imap_auth" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("email_accounts")
      .update({ sync_status: "synced", last_sync: new Date().toISOString() })
      .eq("id", accountId);

    console.log(`[${requestId}] ${synced} new emails synced from ${total} fetched`);

    return new Response(JSON.stringify({
      synced,
      total,
      errors: dbErrors.slice(0, 10),
      message: synced > 0
        ? `Synced ${synced} new emails from ${total} fetched`
        : dbErrors.length > 0
          ? `Sync complete but ${dbErrors.length} issues occurred`
          : `No new emails to sync from ${total} in inbox`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error(`[${requestId}] Fatal error:`, errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
