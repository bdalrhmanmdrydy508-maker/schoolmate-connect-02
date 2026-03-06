import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, ChevronLeft, Users, BookOpen, Plus, Book, GraduationCap, UserCheck, Clock, X, FileText, Calendar, Pencil, Trash2, Search, ClipboardList, Bell, Send } from 'lucide-react';
import { SubjectCard } from '@/components/SubjectCard';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminSettings } from '@/components/AdminSettings';
import { SectionManagement } from '@/components/SectionManagement';
import { Timetable } from '@/components/Timetable';
import { StudentList } from '@/components/StudentList';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonPage } from '@/components/LessonPage';


interface AdminProfile {
  full_name: string;
  institution_name: string;
}

interface Level {
  id: string;
  name: string;
  order_index: number;
}

interface Branch {
  id: string;
  name: string;
  level_id: string;
  parent_branch_id: string | null;
}

interface Section {
  id: string;
  name: string;
  branch_id: string;
}

interface Subject {
  id: string;
  name: string;
}

interface SectionSubject {
  id: string;
  section_id: string;
  subject_name: string;
  teacher_profile_id: string | null;
  teacher_name?: string;
}

interface TeacherProfile {
  id: string;
  full_name: string;
  email: string | null;
  subject: string;
}

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  section_id: string;
  status: string;
  teacher_profiles: {
    full_name: string;
  };
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  lesson_date: string;
  created_at: string;
  duration?: string | null;
}

const BRANCHES_DATA: Record<string, { literary: string[]; scientific: string[] }> = {
  'الأولى ثانوي': {
    literary: ['آداب'],
    scientific: ['علمي'],
  },
  'الثانية ثانوي': {
    literary: ['آداب وفلسفة', 'لغات أجنبية'],
    scientific: ['علوم تجريبية', 'رياضي', 'تقني رياضي', 'تسيير واقتصاد'],
  },
  'الثالثة ثانوي': {
    literary: ['آداب وفلسفة', 'لغات أجنبية'],
    scientific: ['علوم تجريبية', 'رياضي', 'تقني رياضي', 'تسيير واقتصاد'],
  },
};

const SUBJECT_ICONS: Record<string, string> = {
  'رياضيات': '📐',
  'فيزياء': '⚛️',
  'علوم طبيعية': '🧬',
  'عربية': '📜',
  'فرنسية': '🇫🇷',
  'إنجليزية': '🇬🇧',
  'رياضة': '⚽',
  'رسم': '🎨',
  'إعلام آلي': '💻',
  'تاريخ وجغرافيا': '🌍',
  'فلسفة': '🤔',
  'اقتصاد': '📊',
  'قانون': '⚖️',
};

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sectionSubjects, setSectionSubjects] = useState<SectionSubject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  
  const [currentView, setCurrentView] = useState<'levels' | 'branches' | 'sections' | 'section-detail' | 'subject-lessons' | 'section-timetable' | 'section-students'>('levels');
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  
  const [newSectionName, setNewSectionName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubjectOpen, setIsAddingSubjectOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [selectedSubjectForAssignment, setSelectedSubjectForAssignment] = useState<Subject | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTeacherAssignment, setSelectedTeacherAssignment] = useState<TeacherAssignment | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSubject, setNotificationSubject] = useState<SectionSubject | null>(null);
  // Filter lessons based on search query
  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(lessonSearchQuery.toLowerCase())
  );

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

  useEffect(() => {
    fetchProfile();
    fetchLevels();
    fetchSubjects();
    fetchTeachers();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('admin_profiles')
        .select('full_name, institution_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) setProfile(data);
    }
  };

  const fetchLevels = async () => {
    const { data } = await supabase
      .from('levels')
      .select('*')
      .order('order_index');
    
    if (data) setLevels(data);
  };

  const fetchBranches = useCallback(async (levelId: string) => {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('level_id', levelId);
    
    if (data) setBranches(data);
  }, []);

  const fetchSections = useCallback(async (branchId: string) => {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .eq('branch_id', branchId)
      .order('name');
    
    if (data) setSections(data);
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
  };

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teacher_profiles')
      .select('id, full_name, email, subject')
      .order('full_name');
    
    if (data) setTeachers(data);
  };

  const fetchAssignments = useCallback(async (sectionId: string) => {
    const { data } = await supabase
      .from('teacher_assignments')
      .select(`
        id,
        teacher_id,
        subject_id,
        section_id,
        status,
        teacher_profiles!inner (
          full_name
        )
      `)
      .eq('section_id', sectionId);
    
    if (data) setAssignments(data as unknown as TeacherAssignment[]);
  }, []);

  const fetchSectionSubjects = useCallback(async (sectionId: string) => {
    const { data } = await supabase
      .from('section_subjects')
      .select('id, section_id, subject_name, teacher_profile_id')
      .eq('section_id', sectionId)
      .order('created_at');
    
    if (data) {
      // Enrich with teacher names
      const enriched = data.map(ss => {
        const teacher = ss.teacher_profile_id 
          ? teachers.find(t => t.id === ss.teacher_profile_id) 
          : null;
        return { ...ss, teacher_name: teacher?.full_name };
      });
      setSectionSubjects(enriched);
    }
  }, [teachers]);

  const fetchLessons = useCallback(async (sectionId: string, teacherId: string) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, description, file_url, lesson_date, created_at, duration')
      .eq('section_id', sectionId)
      .eq('teacher_id', teacherId)
      .order('lesson_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching lessons:', error);
      setLessons([]);
    } else if (data) {
      setLessons(data);
    }
  }, []);

  useEffect(() => {
    if (selectedLevel) {
      fetchBranches(selectedLevel.id);
    }
  }, [selectedLevel, fetchBranches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchSections(selectedBranch.id);
    }
  }, [selectedBranch, fetchSections]);

  useEffect(() => {
    if (selectedSection) {
      fetchAssignments(selectedSection.id);
      fetchSectionSubjects(selectedSection.id);
    }
  }, [selectedSection, fetchAssignments, fetchSectionSubjects]);

  const getOrCreateBranch = async (branchName: string, levelId: string): Promise<Branch | null> => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(levelId)) {
      console.error('Invalid level ID:', levelId);
      toast({ title: t.common.error, description: t.admin.levelIdInvalid, variant: 'destructive' });
      return null;
    }

    try {
      const { data: existingBranch, error: fetchError } = await supabase
        .from('branches')
        .select('*')
        .eq('name', branchName)
        .eq('level_id', levelId)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error fetching branch:', fetchError);
      }
      
      if (existingBranch) {
        return existingBranch;
      }

      const { data: newBranch, error } = await supabase
        .from('branches')
        .insert({ name: branchName, level_id: levelId })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating branch:', error);
        let errorMessage = t.admin.branchCreateError;
        if (error.code === '42501') {
          errorMessage = t.admin.noPermissionBranch;
        }
        toast({ title: t.common.error, description: errorMessage, variant: 'destructive' });
        return null;
      }

      return newBranch;
    } catch (err) {
      console.error('Unexpected error in getOrCreateBranch:', err);
      toast({ title: t.common.error, description: t.admin.unexpectedError, variant: 'destructive' });
      return null;
    }
  };

  const handleBranchSelect = async (branchName: string) => {
    if (!selectedLevel?.id) {
      toast({ title: t.common.error, description: t.admin.levelNotSelected, variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    const branch = await getOrCreateBranch(branchName, selectedLevel.id);
    setIsLoading(false);
    
    if (branch) {
      setSelectedBranch(branch);
      setCurrentView('sections');
    }
  };

  const handleAddSection = async () => {
    const sectionName = newSectionName.trim();
    
    if (!sectionName) {
      toast({ title: t.common.warning, description: t.admin.sectionNameRequired, variant: 'destructive' });
      return;
    }

    if (!selectedBranch?.id) {
      toast({ title: t.common.error, description: t.admin.branchNotSelected, variant: 'destructive' });
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectedBranch.id)) {
      console.error('Invalid branch ID:', selectedBranch.id);
      toast({ title: t.common.error, description: t.admin.branchIdInvalid, variant: 'destructive' });
      return;
    }

    const existingSection = sections.find(s => s.name.toLowerCase() === sectionName.toLowerCase());
    if (existingSection) {
      toast({ title: t.common.warning, description: t.admin.sectionExists, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('sections')
        .insert({ 
          branch_id: selectedBranch.id, 
          name: sectionName 
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding section:', error);
        let errorMessage = t.admin.sectionAddError;
        
        if (error.code === '23505') {
          errorMessage = t.admin.sectionExists;
        } else if (error.code === '42501') {
          errorMessage = t.admin.noPermissionSection;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({ title: t.common.error, description: errorMessage, variant: 'destructive' });
      } else if (data) {
        toast({ title: t.common.success, description: t.admin.sectionAdded.replace('{name}', sectionName) });
        setSections(prev => [...prev, data]);
        setNewSectionName('');
        setIsAddingSectionOpen(false);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({ title: t.common.error, description: t.admin.unexpectedError, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedSection || !selectedSubjectForAssignment || !selectedTeacherId) {
      toast({ title: t.common.warning, description: t.admin.selectTeacher, variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('section_id', selectedSection.id)
      .eq('subject_id', selectedSubjectForAssignment.id)
      .maybeSingle();

    if (existingAssignment) {
      setIsLoading(false);
      toast({ title: t.common.warning, description: t.admin.alreadyAssigned, variant: 'destructive' });
      return;
    }

    // Get admin profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminProfile) {
      setIsLoading(false);
      toast({ title: t.common.error, description: t.admin.adminProfileNotFound, variant: 'destructive' });
      return;
    }

    // Create assignment
    const { error } = await supabase
      .from('teacher_assignments')
      .insert({
        teacher_id: selectedTeacherId,
        section_id: selectedSection.id,
        subject_id: selectedSubjectForAssignment.id,
        admin_id: adminProfile.id,
        status: 'pending',
      });

    setIsLoading(false);

    if (error) {
      console.error('Error assigning teacher:', error);
      toast({ title: t.common.error, description: t.admin.teacherAssignError, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.admin.assignmentSent });
      fetchAssignments(selectedSection.id);
      setSelectedTeacherId('');
      setTeacherSearchQuery('');
      setIsAssigningTeacher(false);
      setSelectedSubjectForAssignment(null);
    }
  };

  const handleAddSubject = async () => {
    const name = newSubjectName.trim();
    if (!name || !selectedSection) return;

    // Check if subject already exists in this section
    if (sectionSubjects.some(ss => ss.subject_name.toLowerCase() === name.toLowerCase())) {
      toast({ title: t.common.warning, description: t.subjectManagement.subjectExists, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('section_subjects')
      .insert({ section_id: selectedSection.id, subject_name: name })
      .select()
      .single();

    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: t.subjectManagement.addError, variant: 'destructive' });
    } else if (data) {
      toast({ title: t.common.success, description: t.subjectManagement.subjectAdded });
      setSectionSubjects(prev => [...prev, { ...data, teacher_name: undefined }]);
      setNewSubjectName('');
      setIsAddingSubjectOpen(false);
    }
  };

  const handleSectionSubjectUpdate = (updated: SectionSubject) => {
    setSectionSubjects(prev => prev.map(ss => ss.id === updated.id ? updated : ss));
  };

  const handleSectionSubjectDelete = (id: string) => {
    setSectionSubjects(prev => prev.filter(ss => ss.id !== id));
  };

  const handleSendNotification = async () => {
    if (!notificationMessage.trim() || !notificationSubject || !selectedSection) return;
    if (!notificationSubject.teacher_profile_id) {
      toast({ title: t.common.warning, description: t.notifications.noTeacherToNotify, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!adminProfile) { setIsLoading(false); return; }

    const { error } = await supabase
      .from('admin_notifications')
      .insert({
        admin_id: adminProfile.id,
        teacher_profile_id: notificationSubject.teacher_profile_id,
        section_id: selectedSection.id,
        subject_name: notificationSubject.subject_name,
        message: notificationMessage.trim(),
      });
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: t.notifications.sendError, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.notifications.sent });
      setNotificationMessage('');
      setShowNotificationDialog(false);
      setNotificationSubject(null);
    }
  };

  const handleBack = () => {
    if (currentView === 'section-timetable' || currentView === 'section-students') {
      setCurrentView('section-detail');
    } else if (currentView === 'subject-lessons') {
      setCurrentView('section-detail');
      setSelectedSubject(null);
      setSelectedTeacherAssignment(null);
      setLessons([]);
      setSelectedLesson(null);
      setLessonSearchQuery('');
    } else if (currentView === 'section-detail') {
      setCurrentView('sections');
      setSelectedSection(null);
      setAssignments([]);
    } else if (currentView === 'sections') {
      setCurrentView('branches');
      setSelectedBranch(null);
      setSections([]);
    } else if (currentView === 'branches') {
      setCurrentView('levels');
      setSelectedLevel(null);
      setBranches([]);
    }
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

  const handleSectionUpdate = (updatedSection: Section) => {
    setSections(prev => prev.map(s => s.id === updatedSection.id ? updatedSection : s));
  };

  const handleSectionDelete = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const handleSubjectClick = async (subject: Subject, assignment: TeacherAssignment) => {
    setSelectedSubject(subject);
    setSelectedTeacherAssignment(assignment);
    setCurrentView('subject-lessons');
    await fetchLessons(selectedSection!.id, assignment.teacher_id);
  };

  const getLevelLabel = (levelName: string) => {
    return levelName;
  };

  const getAssignmentForSubject = (subjectId: string) => {
    return assignments.find(a => a.subject_id === subjectId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 ml-1" /> {t.admin.pending}</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><UserCheck className="w-3 h-3 ml-1" /> {t.admin.accepted}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><X className="w-3 h-3 ml-1" /> {t.admin.rejected}</Badge>;
      default:
        return null;
    }
  };

  // Filter teachers based on search query - only show results when user types
  const filteredTeachers = teacherSearchQuery.trim() 
    ? teachers.filter(teacher => 
        teacher.full_name.toLowerCase().includes(teacherSearchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AnimatePresence>
                {currentView !== 'levels' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {profile?.full_name || t.roles.admin}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.institution_name || t.settings.institution}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
          <AdminSettings
            profile={profile}
            onClose={() => setShowSettings(false)}
            onThemeChange={handleThemeChange}
            onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
          />
        )}
      </AnimatePresence>

      {/* Lesson Detail - Full Page (view-only for admin) */}
      <AnimatePresence>
        {selectedLesson && (
          <LessonPage
            lesson={selectedLesson}
            onClose={() => setSelectedLesson(null)}
            showEditButton={false}
          />
        )}
      </AnimatePresence>

      {/* Breadcrumb */}
      {currentView !== 'levels' && (
        <div className="container mx-auto px-4 py-2 text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-primary" onClick={() => { setCurrentView('levels'); setSelectedLevel(null); setSelectedBranch(null); setSelectedSection(null); }}>
            {t.admin.home}
          </span>
          {selectedLevel && (
            <>
              <span className="mx-2">/</span>
              <span className={`${currentView !== 'branches' ? 'cursor-pointer hover:text-primary' : 'text-foreground'}`} onClick={() => currentView !== 'branches' && setCurrentView('branches')}>
                {selectedLevel.name}
              </span>
            </>
          )}
          {selectedBranch && (
            <>
              <span className="mx-2">/</span>
              <span className={`${currentView !== 'sections' ? 'cursor-pointer hover:text-primary' : 'text-foreground'}`} onClick={() => currentView !== 'sections' && setCurrentView('sections')}>
                {selectedBranch.name}
              </span>
            </>
          )}
          {selectedSection && (
            <>
              <span className="mx-2">/</span>
              <span className={`${currentView !== 'section-detail' ? 'cursor-pointer hover:text-primary' : 'text-foreground'}`} onClick={() => currentView !== 'section-detail' && setCurrentView('section-detail')}>
                {selectedSection.name}
              </span>
            </>
          )}
          {selectedSubject && (
            <>
              <span className="mx-2">/</span>
              <span className="text-foreground">{selectedSubject.name}</span>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Levels View */}
          {currentView === 'levels' && (
            <motion.div
              key="levels"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {levels.map((level, index) => (
                <motion.button
                  key={level.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedLevel(level);
                    setCurrentView('branches');
                  }}
                  className="group p-8 rounded-2xl bg-card border-2 border-border shadow-md hover:shadow-xl transition-all"
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {getLevelLabel(level.name)}
                  </h3>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Branches View */}
          {currentView === 'branches' && selectedLevel && (
            <motion.div
              key="branches"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold mb-6">{selectedLevel.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Literary branches */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                    <Book className="w-5 h-5" />
                    {t.admin.literaryBranches}
                  </h3>
                  <div className="space-y-3">
                    {BRANCHES_DATA[selectedLevel.name]?.literary.map((branch, index) => (
                      <motion.button
                        key={branch}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 8 }}
                        disabled={isLoading}
                        onClick={() => handleBranchSelect(branch)}
                        className="w-full p-5 rounded-xl bg-card border-2 border-border text-right hover:border-primary hover:shadow-md transition-all disabled:opacity-50"
                      >
                        <span className="font-semibold text-lg">{branch}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                {/* Scientific branches */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    {t.admin.scientificBranches}
                  </h3>
                  <div className="space-y-3">
                    {BRANCHES_DATA[selectedLevel.name]?.scientific.map((branch, index) => (
                      <motion.button
                        key={branch}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: -8 }}
                        disabled={isLoading}
                        onClick={() => handleBranchSelect(branch)}
                        className="w-full p-5 rounded-xl bg-card border-2 border-border text-right hover:border-primary hover:shadow-md transition-all disabled:opacity-50"
                      >
                        <span className="font-semibold text-lg">{branch}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Sections View - Notebook Style */}
          {currentView === 'sections' && selectedBranch && (
            <motion.div
              key="sections"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">{selectedBranch.name}</h2>
                <Dialog open={isAddingSectionOpen} onOpenChange={setIsAddingSectionOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary shadow-lg">
                      <Plus className="w-4 h-4 ml-2" />
                      {t.admin.addSection}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t.admin.addSection}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>{t.admin.sectionName}</Label>
                        <Input
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                          placeholder={t.admin.sectionExample}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                        />
                      </div>
                      <Button 
                        onClick={handleAddSection} 
                        className="w-full gradient-primary"
                        disabled={isLoading || !newSectionName.trim()}
                      >
                        {isLoading ? t.admin.adding : t.common.add}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {sections.map((section, index) => (
                  <motion.button
                    key={section.id}
                    initial={{ opacity: 0, scale: 0.9, rotateY: -20 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05, y: -8 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedSection(section);
                      setCurrentView('section-detail');
                    }}
                    className="notebook-card group relative"
                  >
                    {/* Section Management Buttons */}
                    <SectionManagement
                      section={section}
                      onUpdate={handleSectionUpdate}
                      onDelete={handleSectionDelete}
                    />
                    
                    {/* Notebook binding */}
                    <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-primary/30 to-transparent rounded-r-xl" />
                    <div className="absolute right-2 top-4 bottom-4 w-0.5 bg-primary/20" />
                    
                    {/* Notebook content */}
                    <div className="relative h-full flex flex-col items-center justify-center p-4">
                      <div className="w-14 h-18 bg-primary/10 rounded-lg mb-4 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="w-8 h-8 text-primary" />
                      </div>
                      <span className="font-bold text-foreground text-lg">{section.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">{t.admin.clickToOpen}</span>
                    </div>
                    
                    {/* Notebook lines */}
                    <div className="absolute inset-x-8 bottom-8 space-y-2 opacity-20">
                      <div className="h-px bg-primary/50" />
                      <div className="h-px bg-primary/50" />
                      <div className="h-px bg-primary/50" />
                    </div>
                  </motion.button>
                ))}
                
                {sections.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full text-center py-16"
                  >
                    <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">{t.admin.noSectionsYet}</p>
                    <p className="text-muted-foreground/60 text-sm mt-1">{t.admin.addFirstSection}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Section Detail - Subjects Grid */}
          {currentView === 'section-detail' && selectedSection && (
            <motion.div
              key="section-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Section Title */}
              <div className="text-center">
                <h2 className="text-2xl font-bold">{selectedSection.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedBranch?.name} - {selectedLevel?.name}</p>
              </div>

              {/* Equal buttons: Student List & Timetable */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="gap-2 h-12 text-base border-2"
                  onClick={() => setCurrentView('section-students')}
                >
                  <ClipboardList className="w-5 h-5" />
                  {t.admin.studentList}
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2 h-12 text-base border-2"
                  onClick={() => setCurrentView('section-timetable')}
                >
                  <Clock className="w-5 h-5" />
                  {t.admin.timetable}
                </Button>
              </div>

              {/* Direct Add Subject Input */}
              <div className="flex gap-2">
                <Input
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder={t.subjectManagement.subjectNamePlaceholder}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddSubject} 
                  className="gradient-primary gap-2"
                  disabled={isLoading || !newSubjectName.trim()}
                >
                  <Plus className="w-4 h-4" />
                  {t.common.add}
                </Button>
              </div>

              {/* Subjects Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionSubjects.map((ss, index) => (
                  <SubjectCard
                    key={ss.id}
                    sectionSubject={ss}
                    teachers={teachers}
                    index={index}
                    onUpdate={handleSectionSubjectUpdate}
                    onDelete={handleSectionSubjectDelete}
                    onClick={() => {
                      if (ss.teacher_profile_id) {
                        const assignment = assignments.find(a => 
                          a.teacher_id === ss.teacher_profile_id && a.status === 'accepted'
                        );
                        if (assignment) {
                          const subject = subjects.find(s => s.id === assignment.subject_id) || { id: ss.id, name: ss.subject_name };
                          handleSubjectClick(subject, assignment);
                        }
                      }
                    }}
                    
                  />
                ))}
              </div>

              {sectionSubjects.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">{t.subjectManagement.noSubjectsYet}</p>
                  <p className="text-muted-foreground/60 text-sm mt-1">{t.subjectManagement.addFirstSubject}</p>
                </motion.div>
              )}

            </motion.div>
          )}

          {/* Subject Lessons View */}
          {currentView === 'subject-lessons' && selectedSubject && selectedTeacherAssignment && (
            <motion.div
              key="subject-lessons"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Teacher Info Header */}
              <div className="bg-card rounded-xl border-2 border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{SUBJECT_ICONS[selectedSubject.name] || '📚'}</span>
                      <h2 className="text-2xl font-bold">{selectedSubject.name}</h2>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {t.roles.teacher}: <span className="font-semibold text-foreground">{selectedTeacherAssignment.teacher_profiles.full_name}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSection?.name} - {selectedBranch?.name} - {selectedLevel?.name}
                    </p>
                  </div>
                </div>
              </div>

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

              {/* Lessons List */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t.teacher.lessonsAndSessions} ({filteredLessons.length})
                </h3>
                
                {lessons.length > 0 ? (
                  filteredLessons.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredLessons.map((lesson, index) => (
                        <motion.button
                          key={lesson.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedLesson(lesson)}
                          className="bg-card rounded-xl border-2 border-border p-5 hover:shadow-lg transition-all text-right"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-lg truncate">{lesson.title}</h4>
                              {lesson.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {lesson.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatDateForDisplay(lesson.lesson_date)}</span>
                                </div>
                                {lesson.duration && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{lesson.duration}</span>
                                  </div>
                                )}
                              </div>
                              {lesson.file_url && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  <FileText className="w-3 h-3 ml-1" />
                                  {t.teacher.fileSelected}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 bg-card rounded-xl border-2 border-border"
                    >
                      <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">{t.teacher.noLessonsFound}</p>
                    </motion.div>
                  )
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-card rounded-xl border-2 border-border"
                  >
                    <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">{t.admin.noLessonsYet}</p>
                    <p className="text-muted-foreground/60 text-sm mt-1">{t.admin.noLessonsNote}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Section Timetable View */}
          {currentView === 'section-timetable' && selectedSection && (
            <Timetable
              sectionId={selectedSection.id}
              sectionName={selectedSection.name}
              onBack={() => setCurrentView('section-detail')}
              readOnly={false}
            />
          )}

          {/* Section Students View */}
          {currentView === 'section-students' && selectedSection && (
            <StudentList
              sectionId={selectedSection.id}
              sectionName={selectedSection.name}
              onBack={() => setCurrentView('section-detail')}
              readOnly={false}
            />
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminDashboard;
