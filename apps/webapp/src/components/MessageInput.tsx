import { useFileProcessor } from '@/lib/useFileProcessor';
import {
  Code,
  Eye,
  EyeOff,
  FileIcon,
  FileText,
  Image,
  Loader,
  Loader2,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MessageContent } from './MessageDisplay';
import { Button } from './ui/button';

// ========================================
// Types and Interfaces
// ========================================
interface MessageInputProps {
  onSendMessage: (message: string, files?: ProcessedFileAttachment[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

interface ProcessedFileAttachment {
  id: string;
  name: string;
  language: string;
  content: string;
  metadata: {
    size: number;
    lines: number;
    estimatedTokens: number;
    fileType: string;
  };
}

interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'loading' | 'success' | 'error';
  content?: string;
  language?: string;
  error?: string;
}

// ========================================
// File Type Detection and Icons
// ========================================
const getFileIcon = (filename: string) => {
  const ext = filename.toLowerCase().split('.').pop();

  if (['tsx', 'ts', 'jsx', 'js', 'py', 'cpp', 'c', 'java', 'rs', 'go'].includes(ext || '')) {
    return Code;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return Image;
  }
  if (['md', 'txt', 'json', 'yaml', 'xml'].includes(ext || '')) {
    return FileText;
  }
  return FileIcon;
};

const getFileLanguage = (filename: string): string => {
  const ext = `.${filename.toLowerCase().split('.').pop()}`;

  const EXTENSIONS = {
    '.tsx': 'typescript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.js': 'javascript',
    '.py': 'python',
    '.cpp': 'cpp',
    '.c': 'c',
    '.java': 'java',
    '.rs': 'rust',
    '.go': 'go',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.yaml': 'yaml',
    '.md': 'markdown',
    '.txt': 'text',
  } as const;

  return EXTENSIONS[ext as keyof typeof EXTENSIONS] || 'text';
};

const isFileSupported = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop();
  const supportedExts = [
    'tsx',
    'ts',
    'jsx',
    'js',
    'mjs',
    'cjs',
    'py',
    'cpp',
    'c',
    'java',
    'rs',
    'go',
    'html',
    'css',
    'scss',
    'json',
    'yaml',
    'yml',
    'md',
    'txt',
    'log',
    'env',
    'sql',
  ];
  return supportedExts.includes(ext || '');
};

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  className = '',
}: MessageInputProps) {
  // ========================================
  // State Management
  // ========================================
  const [message, setMessage] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // ========================================
  // Refs
  // ========================================
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // Hooks
  // ========================================
  const { processedFiles, isProcessing, processFiles, clearFiles } = useFileProcessor();

  // ========================================
  // File Processing
  // ========================================
  const readFileContent = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file, 'utf-8');
    });
  }, []);

  const processUploadedFiles = useCallback(
    async (files: File[]) => {
      const newFileItems: FileUploadItem[] = files.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        status: 'loading' as const,
      }));

      setUploadedFiles((prev) => [...prev, ...newFileItems]);

      // Process each file
      for (const fileItem of newFileItems) {
        try {
          const content = await readFileContent(fileItem.file);
          const language = getFileLanguage(fileItem.file.name);

          setUploadedFiles((prev) =>
            prev.map((item) =>
              item.id === fileItem.id ? { ...item, status: 'success', content, language } : item
            )
          );
        } catch (error) {
          console.error(`Error processing ${fileItem.file.name}:`, error);
          setUploadedFiles((prev) =>
            prev.map((item) =>
              item.id === fileItem.id
                ? {
                    ...item,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                  }
                : item
            )
          );
        }
      }
    },
    [readFileContent]
  );

  // ========================================
  // Event Handlers
  // ========================================
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const supportedFiles = fileArray.filter((file) => {
        if (!isFileSupported(file.name)) {
          toast.error(`Unsupported file type: ${file.name}`);
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          toast.error(`File too large: ${file.name} (max 5MB)`);
          return false;
        }
        return true;
      });

      if (supportedFiles.length > 0) {
        processUploadedFiles(supportedFiles);
      }
    },
    [processUploadedFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && uploadedFiles.length === 0) || disabled || isSending) return;

    setIsSending(true);
    try {
      // Process files for attachment
      const successfulFiles = uploadedFiles.filter((f) => f.status === 'success');
      const fileAttachments: ProcessedFileAttachment[] = successfulFiles.map((f) => ({
        id: f.id,
        name: f.file.name,
        language: f.language || 'text',
        content: f.content || '',
        metadata: {
          size: f.file.size,
          lines: (f.content || '').split('\n').length,
          estimatedTokens: Math.ceil((f.content || '').length / 4),
          fileType: f.file.type || 'unknown',
        },
      }));

      await onSendMessage(message.trim(), fileAttachments.length > 0 ? fileAttachments : undefined);
      setMessage('');
      setUploadedFiles([]);
      setIsPreviewMode(false);
      clearFiles();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
    // New line on Shift+Enter
    else if (e.key === 'Enter' && e.shiftKey) {
      // Let the default behavior happen (insert newline)
      return;
    }
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // ========================================
  // Effects
  // ========================================
  useEffect(() => {
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea && !isPreviewMode) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  });

  // Focus textarea when not in preview mode
  useEffect(() => {
    if (!isPreviewMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isPreviewMode]);

  // ========================================
  // Computed Values
  // ========================================
  const hasContent = message.trim().length > 0 || uploadedFiles.length > 0;
  const isMultiline = message.includes('\n');
  const hasMarkdown = /(\*\*[^*]*\*\*|\*[^*]*\*|`[^`]*`|#{1,6}\s|>\s|[-*+]\s|\d+\.\s|```)/m.test(
    message
  );

  // ========================================
  // Render Helpers
  // ========================================
  const renderFileList = () => {
    if (uploadedFiles.length === 0) return null;

    return (
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((fileItem) => {
            const IconComponent = getFileIcon(fileItem.file.name);
            return (
              <div
                key={fileItem.id}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                <IconComponent className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="truncate max-w-32">{fileItem.file.name}</span>

                {fileItem.status === 'loading' && (
                  <Loader2 className="h-3 w-3 animate-spin text-gray-500 dark:text-gray-400" />
                )}

                {fileItem.status === 'error' && (
                  <span className="text-red-600 dark:text-red-400 text-xs">Error</span>
                )}

                {fileItem.status === 'success' && (
                  <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                  onClick={() => removeFile(fileItem.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ========================================
  // Main Render
  // ========================================
  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-700 transition-colors ${
        isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      } ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {renderFileList()}

      <form onSubmit={handleSendMessage}>
        {/* Main Input Row */}
        <div className="flex items-end gap-2 p-3">
          {/* File Upload - Far Left */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            title="Attach File"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".ts,.tsx,.js,.jsx,.py,.cpp,.c,.java,.rs,.go,.html,.css,.json,.yaml,.yml,.md,.txt,.log,.sql"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {/* Message Input/Preview Area - Center */}
          <div className="flex-1">
            {isPreviewMode ? (
              <div
                className={`w-full min-h-[2.5rem] p-3 border rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${
                  isDragOver
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
              >
                <MessageContent content={message} isAI={false} enableFormatting={true} />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                placeholder={isDragOver ? 'Drop files here...' : placeholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled || isSending}
                className={`w-full min-h-[2.5rem] max-h-[200px] resize-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors ${
                  isDragOver
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
                rows={1}
              />
            )}
          </div>

          {/* Action Icons - Right Side */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Preview Toggle */}
            {message.trim() && hasMarkdown && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={togglePreview}
                className="h-8 w-8 p-0"
                title={isPreviewMode ? 'Exit Preview' : 'Preview'}
              >
                {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}

            {/* Send Button */}
            <Button
              type="submit"
              disabled={!hasContent || disabled || isSending}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Send Message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Help Text - Below the input row */}
        {message.trim() && hasMarkdown && isMultiline && !isPreviewMode && (
          <div className="px-3 pb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Press Shift+Enter for new line, Enter to send
            </div>
          </div>
        )}

        {/* Drag and Drop Indicator */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100/50 dark:bg-blue-900/30 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg flex items-center justify-center pointer-events-none z-10">
            <div className="text-center">
              <Paperclip className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Drop files to upload
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
