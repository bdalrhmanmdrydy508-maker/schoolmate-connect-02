import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Edit2, Save, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TimetableEntry {
  id?: string;
  section_id: string;
  day_of_week: number;
  time_slot: string;
  subject_name: string | null;
  teacher_name: string | null;
}

interface TimetableProps {
  sectionId: string;
  sectionName: string;
  onBack: () => void;
}

const DAYS = [
  { index: 0, name: 'الأحد', nameEn: 'Sunday' },
  { index: 1, name: 'الاثنين', nameEn: 'Monday' },
  { index: 2, name: 'الثلاثاء', nameEn: 'Tuesday' },
  { index: 3, name: 'الأربعاء', nameEn: 'Wednesday' },
  { index: 4, name: 'الخميس', nameEn: 'Thursday' },
];

const TIME_SLOTS = [
  { slot: '08:00', label: '08:00 - 09:00' },
  { slot: '09:00', label: '09:00 - 10:00' },
  { slot: '10:00', label: '10:00 - 11:00' },
  { slot: '11:00', label: '11:00 - 12:00' },
  { slot: '13:00', label: '13:00 - 14:00' },
  { slot: '14:00', label: '14:00 - 15:00' },
  { slot: '15:00', label: '15:00 - 16:00' },
  { slot: '16:00', label: '16:00 - 17:00' },
];

export const Timetable = ({ sectionId, sectionName, onBack }: TimetableProps) => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [editingCell, setEditingCell] = useState<{ day: number; slot: string } | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Get current day (0 = Sunday)
  const today = new Date().getDay();
  const currentDayIndex = today === 5 || today === 6 ? -1 : today; // Hide highlight on Friday/Saturday

  useEffect(() => {
    fetchTimetable();
  }, [sectionId]);

  const fetchTimetable = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('section_id', sectionId);

    if (error) {
      console.error('Error fetching timetable:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل الجدول الزمني', variant: 'destructive' });
    } else {
      setEntries(data || []);
    }
    setIsLoading(false);
  };

  const getEntry = (dayIndex: number, timeSlot: string): TimetableEntry | undefined => {
    return entries.find(e => e.day_of_week === dayIndex && e.time_slot === timeSlot);
  };

  const handleCellClick = (dayIndex: number, timeSlot: string) => {
    const entry = getEntry(dayIndex, timeSlot);
    setEditingCell({ day: dayIndex, slot: timeSlot });
    setEditSubject(entry?.subject_name || '');
    setEditTeacher(entry?.teacher_name || '');
  };

  const handleSave = async () => {
    if (!editingCell) return;

    setIsSaving(true);
    const existingEntry = getEntry(editingCell.day, editingCell.slot);

    try {
      if (existingEntry?.id) {
        // Update existing entry
        if (!editSubject.trim() && !editTeacher.trim()) {
          // Delete if both fields are empty
          const { error } = await supabase
            .from('timetables')
            .delete()
            .eq('id', existingEntry.id);

          if (error) throw error;
          toast({ title: 'تم الحذف', description: 'تم حذف المادة من الجدول' });
        } else {
          const { error } = await supabase
            .from('timetables')
            .update({
              subject_name: editSubject.trim() || null,
              teacher_name: editTeacher.trim() || null,
            })
            .eq('id', existingEntry.id);

          if (error) throw error;
          toast({ title: 'تم الحفظ', description: 'تم تحديث الجدول الزمني' });
        }
      } else if (editSubject.trim() || editTeacher.trim()) {
        // Insert new entry
        const { error } = await supabase
          .from('timetables')
          .insert({
            section_id: sectionId,
            day_of_week: editingCell.day,
            time_slot: editingCell.slot,
            subject_name: editSubject.trim() || null,
            teacher_name: editTeacher.trim() || null,
          });

        if (error) throw error;
        toast({ title: 'تم الإضافة', description: 'تم إضافة المادة للجدول' });
      }

      await fetchTimetable();
    } catch (error: any) {
      console.error('Error saving timetable:', error);
      toast({ title: 'خطأ', description: error.message || 'فشل حفظ التغييرات', variant: 'destructive' });
    } finally {
      setIsSaving(false);
      setEditingCell(null);
      setEditSubject('');
      setEditTeacher('');
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditSubject('');
    setEditTeacher('');
  };

  const handleDelete = async () => {
    if (!editingCell) return;

    const existingEntry = getEntry(editingCell.day, editingCell.slot);
    if (!existingEntry?.id) {
      handleCancel();
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('timetables')
        .delete()
        .eq('id', existingEntry.id);

      if (error) throw error;
      toast({ title: 'تم الحذف', description: 'تم حذف المادة من الجدول' });
      await fetchTimetable();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message || 'فشل الحذف', variant: 'destructive' });
    } finally {
      setIsSaving(false);
      setEditingCell(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← العودة
        </Button>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          الجدول الزمني - {sectionName}
        </h2>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-center font-semibold bg-muted/50 w-24">
                الوقت
              </th>
              {DAYS.map((day) => (
                <th
                  key={day.index}
                  className={cn(
                    "p-3 text-center font-semibold transition-colors",
                    currentDayIndex === day.index
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "bg-muted/50"
                  )}
                >
                  {day.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((timeSlot, idx) => (
              <tr
                key={timeSlot.slot}
                className={cn(
                  "border-b border-border/50 last:border-0",
                  idx === 3 && "border-b-2 border-primary/30" // Separator between morning and afternoon
                )}
              >
                <td className="p-2 text-center text-sm font-medium bg-muted/30 text-muted-foreground">
                  {timeSlot.label}
                </td>
                {DAYS.map((day) => {
                  const entry = getEntry(day.index, timeSlot.slot);
                  const isEditing = editingCell?.day === day.index && editingCell?.slot === timeSlot.slot;
                  const hasContent = entry?.subject_name || entry?.teacher_name;

                  return (
                    <td
                      key={`${day.index}-${timeSlot.slot}`}
                      className={cn(
                        "p-1 text-center transition-all relative",
                        currentDayIndex === day.index && "bg-primary/5",
                        !isEditing && "cursor-pointer hover:bg-accent/50",
                        hasContent && !isEditing && "bg-primary/10"
                      )}
                      onClick={() => !isEditing && handleCellClick(day.index, timeSlot.slot)}
                    >
                      {isEditing ? (
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="p-2 space-y-2"
                        >
                          <Input
                            placeholder="اسم المادة"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="text-sm h-8"
                            autoFocus
                          />
                          <Input
                            placeholder="اسم الأستاذ (اختياري)"
                            value={editTeacher}
                            onChange={(e) => setEditTeacher(e.target.value)}
                            className="text-sm h-8"
                          />
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              disabled={isSaving}
                              className="h-7 w-7 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            {entry?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleDelete}
                                disabled={isSaving}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={isSaving}
                              className="h-7 w-7 p-0"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="min-h-[60px] flex flex-col items-center justify-center p-2">
                          {hasContent ? (
                            <>
                              <span className="font-medium text-sm text-foreground">
                                {entry?.subject_name}
                              </span>
                              {entry?.teacher_name && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  {entry.teacher_name}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">
                              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/10 border border-primary/30" />
          <span>خانة ممتلئة</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/5 border-b-2 border-primary" />
          <span>اليوم الحالي</span>
        </div>
        <div className="flex items-center gap-2">
          <Edit2 className="w-4 h-4" />
          <span>انقر على أي خانة للتعديل</span>
        </div>
      </div>
    </motion.div>
  );
};
