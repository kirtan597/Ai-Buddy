"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInterface } from "@/components/chat-v2/ChatInterface";

export default function Home() {
  const [isLaunched, setIsLaunched] = useState(false);

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
            className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 py-12 md:px-8 md:py-16 safe-area-inset overflow-y-auto"
          >
            <div className="max-w-7xl w-full flex flex-col-reverse md:grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              {/* Left Column - Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-6 md:space-y-8 text-center md:text-left"
              >
                {/* Headline */}
                <div className="space-y-2 md:space-y-4">
                  <h1 className="text-4xl md:text-7xl font-bold text-gray-900 tracking-tight">
                    AI Buddy
                  </h1>
                  <h2 className="text-2xl md:text-4xl font-semibold text-violet-600">
                    Your Ultimate Chatbot
                  </h2>
                </div>

                {/* Description */}
                <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-md mx-auto md:mx-0">
                  Experience intelligent conversations powered by advanced AI technology.
                  AI Buddy is your trusted companion for seamless communication and productivity.
                </p>

                {/* CTA Button */}
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
              </motion.div>

              {/* Right Column - Robot Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="relative flex items-center justify-center"
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
                  className="relative z-10 w-full max-w-sm md:max-w-lg drop-shadow-2xl"
                />
              </motion.div>
            </div>
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
