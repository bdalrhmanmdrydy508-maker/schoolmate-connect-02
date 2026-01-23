import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, Trash2, Download, Calendar, FileText, Image, FileArchive, Loader2, FileVideo, FileAudio, FileCode, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload, FILE_CONFIG } from '@/hooks/useFileUpload';
import { FileUploadProgress } from '@/components/FileUploadProgress';
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

interface TeacherProfile {
  id: string;
  full_name: string;
  user_id?: string;
}

interface TeacherFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

interface TeacherFilesProps {
  profile: TeacherProfile;
}

export const TeacherFiles = ({ profile }: TeacherFilesProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<TeacherFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<TeacherFile | null>(null);

  // Use the unified file upload hook
  const { uploadFiles, isUploading, uploadProgress } = useFileUpload({
    bucket: 'teacher-files',
    saveToDatabase: true,
    tableName: 'teacher_files',
    teacherId: profile.id,
    onSuccess: () => {
      fetchFiles();
    },
  });

  useEffect(() => {
    fetchFiles();
  }, [profile.id]);

  const fetchFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('teacher_files')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
    } else {
      setFiles(data || []);
    }
    setIsLoading(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    await uploadFiles(selectedFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteClick = (file: TeacherFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      // Extract file path from URL
      const urlParts = fileToDelete.file_url.split('/teacher-files/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        
        // Delete from storage
        await supabase.storage
          .from('teacher-files')
          .remove([filePath]);
      }

      // Delete metadata
      const { error } = await supabase
        .from('teacher_files')
        .delete()
        .eq('id', fileToDelete.id);

      if (error) throw error;

      toast({ title: 'تم الحذف', description: 'تم حذف الملف بنجاح' });
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ 
        title: 'خطأ', 
        description: 'فشل حذف الملف', 
        variant: 'destructive' 
      });
    }

    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  const getFileIcon = (fileType: string | null, fileName: string) => {
    if (!fileType) {
      // Try to determine from extension
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        return <Image className="w-6 h-6 text-primary" />;
      }
      if (['pdf'].includes(ext)) {
        return <FileText className="w-6 h-6 text-destructive" />;
      }
      return <File className="w-6 h-6 text-muted-foreground" />;
    }
    
    if (fileType.startsWith('image/')) return <Image className="w-6 h-6 text-primary" />;
    if (fileType === 'application/pdf') return <FileText className="w-6 h-6 text-destructive" />;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) {
      return <FileArchive className="w-6 h-6 text-accent-foreground" />;
    }
    if (fileType.includes('video')) return <FileVideo className="w-6 h-6 text-primary" />;
    if (fileType.includes('audio')) return <FileAudio className="w-6 h-6 text-primary" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return <FileSpreadsheet className="w-6 h-6 text-primary" />;
    }
    if (fileType.includes('code') || fileType.includes('javascript') || fileType.includes('json')) {
      return <FileCode className="w-6 h-6 text-primary" />;
    }
    return <File className="w-6 h-6 text-secondary-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const groupFilesByDate = (files: TeacherFile[]) => {
    const groups: Record<string, TeacherFile[]> = {};
    
    files.forEach(file => {
      const date = new Date(file.created_at).toLocaleDateString('ar-DZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(file);
    });

    return groups;
  };

  const groupedFiles = groupFilesByDate(files);

  // Generate accept attribute from allowed extensions
  const acceptedExtensions = FILE_CONFIG.allowedExtensions.map(ext => `.${ext}`).join(',');

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">ملفاتي</h2>
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept={acceptedExtensions}
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gradient-primary"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 ml-2" />
                رفع ملف
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Supported formats info */}
      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
        <p className="font-medium mb-1">الصيغ المدعومة:</p>
        <p>PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, صور (JPG, PNG, GIF), ZIP, RAR, وغيرها...</p>
        <p className="mt-1">الحد الأقصى: 50 ميجابايت</p>
      </div>

      {/* Upload Progress */}
      <FileUploadProgress uploads={uploadProgress} />

      {/* Files List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : files.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-card rounded-xl border border-border/50"
        >
          <File className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">لا توجد ملفات</p>
          <p className="text-muted-foreground/60 text-sm mt-1">اضغط على "رفع ملف" لإضافة ملفاتك</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFiles).map(([date, dateFiles]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{date}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {dateFiles.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-xl border border-border/50 p-4 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                          {getFileIcon(file.file_type, file.file_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate" title={file.file_name}>
                            {file.file_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(file.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(file)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الملف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{fileToDelete?.file_name}"؟
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
