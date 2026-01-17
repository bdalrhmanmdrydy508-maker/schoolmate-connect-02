import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import RoleSelection from './RoleSelection';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-foreground mx-auto mb-4" />
          <p className="text-primary-foreground/80">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show role selection
  if (!user) {
    return <RoleSelection />;
  }

  // Logged in - redirect based on role
  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'teacher') {
    return <TeacherDashboard />;
  }

  // User exists but no role - shouldn't happen, but show role selection as fallback
  return <RoleSelection />;
};

export default Index;
