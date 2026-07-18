import React, { useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import LoginModal from './auth/LoginModal';

function AccountButton() {
  const { user, isLoading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (isLoading) return <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200" />;
  if (!user) return <>
    <button onClick={() => setShowLogin(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
      <LogIn size={16} /> Sign in
    </button>
    <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
  </>;

  return <div className="flex items-center gap-2">
    <span className="hidden items-center gap-2 text-sm font-semibold text-slate-700 sm:flex"><User size={16} />{user.username}</span>
    <button onClick={logout} title="Sign out" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><LogOut size={17} /></button>
  </div>;
}

export default function Header() {
  return <AuthProvider><AccountButton /></AuthProvider>;
}
