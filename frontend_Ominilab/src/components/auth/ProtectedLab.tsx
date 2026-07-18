import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedLab({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-[65vh] items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">Loading account…</div>;
  if (!isAuthenticated) return <div className="flex min-h-[65vh] items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"><Lock className="mx-auto text-amber-500"/><h2 className="mt-4 text-2xl font-black text-slate-900">Sign in required</h2><p className="mt-2 text-sm text-slate-600">Use the Sign in button in the top-right corner to open this experiment.</p></div></div>;
  return <>{children}</>;
}
