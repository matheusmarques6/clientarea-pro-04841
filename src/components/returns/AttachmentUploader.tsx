import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileImage, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export const AttachmentUploader = ({
  files,
  onChange,
  maxFiles = 5,
  maxSizeMB = 5,
}: AttachmentUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Máximo ${maxSizeMB}MB`;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return 'Tipo de arquivo não permitido. Use JPG, PNG ou PDF';
    }

    return null;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    setError(null);

    if (files.length + fileList.length > maxFiles) {
      setError(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    const newFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validateFile(file);

      if (error) {
        setError(error);
        return;
      }

      newFiles.push(file);
    }

    onChange([...files, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileImage className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Anexos/Comprovantes</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fotos de defeitos, notas fiscais, etc. (máx {maxFiles} arquivos, {maxSizeMB}MB cada)
          </p>
        </div>
        {files.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {files.length}/{maxFiles}
          </Badge>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg transition-colors cursor-pointer',
          dragActive
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
            : 'border-border hover:border-purple-300 dark:hover:border-purple-700',
          files.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => files.length < maxFiles && inputRef.current?.click()}
      >
        <div className="p-6 text-center">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou PDF até {maxSizeMB}MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          onChange={handleChange}
          className="hidden"
          disabled={files.length >= maxFiles}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <Card key={index} className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Image Preview */}
                {file.type.startsWith('image/') && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded border border-border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
