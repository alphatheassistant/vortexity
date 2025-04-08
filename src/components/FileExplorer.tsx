import { useState } from 'react';
import { useFileContext } from './FileContextProvider';
import { FolderIcon, FileIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react';

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: FileTreeNode[];
  isOpen: boolean;
}

export function FileExplorer() {
  const { files, currentFile, setCurrentFile, refreshFiles, createDirectory } = useFileContext();
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  
  // Convert flat file list to tree structure
  const buildFileTree = (): FileTreeNode[] => {
    const root: FileTreeNode = {
      name: 'root',
      path: '',
      type: 'directory',
      children: [],
      isOpen: true
    };
    
    files.forEach(file => {
      const parts = file.path.split('/').filter(Boolean);
      let currentNode = root;
      
      parts.forEach((part, index) => {
        const isLastPart = index === parts.length - 1;
        const pathSoFar = parts.slice(0, index + 1).join('/');
        
        if (isLastPart) {
          // This is a file
          currentNode.children.push({
            name: part,
            path: file.path,
            type: 'file',
            children: [],
            isOpen: false
          });
        } else {
          // This is a directory
          let dirNode = currentNode.children.find(
            child => child.name === part && child.type === 'directory'
          );
          
          if (!dirNode) {
            dirNode = {
              name: part,
              path: pathSoFar,
              type: 'directory',
              children: [],
              isOpen: true
            };
            currentNode.children.push(dirNode);
          }
          
          currentNode = dirNode;
        }
      });
    });
    
    return root.children;
  };
  
  const [fileTree, setFileTree] = useState<FileTreeNode[]>(buildFileTree());
  
  // Toggle directory open/closed
  const toggleDirectory = (node: FileTreeNode) => {
    const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(n => {
        if (n.path === node.path) {
          return { ...n, isOpen: !n.isOpen };
        }
        if (n.type === 'directory') {
          return { ...n, children: updateNode(n.children) };
        }
        return n;
      });
    };
    
    setFileTree(updateNode(fileTree));
  };
  
  // Handle file click
  const handleFileClick = (path: string) => {
    setCurrentFile(path);
  };
  
  // Create new folder
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createDirectory(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderInput(false);
      refreshFiles();
    }
  };
  
  // Render a file or directory node
  const renderNode = (node: FileTreeNode, level: number = 0) => {
    const isSelected = node.type === 'file' && node.path === currentFile;
    
    return (
      <div key={node.path || node.name}>
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer ${
            isSelected ? 'bg-blue-800' : ''
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
          onClick={() => node.type === 'directory' ? toggleDirectory(node) : handleFileClick(node.path)}
        >
          {node.type === 'directory' ? (
            <>
              {node.isOpen ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
              <FolderIcon size={16} className="mr-2 text-yellow-500" />
            </>
          ) : (
            <FileIcon size={16} className="mr-2 text-blue-400" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        
        {node.type === 'directory' && node.isOpen && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-gray-800 h-full overflow-y-auto">
      <div className="p-2 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Files</h2>
        <button 
          className="p-1 rounded hover:bg-gray-700"
          onClick={() => setShowNewFolderInput(!showNewFolderInput)}
        >
          <FolderIcon size={16} />
        </button>
      </div>
      
      {showNewFolderInput && (
        <div className="p-2 border-b border-gray-700">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
            className="w-full bg-gray-700 text-white rounded px-2 py-1 mb-2"
          />
          <div className="flex justify-end space-x-2">
            <button 
              className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-500"
              onClick={() => setShowNewFolderInput(false)}
            >
              Cancel
            </button>
            <button 
              className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-500"
              onClick={handleCreateFolder}
            >
              Create
            </button>
          </div>
        </div>
      )}
      
      <div className="p-2">
        {fileTree.map(node => renderNode(node))}
      </div>
    </div>
  );
} 