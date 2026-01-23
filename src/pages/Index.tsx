import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSelection from './RoleSelection';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import LoadingScreen from '@/components/LoadingScreen';

const Index = () => {
  const { user, role, loading, initialLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  // Handle splash screen completion
  const handleSplashComplete = useCallback(() => {
    setSplashComplete(true);
  }, []);

  // Determine if we should still show splash
  useEffect(() => {
    // Keep splash visible until both conditions are met:
    // 1. Splash animation completed (minimum duration)
    // 2. Auth loading is complete
    if (splashComplete && !loading) {
      // Add a small delay for smooth transition
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [splashComplete, loading]);

  // Show splash screen on initial load
  if (showSplash || initialLoading) {
    return <LoadingScreen onComplete={handleSplashComplete} minDuration={3000} maxDuration={5000} />;
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
