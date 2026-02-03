import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'teacher' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  initialLoading: boolean;
  signOut: () => Promise<void>;
  validateRoleForLogin: (email: string, password: string, expectedRole: UserRole) => Promise<{
    success: boolean;
    error?: string;
    actualRole?: UserRole;
  }>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }

      return data?.role as UserRole;
    } catch (error) {
      console.error('Error fetching role:', error);
      return null;
    }
  }, []);

  // Validate that user's role matches expected role during login
  const validateRoleForLogin = useCallback(async (
    email: string, 
    password: string, 
    expectedRole: UserRole
  ): Promise<{ success: boolean; error?: string; actualRole?: UserRole }> => {
    try {
      // First, attempt to sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Generic error for wrong credentials
        const isAdmin = expectedRole === 'admin';
        return { 
          success: false, 
          error: isAdmin 
            ? 'فشل تسجيل دخول المدير - بيانات الاعتماد غير صحيحة'
            : 'فشل تسجيل دخول الأستاذ - بيانات الاعتماد غير صحيحة'
        };
      }

      if (!authData.user) {
        return { success: false, error: 'لم يتم العثور على المستخدم' };
      }

      // Fetch the user's actual role
      const actualRole = await fetchUserRole(authData.user.id);

      // Check if roles match
      if (actualRole !== expectedRole) {
        // Sign out immediately - role mismatch
        await supabase.auth.signOut();
        
        const isAdmin = expectedRole === 'admin';
        return { 
          success: false, 
          error: isAdmin 
            ? 'فشل تسجيل دخول المدير - هذا الحساب مسجل كأستاذ'
            : 'فشل تسجيل دخول الأستاذ - هذا الحساب مسجل كمدير',
          actualRole 
        };
      }

      // For teachers, check approval status
      if (actualRole === 'teacher') {
        const { data: teacherProfile } = await supabase
          .from('teacher_profiles')
          .select('status')
          .eq('user_id', authData.user.id)
          .single();

        if (teacherProfile?.status === 'pending') {
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'حسابك قيد المراجعة. يرجى انتظار موافقة المدير.'
          };
        }

        if (teacherProfile?.status === 'rejected') {
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'تم رفض طلب التسجيل. يرجى التواصل مع المدير.'
          };
        }
      }

      // Success - role matches and approved
      setUser(authData.user);
      setSession(authData.session);
      setRole(actualRole);

      return { success: true, actualRole };

    } catch (error) {
      console.error('Validation error:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }, [fetchUserRole]);

  // Refresh user role
  const refreshRole = useCallback(async () => {
    if (user) {
      const userRole = await fetchUserRole(user.id);
      setRole(userRole);
    }
  }, [user, fetchUserRole]);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Defer role fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            const userRole = await fetchUserRole(session.user.id);
            setRole(userRole);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userRole = await fetchUserRole(session.user.id);
          if (mounted) {
            setRole(userRole);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          // Delay initial loading to allow splash screen minimum display
          setTimeout(() => {
            if (mounted) setInitialLoading(false);
          }, 100);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      loading, 
      initialLoading,
      signOut, 
      validateRoleForLogin,
      refreshRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
