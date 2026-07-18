import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const ok = mode === 'login'
      ? await login(username, password)
      : await register(username, password);
    setBusy(false);
    if (ok) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-7 py-6 text-white">
          <h2 className="text-2xl font-black">{mode === 'login' ? 'Sign in to Ominilab' : 'Create an account'}</h2>
          <p className="mt-1 text-sm text-blue-100">One account gives access to all six open experiments.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-7">
          <label className="block text-sm font-bold text-slate-700">
            Username
            <input value={username} onChange={e => setUsername(e.target.value)} minLength={3} required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
          </label>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="w-full text-sm font-semibold text-blue-700">
            {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
          </button>
          <button type="button" onClick={onClose} className="w-full text-sm text-slate-500">Close</button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
