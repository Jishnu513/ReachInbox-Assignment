'use client';

import { getInitials, formatDate } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { EmailJob } from '@/lib/types';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

interface SentTableProps {
  jobs: EmailJob[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function SentTable({
  jobs,
  loading,
  total,
  page,
  limit,
  onPageChange,
}: SentTableProps) {
  const totalPages = Math.ceil(total / limit);

  if (loading) return <LoadingSkeleton rows={6} />;
  if (!loading && jobs.length === 0) return <EmptyState type="sent" />;

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recipient
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="hidden md:table-cell text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Sent At
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-gray-50/50 transition-colors duration-100 animate-fade-in"
              >
                {/* Recipient */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${
                        job.status === 'sent'
                          ? 'bg-gradient-to-br from-green-400 to-green-600'
                          : 'bg-gradient-to-br from-red-400 to-red-600'
                      }`}
                    >
                      {getInitials(job.recipientEmail.split('@')[0])}
                    </div>
                    <span className="text-sm text-gray-700 truncate max-w-[180px]">
                      {job.recipientEmail}
                    </span>
                  </div>
                </td>

                {/* Subject */}
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-700 truncate max-w-[200px]">{job.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                    From: {job.senderEmail}
                  </p>
                </td>

                {/* Sent time */}
                <td className="hidden md:table-cell px-6 py-4">
                  <p className="text-sm text-gray-700">{formatDate(job.sentAt)}</p>
                  {job.status === 'failed' && job.error && (
                    <p className="text-xs text-red-400 mt-0.5 truncate max-w-[160px]" title={job.error}>
                      {job.error}
                    </p>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  {job.status === 'sent' ? (
                    <span className="badge-sent">
                      <CheckCircle2 className="w-3 h-3" />
                      Sent
                    </span>
                  ) : (
                    <span className="badge-failed">
                      <XCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
