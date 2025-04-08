import { promises as fs } from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import mime from 'mime-types';
import EventEmitter from 'events';

// Cache for file contents
const fileCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Event emitter for file changes
export const fileWatcher = new EventEmitter();
let watcher: chokidar.FSWatcher | null = null;

// Initialize file watcher
export function initFileWatcher(dir: string = '.') {
  if (watcher) {
    watcher.close();
  }
  
  watcher = chokidar.watch(dir, {
    ignored: /(^|[\/\\])\..|node_modules|\.git/,
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('add', path => {
    fileWatcher.emit('fileAdded', path);
    fileCache.delete(path);
  });
  
  watcher.on('change', path => {
    fileWatcher.emit('fileChanged', path);
    fileCache.delete(path);
  });
  
  watcher.on('unlink', path => {
    fileWatcher.emit('fileRemoved', path);
    fileCache.delete(path);
  });
}

// Get file type based on extension
export function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mime.lookup(filePath) || 'text/plain';
  
  // Map common extensions to language types for syntax highlighting
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.json': 'json',
    '.md': 'markdown',
    '.py': 'python',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.sh': 'bash',
    '.sql': 'sql',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
  };
  
  return languageMap[ext] || 'plaintext';
}

export async function listFiles(dir: string = '.'): Promise<string[]> {
  const files: string[] = [];
  
  async function traverse(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        await traverse(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}

export async function readFile(filePath: string): Promise<string> {
  try {
    // Check cache first
    const cached = fileCache.get(filePath);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.content;
    }
    
    // Check file size before reading
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File ${filePath} is too large (${stats.size} bytes). Maximum size is ${MAX_FILE_SIZE} bytes.`);
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Update cache
    fileCache.set(filePath, { content, timestamp: now });
    
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    fileCache.set(filePath, { content, timestamp: Date.now() });
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    fileCache.delete(filePath);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    throw error;
  }
}

export async function createDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

// API route handlers
export async function handleListFiles(req: Request): Promise<Response> {
  try {
    const files = await listFiles();
    return new Response(JSON.stringify(files), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to list files' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleReadFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'File path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const content = await readFile(filePath);
    const fileType = getFileType(filePath);
    
    return new Response(JSON.stringify({ content, fileType }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to read file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleWriteFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'File path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { content } = await req.json();
    
    if (typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Content must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await writeFile(filePath, content);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to write file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleDeleteFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'File path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await deleteFile(filePath);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleCreateDirectory(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const dirPath = url.searchParams.get('path');
    
    if (!dirPath) {
      return new Response(JSON.stringify({ error: 'Directory path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await createDirectory(dirPath);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create directory' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 
