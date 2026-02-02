import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Edit2, Trash2, Save, X, User, Calendar, MapPin, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  section_id: string;
  full_name: string;
  surname: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  is_repeater: boolean;
  created_at: string;
}

interface StudentListProps {
  sectionId: string;
  sectionName: string;
  onBack: () => void;
}

export const StudentList = ({ sectionId, sectionName, onBack }: StudentListProps) => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'full_name' | 'surname'>('full_name');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    surname: '',
    date_of_birth: '',
    place_of_birth: '',
    is_repeater: false,
  });

  useEffect(() => {
    fetchStudents();
  }, [sectionId]);

  const fetchStudents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('section_id', sectionId)
      .order('full_name');

    if (error) {
      console.error('Error fetching students:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل قائمة التلاميذ', variant: 'destructive' });
    } else {
      setStudents(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      surname: '',
      date_of_birth: '',
      place_of_birth: '',
      is_repeater: false,
    });
  };

  const handleAddStudent = async () => {
    if (!formData.full_name.trim() || !formData.surname.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى ملء الاسم واللقب', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('students').insert({
        section_id: sectionId,
        full_name: formData.full_name.trim(),
        surname: formData.surname.trim(),
        date_of_birth: formData.date_of_birth || null,
        place_of_birth: formData.place_of_birth.trim() || null,
        is_repeater: formData.is_repeater,
      });

      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تم إضافة التلميذ' });
      resetForm();
      setIsAddDialogOpen(false);
      await fetchStudents();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message || 'فشل إضافة التلميذ', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    if (!formData.full_name.trim() || !formData.surname.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى ملء الاسم واللقب', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          full_name: formData.full_name.trim(),
          surname: formData.surname.trim(),
          date_of_birth: formData.date_of_birth || null,
          place_of_birth: formData.place_of_birth.trim() || null,
          is_repeater: formData.is_repeater,
        })
        .eq('id', editingStudent.id);

      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تم تحديث بيانات التلميذ' });
      resetForm();
      setEditingStudent(null);
      await fetchStudents();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message || 'فشل تحديث البيانات', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التلميذ؟')) return;

    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);

      if (error) throw error;

      toast({ title: 'تم الحذف', description: 'تم حذف التلميذ من القائمة' });
      await fetchStudents();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message || 'فشل الحذف', variant: 'destructive' });
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      surname: student.surname,
      date_of_birth: student.date_of_birth || '',
      place_of_birth: student.place_of_birth || '',
      is_repeater: student.is_repeater,
    });
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    resetForm();
  };

  // Filter and sort students
  const filteredStudents = students
    .filter((s) => {
      const query = searchQuery.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(query) ||
        s.surname.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'surname') {
        return a.surname.localeCompare(b.surname, 'ar');
      }
      return a.full_name.localeCompare(b.full_name, 'ar');
    });

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button variant="ghost" onClick={onBack}>
          ← العودة
        </Button>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5" />
          قائمة التلاميذ - {sectionName}
        </h2>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو اللقب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Sort */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">ترتيب:</span>
            <Button
              variant={sortBy === 'full_name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('full_name')}
            >
              الاسم
            </Button>
            <Button
              variant={sortBy === 'surname' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('surname')}
            >
              اللقب
            </Button>
          </div>

          {/* Add Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة تلميذ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة تلميذ جديد</DialogTitle>
              </DialogHeader>
              <StudentForm
                formData={formData}
                setFormData={setFormData}
                onSave={handleAddStudent}
                onCancel={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>{searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد تلاميذ في هذا القسم بعد'}</p>
          <p className="text-sm">اضغط على "إضافة تلميذ" لإضافة تلميذ جديد</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>الاسم الكامل</TableHead>
                  <TableHead>اللقب</TableHead>
                  <TableHead>تاريخ الميلاد</TableHead>
                  <TableHead>مكان الميلاد</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="w-24 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "border-b border-border/50 last:border-0",
                        editingStudent?.id === student.id && "bg-primary/5"
                      )}
                    >
                      {editingStudent?.id === student.id ? (
                        <TableCell colSpan={7} className="p-4">
                          <StudentForm
                            formData={formData}
                            setFormData={setFormData}
                            onSave={handleUpdateStudent}
                            onCancel={cancelEdit}
                            isSaving={isSaving}
                            isEditing
                          />
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="text-center font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell>{student.surname}</TableCell>
                          <TableCell>
                            {student.date_of_birth
                              ? new Date(student.date_of_birth).toLocaleDateString('ar-DZ')
                              : '-'}
                          </TableCell>
                          <TableCell>{student.place_of_birth || '-'}</TableCell>
                          <TableCell className="text-center">
                            {student.is_repeater ? (
                              <Badge variant="secondary" className="gap-1">
                                <RotateCcw className="w-3 h-3" />
                                معيد
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                                <Check className="w-3 h-3" />
                                غير معيد
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => startEdit(student)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteStudent(student.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>إجمالي التلاميذ: {students.length}</span>
        <span>المعيدون: {students.filter((s) => s.is_repeater).length}</span>
      </div>
    </motion.div>
  );
};

// Student Form Component
interface StudentFormData {
  full_name: string;
  surname: string;
  date_of_birth: string;
  place_of_birth: string;
  is_repeater: boolean;
}

interface StudentFormProps {
  formData: StudentFormData;
  setFormData: React.Dispatch<React.SetStateAction<StudentFormData>>;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isEditing?: boolean;
}

const StudentForm = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  isSaving,
  isEditing = false,
}: StudentFormProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            الاسم الكامل *
          </Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="أحمد"
          />
        </div>
        <div className="space-y-2">
          <Label>اللقب *</Label>
          <Input
            value={formData.surname}
            onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
            placeholder="بن محمد"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            تاريخ الميلاد
          </Label>
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            مكان الميلاد
          </Label>
          <Input
            value={formData.place_of_birth}
            onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
            placeholder="الجزائر"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <Label className="flex items-center gap-2 cursor-pointer">
          <RotateCcw className="w-4 h-4" />
          التلميذ معيد؟
        </Label>
        <Switch
          checked={formData.is_repeater}
          onCheckedChange={(checked) => setFormData({ ...formData, is_repeater: checked })}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 ml-2" />
          إلغاء
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="w-4 h-4 ml-2" />
          {isSaving ? 'جاري الحفظ...' : isEditing ? 'حفظ التغييرات' : 'إضافة'}
        </Button>
      </div>
    </div>
  );
};
