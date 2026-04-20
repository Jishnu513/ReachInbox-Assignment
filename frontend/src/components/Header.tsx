'use client';

import { RefreshCw, Search } from 'lucide-react';

interface HeaderProps {
  activeTab: 'scheduled' | 'sent';
  onRefresh: () => void;
  refreshing: boolean;
}

export default function Header({ activeTab, onRefresh, refreshing }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      {/* Title */}
      <div>
        <h1 className="text-base font-semibold text-gray-900">
          {activeTab === 'scheduled' ? 'Scheduled Emails' : 'Sent Emails'}
        </h1>
        <p className="text-xs text-gray-400">
          {activeTab === 'scheduled'
            ? 'Emails queued and waiting to be sent'
            : 'Emails that have been processed'}
        </p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails…"
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-56 transition-all"
          />
        </div>

        {/* Refresh button */}
        <button
          id="refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh"
          className="btn-ghost p-2 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
}
