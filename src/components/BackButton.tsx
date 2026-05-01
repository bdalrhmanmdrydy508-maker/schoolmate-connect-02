import { ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface BackButtonProps {
  onClick: () => void;
  /** When true, renders inline (in flow). Otherwise floats fixed at top-right. */
  inline?: boolean;
  label?: string;
  className?: string;
}

/**
 * Consistent, highly visible back button.
 * - Floats at the true top-right corner by default.
 * - Neon-cyan accent so it stands out in light & dark modes.
 * - RTL-aware arrow direction (arrow points toward "previous").
 */
export const BackButton = ({ onClick, inline = false, label, className = '' }: BackButtonProps) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const Arrow = isRTL ? ArrowRight : ArrowLeft;
  const text = label ?? t.common.back;

  const button = (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={text}
      className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 font-bold shadow-lg backdrop-blur-md transition-all ${className}`}
      style={{
        color: '#00e5ff',
        borderColor: 'rgba(0,229,255,0.6)',
        background: 'rgba(0,229,255,0.10)',
        boxShadow: '0 0 18px rgba(0,229,255,0.35)',
      }}
    >
      <Arrow className="w-6 h-6" />
      <span className="text-base">{text}</span>
    </motion.button>
  );

  if (inline) return button;

  return (
    <div className="fixed top-3 right-3 z-[60]">
      {button}
    </div>
  );
};

export default BackButton;
