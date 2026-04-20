'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, Users, Clock, Gauge, FileText, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { scheduleEmails } from '@/lib/api';
import { parseEmailsFromText } from '@/lib/utils';
import type { ScheduleRequest } from '@/lib/types';

interface ComposeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ComposeModal({ onClose, onSuccess }: ComposeModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return d.toISOString().slice(0, 16);
  });
  const [delayBetweenSec, setDelayBetweenSec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileContent = useCallback((content: string, name: string) => {
    setFileName(name);
    const lowerName = name.toLowerCase();

    if (lowerName.endsWith('.csv')) {
      // Parse CSV with PapaParse
      const result = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: true });
      const emails: string[] = [];

      // Try to find email column
      result.data.forEach((row) => {
        const keys = Object.keys(row);
        const emailKey = keys.find((k) => k.toLowerCase().includes('email'));
        if (emailKey && row[emailKey]) {
          const e = row[emailKey].trim();
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) emails.push(e);
        } else {
          // If no email column, try all values
          Object.values(row).forEach((v) => {
            if (v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
              emails.push(v.trim());
            }
          });
        }
      });
      const unique = Array.from(new Set(emails));
      setParsedEmails(unique);
      toast.success(`Parsed ${unique.length} email${unique.length !== 1 ? 's' : ''} from CSV`);
    } else {
      // Plain text — extract emails via regex
      const emails = parseEmailsFromText(content);
      setParsedEmails(emails);
      toast.success(`Detected ${emails.length} email${emails.length !== 1 ? 's' : ''}`);
    }
  }, []);

  const handleFileChange = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleFileContent(content, file.name);
      };
      reader.readAsText(file);
    },
    [handleFileContent],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileChange(file);
    },
    [handleFileChange],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Email body is required'); return; }
    if (parsedEmails.length === 0) { toast.error('Upload a CSV or text file with email addresses'); return; }

    const startISO = new Date(startTime).toISOString();

    const payload: ScheduleRequest = {
      subject: subject.trim(),
      body: body.trim(),
      recipients: parsedEmails,
      startTime: startISO,
      delayBetweenMs: delayBetweenSec * 1000,
      hourlyLimit,
    };

    setSubmitting(true);
    try {
      const result = await scheduleEmails(payload);
      toast.success(`✅ ${result.jobCount} emails scheduled successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule emails');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Schedule Email Campaign</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload recipients and configure scheduling</p>
          </div>
          <button
            id="close-compose-btn"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Subject *
            </label>
            <input
              id="subject-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject…"
              className="input-field"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Email Body *
            </label>
            <textarea
              id="body-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email content here. You can use HTML for formatting…"
              rows={5}
              className="input-field resize-none"
              required
            />
          </div>

          {/* CSV Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Recipients *
            </label>
            <div
              id="file-drop-zone"
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
              />

              {parsedEmails.length > 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {parsedEmails.length} email address{parsedEmails.length !== 1 ? 'es' : ''} detected
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      from <span className="font-medium text-gray-600">{fileName}</span>
                      {' '}· Click to replace
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Drop CSV or text file here
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      or click to browse · .csv and .txt supported
                    </p>
                  </div>
                </div>
              )}
            </div>

            {parsedEmails.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Preview (first 5):</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsedEmails.slice(0, 5).map((email) => (
                    <span key={email} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {email}
                    </span>
                  ))}
                  {parsedEmails.length > 5 && (
                    <span className="text-xs text-gray-400">+{parsedEmails.length - 5} more</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Scheduling Config — 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Start Time *
                </span>
              </label>
              <input
                id="start-time-input"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Delay Between Emails */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Delay (seconds)
                </span>
              </label>
              <input
                id="delay-input"
                type="number"
                min={0}
                value={delayBetweenSec}
                onChange={(e) => setDelayBetweenSec(Math.max(0, parseInt(e.target.value) || 0))}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">Between emails</p>
            </div>

            {/* Hourly Limit */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  Hourly Limit
                </span>
              </label>
              <input
                id="hourly-limit-input"
                type="number"
                min={1}
                max={10000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">Emails per hour</p>
            </div>
          </div>

          {/* Summary box */}
          {parsedEmails.length > 0 && (
            <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl">
              <p className="text-xs font-semibold text-primary-700 mb-1">Campaign Summary</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-primary-600">
                <span>Recipients: <strong>{parsedEmails.length}</strong></span>
                <span>Delay: <strong>{delayBetweenSec}s between emails</strong></span>
                <span>Hourly limit: <strong>{hourlyLimit}/hr</strong></span>
                <span>
                  Est. duration:{' '}
                  <strong>
                    {parsedEmails.length <= 1
                      ? '< 1 min'
                      : `~${Math.round(((parsedEmails.length - 1) * delayBetweenSec) / 60)} min`}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            id="cancel-compose-btn"
            onClick={onClose}
            className="btn-secondary text-sm"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            id="schedule-submit-btn"
            onClick={handleSubmit}
            disabled={submitting || parsedEmails.length === 0}
            className="btn-primary text-sm min-w-[120px] justify-center"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scheduling…
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Schedule {parsedEmails.length > 0 ? `(${parsedEmails.length})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
