import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Calendar, BookOpen, Users, FileText, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getCurrentAcademicYear, getNextAcademicYear } from '@/lib/academicYear';

interface ArchiveRow {
  id: string;
  academic_year: string;
  snapshot: any;
  archived_at: string;
}

interface AcademicArchiveProps {
  onClose: () => void;
}

type View = 'list' | 'year' | 'section' | 'subject';

export const AcademicArchive = ({ onClose }: AcademicArchiveProps) => {
  const { toast } = useToast();
  const [archives, setArchives] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [hasCurrentData, setHasCurrentData] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  const [view, setView] = useState<View>('list');
  const [selectedArchive, setSelectedArchive] = useState<ArchiveRow | null>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  const currentYear = getCurrentAcademicYear();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile) setAdminId(profile.id);

    const [{ count: sectionCount }, { count: lessonCount }] = await Promise.all([
      supabase.from('sections').select('id', { count: 'exact', head: true }),
      supabase.from('lessons').select('id', { count: 'exact', head: true }),
    ]);
    setHasCurrentData((sectionCount ?? 0) > 0 || (lessonCount ?? 0) > 0);

    if (profile) {
      const { data } = await supabase
        .from('academic_archives')
        .select('id, academic_year, snapshot, archived_at')
        .eq('admin_id', profile.id)
        .order('archived_at', { ascending: false });
      if (data) setArchives(data as ArchiveRow[]);
    }
    setLoading(false);
  };

  const handleArchive = async () => {
    if (!adminId) return;
    setArchiving(true);
    try {
      const [sections, branches, levels, sectionSubjects, lessons, students, timetables, assignments, teachers] = await Promise.all([
        supabase.from('sections').select('*'),
        supabase.from('branches').select('*'),
        supabase.from('levels').select('*'),
        supabase.from('section_subjects').select('*'),
        supabase.from('lessons').select('*'),
        supabase.from('students').select('*'),
        supabase.from('timetables').select('*'),
        supabase.from('teacher_assignments').select('*'),
        supabase.from('teacher_profiles').select('id, full_name, subject'),
      ]);

      const snapshot = {
        sections: sections.data || [],
        branches: branches.data || [],
        levels: levels.data || [],
        section_subjects: sectionSubjects.data || [],
        lessons: lessons.data || [],
        students: students.data || [],
        timetables: timetables.data || [],
        teacher_assignments: assignments.data || [],
        teachers: teachers.data || [],
      };

      const { error } = await supabase
        .from('academic_archives')
        .insert({
          admin_id: adminId,
          academic_year: currentYear,
          snapshot,
        });

      if (error) throw error;

      await supabase.from('lessons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('timetables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('teacher_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('section_subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast({ title: 'تمت الأرشفة', description: `تم أرشفة السنة ${currentYear} وبدء سنة ${getNextAcademicYear(currentYear)}` });
      setConfirmArchive(false);
      await init();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'خطأ', description: e.message || 'فشلت عملية الأرشفة', variant: 'destructive' });
    } finally {
      setArchiving(false);
    }
  };

  const handleBack = () => {
    if (view === 'subject') { setView('section'); setSelectedSubject(null); }
    else if (view === 'section') { setView('year'); setSelectedSection(null); }
    else if (view === 'year') { setView('list'); setSelectedArchive(null); }
    else onClose();
  };

  const renderListView = () => (
    <div className="space-y-4">
      {hasCurrentData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <Button
            onClick={() => setConfirmArchive(true)}
            className="gradient-primary shadow-lg gap-2 h-12 px-5"
          >
            <Archive className="w-5 h-5" />
            أرشفة السنة الدراسية الحالية ({currentYear})
          </Button>
        </motion.div>
      )}

      {archives.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Archive className="w-16 h-16 mx-auto mb-4 opacity-40" />
          <p className="text-lg">لا توجد سنوات مؤرشفة بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {archives.map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => { setSelectedArchive(a); setView('year'); }}
              className="p-6 rounded-2xl bg-card border-2 border-border shadow-md hover:shadow-xl hover:border-primary transition-all text-right"
            >
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-3 shadow-lg">
                <Calendar className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-1">{a.academic_year}</h3>
              <p className="text-xs text-muted-foreground">
                أُرشفت في {new Date(a.archived_at).toLocaleDateString('ar-DZ')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-md bg-secondary/60">
                  {(a.snapshot?.sections?.length || 0)} قسم
                </span>
                <span className="px-2 py-1 rounded-md bg-secondary/60">
                  {(a.snapshot?.lessons?.length || 0)} درس
                </span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium">
                للقراءة فقط
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );

  const renderYearView = () => {
    if (!selectedArchive) return null;
    const sections = selectedArchive.snapshot?.sections || [];
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">سنة {selectedArchive.academic_year}</h2>
        {sections.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">لا توجد أقسام في هذا الأرشيف</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sections.map((s: any) => (
              <button
                key={s.id}
                onClick={() => { setSelectedSection(s); setView('section'); }}
                className="p-4 rounded-xl bg-card border-2 border-border hover:border-primary transition-all text-right"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{s.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSectionView = () => {
    if (!selectedSection || !selectedArchive) return null;
    const subjects = (selectedArchive.snapshot?.section_subjects || []).filter(
      (ss: any) => ss.section_id === selectedSection.id
    );
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">قسم {selectedSection.name}</h2>
        {subjects.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">لا توجد مواد في هذا القسم</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((ss: any) => (
              <button
                key={ss.id}
                onClick={() => { setSelectedSubject(ss); setView('subject'); }}
                className="p-4 rounded-xl bg-card border-2 border-border hover:border-primary transition-all text-right"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{ss.subject_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSubjectView = () => {
    if (!selectedSubject || !selectedArchive || !selectedSection) return null;
    const lessons = (selectedArchive.snapshot?.lessons || []).filter(
      (l: any) => l.section_id === selectedSection.id &&
        (selectedSubject.teacher_profile_id ? l.teacher_id === selectedSubject.teacher_profile_id : true)
    );
    return (
      <div>
        <h2 className="text-2xl font-bold mb-1">{selectedSubject.subject_name}</h2>
        <p className="text-sm text-muted-foreground mb-4">{selectedSection.name}</p>
        {lessons.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">لا توجد دروس مسجلة</p>
        ) : (
          <div className="space-y-3">
            {lessons.map((l: any) => (
              <div key={l.id} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold">{l.title}</h4>
                    {l.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{l.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(l.lesson_date).toLocaleDateString('ar-DZ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
      dir="rtl"
    >
      <header className="sticky top-0 z-10 glass border-b border-border/50">
        <div className="px-3 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">الأرشيف الدراسي</h1>
              <p className="text-xs text-muted-foreground">السنة الحالية: {currentYear}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view + (selectedArchive?.id || '') + (selectedSection?.id || '') + (selectedSubject?.id || '')}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {view === 'list' && renderListView()}
              {view === 'year' && renderYearView()}
              {view === 'section' && renderSectionView()}
              {view === 'subject' && renderSubjectView()}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الأرشفة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حفظ كل بيانات السنة الحالية ({currentYear}) في الأرشيف وبدء سنة جديدة ({getNextAcademicYear(currentYear)}).
              هذه العملية لا يمكن التراجع عنها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="gap-2"
            >
              {archiving && <Loader2 className="w-4 h-4 animate-spin" />}
              تأكيد الأرشفة
            </AlertDialogAction>
            <AlertDialogCancel disabled={archiving}>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};
