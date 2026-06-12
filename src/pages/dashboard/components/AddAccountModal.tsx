import { useState } from 'react';
import type { EmailAccount } from '@/hooks/useDashboard';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (account: {
    domain_name: string;
    email_address: string;
    display_name: string;
    imap_host: string;
    imap_port: number;
    smtp_host: string;
    smtp_port: number;
    encrypted_password: string;
  }) => Promise<EmailAccount>;
  isSubmitting: boolean;
}

export function AddAccountModal({ isOpen, onClose, onCreate, isSubmitting }: AddAccountModalProps) {
  const [formData, setFormData] = useState({
    domain_name: '',
    email_address: '',
    display_name: '',
    imap_host: '',
    imap_port: 993,
    smtp_host: '',
    smtp_port: 587,
    encrypted_password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.email_address || !formData.encrypted_password || !formData.imap_host || !formData.smtp_host) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (!formData.domain_name) {
      // Extract domain from email address
      const domain = formData.email_address.split('@')[1];
      if (domain) {
        formData.domain_name = domain;
      } else {
        setFormError('Please enter a valid email address or provide a domain name.');
        return;
      }
    }

    try {
      await onCreate({
        ...formData,
        domain_name: formData.domain_name || formData.email_address.split('@')[1],
      });
      setFormData({
        domain_name: '',
        email_address: '',
        display_name: '',
        imap_host: '',
        imap_port: 993,
        smtp_host: '',
        smtp_port: 587,
        encrypted_password: '',
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-background-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground-950">Add Email Account</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email_address}
              onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              placeholder="Your Name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={formData.encrypted_password}
              onChange={(e) => setFormData({ ...formData, encrypted_password: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              placeholder="Email password or app password"
              required
            />
            <p className="text-xs text-foreground-400 mt-1">
              Use an app password if your provider requires 2FA.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">
                IMAP Host <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.imap_host}
                onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                placeholder="imap.example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">
                IMAP Port
              </label>
              <input
                type="number"
                value={formData.imap_port}
                onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) || 993 })}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                placeholder="993"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">
                SMTP Host <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.smtp_host}
                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                placeholder="smtp.example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">
                SMTP Port
              </label>
              <input
                type="number"
                value={formData.smtp_port}
                onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                placeholder="587"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-background-200 text-sm font-medium text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}