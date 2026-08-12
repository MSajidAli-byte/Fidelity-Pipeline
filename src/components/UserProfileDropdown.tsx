import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  LogOut,
  ChevronDown,
  Settings,
  Sparkles,
  Zap,
  Check,
  ToggleLeft,
  ToggleRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCredit } from '../context/CreditContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';

interface UserProfileDropdownProps {
  theme: 'dark' | 'light';
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ theme }) => {
  const isLight = theme === 'light';
  const { currentUser, isAdmin, toggleRole, logout, loginAsDemoAdmin, loginAsStandardUser, loginByEmail } = useAuth();
  const { tier, creditsRemaining, setIsUpgradeModalOpen } = useCredit();
  const { setIsAdminModalOpen, activeKillSwitchCount } = useFeatureFlags();

  const [isOpen, setIsOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [switchStatus, setSwitchStatus] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = isAdmin;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!currentUser) {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          onClick={() => loginAsDemoAdmin()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded transition-all cursor-pointer shadow-md shadow-blue-600/20 flex items-center gap-1.5"
        >
          <User className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Avatar / Profile Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 pl-2 pr-2.5 py-1 border transition-all cursor-pointer font-mono text-xs rounded-sm shadow-sm ${
          isSuperAdmin
            ? isLight
              ? 'bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100'
              : 'bg-purple-950/40 border-purple-800/60 text-purple-200 hover:bg-purple-900/50'
            : isLight
            ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
            : 'bg-[#0a0a0c] border-zinc-800 text-zinc-300 hover:text-white'
        }`}
        title={`Logged in as ${currentUser.name} (${currentUser.role})`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
            isSuperAdmin
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-sm shadow-purple-500/30'
              : 'bg-slate-600'
          }`}
        >
          {currentUser.avatarInitials}
        </div>

        <div className="flex flex-col text-left hidden sm:flex">
          <span className="font-bold text-[11px] leading-tight truncate max-w-[100px] md:max-w-[120px]">
            {currentUser.name}
          </span>
          <span
            className={`text-[9px] uppercase font-extrabold tracking-wider ${
              isSuperAdmin ? 'text-purple-500' : 'text-slate-400'
            }`}
          >
            {isSuperAdmin ? 'SUPER ADMIN' : 'USER'}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-72 border shadow-2xl z-50 font-mono text-xs rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-zinc-100'
          }`}
        >
          {/* User Header Section */}
          <div
            className={`p-3.5 border-b flex items-start gap-3 ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#050505] border-zinc-800/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${
                isSuperAdmin
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md shadow-purple-600/30'
                  : 'bg-slate-700'
              }`}
            >
              {currentUser.avatarInitials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-extrabold text-xs truncate">{currentUser.name}</span>
                {isSuperAdmin && (
                  <span title="Verified Super Admin">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  </span>
                )}
              </div>
              <p className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {currentUser.email}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border rounded-sm ${
                    isSuperAdmin
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                  }`}
                >
                  {isSuperAdmin ? 'ROLE: SUPER_ADMIN' : 'ROLE: STANDARD_USER'}
                </span>
              </div>
            </div>
          </div>

          {/* RBAC Role Switcher Test Toggle */}
          <div
            className={`px-3.5 py-2.5 border-b text-[10px] flex items-center justify-between gap-2 ${
              isLight ? 'bg-amber-50/60 border-slate-200 text-amber-900' : 'bg-amber-950/20 border-zinc-800 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold uppercase tracking-tight">Simulate RBAC Role:</span>
            </div>
            <button
              onClick={toggleRole}
              className={`px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                isSuperAdmin
                  ? 'bg-purple-600 text-white border-purple-400'
                  : 'bg-slate-700 text-white border-slate-500'
              }`}
              title="Click to toggle RBAC role and verify Admin System visibility"
            >
              {isSuperAdmin ? 'Admin' : 'User'}
            </button>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setShowAccountModal(true);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 flex items-center gap-2.5 transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-900 text-zinc-200'
              }`}
            >
              <User className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-medium">My Account & Profile</span>
            </button>

            <button
              onClick={() => {
                setIsUpgradeModalOpen(true);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-900 text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-medium">Billing / SaaS Credits</span>
              </div>
              <span className="text-[10px] font-bold text-amber-500">
                {tier === 'enterprise' ? '∞' : `${creditsRemaining} Left`}
              </span>
            </button>

            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 flex items-center gap-2.5 transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-900 text-zinc-400'
              }`}
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-medium">Logout Session</span>
            </button>
          </div>

          {/* CONDITIONAL ADMIN ONLY SECTION - RBAC PROTECTED */}
          {isSuperAdmin && (
            <>
              {/* Separator Line */}
              <div className={`border-t my-0.5 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`} />

              <div className="p-1">
                <button
                  onClick={() => {
                    setIsAdminModalOpen(true);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 border flex items-center justify-between font-bold transition-all cursor-pointer rounded ${
                    activeKillSwitchCount > 0
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 hover:bg-rose-500/25'
                      : isLight
                      ? 'bg-purple-50/80 border-purple-200 text-purple-900 hover:bg-purple-100'
                      : 'bg-purple-950/40 border-purple-800/60 text-purple-200 hover:bg-purple-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs">⚙️ System Administration</span>
                  </div>
                  {activeKillSwitchCount > 0 && (
                    <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.2 rounded-full">
                      {activeKillSwitchCount} OFF
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Account Info Modal - Portaled to document.body for clean full-screen centering */}
      {showAccountModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAccountModal(false);
            }}
          >
            <div
              className={`max-w-md w-full border rounded-xl p-6 font-mono shadow-2xl relative ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black ${
                      isSuperAdmin ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md shadow-purple-600/30' : 'bg-slate-700'
                    }`}
                  >
                    {currentUser.avatarInitials}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{currentUser.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAccountModal(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold uppercase px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-zinc-800/80">
                  <span className="text-slate-500 dark:text-zinc-400 uppercase font-bold text-[10px] tracking-wider">User ID</span>
                  <span className="font-mono text-slate-800 dark:text-zinc-200 text-xs font-semibold">{currentUser.id}</span>
                </div>

                <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-zinc-800/80">
                  <span className="text-slate-500 dark:text-zinc-400 uppercase font-bold text-[10px] tracking-wider">RBAC Role</span>
                  <span
                    className={`font-black uppercase px-2 py-0.5 border text-[10px] rounded-sm tracking-wider ${
                      isSuperAdmin
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-zinc-800/80">
                  <span className="text-slate-500 dark:text-zinc-400 uppercase font-bold text-[10px] tracking-wider">Plan Tier</span>
                  <span className="font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">{tier}</span>
                </div>

                <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-zinc-800/80">
                  <span className="text-slate-500 dark:text-zinc-400 uppercase font-bold text-[10px] tracking-wider">Admin Privileges</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300 text-right max-w-[200px]">
                    {isSuperAdmin ? 'Full Telemetry + Feature Kill Switches' : 'Standard User Access Only'}
                  </span>
                </div>
              </div>

              {/* User Session Switcher Console */}
              <div
                className={`mt-5 p-3.5 border rounded-lg space-y-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#050508] border-zinc-800/90'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Switch User / Login Session
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      loginAsDemoAdmin();
                      setSwitchStatus('Switched session to Super Admin (admin@fidelity.ai)');
                    }}
                    className={`p-2 border text-[11px] font-mono font-bold text-left rounded transition-all cursor-pointer ${
                      currentUser.email === 'admin@fidelity.ai'
                        ? 'bg-purple-600 text-white border-purple-400 ring-1 ring-purple-400'
                        : isLight
                        ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="font-black text-purple-400 text-[10px]">SUPER ADMIN</div>
                    <div className="truncate">admin@fidelity.ai</div>
                  </button>

                  <button
                    onClick={() => {
                      loginAsStandardUser();
                      setSwitchStatus('Switched session to Alex Rivera (alex.rivera@fidelity.ai)');
                    }}
                    className={`p-2 border text-[11px] font-mono font-bold text-left rounded transition-all cursor-pointer ${
                      currentUser.email === 'alex.rivera@fidelity.ai'
                        ? 'bg-blue-600 text-white border-blue-400 ring-1 ring-blue-400'
                        : isLight
                        ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="font-black text-blue-400 text-[10px]">CANDIDATE</div>
                    <div className="truncate">alex.rivera@fidelity.ai</div>
                  </button>
                </div>

                {/* Custom Email Login Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="email"
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    placeholder="Enter email e.g. user@domain.com"
                    className={`flex-1 p-2 text-xs font-mono border rounded ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black border-zinc-800 text-white'
                    }`}
                  />
                  <button
                    onClick={async () => {
                      if (!customEmailInput.trim()) return;
                      const ok = await loginByEmail(customEmailInput.trim());
                      if (ok) {
                        setSwitchStatus(`Logged in as ${customEmailInput.trim()}`);
                        setCustomEmailInput('');
                      } else {
                        setSwitchStatus(`Failed to fetch user profile for ${customEmailInput.trim()}`);
                      }
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs uppercase rounded cursor-pointer transition-colors shrink-0"
                  >
                    Switch
                  </button>
                </div>

                {switchStatus && (
                  <p className="text-[10px] font-mono font-bold text-emerald-400 animate-in fade-in">
                    {switchStatus}
                  </p>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowAccountModal(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer rounded transition-colors shadow-md shadow-blue-600/20"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
