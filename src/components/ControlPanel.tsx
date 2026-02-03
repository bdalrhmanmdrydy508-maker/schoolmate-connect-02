import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Check, X as XIcon, Clock, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeacherRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  subject: string;
  teacher_id: string;
  status: string;
  created_at: string;
}

interface ControlPanelProps {
  onClose: () => void;
}

export const ControlPanel = ({ onClose }: ControlPanelProps) => {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<TeacherRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('teacher_profiles')
      .select('id, user_id, full_name, email, subject, teacher_id, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teachers:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل قائمة الأساتذة', variant: 'destructive' });
    } else {
      setTeachers(data || []);
    }
    setIsLoading(false);
  };

  const handleUpdateStatus = async (teacherId: string, newStatus: 'approved' | 'rejected') => {
    setProcessingId(teacherId);
    
    const { error } = await supabase
      .from('teacher_profiles')
      .update({ status: newStatus })
      .eq('id', teacherId);

    if (error) {
      console.error('Error updating status:', error);
      toast({ title: 'خطأ', description: 'فشل تحديث الحالة', variant: 'destructive' });
    } else {
      toast({ 
        title: newStatus === 'approved' ? 'تم القبول' : 'تم الرفض', 
        description: newStatus === 'approved' ? 'تم تفعيل حساب الأستاذ بنجاح' : 'تم رفض طلب التسجيل'
      });
      await fetchTeachers();
    }
    setProcessingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 ml-1" /> في الانتظار</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><Check className="w-3 h-3 ml-1" /> مفعّل</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XIcon className="w-3 h-3 ml-1" /> مرفوض</Badge>;
      default:
        return null;
    }
  };

  const pendingTeachers = teachers.filter(t => t.status === 'pending');
  const otherTeachers = teachers.filter(t => t.status !== 'pending');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border/50 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">لوحة التحكم</h2>
              <p className="text-sm text-muted-foreground">إدارة طلبات تسجيل الأساتذة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchTeachers} disabled={isLoading}>
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Pending Requests */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  طلبات في الانتظار ({pendingTeachers.length})
                </h3>
                
                {pendingTeachers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                    <Check className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد طلبات معلقة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingTeachers.map((teacher) => (
                      <motion.div
                        key={teacher.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold">{teacher.full_name}</span>
                              {getStatusBadge(teacher.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {teacher.subject} • {teacher.email || 'بدون بريد'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              رقم التعريف: {teacher.teacher_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              تاريخ التسجيل: {new Date(teacher.created_at).toLocaleDateString('ar-DZ')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => handleUpdateStatus(teacher.id, 'rejected')}
                              disabled={processingId === teacher.id}
                            >
                              {processingId === teacher.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <XIcon className="w-4 h-4 ml-1" />
                                  رفض
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleUpdateStatus(teacher.id, 'approved')}
                              disabled={processingId === teacher.id}
                            >
                              {processingId === teacher.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 ml-1" />
                                  قبول
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* All Teachers */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  جميع الأساتذة ({teachers.length})
                </h3>
                
                {otherTeachers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لا يوجد أساتذة مسجلين</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {otherTeachers.map((teacher) => (
                      <div
                        key={teacher.id}
                        className="bg-muted/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{teacher.full_name}</span>
                            {getStatusBadge(teacher.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {teacher.subject} • {teacher.email || 'بدون بريد'}
                          </p>
                        </div>
                        {teacher.status === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(teacher.id, 'approved')}
                            disabled={processingId === teacher.id}
                          >
                            {processingId === teacher.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'إعادة تفعيل'
                            )}
                          </Button>
                        )}
                        {teacher.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleUpdateStatus(teacher.id, 'rejected')}
                            disabled={processingId === teacher.id}
                          >
                            {processingId === teacher.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'تعطيل'
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};