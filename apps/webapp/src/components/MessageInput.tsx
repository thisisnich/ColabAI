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
  isMobile?: boolean;
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
  isMobile = false,
}: MessageInputProps) {
  // ========================================
  // State Management
  // ========================================
  const [message, setMessage] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(40);

  // ========================================
  // Refs
  // ========================================
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    // Only set drag over to false if we're actually leaving the container
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
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

      // Reset textarea height
      setTextareaHeight(40);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // On mobile, always allow Enter for new line, use send button
    if (isMobile) {
      return;
    }

    // Desktop: Send on Enter (without Shift)
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
    // Auto-resize textarea with mobile considerations
    const textarea = textareaRef.current;
    if (textarea && !isPreviewMode) {
      textarea.style.height = 'auto';
      const maxHeight = isMobile ? 120 : 200; // Smaller max height on mobile
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
    }
  });

  // Focus textarea when not in preview mode (but not on mobile to avoid keyboard issues)
  useEffect(() => {
    if (!isPreviewMode && textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [isPreviewMode, isMobile]);

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
      <div className="px-2 sm:px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {uploadedFiles.map((fileItem) => {
            const IconComponent = getFileIcon(fileItem.file.name);
            return (
              <div
                key={fileItem.id}
                className="flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
              >
                <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="truncate max-w-20 sm:max-w-32">{fileItem.file.name}</span>

                {fileItem.status === 'loading' && (
                  <Loader2 className="h-3 w-3 animate-spin text-gray-500 dark:text-gray-400 flex-shrink-0" />
                )}

                {fileItem.status === 'error' && (
                  <span className="text-red-600 dark:text-red-400 text-xs flex-shrink-0">
                    Error
                  </span>
                )}

                {fileItem.status === 'success' && (
                  <span className="text-green-600 dark:text-green-400 text-xs flex-shrink-0">
                    ✓
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 sm:h-4 sm:w-4 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 flex-shrink-0"
                  onClick={() => removeFile(fileItem.id)}
                >
                  <X className="h-2 w-2 sm:h-3 sm:w-3" />
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
      ref={containerRef}
      className={`relative border-t border-gray-200 dark:border-gray-700 transition-colors ${
        isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      } ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {renderFileList()}

      <form onSubmit={handleSendMessage} className="relative">
        {/* Main Input Row - Mobile Optimized */}
        <div className="flex items-end gap-1.5 sm:gap-2 p-2 sm:p-3">
          {/* File Upload - Far Left */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 sm:h-10 sm:w-10 p-0 flex-shrink-0 touch-manipulation"
            title="Attach File"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
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
          <div className="flex-1 min-w-0">
            {isPreviewMode ? (
              <div
                className={`w-full min-h-[2.5rem] sm:min-h-[3rem] p-2 sm:p-3 border rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base max-h-[120px] sm:max-h-[200px] overflow-y-auto ${
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
                className={`w-full min-h-[2.5rem] sm:min-h-[3rem] max-h-[120px] sm:max-h-[200px] resize-none border border-gray-300 dark:border-gray-600 rounded-md px-2 sm:px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm sm:text-base leading-relaxed ${
                  isDragOver
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
                rows={1}
                // Mobile-specific attributes
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck="true"
              />
            )}
          </div>

          {/* Action Icons - Right Side */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Preview Toggle - Hide on mobile if no markdown */}
            {message.trim() && hasMarkdown && (!isMobile || isMultiline) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={togglePreview}
                className="h-8 w-8 sm:h-10 sm:w-10 p-0 touch-manipulation"
                title={isPreviewMode ? 'Exit Preview' : 'Preview'}
              >
                {isPreviewMode ? (
                  <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            )}

            {/* Send Button - Larger on mobile */}
            <Button
              type="submit"
              disabled={!hasContent || disabled || isSending}
              variant={isMobile && hasContent ? 'default' : 'ghost'}
              size="sm"
              className={`${
                isMobile ? 'h-10 w-10 p-0 touch-manipulation' : 'h-8 w-8 p-0'
              } ${hasContent && isMobile ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
              title="Send Message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Help Text - Mobile friendly */}
        {message.trim() && !isMobile && hasMarkdown && isMultiline && !isPreviewMode && (
          <div className="px-3 pb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Press Shift+Enter for new line, Enter to send
            </div>
          </div>
        )}

        {/* Mobile Help Text */}
        {message.trim() && isMobile && !isPreviewMode && (
          <div className="px-2 pb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tap send button to send message
            </div>
          </div>
        )}

        {/* Drag and Drop Indicator */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100/50 dark:bg-blue-900/30 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg flex items-center justify-center pointer-events-none z-10">
            <div className="text-center">
              <Paperclip className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                Drop files to upload
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
