'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getScheduledEmails, getSentEmails, getEmailCounts } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ScheduledTable from '@/components/ScheduledTable';
import SentTable from '@/components/SentTable';
import ComposeModal from '@/components/ComposeModal';
import type { EmailJob, CountsResponse } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [showCompose, setShowCompose] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Scheduled state
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledLoading, setScheduledLoading] = useState(true);

  // Sent state
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentPage, setSentPage] = useState(1);
  const [sentLoading, setSentLoading] = useState(true);

  // Sidebar counts
  const [counts, setCounts] = useState<CountsResponse>({ scheduled: 0, sent: 0 });

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  const loadScheduled = useCallback(async (page = 1, silent = false) => {
    if (!silent) setScheduledLoading(true);
    try {
      const res = await getScheduledEmails(page);
      setScheduledJobs(res.data);
      setScheduledTotal(res.total);
      setScheduledPage(res.page);
    } catch (err) {
      console.error('Failed to load scheduled emails:', err);
    } finally {
      if (!silent) setScheduledLoading(false);
    }
  }, []);

  const loadSent = useCallback(async (page = 1, silent = false) => {
    if (!silent) setSentLoading(true);
    try {
      const res = await getSentEmails(page);
      setSentJobs(res.data);
      setSentTotal(res.total);
      setSentPage(res.page);
    } catch (err) {
      console.error('Failed to load sent emails:', err);
    } finally {
      if (!silent) setSentLoading(false);
    }
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const c = await getEmailCounts();
      setCounts(c);
    } catch {
      // silent fail
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    // silent=true → no loading skeleton flicker during background refresh
    await Promise.all([loadScheduled(scheduledPage, true), loadSent(sentPage, true), loadCounts()]);
    setRefreshing(false);
  }, [loadScheduled, loadSent, loadCounts, scheduledPage, sentPage]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadScheduled();
      loadSent();
      loadCounts();
    }
  }, [user, loadScheduled, loadSent, loadCounts]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshAll, 15000);
    return () => clearInterval(interval);
  }, [user, refreshAll]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCompose={() => setShowCompose(true)}
        counts={counts}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          activeTab={activeTab}
          onRefresh={refreshAll}
          refreshing={refreshing}
        />

        {/* Table Area */}
        <main className="flex-1 overflow-hidden bg-white m-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          {activeTab === 'scheduled' ? (
            <ScheduledTable
              jobs={scheduledJobs}
              loading={scheduledLoading}
              total={scheduledTotal}
              page={scheduledPage}
              limit={20}
              onPageChange={(p) => { setScheduledPage(p); loadScheduled(p); }}
            />
          ) : (
            <SentTable
              jobs={sentJobs}
              loading={sentLoading}
              total={sentTotal}
              page={sentPage}
              limit={20}
              onPageChange={(p) => { setSentPage(p); loadSent(p); }}
            />
          )}
        </main>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSuccess={refreshAll}
        />
      )}
    </div>
  );
}
