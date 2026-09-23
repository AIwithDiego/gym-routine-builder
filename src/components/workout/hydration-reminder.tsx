"use client";

import { motion } from "framer-motion";
import { Droplets, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HydrationReminderProps {
  nextMachineName?: string;
  onDismiss: () => void;
}

export function HydrationReminder({
  nextMachineName,
  onDismiss,
}: HydrationReminderProps) {
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background ripple animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-blue-400/20"
            initial={{ width: 100, height: 100, opacity: 0.6 }}
            animate={{
              width: [100, 400],
              height: [100, 400],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
        {/* Animated water droplet */}
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
        >
          <motion.div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #22d3ee 100%)",
            }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Droplets className="w-14 h-14 text-white" />
          </motion.div>

          {/* Sparkle effects */}
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-300"
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.5,
            }}
          />
          <motion.div
            className="absolute top-4 -left-2 w-3 h-3 rounded-full bg-blue-300"
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 1,
            }}
          />
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-2xl font-bold text-text-primary mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Stay Hydrated
        </motion.h1>

        {/* Message */}
        <motion.p
          className="text-text-secondary text-center max-w-xs mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Great work! Take a moment to drink some water before your next
          exercise.
        </motion.p>

        {/* Next machine info */}
        {nextMachineName && (
          <motion.div
            className="flex items-center gap-2 px-4 py-3 bg-bg-card rounded-xl border border-border-default"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="text-text-secondary text-sm">Up next:</span>
            <span className="text-text-primary font-medium">
              {nextMachineName}
            </span>
          </motion.div>
        )}
      </div>

      {/* Continue button */}
      <motion.div
        className="p-6 pb-safe"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={onDismiss} className="w-full" size="lg">
          <span>Continue</span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
