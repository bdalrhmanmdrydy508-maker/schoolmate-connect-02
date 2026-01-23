import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Shield } from 'lucide-react';
import { RoleCard } from '@/components/RoleCard';
import { AuthForm } from '@/components/AuthForm';
import { ThemeToggle } from '@/components/ThemeToggle';

type SelectedRole = 'admin' | 'teacher' | null;

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);

  return (
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-6 left-6 z-20">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl"
            >
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
                >
                  <GraduationCap className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-2">
                  SmartNotebook
                </h1>
                <p className="text-lg text-primary-foreground/70 mb-4">
                  دفتر القسم الذكي
                </p>
                <p className="text-xl text-primary-foreground/80">
                  أنت على وشك البدء كـ...
                </p>
              </motion.div>

              {/* Role Cards */}
              <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                <RoleCard
                  title="المدير"
                  description="إدارة المؤسسة التعليمية والأقسام والمواد وإسناد الأساتذة"
                  icon={Shield}
                  onClick={() => setSelectedRole('admin')}
                  delay={0.3}
                />
                <RoleCard
                  title="الأستاذ"
                  description="إدارة الدروس والتلاميذ وتقديم المحتوى التعليمي"
                  icon={GraduationCap}
                  onClick={() => setSelectedRole('teacher')}
                  delay={0.4}
                />
              </div>
            </motion.div>
          ) : (
            <AuthForm
              key="auth-form"
              role={selectedRole}
              onBack={() => setSelectedRole(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RoleSelection;
