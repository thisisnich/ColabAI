import { AlertCircle, CheckCircle2, File, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface FileInputProps {
  onFilesSelected: (files: FileData[]) => void;
  onFilesRemoved?: (fileIds: string[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  disabled?: boolean;
  className?: string;
}

interface FileData {
  id: string;
  file: File;
  content: string;
  language: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

// Supported file extensions and their corresponding languages
const SUPPORTED_EXTENSIONS = {
  // TypeScript/JavaScript
  '.tsx': 'typescript',
  '.ts': 'typescript',
  '.jsx': 'javascript',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Web technologies
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',

  // Python
  '.py': 'python',
  '.pyx': 'python',
  '.pyi': 'python',

  // C/C++
  '.c': 'c',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.cc': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.hxx': 'cpp',

  // Other languages
  '.astro': 'astro',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.php': 'php',
  '.rb': 'ruby',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.dart': 'dart',
  '.scala': 'scala',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.fish': 'fish',

  // Config and data files
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.md': 'markdown',
  '.mdx': 'mdx',
  '.txt': 'text',
  '.log': 'text',
  '.env': 'bash',

  // Docker and CI/CD
  dockerfile: 'dockerfile',
  '.dockerfile': 'dockerfile',
  '.dockerignore': 'text',
  '.gitignore': 'text',

  // SQL
  '.sql': 'sql',
  '.mysql': 'sql',
  '.pgsql': 'sql',
} as const;

function getFileLanguage(filename: string): string {
  const lowerFilename = filename.toLowerCase();

  // Check for exact filename matches first
  if (lowerFilename === 'dockerfile' || lowerFilename === 'makefile') {
    return SUPPORTED_EXTENSIONS[lowerFilename] || 'text';
  }

  // Check extensions
  const extension = `.${filename.split('.').pop()?.toLowerCase()}`;
  return SUPPORTED_EXTENSIONS[extension as keyof typeof SUPPORTED_EXTENSIONS] || 'text';
}

function isFileSupported(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();

  // Check for exact filename matches
  if (lowerFilename === 'dockerfile' || lowerFilename === 'makefile') {
    return true;
  }

  // Check extensions
  const extension = `.${filename.split('.').pop()?.toLowerCase()}`;
  return extension in SUPPORTED_EXTENSIONS;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function FileInput({
  onFilesSelected,
  onFilesRemoved,
  maxFiles = 10,
  maxFileSize = 5, // 5MB default
  disabled = false,
  className = '',
}: FileInputProps) {
  // ========================================
  // State Management
  // ========================================
  const [files, setFiles] = useState<FileData[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // File Processing
  // ========================================
  const processFile = useCallback(
    async (file: File): Promise<FileData> => {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      const language = getFileLanguage(file.name);

      const fileData: FileData = {
        id,
        file,
        content: '',
        language,
        status: 'loading',
      };

      try {
        // Check file size
        if (file.size > maxFileSize * 1024 * 1024) {
          throw new Error(`File size exceeds ${maxFileSize}MB limit`);
        }

        // Read file content
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });

        return {
          ...fileData,
          content,
          status: 'success',
        };
      } catch (error) {
        return {
          ...fileData,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [maxFileSize]
  );

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles = Array.from(fileList);

      // Filter supported files
      const supportedFiles = newFiles.filter((file) => {
        if (!isFileSupported(file.name)) {
          console.warn(`Unsupported file type: ${file.name}`);
          return false;
        }
        return true;
      });

      if (supportedFiles.length === 0) {
        return;
      }

      // Check file count limit
      const totalFiles = files.length + supportedFiles.length;
      if (totalFiles > maxFiles) {
        console.warn(
          `Cannot add ${supportedFiles.length} files. Maximum ${maxFiles} files allowed.`
        );
        return;
      }

      // Process files
      const processedFiles = await Promise.all(supportedFiles.map((file) => processFile(file)));

      const newFileList = [...files, ...processedFiles];
      setFiles(newFileList);

      // Notify parent component
      const successfulFiles = processedFiles.filter((f) => f.status === 'success');
      if (successfulFiles.length > 0) {
        onFilesSelected(successfulFiles);
      }
    },
    [files, maxFiles, processFile, onFilesSelected]
  );

  // ========================================
  // Event Handlers
  // ========================================
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      const updatedFiles = files.filter((f) => f.id !== fileId);
      setFiles(updatedFiles);

      if (onFilesRemoved) {
        onFilesRemoved([fileId]);
      }
    },
    [files, onFilesRemoved]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ========================================
  // Computed Values
  // ========================================
  const supportedExtensions = Object.keys(SUPPORTED_EXTENSIONS).join(', ');
  const hasFiles = files.length > 0;
  const canAddMore = files.length < maxFiles;

  // ========================================
  // Render Helper Functions
  // ========================================
  const renderFileItem = (fileData: FileData) => (
    <Card key={fileData.id} className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{fileData.file.name}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {fileData.language}
              </Badge>
              <span>{formatFileSize(fileData.file.size)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {fileData.status === 'loading' && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
          {fileData.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
          {fileData.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveFile(fileData.id)}
            className="w-6 h-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {fileData.status === 'error' && fileData.error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {fileData.error}
        </div>
      )}
    </Card>
  );

  // ========================================
  // Main Render
  // ========================================
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${
            isDragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          disabled={disabled || !canAddMore}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={Object.keys(SUPPORTED_EXTENSIONS).join(',')}
        />

        <div className="text-center">
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
            </div>
            <div className="text-xs text-muted-foreground">
              Supports:{' '}
              {supportedExtensions.length > 50
                ? 'Most code files (tsx, ts, py, c, html, css, astro, txt, etc.)'
                : supportedExtensions}
            </div>
            <div className="text-xs text-muted-foreground">
              Max {maxFiles} files, {maxFileSize}MB each
            </div>
            {!canAddMore && (
              <div className="text-xs text-orange-600">
                Maximum file limit reached ({files.length}/{maxFiles})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Browse Button */}
      {canAddMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={handleBrowseClick}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
        </div>
      )}

      {/* File List */}
      {hasFiles && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Selected Files ({files.length}/{maxFiles})
            </h4>
            {files.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const fileIds = files.map((f) => f.id);
                  setFiles([]);
                  if (onFilesRemoved) {
                    onFilesRemoved(fileIds);
                  }
                }}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">{files.map(renderFileItem)}</div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
