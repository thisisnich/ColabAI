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
  '.dockerfile': 'dockerfile',
  '.dockerignore': 'text',
  '.gitignore': 'text',

  // SQL
  '.sql': 'sql',
  '.mysql': 'sql',
  '.pgsql': 'sql',

  // Special filenames (without extensions)
  dockerfile: 'dockerfile',
  makefile: 'makefile',
} as const;

function getFileLanguage(filename: string): string {
  const lowerFilename = filename.toLowerCase();

  // Check for exact filename matches first (files without extensions)
  if (lowerFilename in SUPPORTED_EXTENSIONS) {
    return SUPPORTED_EXTENSIONS[lowerFilename as keyof typeof SUPPORTED_EXTENSIONS];
  }

  // Check extensions
  const extension = `.${filename.split('.').pop()?.toLowerCase()}`;
  return SUPPORTED_EXTENSIONS[extension as keyof typeof SUPPORTED_EXTENSIONS] || 'text';
}

function isFileSupported(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();

  // Check for exact filename matches (files without extensions)
  if (lowerFilename in SUPPORTED_EXTENSIONS) {
    return true;
  }

  // Check extensions
  const extension = `.${filename.split('.').pop()?.toLowerCase()}`;
  return extension in SUPPORTED_EXTENSIONS;
}
