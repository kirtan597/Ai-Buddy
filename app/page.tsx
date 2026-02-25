"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInterface } from "@/components/chat-v2/ChatInterface";
import { LoginModal } from "@/components/LoginModal";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";

export default function Home() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { data: session, status } = useSession();

  /**
   * AUTO-LAUNCH: If the user is already signed in (returning user after
   * Google OAuth redirect OR an existing session cookie), skip the landing
   * page entirely and go straight into the chat with their history.
   */
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !isLaunched) {
      setIsLaunched(true);
    }
  }, [status, session, isLaunched]);

  const handleStartNow = () => {
    const flashDiv = document.createElement('div');
    flashDiv.className = 'fixed inset-0 bg-violet-400/20 z-[100] pointer-events-none';
    document.body.appendChild(flashDiv);
    setTimeout(() => {
      flashDiv.remove();
      setIsLaunched(true);
    }, 300);
  };

  const handleSignIn = () => {
    // After Google OAuth, NextAuth redirects back here.
    // The useEffect above will auto-detect the session and launch chat.
    signIn('google', { callbackUrl: window.location.origin });
  };

  // ── While NextAuth is resolving the session, show a minimal
  //    full-screen loader so we never flash the landing page to
  //    a user who is already signed in. ──────────────────────────
  if (status === 'loading') {
    return (
      <main className="min-h-[100dvh] bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-4"
        >
          {/* Pulsing robot thumbnail */}
          <img
            src="/ai-buddy-robot.png"
            alt="Loading"
            className="w-20 h-20 object-contain drop-shadow-lg"
          />
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-violet-500"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] mobile-optimized bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
      <AnimatePresence mode="wait">
        {!isLaunched ? (
          /* ────────────────────────────────────────────────────────────
             LANDING PAGE  —  shown only to guests / unauthenticated users
          ──────────────────────────────────────────────────────────── */
          <motion.div
            key="landing"
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="h-[100dvh] w-full flex flex-col items-center justify-center px-6 py-6 md:px-8 md:py-16 safe-area-inset overflow-hidden"
          >
            {/* ── Main Content Grid ── */}
            <div className="max-w-7xl w-full flex flex-col-reverse md:grid md:grid-cols-2 gap-6 md:gap-16 items-center">

              {/* Left Column — Text + Buttons */}
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
                <p className="text-sm md:text-lg text-gray-600 leading-relaxed max-w-md mx-auto md:mx-0">
                  Experience intelligent conversations powered by advanced AI.
                  Chat instantly — no sign-in required.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">

                  {/* Button 1 — Start Now (guest mode) */}
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(124, 58, 237, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartNow}
                    className="mobile-button px-8 py-3 md:px-10 md:py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-base md:text-lg font-semibold rounded-full shadow-lg hover:shadow-violet-300 transition-all duration-300 touch-manipulation"
                  >
                    🚀 Start Now
                  </motion.button>

                  {/* Button 2 — Continue with Sign In */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSignIn}
                    className="flex items-center justify-center gap-2 px-6 py-3 md:py-4 bg-white border border-gray-200 text-gray-700 text-base md:text-lg font-medium rounded-full shadow-sm hover:shadow-md hover:border-violet-300 transition-all duration-300 touch-manipulation"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    Continue with Sign In
                  </motion.button>
                </div>

                {/* Hint for signed-in returning users */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-xs text-gray-400 text-center md:text-left"
                >
                  Already have an account? Sign in to pick up where you left off.
                </motion.p>
              </motion.div>

              {/* Right Column — Robot Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="relative flex items-center justify-center z-10"
              >
                {/* Animated glow behind robot */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-radial from-violet-300 via-indigo-200 to-transparent opacity-40 blur-3xl"
                />
                {/* Floating robot */}
                <motion.img
                  src="/ai-buddy-robot.png"
                  alt="AI Buddy Robot"
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-48 md:w-full md:max-w-lg drop-shadow-2xl"
                />
              </motion.div>
            </div>

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
          </motion.div>
        ) : (
          /* ────────────────────────────────────────────────────────────
             CHAT INTERFACE  —  shown after launch or auto-login
          ──────────────────────────────────────────────────────────── */
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
