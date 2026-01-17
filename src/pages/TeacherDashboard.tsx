import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, LogOut, FolderOpen, Upload, Bell, Check, X, BookOpen, Users, Calendar, ClipboardList } from 'lucide-react';
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

interface TeacherProfile {
  id: string;
  full_name: string;
  subject: string;
  teacher_id: string;
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
}

const TeacherDashboard = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedSection, setSelectedSection] = useState<Assignment | null>(null);

  // Lesson form
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonDate, setLessonDate] = useState('');
  const [isAddingLesson, setIsAddingLesson] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchAssignments();
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
        .select('id, full_name, subject, teacher_id')
        .eq('user_id', user.id)
        .single();
      
      if (data) setProfile(data);
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
      const pending = data.filter(a => a.status === 'pending') as unknown as Assignment[];
      setAssignments(accepted);
      setPendingAssignments(pending);
    }
  };

  const fetchLessons = async () => {
    if (!selectedSection || !profile) return;

    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('section_id', selectedSection.section_id)
      .eq('teacher_id', profile.id)
      .order('lesson_date', { ascending: false });

    if (data) setLessons(data);
  };

  const handleAssignmentResponse = async (assignmentId: string, accept: boolean) => {
    const status = accept ? 'accepted' : 'rejected';
    
    const { error } = await supabase
      .from('teacher_assignments')
      .update({ status })
      .eq('id', assignmentId);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل تحديث الطلب', variant: 'destructive' });
    } else {
      toast({ 
        title: accept ? 'تم القبول' : 'تم الرفض', 
        description: accept ? 'تم قبول الإسناد بنجاح' : 'تم رفض الإسناد' 
      });
      fetchAssignments();
    }
  };

  const handleAddLesson = async () => {
    if (!selectedSection || !profile || !lessonTitle || !lessonDate) return;

    const { error } = await supabase
      .from('lessons')
      .insert({
        teacher_id: profile.id,
        section_id: selectedSection.section_id,
        title: lessonTitle,
        description: lessonDescription,
        lesson_date: lessonDate,
      });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل إضافة الدرس', variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم إضافة الدرس بنجاح' });
      setLessonTitle('');
      setLessonDescription('');
      setLessonDate('');
      setIsAddingLesson(false);
      fetchLessons();
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
                  {profile?.full_name || 'الأستاذ'}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{profile?.subject}</Badge>
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    ID: {profile?.teacher_id}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {pendingAssignments.length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-warning animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {pendingAssignments.length}
                  </span>
                </div>
              )}
              <ThemeToggle />
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="sections" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="sections">الأقسام</TabsTrigger>
            <TabsTrigger value="files">ملفاتي</TabsTrigger>
            <TabsTrigger value="notifications" className="relative">
              الإشعارات
              {pendingAssignments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {pendingAssignments.length}
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
                <h2 className="text-xl font-bold">الأقسام المسندة</h2>
                
                {assignments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>لا توجد أقسام مسندة بعد</p>
                    <p className="text-sm">انتظر طلبات الإسناد من المدير</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments.map((assignment, index) => (
                      <motion.button
                        key={assignment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedSection(assignment)}
                        className="p-6 rounded-xl bg-card border border-border/50 text-right hover:border-primary transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <span className="font-semibold">{(assignment as any).sections?.name}</span>
                        </div>
                        <Badge variant="outline">{(assignment as any).subjects?.name}</Badge>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setSelectedSection(null)}>
                    العودة للأقسام
                  </Button>
                  <h2 className="text-xl font-bold">{(selectedSection as any).sections?.name}</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
                    <DialogTrigger asChild>
                      <Button className="h-24 flex-col gap-2 gradient-primary">
                        <Upload className="w-6 h-6" />
                        رفع درس
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إضافة درس جديد</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>عنوان الدرس</Label>
                          <Input
                            value={lessonTitle}
                            onChange={(e) => setLessonTitle(e.target.value)}
                            placeholder="أدخل عنوان الدرس"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>التاريخ</Label>
                          <Input
                            type="date"
                            value={lessonDate}
                            onChange={(e) => setLessonDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الوصف (اختياري)</Label>
                          <Textarea
                            value={lessonDescription}
                            onChange={(e) => setLessonDescription(e.target.value)}
                            placeholder="وصف مختصر للدرس"
                          />
                        </div>
                        <Button onClick={handleAddLesson} className="w-full gradient-primary">
                          إضافة الدرس
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <Calendar className="w-6 h-6" />
                    الاستعمال الزمني
                  </Button>

                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <Users className="w-6 h-6" />
                    قائمة التلاميذ
                  </Button>

                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <ClipboardList className="w-6 h-6" />
                    النقاط والغيابات
                  </Button>
                </div>

                {/* Lessons list */}
                <div className="space-y-4">
                  <h3 className="font-semibold">الدروس المرفوعة</h3>
                  {lessons.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      لا توجد دروس بعد
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="p-4 rounded-lg bg-card border border-border/50"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{lesson.title}</h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(lesson.lesson_date).toLocaleDateString('ar-DZ')}
                            </span>
                          </div>
                          {lesson.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>قريباً - إدارة الملفات</p>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">طلبات الإسناد</h2>
              
              {pendingAssignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>لا توجد طلبات جديدة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAssignments.map((assignment) => (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-card border border-warning/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            طلب إسناد جديد
                          </p>
                          <p className="text-sm text-muted-foreground">
                            القسم: {(assignment as any).sections?.name} - 
                            المادة: {(assignment as any).subjects?.name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90"
                            onClick={() => handleAssignmentResponse(assignment.id, true)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAssignmentResponse(assignment.id, false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
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
