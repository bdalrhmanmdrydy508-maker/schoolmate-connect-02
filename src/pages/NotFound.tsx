import { motion } from 'framer-motion';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-destructive/20 flex items-center justify-center"
        >
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </motion.div>
        
        <h1 className="text-6xl font-bold text-primary-foreground mb-4">404</h1>
        <p className="text-xl text-primary-foreground/80 mb-8">
          عذراً، الصفحة التي تبحث عنها غير موجودة
        </p>
        
        <Button
          onClick={() => navigate('/')}
          className="gradient-primary text-primary-foreground px-8 py-6 text-lg rounded-xl"
        >
          <Home className="w-5 h-5 ml-2" />
          العودة للرئيسية
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
