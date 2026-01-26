
import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface SwipeCardProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  leftLabel?: string;
  rightLabel?: string;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  leftLabel = "PASSED",
  rightLabel = "APPLIED"
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  // Feedback overlays
  const rightOpacity = useTransform(x, [50, 150], [0, 1]);
  const leftOpacity = useTransform(x, [-150, -50], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <motion.div
        style={{ x, rotate, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative w-full max-w-md bg-[#1A1A1A] rounded-3xl overflow-hidden border border-white/10 shadow-2xl cursor-grab active:cursor-grabbing h-[600px]"
      >
        {/* Overlays */}
        <motion.div 
          style={{ opacity: rightOpacity }}
          className="absolute top-10 left-10 z-20 border-4 border-green-500 text-green-500 font-bold px-4 py-2 rounded-lg text-3xl rotate-[-12deg] pointer-events-none"
        >
          {rightLabel}
        </motion.div>

        <motion.div 
          style={{ opacity: leftOpacity }}
          className="absolute top-10 right-10 z-20 border-4 border-red-500 text-red-500 font-bold px-4 py-2 rounded-lg text-3xl rotate-[12deg] pointer-events-none"
        >
          {leftLabel}
        </motion.div>

        {children}
      </motion.div>
    </div>
  );
};

export default SwipeCard;
