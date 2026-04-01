import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, FolderOpen, Upload, Bell, Check, X, BookOpen, Users, Calendar, ClipboardList, FileUp, FileText, Heading1, List, Loader2, Clock, Search, Pencil, ChevronRight } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherSettings } from '@/components/TeacherSettings';
import { TeacherFiles } from '@/components/TeacherFiles';
import { Timetable } from '@/components/Timetable';
import { StudentList } from '@/components/StudentList';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonPage } from '@/components/LessonPage';
import { MyProgram } from '@/components/MyProgram';


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
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    if (selectedSection) {
      fetchLessons();
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
      // Upload file if provided - use user_id for RLS compliance
      if (lessonFile) {
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

      // Insert lesson with duration
      const { error } = await supabase
        .from('lessons')
        .insert({
          teacher_id: profile.id,
          section_id: selectedSection.section_id,
          title: lessonTitle,
          description: lessonDescription,
          lesson_date: parsedDate,
          file_url: fileUrl,
          duration: lessonDuration || null,
        });

      if (error) {
        // Rollback: delete uploaded file if lesson insert fails
        if (fileUrl) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {profile?.full_name || t.roles.teacher}
                </h1>
                <Badge variant="secondary">{profile?.subject}</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {adminNotifications.filter(n => !n.is_read).length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-warning animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {adminNotifications.filter(n => !n.is_read).length}
                  </span>
                </div>
              )}
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

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
      <main className="container mx-auto px-4 py-8">
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

          {/* Sections Tab */}
          <TabsContent value="sections">
            {!selectedSection ? (
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
                        {/* Notebook binding */}
                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-primary/30 to-transparent rounded-r-xl" />
                        <div className="absolute right-2 top-4 bottom-4 w-0.5 bg-primary/20" />
                        
                        {/* Notebook content */}
                        <div className="relative h-full flex flex-col items-center justify-center p-4">
                          <div className="w-14 h-18 bg-primary/10 rounded-lg mb-4 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <BookOpen className="w-8 h-8 text-primary" />
                          </div>
                          <span className="font-bold text-foreground text-lg">{(assignment as any).sections?.name}</span>
                          <Badge variant="outline" className="mt-2">{(assignment as any).subjects?.name}</Badge>
                          <span className="text-xs text-muted-foreground mt-1">{t.teacher.viewOnly}</span>
                        </div>
                        
                        {/* Notebook lines */}
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
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-40 section-detail-bg overflow-y-auto"
              >
                {/* Minimal Top Bar */}
                <header className="sticky top-0 z-50 glass-dark border-b border-border/30">
                  <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-foreground">{profile?.full_name}</span>
                      <Badge variant="secondary" className="text-xs">{(selectedSection as any).subjects?.name}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={signOut}>
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </div>
                </header>

                {/* Section Header - Glassmorphism */}
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-4 mt-4 rounded-2xl p-6 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, hsl(220 50% 25%), hsl(270 40% 30%))' }}
                >
                  <div className="absolute inset-0 backdrop-blur-sm bg-white/5" />
                  <div className="relative flex items-center justify-between">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setSelectedSection(null); setActiveView('lessons'); setLessonSearchQuery(''); }}
                      className="w-10 h-10 rounded-full flex items-center justify-center border border-cyan-400/50 neon-cyan bg-cyan-500/10"
                    >
                      <ChevronRight className="w-5 h-5 text-cyan-300" />
                    </motion.button>
                    <h2 className="text-xl font-bold text-white">{(selectedSection as any).sections?.name}</h2>
                    <div className="w-10" /> {/* spacer */}
                  </div>
                </motion.div>

                {/* Action Buttons - 4 equal cards */}
                <div className="grid grid-cols-4 gap-3 mx-4 mt-4">
                  {/* Add Lesson */}
                  <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
                    <DialogTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-500/10 neon-cyan transition-all aspect-square"
                      >
                        <Upload className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
                        <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300 text-center leading-tight">{t.teacher.addLesson}</span>
                      </motion.button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{t.teacher.addNewLesson}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Heading1 className="w-4 h-4" />
                            {t.teacher.lessonTitle} *
                          </Label>
                          <Input
                            value={lessonTitle}
                            onChange={(e) => setLessonTitle(e.target.value)}
                            placeholder={t.teacher.lessonTitleExample}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {t.teacher.lessonDate} * ({t.teacher.lessonDateFormat})
                          </Label>
                          <Input
                            type="text"
                            value={lessonDate}
                            onChange={(e) => setLessonDate(e.target.value)}
                            placeholder={t.teacher.lessonDatePlaceholder}
                            dir="ltr"
                            className="text-left"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {t.teacher.lessonDuration}
                          </Label>
                          <Input
                            type="text"
                            value={lessonDuration}
                            onChange={(e) => setLessonDuration(e.target.value)}
                            placeholder={t.teacher.lessonDurationPlaceholder}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            {t.teacher.lessonDescription}
                          </Label>
                          <Textarea
                            value={lessonDescription}
                            onChange={(e) => setLessonDescription(e.target.value)}
                            placeholder={t.teacher.lessonDescriptionPlaceholder}
                            className="min-h-[200px] resize-y"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <FileUp className="w-4 h-4" />
                            {t.teacher.attachFile}
                          </Label>
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar"
                              onChange={handleFileChange}
                              className="hidden"
                              id="lesson-file"
                            />
                            <label 
                              htmlFor="lesson-file" 
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              <FileUp className="w-8 h-8 text-muted-foreground" />
                              {lessonFile ? (
                                <span className="text-sm font-medium text-primary">{lessonFile.name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">{t.teacher.supportedFormats}</span>
                              )}
                            </label>
                          </div>
                          {lessonFile && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setLessonFile(null)}
                              className="text-destructive"
                            >
                              {t.common.delete}
                            </Button>
                          )}
                        </div>
                        
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
                          className="w-full gradient-primary"
                          disabled={isUploading || !lessonTitle || !lessonDate}
                        >
                          {isUploading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{t.teacher.addingLesson}</span>
                            </div>
                          ) : t.teacher.addLesson}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Timetable */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveView('timetable')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/10 neon-blue transition-all aspect-square"
                  >
                    <Clock className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 text-center leading-tight">{t.admin.timetable}</span>
                  </motion.button>

                  {/* Students */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveView('students')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 dark:bg-purple-500/10 neon-purple transition-all aspect-square"
                  >
                    <Users className="w-7 h-7 text-purple-500 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300 text-center leading-tight">{t.admin.studentList}</span>
                  </motion.button>

                  {/* My Program */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveView('program')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-orange-500/10 neon-gradient transition-all aspect-square"
                  >
                    <BookOpen className="w-7 h-7 text-purple-500 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300 text-center leading-tight">{t.program.title}</span>
                  </motion.button>
                </div>

                {/* Conditional Views */}
                <div className="mx-4 mt-4 pb-8">
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
                      {/* Search Bar - Neon style */}
                      <div className="relative mt-2">
                        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500 dark:text-cyan-400`} />
                        <Input
                          value={lessonSearchQuery}
                          onChange={(e) => setLessonSearchQuery(e.target.value)}
                          placeholder={t.teacher.searchLessons}
                          className={`${isRTL ? "pr-10" : "pl-10"} border-cyan-500/30 focus:border-cyan-400 dark:bg-card/50 backdrop-blur-sm`}
                        />
                      </div>

                      {/* Lessons list */}
                      <div className="space-y-3 mt-4">
                        <h3 className="font-semibold text-foreground">{t.teacher.lessonsAndSessions}</h3>
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
                            {filteredLessons.map((lesson, index) => (
                              <motion.button
                                key={lesson.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedLesson(lesson)}
                                className="w-full p-4 rounded-xl bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 text-right hover:border-primary/50 transition-all relative overflow-hidden group"
                                whileHover={{ scale: 1.01 }}
                              >
                                {/* Side gradient bar */}
                                <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-0 bottom-0 w-1 rounded-full`} style={{ background: 'linear-gradient(180deg, hsl(180 70% 50%), hsl(270 60% 55%))' }} />
                                <div className={isRTL ? 'pr-4' : 'pl-4'}>
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-foreground">{lesson.title}</h4>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDateForDisplay(lesson.lesson_date)}
                                    </span>
                                  </div>
                                  {lesson.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {lesson.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            {profile && <TeacherFiles profile={profile} />}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              {/* Admin Notifications */}
              {adminNotifications.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    {t.notifications?.newNotifications || 'إشعارات جديدة'}
                  </h2>
                  <div className="space-y-3">
                    {adminNotifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl bg-card border-2 ${notif.is_read ? 'border-border' : 'border-primary/50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{notif.subject_name}</p>
                            <p className="mt-1">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notif.created_at).toLocaleDateString('ar-DZ')}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markNotificationRead(notif.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
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
      </main>
    </div>
  );
};

export default TeacherDashboard;
