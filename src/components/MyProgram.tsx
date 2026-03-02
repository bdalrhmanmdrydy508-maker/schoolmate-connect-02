import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Trash2, Plus, Loader2, FileUp, BookOpen, AlertCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

interface ProgramLesson {
  id: string;
  lesson_number: number;
  lesson_title: string;
  unit: string | null;
  status: string;
}

interface TemplateLesson {
  lesson_number: number;
  lesson_title: string;
  unit?: string;
}

interface MyProgramProps {
  sectionId: string;
  teacherId: string;
  readOnly?: boolean;
  onBack: () => void;
}

export const MyProgram = ({ sectionId, teacherId, readOnly = false, onBack }: MyProgramProps) => {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<ProgramLesson[]>([]);
  const [templateData, setTemplateData] = useState<TemplateLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonUnit, setNewLessonUnit] = useState('');
  const [newLessonNumber, setNewLessonNumber] = useState('');
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);

  const fetchProgram = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('teacher_programs')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('section_id', sectionId)
      .order('lesson_number');

    if (data) setLessons(data as ProgramLesson[]);
    if (error) console.error('Error fetching program:', error);

    // Fetch template
    const { data: tmpl } = await supabase
      .from('program_templates')
      .select('original_data')
      .eq('teacher_id', teacherId)
      .eq('section_id', sectionId)
      .maybeSingle();

    if (tmpl?.original_data) {
      setTemplateData(tmpl.original_data as unknown as TemplateLesson[]);
    }
    setIsLoading(false);
  }, [teacherId, sectionId]);

  useEffect(() => { fetchProgram(); }, [fetchProgram]);

  // Smart autocomplete: when lesson number changes, suggest from template
  useEffect(() => {
    const num = parseInt(newLessonNumber);
    if (!isNaN(num) && templateData.length > 0) {
      const match = templateData.find(t => t.lesson_number === num);
      if (match) {
        if (!newLessonTitle) setNewLessonTitle(match.lesson_title);
        if (!newLessonUnit && match.unit) setNewLessonUnit(match.unit);
      }
    }
  }, [newLessonNumber, templateData]);

  // Title suggestions
  useEffect(() => {
    if (newLessonTitle.length < 1) { setTitleSuggestions([]); return; }
    const allTitles = [
      ...templateData.map(t => t.lesson_title),
      ...lessons.map(l => l.lesson_title)
    ];
    const unique = [...new Set(allTitles)];
    const filtered = unique.filter(t => t.toLowerCase().includes(newLessonTitle.toLowerCase()) && t !== newLessonTitle);
    setTitleSuggestions(filtered.slice(0, 5));
  }, [newLessonTitle, templateData, lessons]);

  // Unit suggestions
  useEffect(() => {
    if (newLessonUnit.length < 1) { setUnitSuggestions([]); return; }
    const allUnits = [
      ...templateData.filter(t => t.unit).map(t => t.unit!),
      ...lessons.filter(l => l.unit).map(l => l.unit!)
    ];
    const unique = [...new Set(allUnits)];
    const filtered = unique.filter(u => u.toLowerCase().includes(newLessonUnit.toLowerCase()) && u !== newLessonUnit);
    setUnitSuggestions(filtered.slice(0, 5));
  }, [newLessonUnit, templateData, lessons]);

  // Convert file to base64 using FileReader (handles large files better)
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error(t.program.fileReadError));
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 40));
        }
      };
      reader.readAsDataURL(file);
    });
  }, [t]);

  // Retry wrapper for network calls
  const withRetry = useCallback(async <T,>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        const isNetworkError = !navigator.onLine || 
          err.message?.includes('Failed to fetch') || 
          err.message?.includes('NetworkError') ||
          err.message?.includes('network');
        
        if (attempt === retries || !isNetworkError) throw err;
        
        setUploadError(t.program.retrying.replace('{attempt}', String(attempt)));
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        setUploadError(null);
      }
    }
    throw new Error(t.program.analysisFailed);
  }, [t]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input so same file can be re-selected
    e.target.value = '';

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({ title: t.common.error, description: t.program.unsupportedFormat, variant: 'destructive' });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: t.common.error, description: t.program.fileTooLarge, variant: 'destructive' });
      return;
    }

    if (file.size === 0) {
      toast({ title: t.common.error, description: t.program.fileEmpty, variant: 'destructive' });
      return;
    }

    // Check network
    if (!navigator.onLine) {
      toast({ title: t.common.error, description: t.program.noConnection, variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Step 1: Convert to base64
      setUploadProgress(5);
      const fileBase64 = await fileToBase64(file);
      setUploadProgress(40);

      // Step 2: Send to AI analysis with retry
      const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';
      setUploadProgress(50);

      const data = await withRetry(async () => {
        const { data, error } = await supabase.functions.invoke('analyze-program', {
          body: { fileBase64, fileType, mimeType: file.type }
        });
        if (error) throw error;
        if (data?.error) {
          if (data.error.includes('Rate limit')) {
            throw new Error(t.program.rateLimited);
          }
          if (data.error.includes('Payment')) {
            throw new Error(t.program.analysisFailed);
          }
          throw new Error(data.error);
        }
        return data;
      });

      setUploadProgress(70);

      const extractedLessons: TemplateLesson[] = data.lessons || [];
      if (extractedLessons.length === 0) {
        toast({ title: t.common.warning, description: t.program.noLessonsExtracted, variant: 'destructive' });
        return;
      }

      // Step 3: Save template
      setUploadProgress(80);
      await withRetry(async () => {
        const { data: existingTmpl } = await supabase
          .from('program_templates')
          .select('id')
          .eq('teacher_id', teacherId)
          .eq('section_id', sectionId)
          .maybeSingle();

        if (existingTmpl) {
          const { error } = await supabase.from('program_templates').update({
            original_data: extractedLessons as any
          }).eq('id', existingTmpl.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('program_templates').insert({
            teacher_id: teacherId,
            section_id: sectionId,
            original_data: extractedLessons as any
          });
          if (error) throw error;
        }
      });

      // Step 4: Insert lessons
      setUploadProgress(90);
      await withRetry(async () => {
        const inserts = extractedLessons.map(l => ({
          teacher_id: teacherId,
          section_id: sectionId,
          lesson_number: l.lesson_number,
          lesson_title: l.lesson_title,
          unit: l.unit || null,
          status: 'not_taught'
        }));

        await supabase.from('teacher_programs')
          .delete()
          .eq('teacher_id', teacherId)
          .eq('section_id', sectionId);

        const { error: insertError } = await supabase.from('teacher_programs').insert(inserts);
        if (insertError) throw insertError;
      });

      setUploadProgress(100);
      toast({ title: t.common.success, description: t.program.programAnalyzed.replace('{count}', String(extractedLessons.length)) });
      setTemplateData(extractedLessons);
      fetchProgram();
    } catch (err: any) {
      console.error('Analysis error:', err);
      const msg = !navigator.onLine 
        ? t.program.noConnection 
        : err.message || t.program.analysisFailed;
      setUploadError(msg);
      toast({ title: t.common.error, description: msg, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => { setUploadProgress(0); setUploadError(null); }, 3000);
    }
  };

  const toggleStatus = async (lesson: ProgramLesson) => {
    if (readOnly) return;
    const newStatus = lesson.status === 'taught' ? 'not_taught' : 'taught';
    const { error } = await supabase
      .from('teacher_programs')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', lesson.id);

    if (!error) {
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, status: newStatus } : l));
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (readOnly) return;
    const { error } = await supabase.from('teacher_programs').delete().eq('id', lessonId);
    if (error) {
      toast({ title: t.common.error, description: t.program.deleteError, variant: 'destructive' });
      return;
    }

    // Renumber remaining lessons
    const remaining = lessons.filter(l => l.id !== lessonId).sort((a, b) => a.lesson_number - b.lesson_number);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].lesson_number !== i + 1) {
        await supabase.from('teacher_programs')
          .update({ lesson_number: i + 1 })
          .eq('id', remaining[i].id);
      }
    }
    fetchProgram();
  };

  const addLesson = async () => {
    if (!newLessonTitle.trim()) {
      toast({ title: t.common.warning, description: t.program.titleRequired, variant: 'destructive' });
      return;
    }

    const num = newLessonNumber ? parseInt(newLessonNumber) : lessons.length + 1;

    // Check for duplicate number - if exists, shift all numbers >= num up by 1
    const existingWithNum = lessons.find(l => l.lesson_number === num);
    if (existingWithNum) {
      const toShift = lessons.filter(l => l.lesson_number >= num).sort((a, b) => b.lesson_number - a.lesson_number);
      for (const l of toShift) {
        await supabase.from('teacher_programs').update({ lesson_number: l.lesson_number + 1 }).eq('id', l.id);
      }
    }

    const { error } = await supabase.from('teacher_programs').insert({
      teacher_id: teacherId,
      section_id: sectionId,
      lesson_number: num,
      lesson_title: newLessonTitle.trim(),
      unit: newLessonUnit.trim() || null,
      status: 'not_taught'
    });

    if (error) {
      toast({ title: t.common.error, description: t.program.addError, variant: 'destructive' });
      return;
    }

    setNewLessonTitle('');
    setNewLessonUnit('');
    setNewLessonNumber('');
    setIsAddingLesson(false);
    fetchProgram();
    toast({ title: t.common.success, description: t.program.lessonAdded });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // First-time upload view
  if (lessons.length === 0 && !readOnly) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>{t.common.back}</Button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t.program.title}
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl border-2 border-dashed border-border bg-card"
        >
          {isAnalyzing ? (
            <div className="text-center space-y-4 w-full max-w-sm">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <p className="text-lg font-medium">{t.program.analyzing}</p>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
              {uploadError && (
                <div className="flex items-center gap-2 text-sm text-destructive justify-center">
                  <WifiOff className="w-4 h-4" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <FileUp className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium mb-2">{t.program.uploadInstruction}</p>
              <p className="text-sm text-muted-foreground mb-6">JPG, PNG, PDF</p>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="program-upload"
              />
              <label htmlFor="program-upload">
                <Button asChild className="gap-2 cursor-pointer">
                  <span>
                    <Upload className="w-4 h-4" />
                    {t.common.upload}
                  </span>
                </Button>
              </label>

              <div className="mt-8 w-full max-w-sm">
                <Button variant="outline" className="w-full gap-2" onClick={() => setIsAddingLesson(true)}>
                  <Plus className="w-4 h-4" />
                  {t.program.addLesson}
                </Button>
              </div>
            </>
          )}
        </motion.div>

        {/* Add Lesson Dialog */}
        <AddLessonDialog
          open={isAddingLesson}
          onOpenChange={setIsAddingLesson}
          newLessonNumber={newLessonNumber}
          setNewLessonNumber={setNewLessonNumber}
          newLessonTitle={newLessonTitle}
          setNewLessonTitle={setNewLessonTitle}
          newLessonUnit={newLessonUnit}
          setNewLessonUnit={setNewLessonUnit}
          titleSuggestions={titleSuggestions}
          unitSuggestions={unitSuggestions}
          showTitleSuggestions={showTitleSuggestions}
          setShowTitleSuggestions={setShowTitleSuggestions}
          showUnitSuggestions={showUnitSuggestions}
          setShowUnitSuggestions={setShowUnitSuggestions}
          onAdd={addLesson}
          t={t}
          titleRef={titleRef}
          unitRef={unitRef}
        />
      </div>
    );
  }

  // Read-only empty view
  if (lessons.length === 0 && readOnly) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>{t.common.back}</Button>
          <h2 className="text-xl font-bold">{t.program.title}</h2>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>{t.program.noProgramYet}</p>
        </div>
      </div>
    );
  }

  // Program table view
  const taughtCount = lessons.filter(l => l.status === 'taught').length;
  const progressPercent = lessons.length > 0 ? Math.round((taughtCount / lessons.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button variant="ghost" onClick={onBack}>{t.common.back}</Button>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t.program.title}
        </h2>
        {!readOnly && (
          <div className="flex gap-2">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="program-reupload"
            />
            <label htmlFor="program-reupload">
              <Button variant="outline" size="sm" asChild className="gap-1 cursor-pointer">
                <span>
                  <Upload className="w-3 h-3" />
                  {t.program.reupload}
                </span>
              </Button>
            </label>
            <Button size="sm" className="gap-1" onClick={() => setIsAddingLesson(true)}>
              <Plus className="w-3 h-3" />
              {t.program.addLesson}
            </Button>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="space-y-2 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>{t.program.analyzing}</span>
            <span className="text-sm text-muted-foreground ml-auto">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          {uploadError && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-card rounded-xl p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">{t.program.progress}</span>
          <span className="font-bold text-primary">{progressPercent}% ({taughtCount}/{lessons.length})</span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--gradient-primary)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Lessons table */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-sm font-semibold text-muted-foreground w-16">#</th>
                <th className="px-4 py-3 text-sm font-semibold text-muted-foreground text-start">{t.program.lessonTitle}</th>
                <th className="px-4 py-3 text-sm font-semibold text-muted-foreground text-start">{t.program.unit}</th>
                <th className="px-4 py-3 text-sm font-semibold text-muted-foreground w-24">{t.program.status}</th>
                {!readOnly && <th className="px-4 py-3 text-sm font-semibold text-muted-foreground w-16">{t.common.delete}</th>}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {lessons.map((lesson) => (
                  <motion.tr
                    key={lesson.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-center font-bold text-muted-foreground">{lesson.lesson_number}</td>
                    <td className="px-4 py-3 font-medium">{lesson.lesson_title}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{lesson.unit || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleStatus(lesson)}
                        disabled={readOnly}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          lesson.status === 'taught'
                            ? 'bg-green-500 shadow-lg shadow-green-500/30'
                            : 'bg-red-500 shadow-lg shadow-red-500/30'
                        } ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
                      >
                        <span className="text-xs text-white font-bold">
                          {lesson.status === 'taught' ? '✓' : '✗'}
                        </span>
                      </button>
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => deleteLesson(lesson.id)}
                          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lesson Dialog */}
      <AddLessonDialog
        open={isAddingLesson}
        onOpenChange={setIsAddingLesson}
        newLessonNumber={newLessonNumber}
        setNewLessonNumber={setNewLessonNumber}
        newLessonTitle={newLessonTitle}
        setNewLessonTitle={setNewLessonTitle}
        newLessonUnit={newLessonUnit}
        setNewLessonUnit={setNewLessonUnit}
        titleSuggestions={titleSuggestions}
        unitSuggestions={unitSuggestions}
        showTitleSuggestions={showTitleSuggestions}
        setShowTitleSuggestions={setShowTitleSuggestions}
        showUnitSuggestions={showUnitSuggestions}
        setShowUnitSuggestions={setShowUnitSuggestions}
        onAdd={addLesson}
        t={t}
        titleRef={titleRef}
        unitRef={unitRef}
        nextNumber={lessons.length + 1}
      />
    </div>
  );
};

// Add Lesson Dialog component
function AddLessonDialog({
  open, onOpenChange, newLessonNumber, setNewLessonNumber, newLessonTitle, setNewLessonTitle,
  newLessonUnit, setNewLessonUnit, titleSuggestions, unitSuggestions,
  showTitleSuggestions, setShowTitleSuggestions, showUnitSuggestions, setShowUnitSuggestions,
  onAdd, t, titleRef, unitRef, nextNumber
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.program.addLesson}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t.program.lessonNumber}</Label>
            <Input
              type="number"
              value={newLessonNumber}
              onChange={(e) => setNewLessonNumber(e.target.value)}
              placeholder={nextNumber ? String(nextNumber) : '1'}
              dir="ltr"
            />
          </div>

          <div className="space-y-2 relative">
            <Label>{t.program.lessonTitle} *</Label>
            <Input
              ref={titleRef}
              value={newLessonTitle}
              onChange={(e) => { setNewLessonTitle(e.target.value); setShowTitleSuggestions(true); }}
              onFocus={() => setShowTitleSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
              placeholder={t.program.lessonTitlePlaceholder}
            />
            {showTitleSuggestions && titleSuggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {titleSuggestions.map((s: string, i: number) => (
                  <button
                    key={i}
                    onMouseDown={(e) => { e.preventDefault(); setNewLessonTitle(s); setShowTitleSuggestions(false); }}
                    className="w-full px-3 py-2 text-sm text-start hover:bg-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 relative">
            <Label>{t.program.unit}</Label>
            <Input
              ref={unitRef}
              value={newLessonUnit}
              onChange={(e) => { setNewLessonUnit(e.target.value); setShowUnitSuggestions(true); }}
              onFocus={() => setShowUnitSuggestions(true)}
              onBlur={() => setTimeout(() => setShowUnitSuggestions(false), 200)}
              placeholder={t.program.unitPlaceholder}
            />
            {showUnitSuggestions && unitSuggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {unitSuggestions.map((s: string, i: number) => (
                  <button
                    key={i}
                    onMouseDown={(e) => { e.preventDefault(); setNewLessonUnit(s); setShowUnitSuggestions(false); }}
                    className="w-full px-3 py-2 text-sm text-start hover:bg-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={onAdd} className="w-full" disabled={!newLessonTitle.trim()}>
            {t.program.addLesson}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MyProgram;
