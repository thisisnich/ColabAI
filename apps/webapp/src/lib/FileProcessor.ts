// ============================================================================
// FileProcessor.ts - File Processing Service
// ============================================================================

import { toast } from 'sonner';

// ========================================
// Types and Interfaces
// ========================================
export interface ProcessedFile {
  id: string;
  name: string;
  path?: string;
  language: string;
  content: string;
  metadata: FileMetadata;
  analysis: FileAnalysis;
  chunks: FileChunk[];
  status: 'processing' | 'completed' | 'error';
  error?: string;
  processedAt: Date;
}

export interface FileMetadata {
  size: number;
  lines: number;
  characters: number;
  encoding: string;
  hasUnicodeChars: boolean;
  estimatedTokens: number;
  fileType: FileType;
}

export interface FileAnalysis {
  // Code structure
  functions: CodeElement[];
  classes: CodeElement[];
  interfaces: CodeElement[];
  types: CodeElement[];
  constants: CodeElement[];
  imports: ImportStatement[];
  exports: ExportStatement[];

  // Content analysis
  comments: CommentBlock[];
  todos: TodoItem[];
  complexity: number; // Simple complexity score
  dependencies: string[];

  // Quality indicators
  hasTests: boolean;
  hasDocumentation: boolean;
  lintingIssues: LintingIssue[];
}

export interface FileChunk {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  type: 'header' | 'function' | 'class' | 'block' | 'comment';
  context?: string;
  estimatedTokens: number;
}

export interface CodeElement {
  name: string;
  type: string;
  line: number;
  startLine: number;
  endLine: number;
  signature?: string;
  docComment?: string;
  complexity?: number;
}

export interface ImportStatement {
  module: string;
  imports: string[];
  type: 'default' | 'named' | 'namespace' | 'side-effect';
  line: number;
}

export interface ExportStatement {
  name: string;
  type: 'default' | 'named' | 'namespace';
  line: number;
}

export interface CommentBlock {
  content: string;
  type: 'single' | 'multi' | 'doc';
  startLine: number;
  endLine: number;
}

export interface TodoItem {
  text: string;
  type: 'TODO' | 'FIXME' | 'HACK' | 'NOTE';
  line: number;
  priority: 'low' | 'medium' | 'high';
}

export interface LintingIssue {
  message: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  rule?: string;
}

export type FileType =
  | 'component'
  | 'utility'
  | 'config'
  | 'test'
  | 'style'
  | 'documentation'
  | 'data'
  | 'script'
  | 'unknown';

// ========================================
// Language-specific Patterns
// ========================================
const LANGUAGE_PATTERNS = {
  typescript: {
    functions:
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
    classes: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g,
    interfaces: /(?:export\s+)?interface\s+(\w+)/g,
    types: /(?:export\s+)?type\s+(\w+)/g,
    imports: /import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
    exports: /export\s+(?:default\s+)?(?:class|function|interface|type|const|let|var)\s+(\w+)/g,
  },
  javascript: {
    functions:
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
    classes: /(?:export\s+)?class\s+(\w+)/g,
    imports:
      /(?:import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+['"`]([^'"`]+)['"`]|const\s+\w+\s*=\s*require\(['"`]([^'"`]+)['"`]\))/g,
    exports: /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g,
  },
  python: {
    functions: /def\s+(\w+)\s*\(/g,
    classes: /class\s+(\w+)/g,
    imports: /(?:from\s+(\S+)\s+import|import\s+(\S+))/g,
  },
  c: {
    functions: /(?:static\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*{/g,
    structs: /(?:typedef\s+)?struct\s+(\w+)/g,
    includes: /#include\s*[<"]([^>"]+)[>"]/g,
  },
  cpp: {
    functions: /(?:static\s+)?(?:virtual\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*(?:const\s*)?{/g,
    classes: /class\s+(\w+)/g,
    includes: /#include\s*[<"]([^>"]+)[>"]/g,
  },
  html: {
    tags: /<(\w+)[^>]*>/g,
    scripts: /<script[^>]*>([\s\S]*?)<\/script>/g,
    styles: /<style[^>]*>([\s\S]*?)<\/style>/g,
  },
  css: {
    selectors: /([.#]?[\w-]+(?:\s*[>+~]\s*[\w-]+)*)\s*{/g,
    properties: /([\w-]+)\s*:/g,
  },
} as const;

// ========================================
// File Type Detection
// ========================================
function detectFileType(filename: string, content: string): FileType {
  const lowerName = filename.toLowerCase();

  // Test files
  if (
    lowerName.includes('test') ||
    lowerName.includes('spec') ||
    content.includes('describe(') ||
    content.includes('it(')
  ) {
    return 'test';
  }

  // Config files
  if (
    lowerName.includes('config') ||
    lowerName.includes('.json') ||
    lowerName.includes('package') ||
    lowerName.includes('tsconfig')
  ) {
    return 'config';
  }

  // Documentation
  if (lowerName.includes('.md') || lowerName.includes('readme') || lowerName.includes('doc')) {
    return 'documentation';
  }

  // Styles
  if (lowerName.includes('.css') || lowerName.includes('.scss') || lowerName.includes('.sass')) {
    return 'style';
  }

  // React components
  if ((lowerName.includes('.tsx') || lowerName.includes('.jsx')) && content.includes('return')) {
    return 'component';
  }

  // Utility functions
  if (
    content.includes('export function') ||
    content.includes('export const') ||
    content.includes('module.exports')
  ) {
    return 'utility';
  }

  // Scripts
  if (lowerName.includes('.sh') || lowerName.includes('script') || content.includes('#!/')) {
    return 'script';
  }

  return 'unknown';
}

// ========================================
// Token Estimation
// ========================================
function estimateTokens(content: string): number {
  // Rough estimation: ~4 characters per token for code
  // This is a simplified heuristic
  const words = content.split(/\s+/).length;
  const characters = content.length;
  const codeTokens = Math.ceil(characters / 4);
  const wordTokens = Math.ceil(words * 1.3); // Code has more symbols

  return Math.max(codeTokens, wordTokens);
}

// ========================================
// Content Analysis Functions
// ========================================
function analyzeImports(content: string, language: string): ImportStatement[] {
  const imports: ImportStatement[] = [];

  // Get the patterns for the specified language, if they exist
  const patterns = (LANGUAGE_PATTERNS as Record<string, { imports?: RegExp }>)[language];

  // Return empty array if no patterns or no import patterns for this language
  if (!patterns?.imports) return imports;

  const lines = content.split('\n');
  let match: RegExpExecArray | null;

  match = patterns.imports.exec(content);
  while (match !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNumber - 1] || '';

    const module = match[1] || match[2] || '';
    let type: ImportStatement['type'] = 'named';

    if (line.includes('import * as')) type = 'namespace';
    else if (line.includes('import ') && !line.includes('{')) type = 'default';
    else if (line.includes('require(')) type = 'side-effect';

    imports.push({
      module,
      imports: [], // Could be parsed more detailed
      type,
      line: lineNumber,
    });

    match = patterns.imports.exec(content);
  }

  return imports;
}
function extractFunctions(content: string, language: string): CodeElement[] {
  const functions: CodeElement[] = [];

  // Safely access the language patterns with proper typing
  const patterns = (LANGUAGE_PATTERNS as Record<string, { functions?: RegExp }>)[language];

  // Return empty array if no patterns or no function patterns for this language
  if (!patterns?.functions) return functions;

  const lines = content.split('\n');
  let match: RegExpExecArray | null;

  match = patterns.functions.exec(content);
  while (match !== null) {
    const functionName = match[1] || match[2] || '';
    const lineNumber = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNumber - 1] || '';

    functions.push({
      name: functionName,
      type: 'function',
      line: lineNumber,
      startLine: lineNumber,
      endLine: lineNumber, // Would need more sophisticated parsing for actual end
      signature: line.trim(),
    });

    match = patterns.functions.exec(content);
  }

  return functions;
}
function findTodos(content: string): TodoItem[] {
  const todos: TodoItem[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Create a new regex for each line to avoid global state issues
    const todoPattern = /(TODO|FIXME|HACK|NOTE):\s*(.+)/gi;
    let match: RegExpExecArray | null;

    match = todoPattern.exec(line);
    while (match !== null) {
      const type = match[1].toUpperCase() as TodoItem['type'];
      const text = match[2].trim();

      let priority: TodoItem['priority'] = 'medium';
      if (type === 'FIXME') priority = 'high';
      if (type === 'NOTE') priority = 'low';

      todos.push({
        text,
        type,
        line: i + 1,
        priority,
      });

      match = todoPattern.exec(line);
    }
  }

  return todos;
}
function findComments(content: string, language: string): CommentBlock[] {
  const comments: CommentBlock[] = [];
  const lines = content.split('\n');

  // Language-specific comment patterns
  let singleLinePattern: RegExp | undefined;
  let multiLineStartPattern: RegExp | undefined;
  let multiLineEndPattern: RegExp | undefined;

  switch (language) {
    case 'javascript':
    case 'typescript':
    case 'c':
    case 'cpp':
      singleLinePattern = /\/\/(.+)/;
      multiLineStartPattern = /\/\*/;
      multiLineEndPattern = /\*\//;
      break;
    case 'python':
      singleLinePattern = /#(.+)/;
      multiLineStartPattern = /"""/;
      multiLineEndPattern = /"""/;
      break;
    case 'html':
      multiLineStartPattern = /<!--/;
      multiLineEndPattern = /-->/;
      break;
    default:
      return comments;
  }

  let inMultiLineComment = false;
  let multiLineStart = 0;
  let multiLineContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Handle multi-line comments
    if (multiLineStartPattern && multiLineEndPattern) {
      if (!inMultiLineComment && multiLineStartPattern.test(line)) {
        inMultiLineComment = true;
        multiLineStart = lineNumber;
        multiLineContent = line;
      } else if (inMultiLineComment) {
        multiLineContent += `\n${line}`;
        if (multiLineEndPattern.test(line)) {
          comments.push({
            content: multiLineContent,
            type: 'multi',
            startLine: multiLineStart,
            endLine: lineNumber,
          });
          inMultiLineComment = false;
          multiLineContent = '';
        }
      }
    }

    // Handle single-line comments (only if not in multi-line comment)
    if (!inMultiLineComment && singleLinePattern) {
      const match = line.match(singleLinePattern);
      if (match) {
        comments.push({
          content: match[1].trim(),
          type: 'single',
          startLine: lineNumber,
          endLine: lineNumber,
        });
      }
    }
  }

  return comments;
}

function calculateComplexity(content: string): number {
  // Simple complexity calculation based on control structures
  const controlStructures = [
    /if\s*\(/g,
    /else\s*if\s*\(/g,
    /while\s*\(/g,
    /for\s*\(/g,
    /switch\s*\(/g,
    /catch\s*\(/g,
    /&&/g,
    /\|\|/g,
  ];

  let complexity = 1; // Base complexity

  for (const pattern of controlStructures) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

function createFileChunks(content: string, metadata: FileMetadata): FileChunk[] {
  const chunks: FileChunk[] = [];
  const lines = content.split('\n');
  const maxChunkSize = 1000; // lines per chunk

  // If file is small, return as single chunk
  if (lines.length <= maxChunkSize) {
    return [
      {
        id: 'chunk-0',
        content,
        startLine: 1,
        endLine: lines.length,
        type: 'block',
        estimatedTokens: metadata.estimatedTokens,
      },
    ];
  }

  // Split into logical chunks
  let currentChunk = '';
  let chunkStartLine = 1;
  let chunkId = 0;

  for (let i = 0; i < lines.length; i++) {
    currentChunk += `${lines[i]}\n`;

    // Create chunk at natural break points or max size
    if (
      (i + 1) % maxChunkSize === 0 ||
      i === lines.length - 1 ||
      (lines[i].trim() === '' && currentChunk.length > 500)
    ) {
      chunks.push({
        id: `chunk-${chunkId}`,
        content: currentChunk.trim(),
        startLine: chunkStartLine,
        endLine: i + 1,
        type: 'block',
        estimatedTokens: estimateTokens(currentChunk),
      });

      currentChunk = '';
      chunkStartLine = i + 2;
      chunkId++;
    }
  }

  return chunks;
}

// ========================================
// Main File Processor Class
// ========================================
export class FileProcessor {
  private static instance: FileProcessor;

  static getInstance(): FileProcessor {
    if (!FileProcessor.instance) {
      FileProcessor.instance = new FileProcessor();
    }
    return FileProcessor.instance;
  }

  async processFile(file: File, content: string, language: string): Promise<ProcessedFile> {
    const startTime = Date.now();

    try {
      // Create basic metadata
      const lines = content.split('\n');
      const metadata: FileMetadata = {
        size: file.size,
        lines: lines.length,
        characters: content.length,
        encoding: 'utf-8',
        // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
        hasUnicodeChars: /[^\x00-\x7F]/.test(content),
        estimatedTokens: estimateTokens(content),
        fileType: detectFileType(file.name, content),
      };

      // Perform content analysis
      const analysis: FileAnalysis = {
        functions: extractFunctions(content, language),
        classes: [], // Would need more sophisticated parsing
        interfaces: [],
        types: [],
        constants: [],
        imports: analyzeImports(content, language),
        exports: [],
        comments: findComments(content, language),
        todos: findTodos(content),
        complexity: calculateComplexity(content),
        dependencies: [], // Would extract from imports
        hasTests: content.includes('test') || content.includes('spec'),
        hasDocumentation: content.includes('/**') || content.includes('README'),
        lintingIssues: [], // Would need actual linter integration
      };

      // Create file chunks for large files
      const chunks = createFileChunks(content, metadata);

      const processedFile: ProcessedFile = {
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        language,
        content,
        metadata,
        analysis,
        chunks,
        status: 'completed',
        processedAt: new Date(),
      };

      const processingTime = Date.now() - startTime;
      console.log(`Processed ${file.name} in ${processingTime}ms`);

      return processedFile;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);

      return {
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        language,
        content,
        metadata: {
          size: file.size,
          lines: content.split('\n').length,
          characters: content.length,
          encoding: 'utf-8',
          hasUnicodeChars: false,
          estimatedTokens: estimateTokens(content),
          fileType: 'unknown',
        },
        analysis: {
          functions: [],
          classes: [],
          interfaces: [],
          types: [],
          constants: [],
          imports: [],
          exports: [],
          comments: [],
          todos: [],
          complexity: 1,
          dependencies: [],
          hasTests: false,
          hasDocumentation: false,
          lintingIssues: [],
        },
        chunks: [],
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown processing error',
        processedAt: new Date(),
      };
    }
  }

  async processMultipleFiles(
    files: { file: File; content: string; language: string }[]
  ): Promise<ProcessedFile[]> {
    const results: ProcessedFile[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const { file, content, language } = files[i];

      try {
        const processed = await this.processFile(file, content, language);
        results.push(processed);

        // Show progress
        toast.loading(`Processing files... ${i + 1}/${total}`, {
          id: 'file-processing',
        });
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        // Continue with other files
      }
    }

    toast.success(`Successfully processed ${results.length}/${total} files`, {
      id: 'file-processing',
    });

    return results;
  }

  // Utility methods for working with processed files
  getFilesSummary(files: ProcessedFile[]): string {
    const totalLines = files.reduce((sum, f) => sum + f.metadata.lines, 0);
    const totalTokens = files.reduce((sum, f) => sum + f.metadata.estimatedTokens, 0);
    const languages = [...new Set(files.map((f) => f.language))];
    const fileTypes = [...new Set(files.map((f) => f.metadata.fileType))];

    return `📁 ${files.length} files processed
📊 ${totalLines.toLocaleString()} lines of code
🔤 ${totalTokens.toLocaleString()} estimated tokens
💻 Languages: ${languages.join(', ')}
📄 Types: ${fileTypes.join(', ')}`;
  }

  searchInFiles(
    files: ProcessedFile[],
    query: string
  ): Array<{ file: ProcessedFile; matches: Array<{ line: number; content: string }> }> {
    const results: Array<{
      file: ProcessedFile;
      matches: Array<{ line: number; content: string }>;
    }> = [];
    const lowercaseQuery = query.toLowerCase();

    for (const file of files) {
      const matches: Array<{ line: number; content: string }> = [];
      const lines = file.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(lowercaseQuery)) {
          matches.push({
            line: i + 1,
            content: line.trim(),
          });
        }
      }

      if (matches.length > 0) {
        results.push({ file, matches });
      }
    }

    return results;
  }
}

// Export singleton instance
export const fileProcessor = FileProcessor.getInstance();
