import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Supported file types configuration
export const FILE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: [
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp',
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
    // Archives
    'zip', 'rar', '7z', 'tar', 'gz',
    // Other
    'pkg', 'dmg', 'exe', 'apk', 'ipa',
    // Audio/Video
    'mp3', 'wav', 'mp4', 'avi', 'mov', 'mkv',
    // Code
    'html', 'css', 'js', 'ts', 'json', 'xml', 'csv'
  ],
  mimeTypes: {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
  } as Record<string, string>,
};

export interface FileMetadata {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  ownerId: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  error?: string;
}

interface UseFileUploadOptions {
  bucket: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
  saveToDatabase?: boolean;
  tableName?: string;
  teacherId?: string;
}

export const useFileUpload = (options: UseFileUploadOptions) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  // Validate file before upload
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > FILE_CONFIG.maxSize) {
      return {
        valid: false,
        error: `حجم الملف يجب أن يكون أقل من ${FILE_CONFIG.maxSize / (1024 * 1024)} ميجابايت`
      };
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!FILE_CONFIG.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${FILE_CONFIG.allowedExtensions.slice(0, 10).join(', ')}...`
      };
    }

    // Check file integrity (basic check - file must have content)
    if (file.size === 0) {
      return {
        valid: false,
        error: 'الملف فارغ'
      };
    }

    return { valid: true };
  }, []);

  // Get content type for file
  const getContentType = useCallback((file: File): string => {
    if (file.type) return file.type;
    
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return FILE_CONFIG.mimeTypes[extension] || 'application/octet-stream';
  }, []);

  // Generate unique file path
  const generateFilePath = useCallback((userId: string, fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'file';
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userId}/${uniqueId}-${sanitizedName}`;
  }, []);

  // Upload single file
  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'يرجى تسجيل الدخول أولاً' };
      }

      // Generate file path
      const filePath = generateFilePath(user.id, file.name);
      const contentType = getContentType(file);

      // Update progress
      setUploadProgress(prev => [
        ...prev.filter(p => p.fileName !== file.name),
        { fileName: file.name, progress: 30, status: 'uploading' }
      ]);

      // Upload to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        setUploadProgress(prev =>
          prev.map(p => p.fileName === file.name 
            ? { ...p, status: 'error', error: uploadError.message } 
            : p
          )
        );
        return { success: false, error: uploadError.message || 'فشل رفع الملف' };
      }

      // Update progress
      setUploadProgress(prev =>
        prev.map(p => p.fileName === file.name 
          ? { ...p, progress: 70, status: 'uploading' } 
          : p
        )
      );

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        // Rollback: delete uploaded file
        await supabase.storage.from(options.bucket).remove([filePath]);
        return { success: false, error: 'فشل الحصول على رابط الملف' };
      }

      // Save to database if required
      if (options.saveToDatabase && options.tableName === 'teacher_files' && options.teacherId) {
        const { error: dbError } = await supabase
          .from('teacher_files')
          .insert({
            teacher_id: options.teacherId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            file_type: contentType,
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          // Rollback: delete uploaded file
          await supabase.storage.from(options.bucket).remove([filePath]);
          return { success: false, error: dbError.message || 'فشل حفظ بيانات الملف' };
        }
      }

      // Update progress
      setUploadProgress(prev =>
        prev.map(p => p.fileName === file.name 
          ? { ...p, progress: 100, status: 'success' } 
          : p
        )
      );

      const result: UploadResult = {
        success: true,
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: contentType,
      };

      options.onSuccess?.(result);
      return result;

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadProgress(prev =>
        prev.map(p => p.fileName === file.name 
          ? { ...p, status: 'error', error: error.message } 
          : p
        )
      );
      const errorMessage = error.message || 'فشل رفع الملف';
      options.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options, validateFile, generateFilePath, getContentType]);

  // Upload multiple files
  const uploadFiles = useCallback(async (files: FileList | File[]): Promise<UploadResult[]> => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    
    // Initialize progress for all files
    setUploadProgress(fileArray.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending' as const
    })));

    const results: UploadResult[] = [];

    for (const file of fileArray) {
      const result = await uploadFile(file);
      results.push(result);

      if (result.success) {
        toast({
          title: 'تم الرفع بنجاح ✓',
          description: `تم رفع "${file.name}" بنجاح`
        });
      } else {
        toast({
          title: 'خطأ في الرفع',
          description: result.error || 'فشل رفع الملف',
          variant: 'destructive'
        });
      }
    }

    setIsUploading(false);
    
    // Clear progress after delay
    setTimeout(() => {
      setUploadProgress([]);
    }, 3000);

    return results;
  }, [uploadFile, toast]);

  // Clear upload progress
  const clearProgress = useCallback(() => {
    setUploadProgress([]);
  }, []);

  return {
    uploadFile,
    uploadFiles,
    isUploading,
    uploadProgress,
    clearProgress,
    validateFile,
  };
};

export default useFileUpload;
