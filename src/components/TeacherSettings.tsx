import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, Eye, EyeOff, Save, Moon, Sun, Monitor, Type, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeacherProfile {
  id: string;
  full_name: string;
  subject: string;
  teacher_id: string;
  email: string | null;
  phone: string | null;
}

interface UserSettings {
  language: string;
  font_size: string;
  theme: string;
}

interface TeacherSettingsProps {
  profile: TeacherProfile;
  onClose: () => void;
  onThemeChange: (theme: string) => void;
}

export const TeacherSettings = ({ profile, onClose, onThemeChange }: TeacherSettingsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    language: 'ar',
    font_size: 'medium',
    theme: 'system',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setSettings({
          language: data.language || 'ar',
          font_size: data.font_size || 'medium',
          theme: data.theme || 'system',
        });
      }
    }
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(profile.teacher_id);
    setCopied(true);
    toast({ title: 'تم النسخ', description: 'تم نسخ معرف الأستاذ' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'خطأ', description: 'كلمتا المرور غير متطابقتين', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'خطأ', description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم بنجاح', description: 'تم تغيير كلمة المرور' });
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSettingChange = async (key: keyof UserSettings, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (key === 'theme') {
      onThemeChange(value);
    }

    if (key === 'font_size') {
      document.documentElement.style.fontSize = 
        value === 'small' ? '14px' : value === 'large' ? '18px' : '16px';
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving settings:', error);
      } else {
        toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات' });
      }
    }
  };

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
        className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border/50 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border/50 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">إعدادات الحساب</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">معلومات الحساب</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground">الاسم الكامل</span>
                <span className="font-medium">{profile.full_name}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground">المادة</span>
                <span className="font-medium">{profile.subject}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground">معرف الأستاذ</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium" dir="ltr">{profile.teacher_id}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={handleCopyId}
                  >
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {profile.email && (
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-muted-foreground">البريد الإلكتروني</span>
                  <span className="font-medium" dir="ltr">{profile.email}</span>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-muted-foreground">رقم الهاتف</span>
                  <span className="font-medium" dir="ltr">{profile.phone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Password Change */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">الأمان</h3>
            
            {!showPasswordForm ? (
              <Button 
                variant="outline" 
                onClick={() => setShowPasswordForm(true)}
                className="w-full"
              >
                تغيير كلمة المرور
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-secondary/20 rounded-lg">
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPasswordForm(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Interface Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">إعدادات الواجهة</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>اللغة</span>
                </div>
                <Select 
                  value={settings.language} 
                  onValueChange={(v) => handleSettingChange('language', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-muted-foreground" />
                  <span>حجم الخط</span>
                </div>
                <Select 
                  value={settings.font_size} 
                  onValueChange={(v) => handleSettingChange('font_size', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">صغير</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="large">كبير</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  ) : settings.theme === 'light' ? (
                    <Sun className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>المظهر</span>
                </div>
                <Select 
                  value={settings.theme} 
                  onValueChange={(v) => handleSettingChange('theme', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">تلقائي</SelectItem>
                    <SelectItem value="light">نهاري</SelectItem>
                    <SelectItem value="dark">ليلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
