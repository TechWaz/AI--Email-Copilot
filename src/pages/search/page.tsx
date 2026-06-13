import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/feature/Sidebar';
import { useSearch, type CategoryFilter, type DateFilter, type ReadFilter } from '@/hooks/useSearch';
import type { InboxEmail } from '@/hooks/useInbox';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  if (diff < 7 * 86400000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function highlightText(text: string, query: string): string {
  if (!query.trim() || !text) return text;
  return text;
}

function getSnippet(body: string | null, query: string, maxLen = 140): string {
  if (!body) return '';
  const cleaned = body.replace(/\s+/g, ' ').trim();
  if (!query.trim()) return cleaned.slice(0, maxLen);
  const idx = cleaned.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return cleaned.slice(0, maxLen);
  const start = Math.max(0, idx - 40);
  const snippet = (start > 0 ? '...' : '') + cleaned.slice(start, start + maxLen);
  return snippet.length < cleaned.length ? snippet + '...' : snippet;
}

const CATEGORY_COLORS: Record<string, string> = {
  Finance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Scheduling: 'bg-blue-50 text-blue-700 border-blue-200',
  Support: 'bg-orange-50 text-orange-700 border-orange-200',
  Marketing: 'bg-purple-50 text-purple-700 border-purple-200',
  Social: 'bg-pink-50 text-pink-700 border-pink-200',
  Security: 'bg-rose-50 text-rose-700 border-rose-200',
  Client: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  General: 'bg-background-100 text-foreground-600 border-background-200',
};

// ─── Email Result Card ────────────────────────────────────────────────────────

interface ResultCardProps {
  email: InboxEmail;
  query: string;
  accountEmail?: string;
  isSelected: boolean;
  onClick: () => void;
  onToggleStar: () => void;
}

function ResultCard({ email, query, accountEmail, isSelected, onClick, onToggleStar }: ResultCardProps) {
  const catColor = CATEGORY_COLORS[email.ai_category ?? 'General'] ?? CATEGORY_COLORS.General;
  const snippet = getSnippet(email.body_text, query);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-background-100 transition-colors hover:bg-background-50 ${
        isSelected ? 'bg-primary-50 border-l-2 border-l-primary-400' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Unread dot */}
        <div className="mt-1.5 shrink-0">
          {!email.is_read
            ? <span className="w-2 h-2 rounded-full bg-primary-500 block"></span>
            : <span className="w-2 h-2 rounded-full bg-transparent block"></span>
          }
        </div>

        <div className="flex-1 min-w-0">
          {/* Row 1: sender + date */}
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm truncate ${email.is_read ? 'text-foreground-600' : 'font-semibold text-foreground-950'}`}>
              {email.sender_name || email.sender_email || 'Unknown'}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={e => { e.stopPropagation(); onToggleStar(); }}
                className={`text-sm transition-colors cursor-pointer ${email.is_starred ? 'text-amber-400' : 'text-foreground-300 hover:text-amber-400'}`}
              >
                <i className={email.is_starred ? 'ri-star-fill' : 'ri-star-line'}></i>
              </button>
              <span className="text-xs text-foreground-400 whitespace-nowrap">{formatDate(email.received_at)}</span>
            </div>
          </div>

          {/* Row 2: subject */}
          <p className={`text-sm truncate mt-0.5 ${email.is_read ? 'text-foreground-600' : 'font-medium text-foreground-800'}`}>
            {email.subject || '(No Subject)'}
          </p>

          {/* Row 3: snippet */}
          {snippet && (
            <p className="text-xs text-foreground-400 truncate mt-0.5">{snippet}</p>
          )}

          {/* Row 4: meta badges */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {accountEmail && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-background-100 text-foreground-500 border border-background-200">
                {accountEmail}
              </span>
            )}
            {email.ai_category && (
              <span className={`text-xs px-1.5 py-0.5 rounded border ${catColor}`}>
                {email.ai_category}
              </span>
            )}
            {email.action_required && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                Action needed
              </span>
            )}
            {email.importance_score !== null && email.importance_score >= 8 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                High priority
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Email Detail Panel ───────────────────────────────────────────────────────

interface DetailPanelProps {
  email: InboxEmail;
  accountEmail?: string;
  onClose: () => void;
  onToggleStar: () => void;
  onNavigateToInbox: () => void;
}

function DetailPanel({ email, accountEmail, onClose, onToggleStar, onNavigateToInbox }: DetailPanelProps) {
  const catColor = CATEGORY_COLORS[email.ai_category ?? 'General'] ?? CATEGORY_COLORS.General;
  const receivedDate = new Date(email.received_at).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Detail top bar */}
      <div className="px-5 py-3.5 border-b border-background-200 flex items-center gap-3">
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-arrow-left-line text-base"></i>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground-950 truncate">{email.subject || '(No Subject)'}</p>
        </div>
        <button
          onClick={onToggleStar}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            email.is_starred ? 'text-amber-400 hover:bg-amber-50' : 'text-foreground-400 hover:bg-background-100'
          }`}
          title={email.is_starred ? 'Unstar' : 'Star'}
        >
          <i className={email.is_starred ? 'ri-star-fill' : 'ri-star-line'}></i>
        </button>
        <button
          onClick={onNavigateToInbox}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 transition-colors cursor-pointer"
          title="Open in Inbox"
        >
          <i className="ri-external-link-line text-base"></i>
        </button>
      </div>

      {/* Email meta */}
      <div className="px-5 py-4 border-b border-background-100 space-y-2">
        <h2 className="text-base font-semibold text-foreground-950">{email.subject || '(No Subject)'}</h2>

        <div className="flex items-center gap-2 flex-wrap">
          {email.ai_category && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${catColor}`}>{email.ai_category}</span>
          )}
          {email.action_required && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-medium">Action required</span>
          )}
          {email.is_read === false && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200 font-medium">Unread</span>
          )}
        </div>

        <div className="text-xs text-foreground-500 space-y-1">
          <div className="flex gap-2">
            <span className="text-foreground-400 w-12 shrink-0">From</span>
            <span className="text-foreground-700 font-medium">
              {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}
            </span>
          </div>
          {email.recipient_email && (
            <div className="flex gap-2">
              <span className="text-foreground-400 w-12 shrink-0">To</span>
              <span className="text-foreground-600">{email.recipient_email}</span>
            </div>
          )}
          {accountEmail && (
            <div className="flex gap-2">
              <span className="text-foreground-400 w-12 shrink-0">Account</span>
              <span className="text-foreground-600">{accountEmail}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-foreground-400 w-12 shrink-0">Date</span>
            <span className="text-foreground-600">{receivedDate}</span>
          </div>
        </div>
      </div>

      {/* AI summary */}
      {email.ai_summary && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-primary-50 border border-primary-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <i className="ri-sparkling-2-line text-primary-500 text-xs"></i>
            <span className="text-xs font-semibold text-primary-700">AI Summary</span>
          </div>
          <p className="text-xs text-primary-700 leading-relaxed">{email.ai_summary}</p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {email.body_html ? (
          <div
            className="text-sm text-foreground-800 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body_html }}
          />
        ) : (
          <pre className="text-sm text-foreground-700 whitespace-pre-wrap font-sans leading-relaxed">{email.body_text || 'No content'}</pre>
        )}
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const CATEGORIES: CategoryFilter[] = ['all', 'Finance', 'Scheduling', 'Support', 'Marketing', 'Social', 'Security', 'Client', 'General'];
const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
];
const READ_OPTIONS: { value: ReadFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'starred', label: 'Starred' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('search');
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    query, setQuery,
    results, isSearching, hasSearched, error,
    filters, setFilters,
    accounts,
    selectedEmail, setSelectedEmail,
    selectEmail, toggleStar,
    runSearch,
  } = useSearch();

  const triggerSearch = useCallback((q: string, f: typeof filters) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(q, f);
    }, 350);
  }, [runSearch]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    triggerSearch(q, filters);
  };

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    triggerSearch(query, next);
  };

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.email_address]));
  const activeFilterCount = [
    filters.accountId !== null,
    filters.category !== 'all',
    filters.dateRange !== 'all',
    filters.readStatus !== 'all',
  ].filter(Boolean).length;

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  return (
    <div className="flex h-screen bg-background-50 overflow-hidden">
      <Sidebar activeItem={activeNav} onNavigate={(id) => { setActiveNav(id); navigate(`/${id === 'dashboard' ? 'dashboard' : id}`); }} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-4 bg-white border-b border-background-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 max-w-2xl">
              <div className="relative flex-1">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-base"></i>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder="Search emails by subject, sender, or content..."
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-background-50 text-foreground-900 placeholder-foreground-400"
                />
                {query && (
                  <button
                    onClick={() => handleQueryChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                  >
                    <i className="ri-close-line text-base"></i>
                  </button>
                )}
              </div>
              {isSearching && (
                <i className="ri-loader-4-line animate-spin text-primary-500 text-base shrink-0"></i>
              )}
            </div>
            <div className="ml-auto text-sm text-foreground-400">
              {hasSearched && !isSearching && (
                <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Account filter */}
            <select
              value={filters.accountId ?? ''}
              onChange={e => handleFilterChange('accountId', e.target.value || null)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer transition-colors ${
                filters.accountId ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-background-200 bg-white text-foreground-600'
              }`}
            >
              <option value="">All Accounts</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.display_name || a.email_address}</option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={filters.category}
              onChange={e => handleFilterChange('category', e.target.value as CategoryFilter)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer transition-colors ${
                filters.category !== 'all' ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-background-200 bg-white text-foreground-600'
              }`}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Date filter */}
            <select
              value={filters.dateRange}
              onChange={e => handleFilterChange('dateRange', e.target.value as DateFilter)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer transition-colors ${
                filters.dateRange !== 'all' ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-background-200 bg-white text-foreground-600'
              }`}
            >
              {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Read status filter */}
            <div className="flex items-center rounded-lg border border-background-200 overflow-hidden">
              {READ_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => handleFilterChange('readStatus', o.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    filters.readStatus === o.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-foreground-600 hover:bg-background-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Clear all filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  const reset = { accountId: null, category: 'all' as CategoryFilter, dateRange: 'all' as DateFilter, readStatus: 'all' as ReadFilter };
                  setFilters(reset);
                  triggerSearch(query, reset);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <i className="ri-filter-off-line text-sm"></i>
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Content area: results + detail */}
        <div className="flex-1 flex overflow-hidden">
          {/* Results list */}
          <div className={`flex flex-col overflow-hidden border-r border-background-200 bg-white transition-all ${selectedEmail ? 'w-80 shrink-0' : 'flex-1'}`}>
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="m-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-600">
                  <i className="ri-error-warning-line text-sm shrink-0"></i>
                  {error}
                </div>
              )}

              {!hasSearched && !isSearching && (
                <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mb-4">
                    <i className="ri-search-eye-line text-3xl text-foreground-300"></i>
                  </div>
                  <h3 className="text-base font-semibold text-foreground-600 mb-1">Search your emails</h3>
                  <p className="text-sm text-foreground-400 max-w-xs">
                    Type a word or phrase to search across all your connected accounts. Use filters to narrow down results.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {['invoice', 'meeting', 'urgent', 'follow up'].map(hint => (
                      <button
                        key={hint}
                        onClick={() => handleQueryChange(hint)}
                        className="px-3 py-1.5 rounded-lg border border-background-200 text-xs text-foreground-600 hover:bg-background-100 cursor-pointer"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasSearched && !isSearching && results.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
                  <div className="w-14 h-14 rounded-2xl bg-background-100 flex items-center justify-center mb-3">
                    <i className="ri-inbox-unarchive-line text-2xl text-foreground-300"></i>
                  </div>
                  <p className="text-sm font-medium text-foreground-600">No emails found</p>
                  <p className="text-xs text-foreground-400 mt-1">
                    {query ? `No results for "${query}"` : 'No emails match the selected filters'}
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        const reset = { accountId: null, category: 'all' as CategoryFilter, dateRange: 'all' as DateFilter, readStatus: 'all' as ReadFilter };
                        setFilters(reset);
                        triggerSearch(query, reset);
                      }}
                      className="mt-3 text-xs text-primary-600 hover:underline cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {results.length > 0 && (
                <div>
                  {!selectedEmail && (
                    <div className="px-4 py-2.5 bg-background-50 border-b border-background-100 flex items-center justify-between">
                      <span className="text-xs text-foreground-500 font-medium">
                        {results.length} email{results.length !== 1 ? 's' : ''} found
                      </span>
                      <span className="text-xs text-foreground-400">
                        {query ? `Matching "${query}"` : 'All matching filters'}
                      </span>
                    </div>
                  )}
                  {results.map(email => (
                    <ResultCard
                      key={email.id}
                      email={email}
                      query={query}
                      accountEmail={accounts.length > 1 ? accountMap[email.account_id] : undefined}
                      isSelected={selectedEmail?.id === email.id}
                      onClick={() => selectEmail(email)}
                      onToggleStar={() => toggleStar(email.id, email.is_starred)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selectedEmail && (
            <div className="flex-1 overflow-hidden">
              <DetailPanel
                email={selectedEmail}
                accountEmail={accountMap[selectedEmail.account_id]}
                onClose={() => setSelectedEmail(null)}
                onToggleStar={() => toggleStar(selectedEmail.id, selectedEmail.is_starred)}
                onNavigateToInbox={() => navigate(`/inbox?emailId=${selectedEmail.id}`)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
