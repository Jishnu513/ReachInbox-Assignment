'use client';

import { PenSquare, Clock, Send, LogOut, Mail } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/lib/api';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { CountsResponse } from '@/lib/types';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onCompose: () => void;
  counts: CountsResponse;
}

export default function Sidebar({ activeTab, onTabChange, onCompose, counts }: SidebarProps) {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      router.push('/');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <aside className="w-60 flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight">ReachInbox</span>
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name}
                width={36}
                height={36}
                className="rounded-full ring-2 ring-primary-100"
              />
            ) : (
              <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {getInitials(user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Compose Button */}
      <div className="p-4">
        <button
          id="compose-btn"
          onClick={onCompose}
          className="btn-primary w-full justify-center text-sm"
        >
          <PenSquare className="w-4 h-4" />
          Compose
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <button
          id="nav-scheduled"
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
            activeTab === 'scheduled'
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className={`w-4 h-4 ${activeTab === 'scheduled' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
            Scheduled
          </div>
          {counts.scheduled > 0 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              activeTab === 'scheduled' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts.scheduled > 999 ? '999+' : counts.scheduled}
            </span>
          )}
        </button>

        <button
          id="nav-sent"
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
            activeTab === 'sent'
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Send className={`w-4 h-4 ${activeTab === 'sent' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
            Sent
          </div>
          {counts.sent > 0 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              activeTab === 'sent' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts.sent > 999 ? '999+' : counts.sent}
            </span>
          )}
        </button>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
