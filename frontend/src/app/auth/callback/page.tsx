'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMe } from '@/lib/api';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.replace('/?error=auth_failed');
      return;
    }

    if (!token) {
      router.replace('/');
      return;
    }

    // Store token and fetch user
    localStorage.setItem('ri_token', token);

    getMe()
      .then(({ user }) => {
        setUser(user);
        router.replace('/dashboard');
      })
      .catch(() => {
        localStorage.removeItem('ri_token');
        router.replace('/?error=auth_failed');
      });
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
      <p className="text-gray-500 text-sm">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
