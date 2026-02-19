"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, LogOut, User, Github } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useSession, signOut } from 'next-auth/react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShowLogin: () => void;
}

export function SettingsModal({ isOpen, onClose, onShowLogin }: SettingsModalProps) {
    const { theme, toggleTheme } = useTheme();
    const { data: session } = useSession();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl z-50 overflow-hidden border border-violet-100 dark:border-gray-800"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-violet-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-6">

                            {/* Appearance Section */}
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
                                            <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
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

                            {/* Account Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</h3>
                                {session?.user ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-violet-100 dark:border-gray-700/50">
                                            {session.user.image ? (
                                                <img src={session.user.image} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                                                    <User className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                                    {session.user.name || 'User'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {session.user.email}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                signOut();
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-center gap-2 p-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl transition-all text-sm font-medium"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-violet-100 dark:border-gray-700/50 text-center space-y-3">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Not Signed In</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sign in to sync your conversation history across devices.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                onClose();
                                                onShowLogin();
                                            }}
                                            className="w-full flex items-center justify-center gap-2 p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-md shadow-violet-200 dark:shadow-none text-sm font-medium"
                                        >
                                            Sign In
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* About Section */}
                            <div className="pt-2">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        My AI Buddy v2.0
                                    </p>
                                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                                        Powered by Google DeepMind's Gemini & OpenAI (maybe)
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
