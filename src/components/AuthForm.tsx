import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, User, Building, BookOpen, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const SUBJECTS = [
  'رياضيات', 'فيزياء', 'علوم طبيعية', 'عربية', 'فرنسية',
  'إنجليزية', 'رياضة', 'رسم', 'إعلام آلي', 'تاريخ وجغرافيا',
  'فلسفة', 'اقتصاد', 'قانون'
];

const adminSchema = z.object({
  fullName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة السر يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string(),
  institutionName: z.string().min(2, 'اسم المؤسسة مطلوب'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'كلمة السر غير متطابقة',
  path: ['confirmPassword'],
});

const teacherSchema = z.object({
  fullName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة السر يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string(),
  subject: z.string().min(1, 'يرجى اختيار المادة'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'كلمة السر غير متطابقة',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة السر مطلوبة'),
});

interface AuthFormProps {
  role: 'admin' | 'teacher';
  onBack: () => void;
}

export const AuthForm = ({ role, onBack }: AuthFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    institutionName: '',
    subject: '',
  });

  const generateTeacherId = () => {
    return 'T' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          toast({
            title: 'خطأ في تسجيل الدخول',
            description: error.message === 'Invalid login credentials' 
              ? 'البريد الإلكتروني أو كلمة السر غير صحيحة' 
              : error.message,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        toast({
          title: 'تم تسجيل الدخول بنجاح',
          description: 'جاري التوجيه...',
        });
      } else {
        // Sign up
        const schema = role === 'admin' ? adminSchema : teacherSchema;
        const result = schema.safeParse(formData);
        
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/`;

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (signUpError) {
          toast({
            title: 'خطأ في إنشاء الحساب',
            description: signUpError.message === 'User already registered'
              ? 'البريد الإلكتروني مسجل مسبقاً'
              : signUpError.message,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (authData.user) {
          // Insert role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: authData.user.id, role });

          if (roleError) {
            console.error('Error inserting role:', roleError);
          }

          // Insert profile based on role
          if (role === 'admin') {
            const { error: profileError } = await supabase
              .from('admin_profiles')
              .insert({
                user_id: authData.user.id,
                full_name: formData.fullName,
                email: formData.email,
                institution_name: formData.institutionName,
              });

            if (profileError) {
              console.error('Error inserting admin profile:', profileError);
            }
          } else {
            const teacherId = generateTeacherId();
            const { error: profileError } = await supabase
              .from('teacher_profiles')
              .insert({
                user_id: authData.user.id,
                full_name: formData.fullName,
                email: formData.email,
                subject: formData.subject,
                teacher_id: teacherId,
              });

            if (profileError) {
              console.error('Error inserting teacher profile:', profileError);
            }
          }

          toast({
            title: 'تم إنشاء الحساب بنجاح',
            description: 'جاري التوجيه إلى لوحة التحكم...',
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const roleTitle = role === 'admin' ? 'المدير' : 'الأستاذ';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="w-4 h-4 ml-2" />
        العودة
      </Button>

      <div className="glass rounded-2xl p-8 border border-border/50 shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </h2>
          <p className="text-muted-foreground">
            {isLogin ? `مرحباً بعودتك ${roleTitle}` : `انضم إلينا كـ${roleTitle}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground">الاسم الكامل</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="pr-10 bg-background/50"
                  placeholder="أدخل اسمك الكامل"
                />
              </div>
              {errors.fullName && <p className="text-destructive text-sm">{errors.fullName}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="pr-10 bg-background/50"
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">كلمة السر</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="pr-10 pl-10 bg-background/50"
                placeholder="••••••••"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">تأكيد كلمة السر</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className="pr-10 bg-background/50"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
                {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword}</p>}
              </div>

              {role === 'admin' && (
                <div className="space-y-2">
                  <Label htmlFor="institutionName" className="text-foreground">اسم المؤسسة</Label>
                  <div className="relative">
                    <Building className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="institutionName"
                      value={formData.institutionName}
                      onChange={(e) => handleChange('institutionName', e.target.value)}
                      className="pr-10 bg-background/50"
                      placeholder="اسم الثانوية"
                    />
                  </div>
                  {errors.institutionName && <p className="text-destructive text-sm">{errors.institutionName}</p>}
                </div>
              )}

              {role === 'teacher' && (
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-foreground">المادة</Label>
                  <Select value={formData.subject} onValueChange={(value) => handleChange('subject', value)}>
                    <SelectTrigger className="bg-background/50">
                      <BookOpen className="w-4 h-4 ml-2 text-muted-foreground" />
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.subject && <p className="text-destructive text-sm">{errors.subject}</p>}
                </div>
              )}
            </>
          )}

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground font-semibold py-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}
            className="text-primary hover:underline text-sm"
          >
            {isLogin ? 'ليس لديك حساب؟ أنشئ حساباً جديداً' : 'لديك حساب؟ سجل الدخول'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
