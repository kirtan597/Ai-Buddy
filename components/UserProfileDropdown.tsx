'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut, signIn } from 'next-auth/react';
import {
    LogOut, RefreshCcw, ChevronDown,
    MessageSquare, Sparkles, CheckCircle, LogIn,
} from 'lucide-react';
import { useChatStore } from '@/lib/chat-v2/chatStore';

interface UserProfileDropdownProps {
    onShowLogin?: () => void;
    variant?: 'landing' | 'chat';
}

export function UserProfileDropdown({ onShowLogin, variant = 'landing' }: UserProfileDropdownProps) {
    const { data: session, status } = useSession();
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [switching, setSwitching] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    // Track the trigger's position so we can place the panel via fixed positioning
    const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

    const { sessions } = useChatStore();
    const totalConversations = sessions.length;
    const totalMessages = sessions.reduce((acc, s) => acc + s.messages.length, 0);

    // Recalculate panel position whenever we open
    const recalcPos = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const rightFromEdge = window.innerWidth - rect.right;
        setPanelPos({ top: rect.bottom + 6, right: rightFromEdge });
    };

    const handleOpen = () => {
        if (!open) recalcPos();
        setOpen(v => !v);
    };

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (
                !triggerRef.current?.contains(target) &&
                !panelRef.current?.contains(target)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [open]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Reposition if window resizes while open
    useEffect(() => {
        if (!open) return;
        const handler = () => recalcPos();
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [open]);

    const handleSignOut = async () => {
        setSigningOut(true);
        setOpen(false);
        await signOut({ callbackUrl: window.location.origin });
    };

    const handleSwitchAccount = async () => {
        setSwitching(true);
        setOpen(false);
        await signOut({ redirect: false });
        await signIn('google', {
            callbackUrl: window.location.origin,
            prompt: 'select_account',
        });
    };

    // ── Loading state ──────────────────────────────────────────────────────────
    if (status === 'loading') {
        return <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-gray-700 animate-pulse" />;
    }

    // ── Not signed in ──────────────────────────────────────────────────────────
    if (!session?.user) {
        return (
            <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onShowLogin}
                className={`flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5 transition-all touch-manipulation
          ${variant === 'landing'
                        ? 'bg-white/80 border border-violet-200 text-violet-700 hover:bg-violet-50 backdrop-blur-sm shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
            >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
            </motion.button>
        );
    }

    // ── Signed in ──────────────────────────────────────────────────────────────
    const user = session.user;
    const initials = (user.name || user.email || 'U')
        .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <>
            {/* ── Trigger button ── */}
            <motion.button
                ref={triggerRef}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleOpen}
                aria-expanded={open}
                aria-haspopup="true"
                className={`flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 transition-all touch-manipulation border
          ${variant === 'landing'
                        ? 'bg-white/90 border-violet-200 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-violet-300'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
            >
                {user.image ? (
                    <img
                        src={user.image}
                        alt={user.name || 'me'}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-violet-200 dark:ring-violet-700"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                        {initials}
                    </div>
                )}
                <span className={`text-xs font-semibold hidden sm:block max-w-[80px] truncate
          ${variant === 'landing' ? 'text-gray-800' : 'text-gray-700 dark:text-gray-200'}`}>
                    {user.name?.split(' ')[0] || 'You'}
                </span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                </motion.span>
            </motion.button>

            {/* ── Backdrop (only visible, no blur — keeps chat readable) ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="fixed inset-0 z-[199]"
                        onClick={() => setOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Dropdown panel — fixed positioned, escapes all overflow:hidden containers ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={panelRef}
                        key="panel"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{
                            position: 'fixed',
                            top: panelPos.top,
                            right: panelPos.right,
                            // Cap width so it fits on small phones
                            width: Math.min(256, window.innerWidth - 16),
                            zIndex: 200,
                        }}
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                        {/* Profile row */}
                        <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 dark:border-gray-800">
                            {user.image ? (
                                <img
                                    src={user.image}
                                    alt={user.name || 'Profile'}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {initials}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {user.name || 'User'}
                                    </p>
                                    <span title="Verified">
                                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col items-center py-2 gap-0.5">
                                <div className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3 text-violet-400" />
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">{totalConversations}</span>
                                </div>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Chats</span>
                            </div>
                            <div className="flex flex-col items-center py-2 gap-0.5">
                                <div className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">{totalMessages}</span>
                                </div>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Messages</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-1">
                            <button
                                onClick={handleSwitchAccount}
                                disabled={switching}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group disabled:opacity-60 touch-manipulation"
                            >
                                <RefreshCcw className={`w-3.5 h-3.5 text-gray-400 group-hover:text-violet-500 transition-colors flex-shrink-0 ${switching ? 'animate-spin' : ''}`} />
                                <div>
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                        {switching ? 'Switching…' : 'Switch Account'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Different Google account</p>
                                </div>
                            </button>

                            <button
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group disabled:opacity-60 touch-manipulation"
                            >
                                <LogOut className={`w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors flex-shrink-0 ${signingOut ? 'animate-pulse' : ''}`} />
                                <div>
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                        {signingOut ? 'Signing out…' : 'Sign Out'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">End session on this device</p>
                                </div>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[9px] text-center text-gray-300 dark:text-gray-700">
                                AI Buddy v2.0 · Synced with MongoDB
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
