"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sun, Moon, LogOut, User,
    RefreshCcw, Shield, Sparkles, MessageSquare,
    CheckCircle, ExternalLink
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShowLogin: () => void;
}

export function SettingsModal({ isOpen, onClose, onShowLogin }: SettingsModalProps) {
    const { theme, toggleTheme } = useTheme();
    const { data: session } = useSession();
    const { sessions } = useChatStore();
    const [signingOut, setSigningOut] = useState(false);
    const [switchingAccount, setSwitchingAccount] = useState(false);

    const totalMessages = sessions.reduce((acc, s) => acc + s.messages.length, 0);
    const totalConversations = sessions.length;

    const user = session?.user;
    const initials = (user?.name || user?.email || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    const handleSignOut = async () => {
        setSigningOut(true);
        onClose();
        await signOut({ callbackUrl: window.location.origin });
    };

    const handleSwitchAccount = async () => {
        setSwitchingAccount(true);
        onClose();
        await signOut({ redirect: false });
        await signIn('google', {
            callbackUrl: window.location.origin,
            prompt: 'select_account',
        } as any);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden border border-violet-100 dark:border-gray-800"
                    >
                        {/* ── Header ── */}
                        <div className="p-4 border-b border-violet-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* ── Content ── */}
                        <div className="p-4 space-y-5 max-h-[80vh] overflow-y-auto">

                            {/* ── ACCOUNT SECTION ── */}
                            {user ? (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</h3>

                                    {/* Profile Card */}
                                    <div className="rounded-2xl overflow-hidden border border-violet-100 dark:border-gray-800">
                                        {/* Gradient Header */}
                                        <div className="relative px-4 pt-4 pb-10 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700">
                                            <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full bg-white/10" />
                                            <div className="flex items-center gap-3">
                                                {user.image ? (
                                                    <img
                                                        src={user.image}
                                                        alt={user.name || 'Profile'}
                                                        referrerPolicy="no-referrer"
                                                        className="w-14 h-14 rounded-2xl border-2 border-white/40 shadow-lg flex-shrink-0 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold border-2 border-white/40 flex-shrink-0">
                                                        {initials}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-white font-bold text-base truncate">{user.name || 'User'}</p>
                                                        <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" />
                                                    </div>
                                                    <p className="text-violet-200 text-xs truncate">{user.email}</p>
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-[10px] text-white font-medium">
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

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 divide-x divide-violet-100 dark:divide-gray-800 -mt-6 relative z-10 mx-3 bg-white dark:bg-gray-900 rounded-xl border border-violet-100 dark:border-gray-800 shadow-sm">
                                            <div className="flex flex-col items-center py-3 gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{totalConversations}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Conversations</span>
                                            </div>
                                            <div className="flex flex-col items-center py-3 gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{totalMessages}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Messages</span>
                                            </div>
                                        </div>

                                        {/* Secure badge */}
                                        <div className="mx-3 mt-2 mb-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                                            <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                                <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-green-700 dark:text-green-400">Secure Session Active</p>
                                                <p className="text-[10px] text-green-600/70 dark:text-green-500/70">Your data is encrypted & synced to MongoDB</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        {/* Switch Account */}
                                        <button
                                            onClick={handleSwitchAccount}
                                            disabled={switchingAccount}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-all text-left group disabled:opacity-60"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                                <RefreshCcw className={`w-4 h-4 text-violet-600 dark:text-violet-400 ${switchingAccount ? 'animate-spin' : ''}`} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    {switchingAccount ? 'Switching Account…' : 'Switch Account'}
                                                </p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    Sign in with a different Google account
                                                </p>
                                            </div>
                                            <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                        </button>

                                        {/* Sign Out */}
                                        <button
                                            onClick={handleSignOut}
                                            disabled={signingOut}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all text-left group disabled:opacity-60"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                                <LogOut className={`w-4 h-4 text-red-500 ${signingOut ? 'animate-pulse' : ''}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                    {signingOut ? 'Signing Out…' : 'Sign Out'}
                                                </p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    End your session on this device
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // ── Not Signed In State ──
                                <div className="space-y-3">
                                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</h3>
                                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-violet-100 dark:border-gray-700/50 text-center space-y-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto">
                                            <User className="w-7 h-7 text-violet-400 dark:text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Not Signed In</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                                Sign in to save your conversations, access history, and sync across devices.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { onClose(); onShowLogin(); }}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-md shadow-violet-200 dark:shadow-none text-sm font-semibold"
                                        >
                                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                                            Continue with Google
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── APPEARANCE SECTION ── */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appearance</h3>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-violet-100 dark:border-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                                            {theme === 'light' ? (
                                                <Sun className="w-5 h-5 text-amber-500" />
                                            ) : (
                                                <Moon className="w-5 h-5 text-indigo-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">Theme</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {theme === 'light' ? 'Light Mode active' : 'Dark Mode active'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
                                    >
                                        Toggle
                                    </button>
                                </div>
                            </div>

                            {/* ── ABOUT ── */}
                            <div className="pt-1">
                                <div className="text-center space-y-0.5">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">AI Buddy v2.0</p>
                                    <p className="text-[10px] text-gray-300 dark:text-gray-600">
                                        Powered by Gemini · Built with Next.js & MongoDB
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
