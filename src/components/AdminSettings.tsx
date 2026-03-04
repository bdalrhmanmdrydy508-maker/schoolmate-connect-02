import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Moon, Sun, Monitor, Type, Globe, Pencil, Lock, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { ControlPanel } from '@/components/ControlPanel';

interface AdminProfile {
  id?: string;
  full_name: string;
  institution_name: string;
  email?: string;
  last_profile_update?: string | null;
}

interface UserSettings {
  language: string;
  font_size: string;
  theme: string;
}

interface AdminSettingsProps {
  profile: AdminProfile;
  onClose: () => void;
  onThemeChange: (theme: string) => void;
  onProfileUpdate: (profile: AdminProfile) => void;
}

export const AdminSettings = ({ profile, onClose, onThemeChange, onProfileUpdate }: AdminSettingsProps) => {
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [institutionName, setInstitutionName] = useState(profile.institution_name);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastProfileUpdate, setLastProfileUpdate] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    language: language,
    font_size: 'medium',
    theme: 'system',
  });

  const EDIT_COOLDOWN_DAYS = 14;

  // Calculate days remaining until next edit is allowed
  const getDaysRemaining = () => {
    if (!lastProfileUpdate) return 0;
    const lastUpdate = new Date(lastProfileUpdate);
    const now = new Date();
    const diffTime = now.getTime() - lastUpdate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = EDIT_COOLDOWN_DAYS - diffDays;
    return remaining > 0 ? remaining : 0;
  };

  const canEditProfile = () => {
    if (!lastProfileUpdate) return true;
    return getDaysRemaining() === 0;
  };

  useEffect(() => {
    fetchSettings();
    fetchLastProfileUpdate();
  }, []);

  const fetchLastProfileUpdate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('admin_profiles')
        .select('last_profile_update')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.last_profile_update) {
        setLastProfileUpdate(data.last_profile_update);
      }
    }
  };

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
          language: data.language || 'fr',
          font_size: data.font_size || 'medium',
          theme: data.theme || 'system',
        });
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!canEditProfile()) {
      toast({ 
        title: t.settings.notAllowed, 
        description: t.settings.canEditAfter.replace('{days}', String(getDaysRemaining())), 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          full_name: fullName,
          institution_name: institutionName,
          updated_at: now,
          last_profile_update: now,
        })
        .eq('user_id', user.id);

      if (error) {
        toast({ title: t.common.error, description: t.settings.dataSaveError, variant: 'destructive' });
      } else {
        toast({ title: t.common.success, description: t.settings.dataSaved });
        setLastProfileUpdate(now);
        onProfileUpdate({ ...profile, full_name: fullName, institution_name: institutionName });
        setEditMode(false);
      }
    }
    setIsLoading(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({ title: t.common.error, description: t.settings.enterCurrentPassword, variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: t.common.error, description: t.settings.passwordMismatch, variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: t.common.error, description: t.settings.passwordTooShort, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    // Verify current password by re-authenticating
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setIsLoading(false);
      toast({ title: t.common.error, description: t.settings.userNotFound, variant: 'destructive' });
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setIsLoading(false);
      toast({ title: t.common.error, description: t.settings.wrongCurrentPassword, variant: 'destructive' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.common.success, description: t.settings.passwordChanged });
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

    if (key === 'language' && (value === 'fr' || value === 'en' || value === 'ar')) {
      await setLanguage(value as any);
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
        toast({ title: t.common.success, description: t.settings.settingsSaved });
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
          <h2 className="text-xl font-bold">{t.settings.title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{t.settings.accountInfo}</h3>
              {!editMode && (
                canEditProfile() ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                    <Pencil className="w-4 h-4 ml-2" />
                    {t.common.edit}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>{t.settings.editAvailableIn.replace('{days}', String(getDaysRemaining()))}</span>
                  </div>
                )
              )}
            </div>

            {/* Restriction notice */}
            {!canEditProfile() && !editMode && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">{t.settings.editRestricted}</p>
                  <p className="text-muted-foreground">{t.settings.editRestrictionNote} {t.settings.daysRemaining.replace('{days}', String(getDaysRemaining()))}</p>
                </div>
              </div>
            )}
            
            {editMode ? (
              <div className="space-y-3 p-4 bg-secondary/20 rounded-lg">
                <div className="space-y-2">
                  <Label>{t.auth.fullName}</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.settings.institution}</Label>
                  <Input
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 ml-2" />
                    {isLoading ? t.common.saving : t.common.save}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditMode(false);
                      setFullName(profile.full_name);
                      setInstitutionName(profile.institution_name);
                    }}
                  >
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-muted-foreground">{t.auth.fullName}</span>
                  <span className="font-medium">{profile.full_name}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-muted-foreground">{t.settings.institution}</span>
                  <span className="font-medium">{profile.institution_name}</span>
                </div>

                {profile.email && (
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">{t.auth.email}</span>
                    <span className="font-medium" dir="ltr">{profile.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Password Change */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t.settings.security}</h3>
            
            {!showPasswordForm ? (
              <Button 
                variant="outline" 
                onClick={() => setShowPasswordForm(true)}
                className="w-full"
              >
                {t.settings.changePassword}
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-secondary/20 rounded-lg">
                <div className="space-y-2">
                  <Label>{t.settings.currentPassword}</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t.settings.enterCurrentPassword}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.settings.newPassword}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t.settings.enterNewPassword}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.settings.confirmNewPassword}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.settings.reEnterPassword}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={isLoading || !currentPassword}
                    className="flex-1"
                  >
                    {isLoading ? t.common.saving : t.common.save}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Interface Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t.settings.interfaceSettings}</h3>
            
            <div className="space-y-3">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-muted-foreground" />
                  <span>{t.settings.fontSize}</span>
                </div>
                <Select 
                  value={settings.font_size} 
                  onValueChange={(v) => handleSettingChange('font_size', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{t.settings.fontSmall}</SelectItem>
                    <SelectItem value="medium">{t.settings.fontMedium}</SelectItem>
                    <SelectItem value="large">{t.settings.fontLarge}</SelectItem>
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
                  <span>{t.settings.theme}</span>
                </div>
                <Select 
                  value={settings.theme} 
                  onValueChange={(v) => handleSettingChange('theme', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t.settings.themeSystem}</SelectItem>
                    <SelectItem value="light">{t.settings.themeLight}</SelectItem>
                    <SelectItem value="dark">{t.settings.themeDark}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Control Panel Button */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t.controlPanel.allTeachers.split(' ')[0]}</h3>
            <Button 
              onClick={() => setShowControlPanel(true)}
              className="w-full gap-2"
              variant="outline"
            >
              <Users className="w-5 h-5" />
              {t.settings.controlPanel}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t.controlPanel.subtitle}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Control Panel Modal */}
      <AnimatePresence>
        {showControlPanel && (
          <ControlPanel onClose={() => setShowControlPanel(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
