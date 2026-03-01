import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Download, Pencil, Calendar, Clock, Save, Loader2, Trash2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  onUpdate?: (lesson: Lesson) => void;
  onDelete?: (lessonId: string) => void;
  showEditButton?: boolean;
  teacherUserId?: string;
}

export const LessonPage = ({ lesson, onClose, onUpdate, onDelete, showEditButton = false, teacherUserId }: LessonPageProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(lesson.title);
  const [editDescription, setEditDescription] = useState(lesson.description || '');
  const [editDate, setEditDate] = useState(formatDateForEdit(lesson.lesson_date));
  const [editDuration, setEditDuration] = useState(lesson.duration || '');
  const [editFile, setEditFile] = useState<File | null>(null);

  function formatDateForEdit(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }

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

  const parseManualDate = (dateStr: string): string | null => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(regex);
    if (!match) return null;
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    if (!editTitle || !editDate) {
      toast({ title: t.common.warning, description: t.teacher.fillRequiredFields, variant: 'destructive' });
      return;
    }

    const parsedDate = parseManualDate(editDate);
    if (!parsedDate) {
      toast({ title: t.common.warning, description: t.teacher.invalidDateFormat, variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      let fileUrl = lesson.file_url;

      // Upload new file if provided
      if (editFile && teacherUserId) {
        const fileExt = editFile.name.split('.').pop()?.toLowerCase();
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const fileName = `${teacherUserId}/${uniqueId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('teacher-files')
          .upload(fileName, editFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: editFile.type || 'application/octet-stream'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('teacher-files')
          .getPublicUrl(fileName);
        fileUrl = publicUrl;
      }

      const { error } = await supabase
        .from('lessons')
        .update({
          title: editTitle,
          description: editDescription || null,
          lesson_date: parsedDate,
          duration: editDuration || null,
          file_url: fileUrl,
        })
        .eq('id', lesson.id);

      if (error) throw error;

      const updatedLesson: Lesson = {
        ...lesson,
        title: editTitle,
        description: editDescription || null,
        lesson_date: parsedDate,
        duration: editDuration || null,
        file_url: fileUrl,
      };

      toast({ title: t.common.success, description: t.lessonEdit.lessonUpdated });
      setIsEditing(false);
      onUpdate?.(updatedLesson);
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message || t.lessonEdit.updateError, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t.lessonEdit.deleteConfirm)) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);
      if (error) throw error;
      toast({ title: t.common.success, description: t.lessonEdit.lessonDeleted });
      onDelete?.(lesson.id);
      onClose();
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: 'destructive' });
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
          {isEditing ? t.lessonEdit.editLesson : formatDateForDisplay(lesson.lesson_date)}
          {!isEditing && lesson.duration && ` • ${lesson.duration}`}
        </span>
        {showEditButton && !isEditing ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Pencil className="w-5 h-5" />
            </Button>
          </div>
        ) : isEditing ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive">
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-primary" />}
            </Button>
          </div>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-6 bg-card rounded-2xl shadow-lg border border-border/50 p-8">
              <div className="space-y-2">
                <Label>{t.teacher.lessonTitle} *</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.teacher.lessonDate} * ({t.teacher.lessonDateFormat})</Label>
                  <Input value={editDate} onChange={(e) => setEditDate(e.target.value)} dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>{t.teacher.lessonDuration}</Label>
                  <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.teacher.lessonDescription}</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="min-h-[200px]" />
              </div>
              <div className="space-y-2">
                <Label>{t.teacher.attachFile}</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip" onChange={(e) => setEditFile(e.target.files?.[0] || null)} className="hidden" id="edit-lesson-file" />
                  <label htmlFor="edit-lesson-file" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileUp className="w-8 h-8 text-muted-foreground" />
                    {editFile ? (
                      <span className="text-sm font-medium text-primary">{editFile.name}</span>
                    ) : lesson.file_url ? (
                      <span className="text-sm text-muted-foreground">{t.teacher.fileSelected} ✓</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t.teacher.supportedFormats}</span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* View Mode - Notebook paper */
            <>
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
                <div className="absolute left-12 top-0 bottom-0 w-px bg-destructive/20" />
                <div className="mb-8 pb-4 border-b-2 border-primary/20 pl-12">
                  <h1 className="text-2xl md:text-3xl font-bold text-primary leading-relaxed">{lesson.title}</h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDateForDisplay(lesson.lesson_date)}</span>
                    {lesson.duration && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{lesson.duration}</span>}
                  </div>
                </div>
                <div className="pl-12 pr-4 min-h-[40vh]">
                  {lesson.description ? (
                    <div className="whitespace-pre-wrap text-foreground leading-[32px] text-base">{lesson.description}</div>
                  ) : (
                    <p className="text-muted-foreground italic">{t.admin.noLessonsNote}</p>
                  )}
                </div>
              </div>
              {lesson.file_url && (
                <div className="flex items-center justify-center gap-4 mt-6 pb-8">
                  <Button asChild className="gap-2 px-6" variant="default">
                    <a href={lesson.file_url} target="_blank" rel="noopener noreferrer"><FileText className="w-4 h-4" />{t.common.openFile}</a>
                  </Button>
                  <Button asChild className="gap-2 px-6" variant="outline">
                    <a href={lesson.file_url} download><Download className="w-4 h-4" />{t.common.download}</a>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
