import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number;
  maxDuration?: number;
}

const LoadingScreen = ({ 
  onComplete, 
  minDuration = 3000, 
  maxDuration = 5000 
}: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loadingText, setLoadingText] = useState('جاري التحميل');

  useEffect(() => {
    const startTime = Date.now();
    const duration = Math.min(maxDuration, Math.max(minDuration, 3500));
    
    // Progress animation
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(newProgress);
      
      // Update loading text based on progress
      if (newProgress < 30) {
        setLoadingText('جاري التحميل');
      } else if (newProgress < 60) {
        setLoadingText('التحقق من الحساب');
      } else if (newProgress < 90) {
        setLoadingText('تحضير لوحة التحكم');
      } else {
        setLoadingText('جاهز للانطلاق');
      }
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 50);

    // Minimum display timer
    const minTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(minTimer);
    };
  }, [minDuration, maxDuration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 relative overflow-hidden"
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-accent/5 blur-3xl"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-primary/10 blur-2xl"
              animate={{ y: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Logo with glow effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative mb-8"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150" />
            <motion.img 
              src={logo} 
              alt="SmartNotebook" 
              className="relative w-28 h-28 object-contain drop-shadow-2xl"
              animate={{ 
                rotate: [0, 5, -5, 0],
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          </motion.div>

          {/* App Name with gradient */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2"
          >
            SmartNotebook
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-muted-foreground text-sm mb-10"
          >
            دفتر القسم الذكي
          </motion.p>

          {/* Loading Animation - Elegant Progress Bar */}
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "16rem" }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="relative h-2 bg-secondary/50 rounded-full overflow-hidden"
          >
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
              animate={{ x: ['-100%', '400%'] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Progress percentage */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="text-muted-foreground/70 text-xs mt-3"
          >
            {Math.round(progress)}%
          </motion.p>

          {/* Loading Dots */}
          <div className="flex items-center gap-1.5 mt-4">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2 h-2 rounded-full bg-primary/60"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: index * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Loading Text */}
          <motion.p
            key={loadingText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="text-muted-foreground/70 text-xs mt-4"
          >
            {loadingText}...
          </motion.p>

          {/* Version */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute bottom-6 text-muted-foreground/50 text-xs"
          >
            الإصدار 1.0.0
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
