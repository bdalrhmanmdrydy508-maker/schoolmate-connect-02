import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Archive, User, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenArchive: () => void;
  onOpenProfile: () => void;
}

export const SideMenu = ({ open, onClose, onOpenSettings, onOpenArchive, onOpenProfile }: SideMenuProps) => {
  const { signOut } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  const items = [
    { icon: Settings, label: 'الإعدادات', action: onOpenSettings },
    { icon: Archive, label: 'الأرشيف', action: onOpenArchive },
    { icon: User, label: 'المعلومات الشخصية', action: onOpenProfile },
  ];

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />

            {/* Drawer (slides from left) */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
              className="fixed top-0 left-0 z-[61] h-full w-[78%] max-w-xs bg-card border-r border-border/60 shadow-2xl flex flex-col"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h2 className="text-lg font-bold">القائمة</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Items */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-2">
                {items.map((item, i) => (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleItemClick(item.action)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors text-right"
                  >
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-base">{item.label}</span>
                  </motion.button>
                ))}
              </nav>

              {/* Footer - Logout */}
              <div className="p-3 border-t border-border/50">
                <Button
                  variant="destructive"
                  className="w-full gap-2 h-12"
                  onClick={() => setConfirmLogout(true)}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">تسجيل الخروج</span>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل تريد تسجيل الخروج؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إنهاء جلستك الحالية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={async () => {
                setConfirmLogout(false);
                onClose();
                await signOut();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تأكيد
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
