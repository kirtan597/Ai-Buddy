'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose?: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-violet-100 dark:border-gray-800"
                    >
                        {/* Decorative Header */}
                        <div className="h-32 bg-gradient-to-br from-violet-600 to-indigo-600 relative overflow-hidden flex items-center justify-center">
                            <div 
                                className="absolute inset-0 opacity-20" 
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px' }} 
                            />
                            <div className="relative z-10 flex flex-col items-center text-white">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl mb-3">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold font-orbitron tracking-wide">AI Buddy</h2>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 text-center">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Unlock Full Access
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                                Sign in to save your conversations, access history, and continue chatting without limits.
                            </p>

                            <button
                                onClick={() => signIn('google', { callbackUrl: window.location.origin })}
                                className="w-full group relative flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 font-medium py-3.5 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                <img
                                    src="https://www.google.com/favicon.ico"
                                    alt="Google"
                                    className="w-5 h-5"
                                />
                                <span className="text-lg">Continue with Google</span>
                                <ArrowRight className="w-4 h-4 text-violet-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 absolute right-4" />
                            </button>

                            <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                                By continuing, you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
