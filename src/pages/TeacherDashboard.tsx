import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, FolderOpen, Upload, Bell, Check, X, BookOpen, Users, Calendar, ClipboardList, FileUp, FileText, Heading1, List, Loader2, Clock, Search, Pencil, ChevronRight, Tag, ArrowRight, AlertTriangle, Menu } from 'lucide-react';
import { SideMenu } from '@/components/SideMenu';
import { ProfilePage } from '@/components/ProfilePage';
import { ScrollDatePicker } from '@/components/ScrollDatePicker';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherSettings } from '@/components/TeacherSettings';
import { TeacherFiles } from '@/components/TeacherFiles';
import { Timetable } from '@/components/Timetable';
import { StudentList } from '@/components/StudentList';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonPage } from '@/components/LessonPage';
import { MyProgram } from '@/components/MyProgram';
import { BackButton } from '@/components/BackButton';


interface TeacherProfile {
  id: string;
  user_id: string;
  full_name: string;
  subject: string;
  email: string | null;
  phone: string | null;
}

interface Assignment {
  id: string;
  status: string;
  section_id: string;
  subject_id: string;
  sections?: { name: string };
  subjects?: { name: string };
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  lesson_date: string;
  file_url: string | null;
  duration?: string | null;
  lesson_type?: string | null;
  homework_submission_date?: string | null;
  homework_return_date?: string | null;
}
const TeacherDashboard = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedSection, setSelectedSection] = useState<Assignment | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeView, setActiveView] = useState<'lessons' | 'timetable' | 'students' | 'program'>('lessons');
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [adminNotifications, setAdminNotifications] = useState<{ id: string; subject_name: string; message: string; created_at: string; is_read: boolean }[]>([]);

  // Lesson form
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonDate, setLessonDate] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [showFileSourceDialog, setShowFileSourceDialog] = useState(false);
  const [showMyFilesPicker, setShowMyFilesPicker] = useState(false);
  const [myFiles, setMyFiles] = useState<{ id: string; file_name: string; file_url: string }[]>([]);
  const [loadingMyFiles, setLoadingMyFiles] = useState(false);
  const [selectedExistingFile, setSelectedExistingFile] = useState<{ file_name: string; file_url: string } | null>(null);
  const [lessonType, setLessonType] = useState('lesson');
  const [homeworkSubmissionDate, setHomeworkSubmissionDate] = useState('');
  const [homeworkReturnDate, setHomeworkReturnDate] = useState('');
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [programLessons, setProgramLessons] = useState<{ lesson_title: string; unit: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchAssignments();
      fetchAdminNotifications();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedSection && profile) {
      fetchLessons();
      fetchProgramLessons();
    }
  }, [selectedSection]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('teacher_profiles')
        .select('id, user_id, full_name, subject, email, phone')
        .eq('user_id', user.id)
        .single();
      
      if (data) setProfile(data);
    }
  };

  const fetchAdminNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('admin_notifications')
      .select('id, subject_name, message, created_at, is_read')
      .eq('teacher_profile_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setAdminNotifications(data);
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
    setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleThemeChange = (theme: string) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const fetchAssignments = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('teacher_assignments')
      .select(`
        id,
        status,
        section_id,
        subject_id,
        sections (name),
        subjects (name)
      `)
      .eq('teacher_id', profile.id);

    if (data) {
      const accepted = data.filter(a => a.status === 'accepted') as unknown as Assignment[];
      setAssignments(accepted);
    }
  };

  const fetchLessons = async () => {
    if (!selectedSection || !profile) return;

    const { data } = await supabase
      .from('lessons')
      .select('*, duration')
      .eq('section_id', selectedSection.section_id)
      .eq('teacher_id', profile.id)
      .order('lesson_date', { ascending: false });

    if (data) setLessons(data);
  };

  const fetchProgramLessons = async () => {
    if (!selectedSection || !profile) return;
    const { data } = await supabase
      .from('teacher_programs')
      .select('lesson_title, unit')
      .eq('section_id', selectedSection.section_id)
      .eq('teacher_id', profile.id)
      .order('lesson_number', { ascending: true });
    if (data) setProgramLessons(data);
  };

  // Filter suggestions based on typing
  const titleSuggestions = useMemo(() => {
    if (!lessonTitle.trim() || !showSuggestions) return [];
    const query = lessonTitle.toLowerCase();
    return programLessons
      .filter(p => p.lesson_title.toLowerCase().includes(query))
      .slice(0, 6);
  }, [lessonTitle, programLessons, showSuggestions]);

  // Filter lessons based on search query
  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(lessonSearchQuery.toLowerCase())
  );

  // Parse manual date format DD/MM/YYYY to YYYY-MM-DD for database
  const parseManualDate = (dateStr: string): string | null => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(regex);
    if (!match) return null;
    const [, day, month, year] = match;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2000 || y > 2100) return null;
    return `${year}-${month}-${day}`;
  };

  // Format database date to DD/MM/YYYY for display
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

  const openMyFilesPicker = async () => {
    if (!profile) return;
    setShowFileSourceDialog(false);
    setShowMyFilesPicker(true);
    setLoadingMyFiles(true);
    const { data } = await supabase
      .from('teacher_files')
      .select('id, file_name, file_url')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });
    setMyFiles(data || []);
    setLoadingMyFiles(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Support all common file types
      const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'rar'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!allowedExtensions.includes(ext)) {
        toast({ title: 'خطأ', description: 'نوع الملف غير مدعوم', variant: 'destructive' });
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({ title: 'خطأ', description: 'حجم الملف يجب أن يكون أقل من 50 ميغابايت', variant: 'destructive' });
        return;
      }
      setLessonFile(file);
      setSelectedExistingFile(null);
      setShowFileSourceDialog(false);
    }
  };

  const handleAddLesson = async () => {
    if (!selectedSection || !profile || !lessonTitle || !lessonDate) {
      toast({ title: t.common.warning, description: t.teacher.fillRequiredFields, variant: 'destructive' });
      return;
    }

    // Validate and parse the manual date
    const parsedDate = parseManualDate(lessonDate);
    if (!parsedDate) {
      toast({ title: t.common.warning, description: t.teacher.invalidDateFormat, variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    let fileUrl: string | null = null;

    try {
      // Reuse an existing file from "ملفاتي" without re-uploading
      if (selectedExistingFile) {
        fileUrl = selectedExistingFile.file_url;
        setUploadProgress(60);
      } else if (lessonFile) {
        setUploadProgress(20);
        const fileExt = lessonFile.name.split('.').pop()?.toLowerCase();
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        // CRITICAL: Use profile.user_id (equals auth.uid()) for RLS policy compliance
        const fileName = `${profile.user_id}/${uniqueId}.${fileExt}`;
        
        setUploadProgress(40);
        
        const { error: uploadError } = await supabase.storage
          .from('teacher-files')
          .upload(fileName, lessonFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: lessonFile.type || 'application/octet-stream'
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`${t.teacher.uploadError}: ${uploadError.message}`);
        }

        setUploadProgress(70);

        const { data: { publicUrl } } = supabase.storage
          .from('teacher-files')
          .getPublicUrl(fileName);
        
        fileUrl = publicUrl;
        setUploadProgress(85);
      }

      // Parse homework dates if applicable
      let parsedHomeworkSubmission: string | null = null;
      let parsedHomeworkReturn: string | null = null;
      if (lessonType === 'duty_correction') {
        if (homeworkSubmissionDate) parsedHomeworkSubmission = parseManualDate(homeworkSubmissionDate);
        if (homeworkReturnDate) parsedHomeworkReturn = parseManualDate(homeworkReturnDate);
      }

      // Insert lesson with all fields
      const insertData: any = {
        teacher_id: profile.id,
        section_id: selectedSection.section_id,
        title: lessonTitle,
        description: lessonDescription,
        lesson_date: parsedDate,
        file_url: fileUrl,
        duration: lessonDuration || null,
        lesson_type: lessonType,
        homework_submission_date: parsedHomeworkSubmission,
        homework_return_date: parsedHomeworkReturn,
      };

      const { error } = await supabase
        .from('lessons')
        .insert(insertData);

      if (error) {
        // Rollback: delete uploaded file if lesson insert fails
        if (fileUrl && lessonFile && !selectedExistingFile) {
          const filePath = fileUrl.split('/teacher-files/').pop();
          if (filePath) {
            await supabase.storage.from('teacher-files').remove([filePath]);
          }
        }
        throw error;
      }

      setUploadProgress(100);
      toast({ title: t.common.success, description: t.teacher.lessonAdded });
      
      // Reset form
      setLessonTitle('');
      setLessonDescription('');
      setLessonDate('');
      setLessonDuration('');
      setLessonFile(null);
      setSelectedExistingFile(null);
      setLessonType('lesson');
      setHomeworkSubmissionDate('');
      setHomeworkReturnDate('');
      setIsAddingLesson(false);
      fetchLessons();
    } catch (error: any) {
      console.error('Lesson add error:', error);
      toast({ title: t.common.error, description: error.message || t.teacher.lessonError, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Full-screen Add Lesson Page
  if (isAddingLesson && selectedSection) {
    return (
      <div className="min-h-screen bg-background">
        {/* Minimal Header */}
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between gap-3" dir="ltr">
              {/* Left: menu + theme */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setShowSideMenu(true)} aria-label="القائمة">
                  <Menu className="w-6 h-6" />
                </Button>
                <ThemeToggle />
              </div>
              {/* Right: teacher name + subject */}
              <div className="text-right min-w-0" dir="rtl">
                <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{profile?.full_name}</h1>
                <span className="text-xs text-muted-foreground truncate block">{(selectedSection as any).subjects?.name}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Consistent Back Button on its own row */}
            <BackButton onClick={() => setIsAddingLesson(false)} />

            <h2 className="text-2xl font-bold">{t.teacher.addNewLesson}</h2>

            <div className="space-y-5">
              {/* Lesson Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Tag className="w-5 h-5" />
                  {t.teacher.lessonType} *
                </Label>
                <Select value={lessonType} onValueChange={(v) => { setLessonType(v); setHomeworkSubmissionDate(''); setHomeworkReturnDate(''); }}>
                  <SelectTrigger className="h-12 text-base rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson">{t.teacher.lessonTypeLesson}</SelectItem>
                    <SelectItem value="assignment">{t.teacher.lessonTypeAssignment}</SelectItem>
                    <SelectItem value="homework_correction">{t.teacher.lessonTypeHomeworkCorrection}</SelectItem>
                    <SelectItem value="test_correction">{t.teacher.lessonTypeTestCorrection}</SelectItem>
                    <SelectItem value="duty_correction">{t.teacher.lessonTypeDutyCorrection}</SelectItem>
                    <SelectItem value="lab_work">{t.teacher.lessonTypeLabWork}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title with AI Autocomplete */}
              <div className="space-y-2 relative">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Heading1 className="w-5 h-5" />
                  {t.teacher.lessonTitle} *
                </Label>
                {/* AI Suggestions - Above Input */}
                <AnimatePresence>
                  {titleSuggestions.length > 0 && showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="z-50 bg-popover border-2 border-primary/30 rounded-xl shadow-lg overflow-hidden mb-1"
                    >
                      <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        اقتراحات من برنامجك
                      </div>
                      {titleSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onMouseDown={(e) => { e.preventDefault(); setLessonTitle(s.lesson_title); setShowSuggestions(false); }}
                          className="w-full px-4 py-3 text-right hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0 flex items-center justify-between"
                        >
                          <span className="font-medium text-foreground">{s.lesson_title}</span>
                          {s.unit && <Badge variant="secondary" className="text-xs">{s.unit}</Badge>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <Input
                  value={lessonTitle}
                  onChange={(e) => { setLessonTitle(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="h-12 text-base rounded-xl"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="w-5 h-5" />
                  {t.teacher.lessonDate} *
                </Label>
                <ScrollDatePicker value={lessonDate} onChange={setLessonDate} />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="w-5 h-5" />
                  {t.teacher.lessonDuration}
                </Label>
                <Input
                  type="text"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  className="h-12 text-base rounded-xl"
                />
              </div>

              {/* Duty correction fields */}
              {lessonType === 'duty_correction' && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-semibold">
                      <Calendar className="w-5 h-5" />
                      {t.teacher.homeworkSubmissionDate}
                    </Label>
                    <ScrollDatePicker value={homeworkSubmissionDate} onChange={setHomeworkSubmissionDate} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-semibold">
                      <Calendar className="w-5 h-5" />
                      {t.teacher.homeworkReturnDate}
                    </Label>
                    <ScrollDatePicker value={homeworkReturnDate} onChange={setHomeworkReturnDate} />
                  </div>
                </>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <List className="w-5 h-5" />
                  {t.teacher.lessonDescription}
                </Label>
                <Textarea
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  className="min-h-[150px] resize-y text-base rounded-xl"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <FileUp className="w-5 h-5" />
                  {t.teacher.attachFile}
                </Label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar"
                  onChange={handleFileChange}
                  className="hidden"
                  id="lesson-file"
                />
                <button
                  type="button"
                  onClick={() => setShowFileSourceDialog(true)}
                  className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center flex flex-col items-center gap-2 hover:border-primary/60 transition-colors"
                >
                  <FileUp className="w-10 h-10 text-muted-foreground" />
                  {lessonFile ? (
                    <span className="text-sm font-medium text-primary">{lessonFile.name}</span>
                  ) : selectedExistingFile ? (
                    <span className="text-sm font-medium text-primary">{selectedExistingFile.file_name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t.teacher.supportedFormats}</span>
                  )}
                </button>
                {(lessonFile || selectedExistingFile) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLessonFile(null); setSelectedExistingFile(null); }}
                    className="text-destructive"
                  >
                    {t.common.delete}
                  </Button>
                )}
              </div>

              {/* File source dialog */}
              <Dialog open={showFileSourceDialog} onOpenChange={setShowFileSourceDialog}>
                <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-center">اختر مصدر الملف</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 pt-2">
                    <label
                      htmlFor="lesson-file"
                      className="cursor-pointer flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent transition-colors"
                    >
                      <Upload className="w-6 h-6 text-primary" />
                      <div className="text-right">
                        <p className="font-semibold">من الهاتف</p>
                        <p className="text-xs text-muted-foreground">اختيار ملف جديد من جهازك</p>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={openMyFilesPicker}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent transition-colors text-right"
                    >
                      <FolderOpen className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-semibold">من التطبيق</p>
                        <p className="text-xs text-muted-foreground">اختيار ملف موجود في ملفاتي</p>
                      </div>
                    </button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* My files picker */}
              <Dialog open={showMyFilesPicker} onOpenChange={setShowMyFilesPicker}>
                <DialogContent className="max-w-md rounded-2xl" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-center">ملفاتي</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto space-y-2">
                    {loadingMyFiles ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : myFiles.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">لا توجد ملفات محفوظة</p>
                    ) : (
                      myFiles.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setSelectedExistingFile({ file_name: f.file_name, file_url: f.file_url });
                            setLessonFile(null);
                            setShowMyFilesPicker(false);
                          }}
                          className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent transition-colors text-right"
                        >
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <span className="text-sm truncate">{f.file_name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>


              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.teacher.addingLesson}</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handleAddLesson}
                className="w-full gradient-primary h-12 text-base font-semibold rounded-xl"
                disabled={isUploading || !lessonTitle || !lessonDate}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.teacher.addingLesson}</span>
                  </div>
                ) : t.teacher.addLesson}
              </Button>
            </div>
          </motion.div>
        </main>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && profile && (
            <TeacherSettings
              profile={profile}
              onClose={() => setShowSettings(false)}
              onThemeChange={handleThemeChange}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between gap-3" dir="ltr">
            {/* Left: menu + theme + notifications indicator */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowSideMenu(true)} aria-label="القائمة">
                <Menu className="w-6 h-6" />
              </Button>
              <ThemeToggle />
              {adminNotifications.filter(n => !n.is_read).length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-warning animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {adminNotifications.filter(n => !n.is_read).length}
                  </span>
                </div>
              )}
            </div>

            {/* Right: teacher name + subject */}
            <div className="text-right min-w-0" dir="rtl">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
                {profile?.full_name || t.roles.teacher}
              </h1>
              <Badge variant="secondary">{profile?.subject}</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Side Menu (Teacher: Profile + Settings + Logout only) */}
      <SideMenu
        open={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenSettings={() => setShowSettings(true)}
        showDashboard={false}
        showArchive={false}
      />

      {/* Profile Page */}
      <AnimatePresence>
        {showProfile && profile && (
          <ProfilePage
            fullName={profile.full_name}
            email={profile.email}
            roleLabel={t.roles.teacher}
            extraLabel={profile.subject}
            extraIcon="subject"
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && profile && (
          <TeacherSettings
            profile={profile}
            onClose={() => setShowSettings(false)}
            onThemeChange={handleThemeChange}
          />
        )}
      </AnimatePresence>

      {/* Lesson Detail - Full Page */}
      <AnimatePresence>
        {selectedLesson && (
          <LessonPage
            lesson={selectedLesson}
            onClose={() => setSelectedLesson(null)}
            showEditButton={true}
            teacherUserId={profile?.user_id}
            onUpdate={(updated) => {
              setLessons(prev => prev.map(l => l.id === updated.id ? { ...updated, description: updated.description || '' } : l));
              setSelectedLesson(updated);
            }}
            onDelete={(id) => {
              setLessons(prev => prev.filter(l => l.id !== id));
              setSelectedLesson(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="px-3 py-4">
        {selectedSection ? (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
                <BackButton
                  onClick={() => { setSelectedSection(null); setActiveView('lessons'); setLessonSearchQuery(''); }}
                  label={t.teacher.backToSections}
                />
                <h2 className="text-xl font-bold text-right">{(selectedSection as any).sections?.name}</h2>

                {/* Action Buttons - responsive grid, equal sizing */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 border-2 border-border"
                    onClick={() => setIsAddingLesson(true)}
                  >
                    <Upload className="w-6 h-6 text-primary" />
                    <span className="text-xs font-medium">{t.teacher.addLesson}</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 border-2 border-border"
                    onClick={() => setActiveView('timetable')}
                  >
                    <Clock className="w-6 h-6 text-primary" />
                    <span className="text-xs font-medium">{t.admin.timetable}</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 border-2 border-border"
                    onClick={() => setActiveView('students')}
                  >
                    <Users className="w-6 h-6 text-primary" />
                    <span className="text-xs font-medium">{t.admin.studentList}</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 border-2 border-border"
                    onClick={() => setActiveView('program')}
                  >
                    <BookOpen className="w-6 h-6 text-primary" />
                    <span className="text-xs font-medium">{t.program.title}</span>
                  </Button>
                </div>


                {/* Conditional Views */}
                {activeView === 'timetable' && (
                  <Timetable
                    sectionId={selectedSection.section_id}
                    sectionName={(selectedSection as any).sections?.name || ''}
                    onBack={() => setActiveView('lessons')}
                    readOnly={true}
                  />
                )}

                {activeView === 'program' && profile && (
                  <MyProgram
                    sectionId={selectedSection.section_id}
                    teacherId={profile.id}
                    readOnly={false}
                    onBack={() => setActiveView('lessons')}
                  />
                )}

                {activeView === 'students' && (
                  <StudentList
                    sectionId={selectedSection.section_id}
                    sectionName={(selectedSection as any).sections?.name || ''}
                    onBack={() => setActiveView('lessons')}
                    readOnly={true}
                  />
                )}

                {activeView === 'lessons' && (
                  <>
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                      <Input
                        value={lessonSearchQuery}
                        onChange={(e) => setLessonSearchQuery(e.target.value)}
                        placeholder={t.teacher.searchLessons}
                        className={isRTL ? "pr-10" : "pl-10"}
                      />
                    </div>

                    {/* Lessons list */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">{t.teacher.lessonsAndSessions}</h3>
                      {lessons.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          {t.teacher.noLessonsYet}
                        </p>
                      ) : filteredLessons.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          {t.teacher.noLessonsFound}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {filteredLessons.map((lesson) => (
                            <motion.button
                              key={lesson.id}
                              onClick={() => setSelectedLesson(lesson)}
                              className="w-full p-4 rounded-lg bg-card border-2 border-border text-right hover:border-primary transition-colors"
                              whileHover={{ scale: 1.01 }}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{lesson.title}</h4>
                                <span className="text-sm text-muted-foreground">
                                  {formatDateForDisplay(lesson.lesson_date)}
                                </span>
                              </div>
                              {lesson.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {lesson.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {lesson.lesson_type && lesson.lesson_type !== 'lesson' && (
                                  <Badge variant="default" className="text-xs">
                                    <Tag className="w-3 h-3 ml-1" />
                                    {(t.teacher as any)[`lessonType${lesson.lesson_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`] || lesson.lesson_type}
                                  </Badge>
                                )}
                                {lesson.duration && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="w-3 h-3 ml-1" />
                                    {lesson.duration}
                                  </Badge>
                                )}
                                {lesson.file_url && (
                                  <Badge variant="outline" className="text-xs">
                                    <FileText className="w-3 h-3 ml-1" />
                                    {t.teacher.fileSelected}
                                  </Badge>
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
            </motion.div>
          </div>
        ) : (
          <Tabs defaultValue="sections" className="space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
              <TabsTrigger value="sections">{t.teacher.assignedSections}</TabsTrigger>
              <TabsTrigger value="files">{t.teacher.myFiles}</TabsTrigger>
              <TabsTrigger value="notifications" className="relative">
                {t.teacher.notifications}
                {adminNotifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {adminNotifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sections">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold">{t.teacher.assignedSections}</h2>
                
                {assignments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>{t.teacher.noSectionsAssigned}</p>
                    <p className="text-sm">{t.teacher.waitForAssignments}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {assignments.map((assignment, index) => (
                      <motion.button
                        key={assignment.id}
                        initial={{ opacity: 0, scale: 0.9, rotateY: -20 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05, y: -8 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedSection(assignment)}
                        className="notebook-card group relative"
                      >
                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-primary/30 to-transparent rounded-r-xl" />
                        <div className="absolute right-2 top-4 bottom-4 w-0.5 bg-primary/20" />
                        
                        <div className="relative h-full flex flex-col items-center justify-center p-4">
                          <div className="w-14 h-18 bg-primary/10 rounded-lg mb-4 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <BookOpen className="w-8 h-8 text-primary" />
                          </div>
                          <span className="font-bold text-foreground text-lg">{(assignment as any).sections?.name}</span>
                          <Badge variant="outline" className="mt-2">{(assignment as any).subjects?.name}</Badge>
                          <span className="text-xs text-muted-foreground mt-1">{t.teacher.viewOnly}</span>
                        </div>
                        
                        <div className="absolute inset-x-8 bottom-8 space-y-2 opacity-20">
                          <div className="h-px bg-primary/50" />
                          <div className="h-px bg-primary/50" />
                          <div className="h-px bg-primary/50" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="files">
              {profile && <TeacherFiles profile={profile} />}
            </TabsContent>

            <TabsContent value="notifications">
              <div className="space-y-6">
              {adminNotifications.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        الإشعارات
                      </h2>
                      {adminNotifications.some(n => !n.is_read) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const unread = adminNotifications.filter(n => !n.is_read);
                            await Promise.all(unread.map(n => supabase.from('admin_notifications').update({ is_read: true }).eq('id', n.id)));
                            setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                          }}
                          className="gap-1"
                        >
                          <Check className="w-4 h-4" />
                          تعليم الكل كمقروء
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {adminNotifications.map((notif) => {
                        const isAssignment = notif.message.includes('تم إسنادك') || notif.message.includes('إسناد');
                        const isAlert = notif.message.includes('تنبيه') || notif.message.includes('الناظر');
                        const isReminder = notif.message.includes('تذكير') || notif.message.includes('كتابة');
                        
                        // Parse notification for structured display
                        const sectionMatch = notif.message.match(/القسم:\s*([^–\-:]+)/);
                        const messageMatch = notif.message.match(/الرسالة:\s*(.+)$/);
                        const sectionName = sectionMatch ? sectionMatch[1].trim() : '';
                        const messageText = messageMatch ? messageMatch[1].trim() : notif.message;

                        return (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-xl border-2 overflow-hidden transition-all ${
                              notif.is_read 
                                ? 'bg-card border-border opacity-75' 
                                : isAlert 
                                  ? 'bg-card border-warning/50 shadow-md'
                                  : isAssignment
                                    ? 'bg-card border-primary/50 shadow-md'
                                    : 'bg-card border-accent/50 shadow-md'
                            }`}
                          >
                            {/* Notification Header */}
                            <div className={`px-4 py-2 flex items-center justify-between ${
                              isAlert ? 'bg-warning/10' : isAssignment ? 'bg-primary/10' : 'bg-accent/10'
                            }`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                  isAlert ? 'bg-warning/20 text-warning' : isAssignment ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'
                                }`}>
                                  {isAlert ? <AlertTriangle className="w-4 h-4" /> : isAssignment ? <BookOpen className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                </div>
                                <span className={`font-bold text-sm ${
                                  isAlert ? 'text-warning' : isAssignment ? 'text-primary' : 'text-accent'
                                }`}>
                                  {isAlert ? 'تنبيه من الناظر' : isAssignment ? 'إسناد قسم' : 'إشعار'}
                                </span>
                              </div>
                              {!notif.is_read && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markNotificationRead(notif.id)}
                                  className="h-7 w-7 p-0 shrink-0"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            {/* Notification Body */}
                            <div className="px-4 py-3 space-y-2">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                {sectionName && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground">القسم:</span>
                                    <span className="font-semibold text-foreground">{sectionName}</span>
                                  </span>
                                )}
                                {notif.subject_name && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground">المادة:</span>
                                    <span className="font-semibold text-foreground">{notif.subject_name}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">
                                {isAlert && messageText !== notif.message ? messageText : notif.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(notif.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {adminNotifications.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>{t.teacher.noNewAssignments}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
