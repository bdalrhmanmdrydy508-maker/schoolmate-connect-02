import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, ChevronLeft, Users, BookOpen, Plus, Book, GraduationCap, UserCheck, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  section_id: string;
  status: string;
  teacher_profiles: {
    full_name: string;
    teacher_id: string;
  };
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
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  
  const [currentView, setCurrentView] = useState<'levels' | 'branches' | 'sections' | 'section-detail'>('levels');
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  
  const [newSectionName, setNewSectionName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [selectedSubjectForAssignment, setSelectedSubjectForAssignment] = useState<Subject | null>(null);
  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchLevels();
    fetchSubjects();
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
          full_name,
          teacher_id
        )
      `)
      .eq('section_id', sectionId);
    
    if (data) setAssignments(data as unknown as TeacherAssignment[]);
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
    }
  }, [selectedSection, fetchAssignments]);

  const getOrCreateBranch = async (branchName: string, levelId: string): Promise<Branch | null> => {
    // First, try to find existing branch
    const { data: existingBranch } = await supabase
      .from('branches')
      .select('*')
      .eq('name', branchName)
      .eq('level_id', levelId)
      .maybeSingle();
    
    if (existingBranch) {
      return existingBranch;
    }

    // Create new branch
    const { data: newBranch, error } = await supabase
      .from('branches')
      .insert({ name: branchName, level_id: levelId })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating branch:', error);
      toast({ title: 'خطأ', description: 'فشل إنشاء الشعبة', variant: 'destructive' });
      return null;
    }

    return newBranch;
  };

  const handleBranchSelect = async (branchName: string) => {
    if (!selectedLevel) return;
    
    setIsLoading(true);
    const branch = await getOrCreateBranch(branchName, selectedLevel.id);
    setIsLoading(false);
    
    if (branch) {
      setSelectedBranch(branch);
      setCurrentView('sections');
    }
  };

  const handleAddSection = async () => {
    if (!selectedBranch || !newSectionName.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال اسم القسم', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('sections')
      .insert({ 
        branch_id: selectedBranch.id, 
        name: newSectionName.trim() 
      })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      console.error('Error adding section:', error);
      toast({ 
        title: 'خطأ', 
        description: error.message || 'فشل إضافة القسم', 
        variant: 'destructive' 
      });
    } else if (data) {
      toast({ title: 'تم بنجاح', description: 'تم إضافة القسم بنجاح' });
      setSections(prev => [...prev, data]);
      setNewSectionName('');
      setIsAddingSectionOpen(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedSection || !selectedSubjectForAssignment || !teacherId.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال معرف الأستاذ', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    // Find teacher by teacher_id
    const { data: teacher, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('teacher_id', teacherId.trim())
      .maybeSingle();

    if (teacherError || !teacher) {
      setIsLoading(false);
      toast({ title: 'خطأ', description: 'لم يتم العثور على أستاذ بهذا المعرف', variant: 'destructive' });
      return;
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('section_id', selectedSection.id)
      .eq('subject_id', selectedSubjectForAssignment.id)
      .maybeSingle();

    if (existingAssignment) {
      setIsLoading(false);
      toast({ title: 'تنبيه', description: 'تم إسناد أستاذ لهذه المادة مسبقاً', variant: 'destructive' });
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
      toast({ title: 'خطأ', description: 'لم يتم العثور على ملف المدير', variant: 'destructive' });
      return;
    }

    // Create assignment
    const { error } = await supabase
      .from('teacher_assignments')
      .insert({
        teacher_id: teacher.id,
        section_id: selectedSection.id,
        subject_id: selectedSubjectForAssignment.id,
        admin_id: adminProfile.id,
        status: 'pending',
      });

    setIsLoading(false);

    if (error) {
      console.error('Error assigning teacher:', error);
      toast({ title: 'خطأ', description: 'فشل إسناد الأستاذ', variant: 'destructive' });
    } else {
      toast({ title: 'تم بنجاح', description: 'تم إرسال طلب الإسناد للأستاذ' });
      fetchAssignments(selectedSection.id);
      setTeacherId('');
      setIsAssigningTeacher(false);
      setSelectedSubjectForAssignment(null);
    }
  };

  const handleBack = () => {
    if (currentView === 'section-detail') {
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

  const getLevelIcon = (index: number) => {
    const icons = ['١', '٢', '٣'];
    return icons[index] || (index + 1).toString();
  };

  const getAssignmentForSubject = (subjectId: string) => {
    return assignments.find(a => a.subject_id === subjectId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 ml-1" /> في الانتظار</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><UserCheck className="w-3 h-3 ml-1" /> مقبول</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><X className="w-3 h-3 ml-1" /> مرفوض</Badge>;
      default:
        return null;
    }
  };

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
                  {profile?.full_name || 'المدير'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.institution_name || 'المؤسسة'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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

      {/* Breadcrumb */}
      {currentView !== 'levels' && (
        <div className="container mx-auto px-4 py-2 text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-primary" onClick={() => { setCurrentView('levels'); setSelectedLevel(null); setSelectedBranch(null); setSelectedSection(null); }}>
            الرئيسية
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
              <span className="text-foreground">{selectedSection.name}</span>
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
                  className="group p-8 rounded-2xl bg-card border border-border/50 shadow-md hover:shadow-xl transition-all"
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-lg">
                    {getLevelIcon(index)}
                  </div>
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {level.name}
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
                    الشعب الأدبية
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
                        className="w-full p-5 rounded-xl bg-card border border-border/50 text-right hover:border-primary hover:shadow-md transition-all disabled:opacity-50"
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
                    الشعب العلمية
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
                        className="w-full p-5 rounded-xl bg-card border border-border/50 text-right hover:border-primary hover:shadow-md transition-all disabled:opacity-50"
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
                      إضافة قسم
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة قسم جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>اسم القسم</Label>
                        <Input
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                          placeholder="مثال: القسم 1"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                        />
                      </div>
                      <Button 
                        onClick={handleAddSection} 
                        className="w-full gradient-primary"
                        disabled={isLoading || !newSectionName.trim()}
                      >
                        {isLoading ? 'جاري الإضافة...' : 'إضافة'}
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
                    className="notebook-card group"
                  >
                    {/* Notebook binding */}
                    <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-primary/30 to-transparent rounded-r-xl" />
                    <div className="absolute right-2 top-4 bottom-4 w-0.5 bg-primary/20" />
                    
                    {/* Notebook content */}
                    <div className="relative h-full flex flex-col items-center justify-center p-4">
                      <div className="w-14 h-18 bg-primary/10 rounded-lg mb-4 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="w-8 h-8 text-primary" />
                      </div>
                      <span className="font-bold text-foreground text-lg">{section.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">انقر للفتح</span>
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
                    <p className="text-muted-foreground text-lg">لا توجد أقسام بعد</p>
                    <p className="text-muted-foreground/60 text-sm mt-1">أضف قسماً جديداً للبدء</p>
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
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedSection.name}</h2>
                  <p className="text-muted-foreground">{selectedBranch?.name} - {selectedLevel?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject, index) => {
                  const assignment = getAssignmentForSubject(subject.id);
                  
                  return (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-xl border border-border/50 p-5 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{SUBJECT_ICONS[subject.name] || '📚'}</span>
                          <h3 className="font-bold text-lg">{subject.name}</h3>
                        </div>
                      </div>
                      
                      {assignment ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">الأستاذ:</span>
                            <span className="font-medium">{assignment.teacher_profiles.full_name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">الحالة:</span>
                            {getStatusBadge(assignment.status)}
                          </div>
                        </div>
                      ) : (
                        <Dialog open={isAssigningTeacher && selectedSubjectForAssignment?.id === subject.id} onOpenChange={(open) => {
                          setIsAssigningTeacher(open);
                          if (!open) setSelectedSubjectForAssignment(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full mt-2"
                              onClick={() => setSelectedSubjectForAssignment(subject)}
                            >
                              <Users className="w-4 h-4 ml-2" />
                              إسناد أستاذ
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>إسناد أستاذ لمادة {subject.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>معرف الأستاذ (ID)</Label>
                                <Input
                                  value={teacherId}
                                  onChange={(e) => setTeacherId(e.target.value)}
                                  placeholder="مثال: T1A2B3"
                                  dir="ltr"
                                  onKeyDown={(e) => e.key === 'Enter' && handleAssignTeacher()}
                                />
                                <p className="text-xs text-muted-foreground">
                                  أدخل معرف الأستاذ لإرسال طلب الإسناد
                                </p>
                              </div>
                              <Button 
                                onClick={handleAssignTeacher} 
                                className="w-full gradient-primary"
                                disabled={isLoading || !teacherId.trim()}
                              >
                                {isLoading ? 'جاري الإرسال...' : 'إرسال الطلب'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminDashboard;
