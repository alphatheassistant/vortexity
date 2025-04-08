// Remove Node.js specific imports
// import { promises as fs } from 'fs';
// import path from 'path';
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
  
  // In browser environment, we can't use chokidar directly
  // Instead, we'll use a polling mechanism with fetch
  console.log('File watcher initialized in browser environment');
  
  // Set up a polling interval to check for file changes
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/list-files');
      if (response.ok) {
        const files = await response.json();
        // Process file changes
        fileWatcher.emit('filesUpdated', files);
      }
    } catch (error) {
      console.error('Error polling for file changes:', error);
    }
  }, 5000); // Poll every 5 seconds
  
  // Store the interval ID so we can clear it later
  return () => clearInterval(pollInterval);
}

// Get file type based on extension
export function getFileType(filePath: string): string {
  // Extract extension from path
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const mimeType = mime.lookup(filePath) || 'text/plain';
  
  // Map common extensions to language types for syntax highlighting
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'sh': 'bash',
    'sql': 'sql',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
  };
  
  return languageMap[ext] || 'plaintext';
}

// API functions that will be called from the frontend
export async function listFiles(dir: string = '.'): Promise<string[]> {
  try {
    const response = await fetch('/api/list-files');
    if (!response.ok) {
      throw new Error('Failed to list files');
    }
    return await response.json();
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

export async function readFile(filePath: string): Promise<string> {
  try {
    // Check cache first
    const cached = fileCache.get(filePath);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.content;
    }
    
    const response = await fetch(`/api/read-file?path=${encodeURIComponent(filePath)}`);
    if (!response.ok) {
      throw new Error('Failed to read file');
    }
    
    const data = await response.json();
    const content = data.content;
    
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
    const response = await fetch('/api/write-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: filePath, content }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to write file');
    }
    
    // Update cache
    fileCache.set(filePath, { content, timestamp: Date.now() });
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    const response = await fetch(`/api/delete-file?path=${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
    
    // Remove from cache
    fileCache.delete(filePath);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    throw error;
  }
}

export async function createDirectory(dirPath: string): Promise<void> {
  try {
    const response = await fetch('/api/create-directory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: dirPath }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create directory');
    }
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

// API route handlers - these will be used by the server
export async function handleListFiles(req: Request): Promise<Response> {
  // This would be implemented on the server side
  return new Response(JSON.stringify([]), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleReadFile(req: Request): Promise<Response> {
  // This would be implemented on the server side
  return new Response(JSON.stringify({ content: '', fileType: 'plaintext' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleWriteFile(req: Request): Promise<Response> {
  // This would be implemented on the server side
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleDeleteFile(req: Request): Promise<Response> {
  // This would be implemented on the server side
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleCreateDirectory(req: Request): Promise<Response> {
  // This would be implemented on the server side
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
} 
