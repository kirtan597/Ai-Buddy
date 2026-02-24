'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut, signIn } from 'next-auth/react';
import {
    User, LogOut, RefreshCcw, ChevronDown,
    MessageSquare, Shield, Sparkles, CheckCircle,
    ExternalLink
} from 'lucide-react';
import { useChatStore } from '@/lib/chat-v2/chatStore';

interface UserProfileDropdownProps {
    onShowLogin?: () => void;
    /** variant controls where this appears: 'landing' (light bg) or 'chat' (dark sidebar) */
    variant?: 'landing' | 'chat';
}

export function UserProfileDropdown({
    onShowLogin,
    variant = 'landing',
}: UserProfileDropdownProps) {
    const { data: session, status } = useSession();
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [switchingAccount, setSwitchingAccount] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { sessions } = useChatStore();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const totalMessages = sessions.reduce((acc, s) => acc + s.messages.length, 0);
    const totalConversations = sessions.length;

    const handleSignOut = async () => {
        setSigningOut(true);
        setOpen(false);
        await signOut({ callbackUrl: window.location.origin });
    };

    const handleSwitchAccount = async () => {
        setSwitchingAccount(true);
        setOpen(false);
        // Sign out silently, then immediately trigger Google sign-in with account picker
        await signOut({ redirect: false });
        await signIn('google', {
            callbackUrl: window.location.origin,
            prompt: 'select_account',
        });
    };

    // ─── Loading State ─────────────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-violet-200 dark:bg-violet-800 animate-pulse" />
                <div className="hidden sm:block w-20 h-3 rounded bg-violet-200 dark:bg-violet-800 animate-pulse" />
            </div>
        );
    }

    // ─── Not Signed In ─────────────────────────────────────────────────────────
    if (!session?.user) {
        return (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onShowLogin}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 touch-manipulation shadow-sm
          ${variant === 'landing'
                        ? 'bg-white/80 backdrop-blur-sm border border-violet-200 text-violet-700 hover:bg-violet-50'
                        : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
            >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
            </motion.button>
        );
    }

    // ─── Signed In ─────────────────────────────────────────────────────────────
    const user = session.user;
    const initials = (user.name || user.email || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    return (
        <div ref={dropdownRef} className="relative z-50">
            {/* ── Trigger Button ── */}
            <motion.button
                id="profile-dropdown-trigger"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-all duration-200 touch-manipulation border shadow-sm
          ${variant === 'landing'
                        ? 'bg-white/90 backdrop-blur-sm border-violet-200 hover:border-violet-400 hover:shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                aria-expanded={open}
                aria-haspopup="true"
            >
                {/* Avatar */}
                {user.image ? (
                    <img
                        src={user.image}
                        alt={user.name || 'Profile'}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-violet-300 dark:ring-violet-600"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-violet-300">
                        {initials}
                    </div>
                )}

                {/* Name */}
                <span className={`text-xs font-semibold hidden sm:block max-w-[100px] truncate
          ${variant === 'landing' ? 'text-gray-800' : 'text-gray-800 dark:text-white'}`}>
                    {user.name?.split(' ')[0] || 'You'}
                </span>

                {/* Chevron */}
                <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className={`w-3.5 h-3.5
            ${variant === 'landing' ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}
                    />
                </motion.div>
            </motion.button>

            {/* ── Dropdown Panel ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        id="profile-dropdown-panel"
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-violet-100 dark:border-gray-800 overflow-hidden"
                    >
                        {/* ── Header ── */}
                        <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 overflow-hidden">
                            {/* Decorative circles */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5" />

                            <div className="relative flex items-start gap-3">
                                {/* Large Avatar */}
                                {user.image ? (
                                    <img
                                        src={user.image}
                                        alt={user.name || 'Profile'}
                                        referrerPolicy="no-referrer"
                                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white/40 shadow-lg flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold border-2 border-white/40 flex-shrink-0">
                                        {initials}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-white font-bold text-base truncate">
                                            {user.name || 'User'}
                                        </p>
                                        <span title="Verified Google Account">
                                            <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" />
                                        </span>
                                    </div>
                                    <p className="text-violet-200 text-xs truncate mt-0.5">{user.email}</p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white font-medium">
                                            <Sparkles className="w-2.5 h-2.5" />
                                            Google Account
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-green-400/30 rounded-full px-2 py-0.5 text-[10px] text-green-200 font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Stats Row ── */}
                        <div className="grid grid-cols-2 divide-x divide-violet-100 dark:divide-gray-800 border-b border-violet-100 dark:border-gray-800">
                            <div className="flex flex-col items-center py-3 gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                        {totalConversations}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Conversations
                                </span>
                            </div>
                            <div className="flex flex-col items-center py-3 gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                        {totalMessages}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Messages
                                </span>
                            </div>
                        </div>

                        {/* ── Menu Items ── */}
                        <div className="p-2 space-y-1">

                            {/* Account Protection info */}
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                                        Secure Session Active
                                    </p>
                                    <p className="text-[10px] text-green-600/70 dark:text-green-500/70">
                                        Your data is encrypted & synced
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="pt-1 pb-0.5">
                                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider px-3 mb-1">
                                    Account Actions
                                </p>
                            </div>

                            {/* Switch Account */}
                            <motion.button
                                id="switch-account-btn"
                                whileHover={{ backgroundColor: 'rgba(139,92,246,0.06)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSwitchAccount}
                                disabled={switchingAccount}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group touch-manipulation disabled:opacity-60"
                            >
                                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/40 transition-colors">
                                    <RefreshCcw className={`w-4 h-4 text-violet-600 dark:text-violet-400 ${switchingAccount ? 'animate-spin' : ''}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {switchingAccount ? 'Switching…' : 'Switch Account'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                        Sign in with a different Google account
                                    </p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                            </motion.button>

                            {/* Sign Out */}
                            <motion.button
                                id="sign-out-btn"
                                whileHover={{ backgroundColor: 'rgba(239,68,68,0.06)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group touch-manipulation disabled:opacity-60"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                    <LogOut className={`w-4 h-4 text-red-500 ${signingOut ? 'animate-pulse' : ''}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                        {signingOut ? 'Signing out…' : 'Sign Out'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                        End your session on this device
                                    </p>
                                </div>
                            </motion.button>
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-4 py-3 border-t border-violet-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30">
                            <p className="text-[10px] text-center text-gray-400 dark:text-gray-600">
                                AI Buddy v2.0 · Your data is stored securely in MongoDB Atlas
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
