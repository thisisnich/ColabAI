// ============================================================================
// useFileProcessor.ts - React Hook for File Processing
// ============================================================================

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { type ProcessedFile, fileProcessor } from './FileProcessor';

interface FileData {
  id: string;
  file: File;
  content: string;
  language: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

// Type for backend file attachment (matching the Convex schema)
interface FileAttachment {
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

interface UseFileProcessorReturn {
  processedFiles: ProcessedFile[];
  isProcessing: boolean;
  processFiles: (files: FileData[]) => Promise<ProcessedFile[]>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  getFilesSummary: () => string;
  searchInFiles: (
    query: string
  ) => Array<{ file: ProcessedFile; matches: Array<{ line: number; content: string }> }>;
  exportFilesData: () => string;
  getContextForChat: (options?: { includeComments?: boolean; includeMetadata?: boolean }) => string;
  // New methods for backend integration
  getFilesForMessage: () => FileAttachment[];
  hasFiles: () => boolean;
  clearFilesAfterSend: () => void;
}

export function useFileProcessor(): UseFileProcessorReturn {
  // ========================================
  // State Management
  // ========================================
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // ========================================
  // File Processing
  // ========================================
  const processFiles = useCallback(async (files: FileData[]): Promise<ProcessedFile[]> => {
    if (files.length === 0) return [];

    setIsProcessing(true);

    try {
      // Filter successful files
      const successfulFiles = files.filter((f) => f.status === 'success');

      if (successfulFiles.length === 0) {
        toast.error('No valid files to process');
        return [];
      }

      // Prepare files for processing
      const filesToProcess = successfulFiles.map((f) => ({
        file: f.file,
        content: f.content,
        language: f.language,
      }));

      // Process files
      const results = await fileProcessor.processMultipleFiles(filesToProcess);

      // Update state
      setProcessedFiles((prev) => {
        // Remove duplicates by name
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = results.filter((f) => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });

      // Show success message
      const successCount = results.filter((f) => f.status === 'completed').length;
      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} file${successCount > 1 ? 's' : ''}`);
      }

      return results;
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Failed to process files');
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ========================================
  // File Management
  // ========================================
  const removeFile = useCallback((fileId: string) => {
    setProcessedFiles((prev) => prev.filter((f) => f.id !== fileId));
    toast.info('File removed from processing queue');
  }, []);

  const clearFiles = useCallback(() => {
    setProcessedFiles([]);
    toast.info('All files cleared');
  }, []);

  // New method to clear files after sending (without toast notification)
  const clearFilesAfterSend = useCallback(() => {
    setProcessedFiles([]);
  }, []);

  // ========================================
  // Backend Integration Methods
  // ========================================
  const getFilesForMessage = useCallback((): FileAttachment[] => {
    return processedFiles
      .filter((file) => file.status === 'completed')
      .map((file) => ({
        id: file.id,
        name: file.name,
        language: file.language,
        content: file.content,
        metadata: {
          size: file.metadata.size,
          lines: file.metadata.lines,
          estimatedTokens: file.metadata.estimatedTokens,
          fileType: file.metadata.fileType,
        },
      }));
  }, [processedFiles]);

  const hasFiles = useCallback((): boolean => {
    return processedFiles.some((file) => file.status === 'completed');
  }, [processedFiles]);

  // ========================================
  // Utility Functions
  // ========================================
  const getFilesSummary = useCallback((): string => {
    if (processedFiles.length === 0) return 'No files processed yet';
    return fileProcessor.getFilesSummary(processedFiles);
  }, [processedFiles]);

  const searchInFiles = useCallback(
    (query: string) => {
      return fileProcessor.searchInFiles(processedFiles, query);
    },
    [processedFiles]
  );

  const exportFilesData = useCallback((): string => {
    if (processedFiles.length === 0) return '';

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalFiles: processedFiles.length,
      files: processedFiles.map((file) => ({
        name: file.name,
        language: file.language,
        metadata: file.metadata,
        analysis: {
          functions: file.analysis.functions.length,
          classes: file.analysis.classes.length,
          imports: file.analysis.imports.length,
          todos: file.analysis.todos.length,
          complexity: file.analysis.complexity,
          hasTests: file.analysis.hasTests,
          hasDocumentation: file.analysis.hasDocumentation,
        },
        chunks: file.chunks.length,
        status: file.status,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }, [processedFiles]);

  const getContextForChat = useCallback(
    (options: { includeComments?: boolean; includeMetadata?: boolean } = {}): string => {
      const { includeComments = false, includeMetadata = true } = options;

      if (processedFiles.length === 0) return '';

      let context = '# Uploaded Files Context\n\n';

      // Add summary
      if (includeMetadata) {
        context += '## Files Summary\n';
        context += `${getFilesSummary()}\n\n`;
      }

      // Add individual file contents
      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];

        context += `## File ${i + 1}: ${file.name}\n`;
        context += `**Language:** ${file.language}\n`;
        context += `**Type:** ${file.metadata.fileType}\n`;

        if (includeMetadata) {
          context += `**Lines:** ${file.metadata.lines}\n`;
          context += `**Estimated Tokens:** ${file.metadata.estimatedTokens}\n`;

          if (file.analysis.functions.length > 0) {
            context += `**Functions:** ${file.analysis.functions.map((f) => f.name).join(', ')}\n`;
          }

          if (file.analysis.imports.length > 0) {
            context += `**Dependencies:** ${file.analysis.imports.map((i) => i.module).join(', ')}\n`;
          }

          if (file.analysis.todos.length > 0) {
            context += `**TODOs:** ${file.analysis.todos.length}\n`;
          }
        }

        context += '\n### Content:\n';
        context += `\`\`\`${file.language}\n`;
        context += file.content;
        context += '\n```\n\n';

        // Add comments if requested
        if (includeComments && file.analysis.comments.length > 0) {
          context += '### Comments:\n';
          for (const comment of file.analysis.comments) {
            context += `- Line ${comment.startLine}: ${comment.content}\n`;
          }
          context += '\n';
        }

        // Add TODOs if any
        if (file.analysis.todos.length > 0) {
          context += '### TODOs:\n';
          for (const todo of file.analysis.todos) {
            context += `- Line ${todo.line} [${todo.type}]: ${todo.text}\n`;
          }
          context += '\n';
        }

        context += '---\n\n';
      }

      return context;
    },
    [processedFiles, getFilesSummary]
  );

  // ========================================
  // Return Hook Interface
  // ========================================
  return {
    processedFiles,
    isProcessing,
    processFiles,
    removeFile,
    clearFiles,
    getFilesSummary,
    searchInFiles,
    exportFilesData,
    getContextForChat,
    // New methods for backend integration
    getFilesForMessage,
    hasFiles,
    clearFilesAfterSend,
  };
}
