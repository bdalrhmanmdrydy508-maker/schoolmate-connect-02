import { useState } from 'react';
import { Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
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

interface Section {
  id: string;
  name: string;
  branch_id: string;
}

interface SectionManagementProps {
  section: Section;
  onUpdate: (section: Section) => void;
  onDelete: (sectionId: string) => void;
}

export const SectionManagement = ({ section, onUpdate, onDelete }: SectionManagementProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast({ title: t.common.warning, description: t.admin.sectionNameRequired, variant: 'destructive' });
      return;
    }

    if (editName.trim() === section.name) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    const { error } = await supabase
      .from('sections')
      .update({ name: editName.trim() })
      .eq('id', section.id);

    setIsLoading(false);

    if (error) {
      console.error('Error updating section:', error);
      toast({ title: t.common.error, description: t.sectionManagement.updateError, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.sectionManagement.sectionUpdated });
      onUpdate({ ...section, name: editName.trim() });
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    
    // Delete all related timetables
    await supabase
      .from('timetables')
      .delete()
      .eq('section_id', section.id);

    // Delete all related students
    await supabase
      .from('students')
      .delete()
      .eq('section_id', section.id);

    // Delete all related assignments
    await supabase
      .from('teacher_assignments')
      .delete()
      .eq('section_id', section.id);

    // Delete all related lessons
    await supabase
      .from('lessons')
      .delete()
      .eq('section_id', section.id);

    // Delete the section
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', section.id);

    setIsLoading(false);
    setDeleteDialogOpen(false);

    if (error) {
      console.error('Error deleting section:', error);
      toast({ title: t.common.error, description: t.sectionManagement.deleteError, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.sectionManagement.sectionDeleted });
      onDelete(section.id);
    }
  };

  const handleCancel = () => {
    setEditName(section.name);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 h-8"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-600" />}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={handleCancel}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 left-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.sectionManagement.deleteSection}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.sectionManagement.deleteConfirm.replace('this section', `"${section.name}"`)}
              <br />
              <span className="text-destructive font-medium">
                {t.sectionManagement.deleteWarning}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? t.common.saving : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
