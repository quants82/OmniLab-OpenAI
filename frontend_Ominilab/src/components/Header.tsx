import React, { useState } from 'react';
import { LogIn, LogOut, User, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import LoginModal from './auth/LoginModal';
import { API_CONFIG } from '../config/api.config';

const openApiUrl = `${API_CONFIG.python.apiUrl}/docs`;

function HeaderContent() {
  const { user, isLoading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { label: 'Home', href: '/' },
    { label: 'Experiments', href: '/experiments/' },
    { label: 'Flash ESP32', href: '/nap-firmware/' },
    { label: 'For Judges', href: '/judges/' },
    { label: 'Open API', href: openApiUrl },
  ];

  return (
    <div className="flex items-center gap-6">
      {/* Desktop Navigation */}
      <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-blue-700">
            {link.label}
          </a>
        ))}
      </nav>

      {/* Account actions */}
      <div className="flex items-center gap-4">
        {/* Account Button */}
        {isLoading ? (
          <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200" />
        ) : !user ? (
          <>
            <button
              onClick={() => setShowLogin(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              <LogIn size={16} /> Sign in
            </button>
            <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 text-sm font-semibold text-slate-700 sm:flex">
              <User size={16} />
              {user.username}
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={17} />
            </button>
          </div>
        )}

        {/* Mobile Hamburger toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-16 z-[100] border-b border-slate-200 bg-white p-4 shadow-xl md:hidden">
          <nav className="flex flex-col gap-4 font-bold text-slate-600">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-4 py-2 hover:bg-slate-50 hover:text-blue-700"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {/* Show user profile inside mobile menu as well if logged in */}
            {user && (
              <div className="border-t border-slate-100 pt-3 px-4 flex items-center gap-2 text-sm font-semibold text-slate-700 sm:hidden">
                <User size={16} />
                <span>{user.username}</span>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  return (
    <AuthProvider>
      <HeaderContent />
    </AuthProvider>
  );
}
