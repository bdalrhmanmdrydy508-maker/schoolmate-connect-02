import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  onClick: () => void;
  /** When true, renders inline (in flow). Otherwise floats fixed at top-right. */
  inline?: boolean;
  label?: string;
  className?: string;
}

/**
 * Unified, formal back button used on every internal page.
 * - Calm neutral colors that work in light & dark modes.
 * - No glow/neon effects.
 * - RTL-aware arrow direction.
 * - Default position: fixed at the true top-right corner of the page.
 */
export const BackButton = ({ onClick, inline = false, label, className = '' }: BackButtonProps) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const Arrow = isRTL ? ArrowRight : ArrowLeft;
  const text = label ?? t.common.back;

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label={text}
      className={`gap-2 h-10 px-3 rounded-lg border border-border bg-card text-foreground hover:bg-accent shadow-sm ${className}`}
    >
      <Arrow className="w-5 h-5" />
      <span className="text-sm font-medium">{text}</span>
    </Button>
  );

  if (inline) return button;

  return (
    <div className="absolute top-3 right-3 z-40">
      {button}
    </div>
  );
};

export default BackButton;
