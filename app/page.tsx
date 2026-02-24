"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInterface } from "@/components/chat-v2/ChatInterface";
import { LoginModal } from "@/components/LoginModal";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { Sparkles, LogIn, User } from "lucide-react";

export default function Home() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { data: session, status } = useSession();

  const handleInitialize = () => {
    const flashDiv = document.createElement('div');
    flashDiv.className = 'fixed inset-0 bg-violet-400/20 z-[100] pointer-events-none';
    document.body.appendChild(flashDiv);

    setTimeout(() => {
      flashDiv.remove();
      setIsLaunched(true);
    }, 300);
  };

  return (
    <main className="min-h-[100dvh] mobile-optimized bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
      <AnimatePresence mode="wait">
        {!isLaunched ? (
          // === AI BUDDY LANDING PAGE ===
          <motion.div
            key="landing"
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="h-[100dvh] w-full flex flex-col items-center justify-center px-6 py-6 md:px-8 md:py-16 safe-area-inset overflow-hidden"
          >
            {/* Auth status bar at top */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-20"
            >
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full bg-violet-200 animate-pulse" />
              ) : session?.user ? (
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-violet-200 rounded-full px-3 py-1.5 shadow-sm">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-6 h-6 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-gray-700 font-medium hidden sm:inline max-w-[120px] truncate">
                    {session.user.name || session.user.email}
                  </span>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-violet-200 rounded-full px-4 py-2 shadow-sm text-sm font-medium text-violet-700 hover:bg-violet-50 transition-colors touch-manipulation"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </motion.button>
              )}
            </motion.div>

            <div className="max-w-7xl w-full flex flex-col-reverse md:grid md:grid-cols-2 gap-6 md:gap-16 items-center">
              {/* Left Column - Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-6 md:space-y-8 text-center md:text-left z-20"
              >
                {/* Headline */}
                <div className="space-y-2 md:space-y-4">
                  <h1 className="text-4xl md:text-7xl font-bold text-gray-900 tracking-tight">
                    AI Buddy
                  </h1>
                  <h2 className="text-xl md:text-4xl font-semibold text-violet-600">
                    Your Ultimate Chatbot
                  </h2>
                </div>

                {/* Description */}
                <p className="text-sm md:text-lg text-gray-600 leading-relaxed max-w-md mx-auto md:mx-0 hidden md:block">
                  Experience intelligent conversations powered by advanced AI technology.
                  AI Buddy is your trusted companion for seamless communication and productivity.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto md:hidden">
                  Experience intelligent conversations powered by advanced AI.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <motion.button
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 20px 40px rgba(124, 58, 237, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInitialize}
                    className="mobile-button px-8 py-3 md:px-10 md:py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-base md:text-lg font-semibold rounded-full shadow-lg hover:shadow-violet-300 transition-all duration-300 touch-manipulation"
                  >
                    Get Started
                  </motion.button>

                  {/* Show Google Sign-In if not logged in */}
                  {!session?.user && status !== 'loading' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => signIn('google', { callbackUrl: window.location.origin })}
                      className="flex items-center justify-center gap-2 px-6 py-3 md:py-4 bg-white border border-gray-200 text-gray-700 text-base md:text-lg font-medium rounded-full shadow-sm hover:shadow-md hover:border-violet-300 transition-all duration-300 touch-manipulation"
                    >
                      <img
                        src="https://www.google.com/favicon.ico"
                        alt="Google"
                        className="w-5 h-5"
                      />
                      Sign in with Google
                    </motion.button>
                  )}
                </div>

                {/* Features badges */}
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {['💬 Smart Chat', '🎨 Image Generation', '📱 Mobile Ready', '🔒 Secure Login'].map((feature) => (
                    <span
                      key={feature}
                      className="px-3 py-1 bg-white/70 backdrop-blur-sm border border-violet-100 rounded-full text-xs text-gray-600 font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Signed in indicator */}
                {session?.user && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-sm text-green-600 justify-center md:justify-start"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Signed in as <strong>{session.user.name}</strong> — your chats will be saved!</span>
                  </motion.div>
                )}
              </motion.div>

              {/* Right Column - Robot Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="relative flex items-center justify-center z-10"
              >
                {/* Gradient Glow Background */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.4, 0.6, 0.4]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-radial from-violet-300 via-indigo-200 to-transparent opacity-40 blur-3xl"
                />

                {/* Robot Image with Float Animation */}
                <motion.img
                  src="/ai-buddy-robot.png"
                  alt="AI Buddy Robot"
                  animate={{
                    y: [0, -20, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative z-10 w-48 md:w-full md:max-w-lg drop-shadow-2xl"
                />
              </motion.div>
            </div>

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
          </motion.div>
        ) : (
          // === AI BUDDY CHAT INTERFACE ===
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="h-[100dvh] w-full overflow-hidden"
          >
            <ChatInterface />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
