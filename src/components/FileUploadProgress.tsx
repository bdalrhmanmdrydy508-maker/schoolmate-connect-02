import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, File } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { UploadProgress } from '@/hooks/useFileUpload';

interface FileUploadProgressProps {
  uploads: UploadProgress[];
}

export const FileUploadProgress = ({ uploads }: FileUploadProgressProps) => {
  if (uploads.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <AnimatePresence>
        {uploads.map((upload) => (
          <motion.div
            key={upload.fileName}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border/50 rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                {upload.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : upload.status === 'error' ? (
                  <XCircle className="w-5 h-5 text-destructive" />
                ) : upload.status === 'uploading' ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <File className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" title={upload.fileName}>
                  {upload.fileName}
                </p>
                
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="h-1.5 mt-1" />
                )}
                
                {upload.status === 'success' && (
                  <p className="text-xs text-primary">تم الرفع بنجاح</p>
                )}
                
                {upload.status === 'error' && (
                  <p className="text-xs text-destructive">{upload.error || 'فشل الرفع'}</p>
                )}
                
                {upload.status === 'pending' && (
                  <p className="text-xs text-muted-foreground">في الانتظار...</p>
                )}
              </div>
              
              {upload.status === 'uploading' && (
                <span className="text-sm text-muted-foreground">{upload.progress}%</span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadProgress;
