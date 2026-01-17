import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, LogOut, ChevronLeft, Users, BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [currentView, setCurrentView] = useState<'levels' | 'branches' | 'sections' | 'section-detail'>('levels');
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const [newSectionName, setNewSectionName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchLevels();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedLevel) {
      fetchBranches(selectedLevel.id);
    }
  }, [selectedLevel]);

  useEffect(() => {
    if (selectedBranch) {
      fetchSections(selectedBranch.id);
    }
  }, [selectedBranch]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('admin_profiles')
        .select('full_name, institution_name')
        .eq('user_id', user.id)
        .single();
      
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

  const fetchBranches = async (levelId: string) => {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('level_id', levelId);
    
    if (data) setBranches(data);
  };

  const fetchSections = async (branchId: string) => {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .eq('branch_id', branchId);
    
    if (data) setSections(data);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*');
    if (data) setSubjects(data);
  };

  const handleAddSection = async () => {
    if (!selectedBranch || !newSectionName.trim()) return;

    const { error } = await supabase
      .from('sections')
      .insert({ branch_id: selectedBranch.id, name: newSectionName });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل إضافة القسم', variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم إضافة القسم بنجاح' });
      fetchSections(selectedBranch.id);
      setNewSectionName('');
      setIsAddingSectionOpen(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedSection || !selectedSubject || !teacherId.trim()) return;

    // Find teacher by teacher_id
    const { data: teacher } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('teacher_id', teacherId)
      .single();

    if (!teacher) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على الأستاذ', variant: 'destructive' });
      return;
    }

    // Get admin profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminProfile) return;

    // Create assignment
    const { error } = await supabase
      .from('teacher_assignments')
      .insert({
        teacher_id: teacher.id,
        section_id: selectedSection.id,
        subject_id: selectedSubject,
        admin_id: adminProfile.id,
        status: 'pending',
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'خطأ', description: 'تم إسناد أستاذ لهذه المادة مسبقاً', variant: 'destructive' });
      } else {
        toast({ title: 'خطأ', description: 'فشل إسناد الأستاذ', variant: 'destructive' });
      }
    } else {
      toast({ title: 'تم', description: 'تم إرسال طلب الإسناد للأستاذ' });
      setTeacherId('');
      setIsAssigningTeacher(false);
    }
  };

  const handleBack = () => {
    if (currentView === 'section-detail') {
      setCurrentView('sections');
      setSelectedSection(null);
    } else if (currentView === 'sections') {
      setCurrentView('branches');
      setSelectedBranch(null);
    } else if (currentView === 'branches') {
      setCurrentView('levels');
      setSelectedLevel(null);
    }
  };

  const getLevelIcon = (index: number) => {
    const icons = ['١', '٢', '٣'];
    return icons[index] || (index + 1).toString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentView !== 'levels' && (
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentView === 'levels' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {levels.map((level, index) => (
              <motion.button
                key={level.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedLevel(level);
                  setCurrentView('branches');
                }}
                className="group p-8 rounded-2xl bg-card border border-border/50 shadow-md hover:shadow-lg transition-all"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">
                  {getLevelIcon(index)}
                </div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {level.name}
                </h3>
              </motion.button>
            ))}
          </motion.div>
        )}

        {currentView === 'branches' && selectedLevel && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-2xl font-bold mb-6">{selectedLevel.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Literary branches */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-muted-foreground">الشعب الأدبية</h3>
                {BRANCHES_DATA[selectedLevel.name]?.literary.map((branch, index) => (
                  <motion.button
                    key={branch}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => {
                      setSelectedBranch({ id: `lit-${index}`, name: branch, level_id: selectedLevel.id, parent_branch_id: null });
                      setCurrentView('sections');
                    }}
                    className="w-full p-6 rounded-xl bg-card border border-border/50 text-right hover:border-primary transition-colors"
                  >
                    <span className="font-semibold">{branch}</span>
                  </motion.button>
                ))}
              </div>
              
              {/* Scientific branches */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-muted-foreground">الشعب العلمية</h3>
                {BRANCHES_DATA[selectedLevel.name]?.scientific.map((branch, index) => (
                  <motion.button
                    key={branch}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => {
                      setSelectedBranch({ id: `sci-${index}`, name: branch, level_id: selectedLevel.id, parent_branch_id: null });
                      setCurrentView('sections');
                    }}
                    className="w-full p-6 rounded-xl bg-card border border-border/50 text-right hover:border-primary transition-colors"
                  >
                    <span className="font-semibold">{branch}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'sections' && selectedBranch && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{selectedBranch.name}</h2>
              <Dialog open={isAddingSectionOpen} onOpenChange={setIsAddingSectionOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
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
                      />
                    </div>
                    <Button onClick={handleAddSection} className="w-full gradient-primary">
                      إضافة
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sections.map((section, index) => (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    setSelectedSection(section);
                    setCurrentView('section-detail');
                  }}
                  className="aspect-[3/4] p-4 rounded-xl bg-gradient-to-b from-card to-secondary border border-border/50 flex flex-col items-center justify-center shadow-md hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-16 bg-primary/10 rounded-lg mb-3 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">{section.name}</span>
                </motion.button>
              ))}
              
              {sections.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  لا توجد أقسام بعد. أضف قسماً جديداً للبدء.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {currentView === 'section-detail' && selectedSection && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold">{selectedSection.name}</h2>

            {/* Subject selector */}
            <div className="bg-card p-6 rounded-xl border border-border/50">
              <Label className="text-lg font-semibold mb-4 block">اختر المادة</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="اختر المادة" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assign teacher */}
            {selectedSubject && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card p-6 rounded-xl border border-border/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">إسناد أستاذ</h3>
                  <Dialog open={isAssigningTeacher} onOpenChange={setIsAssigningTeacher}>
                    <DialogTrigger asChild>
                      <Button className="gradient-primary">
                        <Users className="w-4 h-4 ml-2" />
                        إسناد أستاذ
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إسناد أستاذ للمادة</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>معرف الأستاذ (ID)</Label>
                          <Input
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                            placeholder="مثال: T1A2B3"
                            dir="ltr"
                          />
                        </div>
                        <Button onClick={handleAssignTeacher} className="w-full gradient-primary">
                          إرسال الطلب
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-muted-foreground">
                  أدخل معرف الأستاذ لإرسال طلب إسناد. سيتمكن الأستاذ من قبول أو رفض الطلب.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
