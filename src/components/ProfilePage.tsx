import { motion } from 'framer-motion';
import { User, Mail, Shield, Building2 } from 'lucide-react';
import { BackButton } from '@/components/BackButton';

interface ProfilePageProps {
  fullName: string;
  email?: string | null;
  roleLabel: string; // "الناظر" أو "أستاذ"
  extraLabel?: string; // institution / subject
  extraIcon?: 'institution' | 'subject';
  onClose: () => void;
}

export const ProfilePage = ({ fullName, email, roleLabel, extraLabel, extraIcon, onClose }: ProfilePageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
      dir="rtl"
    >
      <div className="relative max-w-xl mx-auto p-5 pt-16">
        <BackButton onClick={onClose} />

        <header className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">الملف الشخصي</h1>
          <p className="text-sm text-muted-foreground mt-1">معلومات الحساب</p>
        </header>

        <section className="space-y-3">
          <Row icon={<User className="w-5 h-5 text-primary" />} label="الاسم الكامل" value={fullName} />
          {email && <Row icon={<Mail className="w-5 h-5 text-primary" />} label="البريد الإلكتروني" value={email} ltr />}
          <Row icon={<Shield className="w-5 h-5 text-primary" />} label="الدور" value={roleLabel} />
          {extraLabel && (
            <Row
              icon={<Building2 className="w-5 h-5 text-primary" />}
              label={extraIcon === 'subject' ? 'المادة' : 'المؤسسة'}
              value={extraLabel}
            />
          )}
        </section>

        <p className="text-xs text-muted-foreground text-center mt-8">
          لتعديل المعلومات، توجّه إلى صفحة الإعدادات.
        </p>
      </div>
    </motion.div>
  );
};

const Row = ({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) => (
  <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border">
    <div className="flex items-center gap-3 text-muted-foreground">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <span className="font-semibold text-foreground" dir={ltr ? 'ltr' : undefined}>{value}</span>
  </div>
);

export default ProfilePage;
