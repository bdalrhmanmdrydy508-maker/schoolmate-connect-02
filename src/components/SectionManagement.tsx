import { useState } from 'react';
import { Pencil, Trash2, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
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

/**
 * Principal-only section actions.
 * Renders a small cog button at the TOP-LEFT of the section card.
 * Click → popup menu with Edit / Delete options.
 */
export const SectionManagement = ({ section, onUpdate, onDelete }: SectionManagementProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const stop = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast({ title: t.common.warning, description: t.admin.sectionNameRequired, variant: 'destructive' });
      return;
    }

    if (editName.trim() === section.name) {
      setEditOpen(false);
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
      setEditOpen(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    await supabase.from('timetables').delete().eq('section_id', section.id);
    await supabase.from('students').delete().eq('section_id', section.id);
    await supabase.from('teacher_assignments').delete().eq('section_id', section.id);
    await supabase.from('lessons').delete().eq('section_id', section.id);

    const { error } = await supabase.from('sections').delete().eq('id', section.id);

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

  return (
    <>
      {/* Settings cog at TOP-LEFT of the section card */}
      <div
        className="absolute top-2 left-2 z-20"
        onClick={stop}
        onMouseDown={stop}
        onTouchStart={stop}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-accent"
              aria-label={t.sectionManagement.editSection}
            >
              <SettingsIcon className="w-4 h-4 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onClick={stop}>
            <DropdownMenuItem onSelect={() => { setEditName(section.name); setEditOpen(true); }}>
              <Pencil className="w-4 h-4 mr-2" />
              {t.sectionManagement.editSection}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.sectionManagement.deleteSection}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit name modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClick={stop}>
          <DialogHeader>
            <DialogTitle>{t.sectionManagement.editSection}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setEditOpen(false);
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isLoading}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={stop}>
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
