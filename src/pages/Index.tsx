import { useAuth } from '@/contexts/AuthContext';
import RoleSelection from './RoleSelection';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import LoadingScreen from '@/components/LoadingScreen';

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
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
