# AI Email Copilot Workspace

## 1. Project Description
A secure private internal business productivity workspace for managing multiple Hostinger IMAP email accounts and domains under a single admin login. This is NOT a SaaS — it's a private internal tool for one business. The platform centralizes inbox management and automates email-related productivity tasks using AI via OpenAI integration.

## 2. Page Structure
- `/login` — Admin login (also handles first-time setup and password reset)
- `/dashboard` — Main workspace dashboard with widgets and account management
- `/inbox` — Unified inbox across all connected accounts
- `/connect-account` — Connect new email account (Phase 2)
- `/priority` — Priority inbox (Phase 5)
- `/tasks` — Task management (Phase 5)
- `/ai-assistant` — AI assistant chat (Phase 4)
- `/research` — Research agent (Phase 4)
- `/accounts` — Manage email accounts (Phase 2)
- `/reminders` — Reminders list (Phase 5)
- `/search` — Natural language email search (Phase 5)
- `/settings` — Settings page

## 3. Core Features
- [x] Admin-only authentication (single login, no signup, password reset)
- [x] Admin account setup flow (first-time setup via Edge Function)
- [x] Dashboard layout with sidebar navigation
- [x] Dashboard widgets (unread count, reply-needed, tasks, reminders, AI activity)
- [x] Email account management list on dashboard
- [ ] Secure email account connection (IMAP for Hostinger) — Phase 2
- [ ] IMAP connection testing Edge Function — Phase 2
- [ ] Email sync engine (manual + auto every 5 min) — Phase 3
- [ ] Unified inbox across all accounts/domains — Phase 3
- [ ] AI email summarization — Phase 4
- [ ] AI action extraction (tasks, deadlines, follow-ups) — Phase 4
- [ ] AI smart reply drafts — Phase 4
- [ ] Email categorization — Phase 4
- [ ] Auto reminder detection — Phase 4
- [ ] Research agent — Phase 4
- [ ] AI daily digest — Phase 4
- [ ] Priority inbox — Phase 5
- [ ] Task management with status tracking — Phase 5
- [ ] Reminder system — Phase 5
- [ ] Natural language email search — Phase 5
- [ ] AI activity logging — Phase 4

## 4. Data Model Design

### Table: admin_users
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| email | text | Admin email |
| role | text | Role (admin) |
| created_at | timestamptz | Creation timestamp |

### Table: email_accounts
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| domain_name | text | Domain (e.g., autoster.co.uk) |
| email_address | text | Full email address |
| display_name | text | Display name |
| imap_host | text | IMAP server hostname |
| imap_port | integer | IMAP port |
| smtp_host | text | SMTP server hostname |
| smtp_port | integer | SMTP port |
| encrypted_password | text | Encrypted email password |
| sync_status | text | pending/syncing/synced/error |
| last_sync | timestamptz | Last sync timestamp |
| created_at | timestamptz | Creation timestamp |

### Table: emails
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| account_id | uuid | FK to email_accounts |
| user_id | uuid | FK to auth.users |
| message_id | text | Unique message ID (dedup) |
| thread_id | text | Thread grouping ID |
| sender_name | text | Sender display name |
| sender_email | text | Sender email |
| recipient_email | text | Recipient email |
| cc | text | CC recipients |
| bcc | text | BCC recipients |
| subject | text | Email subject |
| body_text | text | Plain text body |
| body_html | text | HTML body |
| attachments | jsonb | Attachment metadata |
| received_at | timestamptz | When received |
| is_read | boolean | Read status |
| importance_score | float | AI importance score |
| ai_summary | text | AI-generated summary |
| ai_category | text | AI category label |
| ai_reply_draft | text | AI-generated reply draft |
| action_required | boolean | Needs action flag |
| reminder_date | timestamptz | AI-detected reminder date |
| folder | text | Folder (INBOX, etc.) |
| is_starred | boolean | Starred flag |
| created_at | timestamptz | Record creation |

### Table: tasks
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| email_id | uuid | FK to emails (nullable) |
| title | text | Task title |
| description | text | Task description |
| due_date | timestamptz | Due date |
| status | text | pending/in_progress/completed |
| priority | text | low/medium/high/urgent |
| created_at | timestamptz | Creation timestamp |

### Table: reminders
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| email_id | uuid | FK to emails (nullable) |
| title | text | Reminder title |
| reminder_date | timestamptz | When to remind |
| status | text | active/completed/dismissed |
| created_at | timestamptz | Creation timestamp |

### Table: ai_logs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| email_id | uuid | FK to emails (nullable) |
| action_type | text | Type of AI action |
| prompt | text | Input prompt |
| result | text | AI output result |
| created_at | timestamptz | Creation timestamp |

### Table: sent_emails
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| account_id | uuid | FK to email_accounts |
| to_recipients | text | To recipients |
| cc | text | CC recipients |
| bcc | text | BCC recipients |
| subject | text | Email subject |
| body_text | text | Plain text body |
| body_html | text | HTML body |
| sent_at | timestamptz | When sent |
| is_draft | boolean | Draft flag |
| created_at | timestamptz | Creation timestamp |

## 5. Backend / Third-party Integration Plan
- **Supabase**: Database (all tables) + Auth (single admin) — ✅ Integrated
- **OpenAI**: AI email processing (summaries, replies, research, categorization) — 🔜 Phase 4
- **Hostinger IMAP/SMTP**: Email account connection and sync — 🔜 Phase 2 & 3
- **Shopify**: Not needed
- **Stripe**: Not needed

## 6. Development Phase Plan

### Phase 1: Foundation — Authentication + Dashboard ✅ IN PROGRESS
- Goal: Secure admin login + modern productivity dashboard layout
- Deliverable: Login page (with setup + reset), dashboard with sidebar, widget overview, account list
- Status: Core built — verifying and hardening

### Phase 2: Email Account Connection 🔜 NEXT
- Goal: Secure IMAP connection system for Hostinger accounts
- Deliverable: Connect Email Account page, IMAP test Edge Function, encrypted credential storage
- Status: Pending

### Phase 3: Email Sync Engine
- Goal: Backend sync system fetching emails from connected accounts
- Deliverable: Sync Edge Function, Unified Inbox page, email list/viewer
- Status: Pending

### Phase 4: AI Email Agent
- Goal: OpenAI-powered email processing
- Deliverable: AI summaries, action extraction, smart replies, categorization, reminders, research agent, daily digest
- Status: Pending

### Phase 5: Productivity Workspace
- Goal: Full unified workspace with all productivity features
- Deliverable: Advanced search, AI tools panel, task management, priority inbox, reminder system
- Status: Pending