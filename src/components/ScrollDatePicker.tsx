import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollDatePickerProps {
  value: string; // DD/MM/YYYY
  onChange: (value: string) => void;
  label?: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 3 + i));

const monthNames: Record<string, string> = {
  '01': 'جانفي', '02': 'فيفري', '03': 'مارس', '04': 'أفريل',
  '05': 'ماي', '06': 'جوان', '07': 'جويلية', '08': 'أوت',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

// Try to play a subtle tick sound
const playTick = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    gain.gain.value = 0.03;
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch {}
};

function ScrollColumn({ items, selected, onSelect, renderItem }: {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  renderItem?: (item: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(-1);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const selectedIndex = items.indexOf(selected);

  useEffect(() => {
    if (containerRef.current && !isScrolling.current) {
      const idx = items.indexOf(selected);
      if (idx >= 0) {
        containerRef.current.scrollTop = idx * ITEM_HEIGHT;
        lastIndex.current = idx;
      }
    }
  }, [selected, items]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    isScrolling.current = true;

    const scrollTop = containerRef.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(items.length - 1, idx));

    if (clampedIdx !== lastIndex.current) {
      lastIndex.current = clampedIdx;
      playTick();
      onSelect(items[clampedIdx]);
    }

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: clampedIdx * ITEM_HEIGHT, behavior: 'smooth' });
      }
    }, 100);
  }, [items, onSelect]);

  return (
    <div className="relative flex-1" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
      {/* Highlight bar */}
      <div
        className="absolute inset-x-1 rounded-lg bg-primary/15 border border-primary/30 pointer-events-none z-10"
        style={{ top: CENTER_INDEX * ITEM_HEIGHT, height: ITEM_HEIGHT }}
      />
      {/* Gradient masks */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-popover to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-popover to-transparent z-20 pointer-events-none" />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: CENTER_INDEX * ITEM_HEIGHT,
          paddingBottom: CENTER_INDEX * ITEM_HEIGHT,
        }}
      >
        {items.map((item, i) => (
          <div
            key={item}
            className={`flex items-center justify-center transition-all duration-150 cursor-pointer select-none ${
              i === selectedIndex
                ? 'text-primary font-bold text-lg'
                : 'text-muted-foreground text-base'
            }`}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'start' }}
            onClick={() => {
              onSelect(item);
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
              }
            }}
          >
            {renderItem ? renderItem(item) : item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScrollDatePicker({ value, onChange, label }: ScrollDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial value
  const parseParts = (val: string) => {
    const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return { day: match[1], month: match[2], year: match[3] };
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
    };
  };

  const [day, setDay] = useState(() => parseParts(value).day);
  const [month, setMonth] = useState(() => parseParts(value).month);
  const [year, setYear] = useState(() => parseParts(value).year);

  useEffect(() => {
    if (isOpen) {
      const parts = parseParts(value);
      setDay(parts.day);
      setMonth(parts.month);
      setYear(parts.year);
    }
  }, [isOpen]);

  const confirm = () => {
    onChange(`${day}/${month}/${year}`);
    setIsOpen(false);
  };

  const displayValue = value || '';

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full h-12 text-base rounded-xl justify-start gap-3 font-normal"
        dir="ltr"
      >
        <Calendar className="w-5 h-5 text-primary shrink-0" />
        {displayValue ? (
          <span className="text-foreground">{displayValue}</span>
        ) : (
          <span className="text-muted-foreground">DD/MM/YYYY</span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-popover rounded-t-2xl shadow-2xl border-t border-border"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
                <span className="font-bold text-base">اختر التاريخ</span>
                <Button variant="ghost" size="sm" onClick={confirm} className="text-primary font-bold">
                  <Check className="w-5 h-5" />
                  تأكيد
                </Button>
              </div>

              {/* Column Labels */}
              <div className="flex px-4 pt-3 pb-1">
                <span className="flex-1 text-center text-xs text-muted-foreground font-semibold">اليوم</span>
                <span className="flex-1 text-center text-xs text-muted-foreground font-semibold">الشهر</span>
                <span className="flex-1 text-center text-xs text-muted-foreground font-semibold">السنة</span>
              </div>

              {/* Scroll Wheels */}
              <div className="flex gap-2 px-4 pb-6" dir="ltr">
                <ScrollColumn items={days} selected={day} onSelect={setDay} />
                <ScrollColumn
                  items={months}
                  selected={month}
                  onSelect={setMonth}
                  renderItem={(m) => monthNames[m] || m}
                />
                <ScrollColumn items={years} selected={year} onSelect={setYear} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
