import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  delay?: number;
}

export const RoleCard = ({ title, description, icon: Icon, onClick, delay = 0 }: RoleCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative w-full max-w-sm p-8 rounded-2xl glass border border-border/50 shadow-lg hover:shadow-glow transition-all duration-300 overflow-hidden"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon container */}
      <motion.div 
        className="relative mb-6 w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-md"
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Icon className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
      </motion.div>
      
      {/* Content */}
      <div className="relative text-center">
        <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 gradient-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.button>
  );
};
