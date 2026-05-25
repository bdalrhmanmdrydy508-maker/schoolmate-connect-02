import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash. The client SDK
    // automatically establishes a session from it on load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    toast({ title: 'تم بنجاح', description: 'تم تغيير كلمة المرور بنجاح' });
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-md p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">إعادة تعيين كلمة المرور</h1>
          <p className="text-sm text-muted-foreground mt-2">أدخل كلمة مرور جديدة لحسابك</p>
        </div>

        {!ready ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جاري التحقق من الرابط...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newpw" className="text-foreground">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newpw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmpw" className="text-foreground">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmpw"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                />
              </div>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حفظ كلمة المرور
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/')}>
              العودة
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
