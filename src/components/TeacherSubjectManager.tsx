import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
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
}

const SUBJECT_ICONS: Record<string, string> = {
  'رياضيات': '📐', 'فيزياء': '⚛️', 'علوم طبيعية': '🧬',
  'عربية': '📜', 'فرنسية': '🇫🇷', 'إنجليزية': '🇬🇧',
  'رياضة': '⚽', 'رسم': '🎨', 'إعلام آلي': '💻',
  'تاريخ وجغرافيا': '🌍', 'فلسفة': '🤔', 'اقتصاد': '📊', 'قانون': '⚖️',
};

interface TeacherSubjectManagerProps {
  sectionId: string;
}

export const TeacherSubjectManager = ({ sectionId }: TeacherSubjectManagerProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<SectionSubject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState<SectionSubject | null>(null);
  const [editName, setEditName] = useState('');

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase
      .from('section_subjects')
      .select('id, section_id, subject_name, teacher_profile_id')
      .eq('section_id', sectionId)
      .order('created_at');
    if (data) setSubjects(data);
  }, [sectionId]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const handleAdd = async () => {
    const name = newSubjectName.trim();
    if (!name) return;
    if (subjects.some(s => s.subject_name.toLowerCase() === name.toLowerCase())) {
      toast({ title: t.common.warning, description: t.subjectManagement.subjectExists, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('section_subjects')
      .insert({ section_id: sectionId, subject_name: name })
      .select()
      .single();
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: t.subjectManagement.addError, variant: 'destructive' });
    } else if (data) {
      toast({ title: t.common.success, description: t.subjectManagement.subjectAdded });
      setSubjects(prev => [...prev, data]);
      setNewSubjectName('');
      setShowAddDialog(false);
    }
  };

  const handleRename = async () => {
    if (!editingSubject || !editName.trim()) return;
    if (editName.trim() === editingSubject.subject_name) { setShowRenameDialog(false); return; }
    setIsLoading(true);
    const { error } = await supabase
      .from('section_subjects')
      .update({ subject_name: editName.trim() })
      .eq('id', editingSubject.id);
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: t.subjectManagement.updateError, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.subjectManagement.nameUpdated });
      setSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, subject_name: editName.trim() } : s));
      setShowRenameDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!editingSubject) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('section_subjects')
      .delete()
      .eq('id', editingSubject.id);
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: t.subjectManagement.deleteError, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.subjectManagement.subjectDeleted });
      setSubjects(prev => prev.filter(s => s.id !== editingSubject.id));
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground">{t.admin.subjects}</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setNewSubjectName(''); setShowAddDialog(true); }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t.subjectManagement.addSubject}
        </Button>
      </div>

      {subjects.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">{t.subjectManagement.noSubjectsYet}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {subjects.map((subject, index) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{SUBJECT_ICONS[subject.subject_name] || '📚'}</span>
                <span className="text-sm font-medium truncate">{subject.subject_name}</span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => { setEditingSubject(subject); setEditName(subject.subject_name); setShowRenameDialog(true); }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => { setEditingSubject(subject); setShowDeleteDialog(true); }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.subjectManagement.addSubject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.subjectManagement.subjectName}</Label>
              <Input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder={t.subjectManagement.subjectNamePlaceholder}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
            </div>
            <Button onClick={handleAdd} className="w-full gradient-primary" disabled={isLoading || !newSubjectName.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.common.add}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
              />
            </div>
            <Button onClick={handleRename} className="w-full gradient-primary" disabled={isLoading || !editName.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
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
    </div>
  );
};
