import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  onClick: () => void;
  /** When true, renders just the button (no wrapper row). Otherwise renders inside its own full-width row aligned to the right. */
  inline?: boolean;
  label?: string;
  className?: string;
}

/**
 * Unified, formal back button used on every internal page.
 * - Calm neutral colors (no glow / no neon).
 * - RTL-aware arrow direction.
 * - Always sits on its own row, aligned to the true right, with clear spacing
 *   so it never overlaps page titles or content.
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
      className={`gap-2 h-10 px-4 rounded-lg border border-border/80 bg-card/80 text-foreground hover:bg-accent hover:text-accent-foreground hover:border-border transition-colors shadow-sm ${className}`}
    >
      <Arrow className="w-4 h-4 opacity-80" />
      <span className="text-sm font-medium">{text}</span>
    </Button>
  );

  if (inline) return button;

  // Own row, right-aligned (true right in both LTR & RTL), with bottom spacing
  return (
    <div className="w-full flex justify-end mb-4" dir="ltr">
      <div dir={isRTL ? 'rtl' : 'ltr'}>{button}</div>
    </div>
  );
};

export default BackButton;
