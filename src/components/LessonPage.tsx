import { motion } from 'framer-motion';
import { X, FileText, Download, Pencil, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  lesson_date: string;
  file_url: string | null;
  duration?: string | null;
}

interface LessonPageProps {
  lesson: Lesson;
  onClose: () => void;
  onEdit?: () => void;
  showEditButton?: boolean;
}

export const LessonPage = ({ lesson, onClose, onEdit, showEditButton = false }: LessonPageProps) => {
  const { t } = useLanguage();

  const formatDateForDisplay = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split('/');
      const raw = parts[parts.length - 1];
      // Remove UUID prefix if present
      const cleaned = raw.replace(/^[a-f0-9-]+-/, '');
      return decodeURIComponent(cleaned);
    } catch {
      return t.common.openFile;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
        <span className="text-sm text-muted-foreground font-medium">
          {formatDateForDisplay(lesson.lesson_date)}
          {lesson.duration && ` • ${lesson.duration}`}
        </span>
        {showEditButton && onEdit ? (
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="w-5 h-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Notebook paper content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div
            className="relative bg-card rounded-2xl shadow-lg border border-border/50 min-h-[70vh] p-8"
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 0px, transparent 48px, hsl(var(--primary) / 0.12) 48px, hsl(var(--primary) / 0.12) 50px, transparent 50px),
                linear-gradient(hsl(var(--primary) / 0.06) 1px, transparent 1px)
              `,
              backgroundSize: '100% 100%, 100% 32px',
              backgroundPosition: '0 0, 0 80px',
            }}
          >
            {/* Red margin line accent */}
            <div className="absolute left-12 top-0 bottom-0 w-px bg-destructive/20" />

            {/* Title area */}
            <div className="mb-8 pb-4 border-b-2 border-primary/20 pl-12">
              <h1 className="text-2xl md:text-3xl font-bold text-primary leading-relaxed">
                {lesson.title}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDateForDisplay(lesson.lesson_date)}
                </span>
                {lesson.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {lesson.duration}
                  </span>
                )}
              </div>
            </div>

            {/* Content area */}
            <div className="pl-12 pr-4 min-h-[40vh]">
              {lesson.description ? (
                <div className="whitespace-pre-wrap text-foreground leading-[32px] text-base">
                  {lesson.description}
                </div>
              ) : (
                <p className="text-muted-foreground italic">{t.admin.noLessonsNote}</p>
              )}
            </div>
          </div>

          {/* File buttons */}
          {lesson.file_url && (
            <div className="flex items-center justify-center gap-4 mt-6 pb-8">
              <Button
                asChild
                className="gap-2 px-6"
                variant="default"
              >
                <a href={lesson.file_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4" />
                  {t.common.openFile}
                </a>
              </Button>
              <Button
                asChild
                className="gap-2 px-6"
                variant="outline"
              >
                <a href={lesson.file_url} download>
                  <Download className="w-4 h-4" />
                  {t.common.download}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
