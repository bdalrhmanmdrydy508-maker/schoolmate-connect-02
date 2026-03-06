import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Pencil, UserPlus, Trash2, X, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface SubjectCardProps {
  sectionSubject: SectionSubject;
  teachers: TeacherProfile[];
  index: number;
  onUpdate: (updated: SectionSubject) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

const SUBJECT_ICONS: Record<string, string> = {
  'رياضيات': '📐', 'فيزياء': '⚛️', 'علوم طبيعية': '🧬',
  'عربية': '📜', 'فرنسية': '🇫🇷', 'إنجليزية': '🇬🇧',
  'رياضة': '⚽', 'رسم': '🎨', 'إعلام آلي': '💻',
  'تاريخ وجغرافيا': '🌍', 'فلسفة': '🤔', 'اقتصاد': '📊', 'قانون': '⚖️',
};

export const SubjectCard = ({ sectionSubject, teachers, index, onUpdate, onDelete, onClick }: SubjectCardProps) => {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState(sectionSubject.subject_name);
  const [teacherSearch, setTeacherSearch] = useState('');

  const filteredTeachers = teacherSearch.trim()
    ? teachers.filter(t => t.full_name.toLowerCase().includes(teacherSearch.toLowerCase()))
    : [];

  const handleRename = async () => {
    if (!newName.trim()) return;
    if (newName.trim() === sectionSubject.subject_name) {
      setShowRenameDialog(false);
      return;
    }
    setIsLoading(true);
    const { error } = await supabase
      .from('section_subjects')
      .update({ subject_name: newName.trim() })
      .eq('id', sectionSubject.id);
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: t.subjectManagement.updateError, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.subjectManagement.nameUpdated });
      onUpdate({ ...sectionSubject, subject_name: newName.trim() });
      setShowRenameDialog(false);
    }
  };

  const handleChangeTeacher = async (teacherId: string | null) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('section_subjects')
      .update({ teacher_profile_id: teacherId })
      .eq('id', sectionSubject.id);
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: t.subjectManagement.updateError, variant: 'destructive' });
    } else {
      const teacherName = teacherId ? teachers.find(t => t.id === teacherId)?.full_name : undefined;
      toast({ title: t.common.success, description: t.subjectManagement.teacherUpdated });
      onUpdate({ ...sectionSubject, teacher_profile_id: teacherId, teacher_name: teacherName });
      setShowTeacherDialog(false);
      setTeacherSearch('');
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const { error } = await supabase
      .from('section_subjects')
      .delete()
      .eq('id', sectionSubject.id);
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: t.subjectManagement.deleteError, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.subjectManagement.subjectDeleted });
      onDelete(sectionSubject.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-card rounded-xl border-2 border-border p-5 hover:shadow-lg transition-all relative group"
      >
        {/* Settings button - top-left */}
        <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} z-10`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "end" : "start"}>
              <DropdownMenuItem onClick={() => { setNewName(sectionSubject.subject_name); setShowRenameDialog(true); }}>
                <Pencil className="w-4 h-4 mr-2" />
                {t.subjectManagement.changeName}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTeacherDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                {sectionSubject.teacher_profile_id ? t.subjectManagement.changeTeacher : t.subjectManagement.assignTeacher}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t.subjectManagement.deleteSubject}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Subject content */}
        <div className="cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-3 mb-3 mt-2">
            <span className="text-3xl">{SUBJECT_ICONS[sectionSubject.subject_name] || '📚'}</span>
            <h3 className="font-bold text-lg">{sectionSubject.subject_name}</h3>
          </div>
          {sectionSubject.teacher_name ? (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" />
              {sectionSubject.teacher_name}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground/60 italic">
              {t.subjectManagement.noTeacher}
            </div>
          )}
        </div>

      </motion.div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.subjectManagement.changeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.subjectManagement.newSubjectName}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.subjectManagement.subjectNamePlaceholder}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
              />
            </div>
            <Button onClick={handleRename} className="w-full gradient-primary" disabled={isLoading || !newName.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Teacher Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={(open) => { setShowTeacherDialog(open); if (!open) setTeacherSearch(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.subjectManagement.changeTeacher}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder={t.admin.searchTeacher}
                className={isRTL ? "pr-10" : "pl-10"}
                autoFocus
              />
            </div>

            {/* Remove teacher option */}
            {sectionSubject.teacher_profile_id && (
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => handleChangeTeacher(null)}
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-2" />
                {t.subjectManagement.noTeacher}
              </Button>
            )}

            {teacherSearch.trim() ? (
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {filteredTeachers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">{t.common.noResults}</p>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => handleChangeTeacher(teacher.id)}
                      disabled={isLoading}
                      className={`w-full p-3 rounded-lg text-right transition-colors ${
                        sectionSubject.teacher_profile_id === teacher.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      <div className="font-medium">{teacher.full_name}</div>
                      <div className="text-sm opacity-80">{teacher.subject} {teacher.email && `• ${teacher.email}`}</div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 border rounded-lg">
                {t.admin.searchTeacher}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.subjectManagement.deleteSubject}</AlertDialogTitle>
            <AlertDialogDescription>{t.subjectManagement.deleteConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isLoading}>
              {isLoading ? t.common.saving : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
