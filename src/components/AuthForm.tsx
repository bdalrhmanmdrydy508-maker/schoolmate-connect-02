import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, User, Building, BookOpen, ShieldAlert, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { z } from 'zod';

// Secret code for admin access
const ADMIN_SECRET_CODE = 'aqzsedrftgyhujikolpm';

const SUBJECTS = [
  'رياضيات', 'فيزياء', 'علوم طبيعية', 'عربية', 'فرنسية',
  'إنجليزية', 'رياضة', 'رسم', 'إعلام آلي', 'تاريخ وجغرافيا',
  'فلسفة', 'اقتصاد', 'قانون'
];

interface AuthFormProps {
  role: 'admin' | 'teacher';
  onBack: () => void;
}

export const AuthForm = ({ role, onBack }: AuthFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roleError, setRoleError] = useState<string | null>(null);
  const { toast } = useToast();
  const { validateRoleForLogin } = useAuth();
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    institutionName: '',
    subject: '',
    secretCode: '',
  });

  // Dynamic validation schemas
  const adminSchema = z.object({
    fullName: z.string().min(3, t.auth.fullName + ' - 3 characters min'),
    email: z.string().email(t.auth.email + ' invalid'),
    password: z.string().min(6, t.settings.passwordTooShort),
    confirmPassword: z.string(),
    institutionName: z.string().min(2, t.settings.institution + ' required'),
    secretCode: z.string().refine(val => val === ADMIN_SECRET_CODE, t.auth.invalidSecretCode),
  }).refine(data => data.password === data.confirmPassword, {
    message: t.settings.passwordMismatch,
    path: ['confirmPassword'],
  });

  const teacherSchema = z.object({
    fullName: z.string().min(3, t.auth.fullName + ' - 3 characters min'),
    email: z.string().email(t.auth.email + ' invalid'),
    password: z.string().min(6, t.settings.passwordTooShort),
    confirmPassword: z.string(),
    subject: z.string().min(1, t.settings.subject + ' required'),
  }).refine(data => data.password === data.confirmPassword, {
    message: t.settings.passwordMismatch,
    path: ['confirmPassword'],
  });

  const adminLoginSchema = z.object({
    email: z.string().email(t.auth.email + ' invalid'),
    password: z.string().min(1, t.auth.password + ' required'),
  });

  const teacherLoginSchema = z.object({
    email: z.string().email(t.auth.email + ' invalid'),
    password: z.string().min(1, t.auth.password + ' required'),
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setRoleError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setRoleError(null);

    try {
      if (isLogin) {
        // Validate form data based on role
        const loginSchema = role === 'admin' ? adminLoginSchema : teacherLoginSchema;
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

        // Use the new role validation method
        const validation = await validateRoleForLogin(
          formData.email,
          formData.password,
          role
        );

        if (!validation.success) {
          // Set role-specific error message
          setRoleError(validation.error || t.common.error);
          toast({
            title: role === 'admin' ? t.auth.adminLoginFailed : t.auth.teacherLoginFailed,
            description: validation.error,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        toast({
          title: t.auth.loginSuccess,
          description: t.auth.redirecting,
        });

      } else {
        // Sign up flow
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
            title: t.auth.accountError,
            description: signUpError.message === 'User already registered'
              ? t.auth.emailAlreadyRegistered
              : signUpError.message,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (authData.user) {
          // Insert role - This permanently binds the account to this role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: authData.user.id, role });

          if (roleError) {
            console.error('Error inserting role:', roleError);
            // If role insertion fails, we should sign out and notify user
            await supabase.auth.signOut();
            toast({
              title: t.common.error,
              description: t.auth.accountError,
              variant: 'destructive',
            });
            setLoading(false);
            return;
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
            // Teacher accounts start as 'pending' and need admin approval
            const { error: profileError } = await supabase
              .from('teacher_profiles')
              .insert({
                user_id: authData.user.id,
                full_name: formData.fullName,
                email: formData.email,
                subject: formData.subject,
                teacher_id: authData.user.id.substring(0, 8).toUpperCase(),
                status: 'pending', // Requires admin approval
              });

            if (profileError) {
              console.error('Error inserting teacher profile:', profileError);
            }

            // Sign out teacher - they need approval first
            await supabase.auth.signOut();
            
            toast({
              title: t.auth.registrationSent,
              description: t.auth.waitingApproval,
            });
            setLoading(false);
            return;
          }

          toast({
            title: t.auth.signupSuccess,
            description: `${t.auth.registeredAs}${role === 'admin' ? t.roles.admin : t.roles.teacher} - ${t.auth.redirecting}`,
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: t.common.error,
        description: t.admin.unexpectedError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const roleTitle = role === 'admin' ? t.roles.admin : t.roles.teacher;
  const roleIcon = role === 'admin' ? '🔐' : '📚';

  return (
    <motion.div
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
      className="w-full max-w-md mx-auto"
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2 rotate-180'}`} />
        {t.common.back}
      </Button>

      <div className="glass rounded-2xl p-8 border border-border/50 shadow-lg">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">{roleIcon}</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isLogin ? t.auth.login : t.auth.signup}
          </h2>
          <p className="text-muted-foreground">
            {isLogin ? `${t.auth.welcomeBack} ${roleTitle}` : `${t.auth.joinUs}${roleTitle}`}
          </p>
        </div>

        {/* Role mismatch error alert */}
        {roleError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive text-sm">{roleError}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.auth.ensureCorrectRole}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground">{t.auth.fullName}</Label>
              <div className="relative">
                <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={`${isRTL ? 'pr-10' : 'pl-10'} bg-background/50`}
                  placeholder={t.auth.fullName}
                />
              </div>
              {errors.fullName && <p className="text-destructive text-sm">{errors.fullName}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">{t.auth.email}</Label>
            <div className="relative">
              <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'} bg-background/50`}
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">{t.auth.password}</Label>
            <div className="relative">
              <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} bg-background/50`}
                placeholder="••••••••"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
          </div>

        {/* Secret Code Field - Required for Admin signup only */}
        {role === 'admin' && !isLogin && (
            <div className="space-y-2">
              <Label htmlFor="secretCode" className="text-foreground">{t.auth.secretCode}</Label>
              <div className="relative">
                <KeyRound className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  id="secretCode"
                  type="password"
                  value={formData.secretCode}
                  onChange={(e) => handleChange('secretCode', e.target.value)}
                  className={`${isRTL ? 'pr-10' : 'pl-10'} bg-background/50`}
                  placeholder={t.auth.secretCode}
                  dir="ltr"
                />
              </div>
              {errors.secretCode && <p className="text-destructive text-sm">{errors.secretCode}</p>}
              <p className="text-xs text-muted-foreground">
                {t.auth.secretCodeRequired}
              </p>
            </div>
          )}

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">{t.auth.confirmPassword}</Label>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={`${isRTL ? 'pr-10' : 'pl-10'} bg-background/50`}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
                {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword}</p>}
              </div>

              {role === 'admin' && (
                <div className="space-y-2">
                  <Label htmlFor="institutionName" className="text-foreground">{t.settings.institution}</Label>
                  <div className="relative">
                    <Building className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                    <Input
                      id="institutionName"
                      value={formData.institutionName}
                      onChange={(e) => handleChange('institutionName', e.target.value)}
                      className={`${isRTL ? 'pr-10' : 'pl-10'} bg-background/50`}
                      placeholder={t.settings.institution}
                    />
                  </div>
                  {errors.institutionName && <p className="text-destructive text-sm">{errors.institutionName}</p>}
                </div>
              )}

              {role === 'teacher' && (
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-foreground">{t.settings.subject}</Label>
                  <Select value={formData.subject} onValueChange={(value) => handleChange('subject', value)}>
                    <SelectTrigger className="bg-background/50">
                      <BookOpen className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-muted-foreground`} />
                      <SelectValue placeholder={t.settings.subject} />
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
            className="w-full gradient-primary shadow-lg"
            disabled={loading}
          >
            {loading && <Loader2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />}
            {isLogin ? t.auth.login : t.auth.signup}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
              setRoleError(null);
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? t.auth.noAccount : t.auth.alreadyHaveAccount}{' '}
            <span className="text-primary font-medium">
              {isLogin ? t.auth.signup : t.auth.login}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
