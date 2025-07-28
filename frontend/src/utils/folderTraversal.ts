/**
 * Folder Traversal Utility for Drag-and-Drop Folder Upload
 * 
 * Handles recursive folder structure traversal using the DataTransferItem API
 * and webkitGetAsEntry() for folder detection and file extraction.
 */

export interface FileEntry {
  file: File;
  path: string;
  relativePath: string;
  size: number;
  type: string;
}

export interface FolderEntry {
  name: string;
  path: string;
  relativePath: string;
  files: FileEntry[];
  subfolders: FolderEntry[];
  totalFiles: number;
  totalSize: number;
}

export interface FolderUploadStructure {
  rootFolder: string;
  folders: FolderEntry[];
  files: FileEntry[];
  totalFiles: number;
  totalSize: number;
  maxDepth: number;
}

/**
 * Checks if drag-and-drop contains folders
 */
export function containsFolders(dataTransfer: DataTransfer): boolean {
  if (!dataTransfer || !dataTransfer.items) return false;
  
  try {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (!item || item.kind !== 'file') continue;
      
      const entry = item.webkitGetAsEntry?.();
      if (entry && entry.isDirectory) {
        return true;
      }
    }
  } catch (error) {
    console.warn('Error checking for folders in dataTransfer:', error);
    return false;
  }
  
  return false;
}

/**
 * Traverses a directory entry recursively to extract all files and folders
 */
async function traverseDirectoryEntry(
  entry: FileSystemDirectoryEntry,
  basePath: string = '',
  depth: number = 0
): Promise<{ files: FileEntry[]; folders: FolderEntry[] }> {
  return new Promise((resolve, reject) => {
    const reader = entry.createReader();
    const files: FileEntry[] = [];
    const folders: FolderEntry[] = [];
    
    function readEntries() {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          // No more entries, resolve with collected data
          resolve({ files, folders });
          return;
        }

        try {
          // Check if entries is valid
          if (!entries || !Array.isArray(entries)) {
            reject(new Error('Invalid entries received from directory reader'));
            return;
          }

          // Process entries in batches
          for (const childEntry of entries) {
            if (!childEntry) continue;
            
            const relativePath = basePath ? `${basePath}/${childEntry.name}` : childEntry.name;
            
            if (childEntry.isFile) {
              // Handle file entry
              const fileEntry = childEntry as FileSystemFileEntry;
              try {
                const file = await new Promise<File>((resolveFile, rejectFile) => {
                  fileEntry.file(resolveFile, rejectFile);
                });
                
                files.push({
                  file,
                  path: `${entry.name}/${relativePath}`,
                  relativePath,
                  size: file.size,
                  type: file.type
                });
              } catch (fileError) {
                console.warn(`Failed to read file ${childEntry.name}:`, fileError);
                // Continue with other files instead of failing completely
              }
            } else if (childEntry.isDirectory) {
              // Handle directory entry recursively
              const dirEntry = childEntry as FileSystemDirectoryEntry;
              try {
                const { files: subFiles, folders: subFolders } = await traverseDirectoryEntry(
                  dirEntry,
                  relativePath,
                  depth + 1
                );
                
                const folderEntry: FolderEntry = {
                  name: childEntry.name,
                  path: `${entry.name}/${relativePath}`,
                  relativePath,
                  files: subFiles || [],
                  subfolders: subFolders || [],
                  totalFiles: (subFiles || []).length + (subFolders || []).reduce((acc, f) => acc + f.totalFiles, 0),
                  totalSize: (subFiles || []).reduce((acc, f) => acc + f.size, 0) + 
                            (subFolders || []).reduce((acc, f) => acc + f.totalSize, 0)
                };
                
                folders.push(folderEntry);
              } catch (dirError) {
                console.warn(`Failed to read directory ${childEntry.name}:`, dirError);
                // Continue with other directories instead of failing completely
              }
            }
          }
          
          // Continue reading more entries (Chrome limitation: max 100 entries per readEntries)
          readEntries();
        } catch (error) {
          reject(error);
        }
      }, reject);
    }
    
    readEntries();
  });
}

/**
 * Processes DataTransfer items to extract folder structure
 */
export async function processFolderDrop(dataTransfer: DataTransfer): Promise<FolderUploadStructure> {
  if (!dataTransfer || !dataTransfer.items) {
    throw new Error('DataTransfer items not supported or dataTransfer is null');
  }

  const rootFiles: FileEntry[] = [];
  const folders: FolderEntry[] = [];
  let maxDepth = 0;

  try {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      
      if (!item || item.kind !== 'file') continue;
      
      const entry = item.webkitGetAsEntry?.();
      if (!entry) {
        console.warn(`Could not get entry for item ${i}`);
        continue;
      }

      if (entry.isFile) {
        // Handle individual files at root level
        const fileEntry = entry as FileSystemFileEntry;
        try {
          const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
          });
          
          rootFiles.push({
            file,
            path: entry.name,
            relativePath: entry.name,
            size: file.size,
            type: file.type
          });
        } catch (fileError) {
          console.warn(`Failed to read root file ${entry.name}:`, fileError);
          continue;
        }
      } else if (entry.isDirectory) {
        // Handle folder
        const dirEntry = entry as FileSystemDirectoryEntry;
        try {
          const { files: folderFiles, folders: subFolders } = await traverseDirectoryEntry(dirEntry);
          
          const folderEntry: FolderEntry = {
            name: entry.name,
            path: entry.name,
            relativePath: entry.name,
            files: folderFiles || [],
            subfolders: subFolders || [],
            totalFiles: (folderFiles || []).length + (subFolders || []).reduce((acc, f) => acc + f.totalFiles, 0),
            totalSize: (folderFiles || []).reduce((acc, f) => acc + f.size, 0) + 
                      (subFolders || []).reduce((acc, f) => acc + f.totalSize, 0)
          };
          
          folders.push(folderEntry);
          
          // Calculate max depth
          const calculateDepth = (folder: FolderEntry, currentDepth: number = 1): number => {
            let depth = currentDepth;
            for (const subfolder of folder.subfolders || []) {
              depth = Math.max(depth, calculateDepth(subfolder, currentDepth + 1));
            }
            return depth;
          };
          
          maxDepth = Math.max(maxDepth, calculateDepth(folderEntry));
        } catch (dirError) {
          console.warn(`Failed to read root directory ${entry.name}:`, dirError);
          continue;
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to process folder drop: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Flatten all files for easier processing
  const allFiles: FileEntry[] = [...rootFiles];
  const flattenFiles = (folderEntry: FolderEntry) => {
    if (folderEntry.files && Array.isArray(folderEntry.files)) {
      allFiles.push(...folderEntry.files);
    }
    if (folderEntry.subfolders && Array.isArray(folderEntry.subfolders)) {
      folderEntry.subfolders.forEach(flattenFiles);
    }
  };
  if (folders && Array.isArray(folders)) {
    folders.forEach(flattenFiles);
  }

  return {
    rootFolder: folders.length === 1 ? folders[0].name : 'Multiple Items',
    folders,
    files: allFiles,
    totalFiles: allFiles.length,
    totalSize: allFiles.reduce((acc, f) => acc + f.size, 0),
    maxDepth
  };
}

/**
 * Creates a flat list of folder paths that need to be created
 */
export function getFolderCreationOrder(structure: FolderUploadStructure): string[] {
  const paths: string[] = [];
  
  const collectPaths = (folder: FolderEntry, parentPath: string = '') => {
    if (!folder || !folder.name) return;
    
    const currentPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
    paths.push(currentPath);
    
    if (folder.subfolders && Array.isArray(folder.subfolders)) {
      folder.subfolders.forEach(subfolder => {
        collectPaths(subfolder, currentPath);
      });
    }
  };
  
  if (structure && structure.folders && Array.isArray(structure.folders)) {
    structure.folders.forEach(folder => {
      collectPaths(folder);
    });
  }
  
  // Sort by depth (shortest paths first) to ensure parent folders are created before children
  return paths.sort((a, b) => {
    const aDepth = (a.match(/\//g) || []).length;
    const bDepth = (b.match(/\//g) || []).length;
    return aDepth - bDepth;
  });
}

/**
 * Validates folder structure against constraints
 */
export interface FolderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFolderStructure(
  structure: FolderUploadStructure,
  constraints: {
    maxFiles?: number;
    maxTotalSize?: number; // in bytes
    maxDepth?: number;
    maxFileSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): FolderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check total file count
  if (constraints.maxFiles && structure.totalFiles > constraints.maxFiles) {
    errors.push(`Too many files: ${structure.totalFiles} (max: ${constraints.maxFiles})`);
  }
  
  // Check total size
  if (constraints.maxTotalSize && structure.totalSize > constraints.maxTotalSize) {
    const sizeMB = Math.round(structure.totalSize / 1024 / 1024);
    const maxSizeMB = Math.round(constraints.maxTotalSize / 1024 / 1024);
    errors.push(`Total size too large: ${sizeMB}MB (max: ${maxSizeMB}MB)`);
  }
  
  // Check depth
  if (constraints.maxDepth && structure.maxDepth > constraints.maxDepth) {
    errors.push(`Folder structure too deep: ${structure.maxDepth} levels (max: ${constraints.maxDepth})`);
  }
  
  // Check individual file sizes and types
  for (const file of structure.files) {
    if (constraints.maxFileSize && file.size > constraints.maxFileSize) {
      const fileSizeMB = Math.round(file.size / 1024 / 1024);
      const maxSizeMB = Math.round(constraints.maxFileSize / 1024 / 1024);
      warnings.push(`Large file: ${file.relativePath} (${fileSizeMB}MB, max: ${maxSizeMB}MB)`);
    }
    
    if (constraints.allowedTypes && constraints.allowedTypes.length > 0) {
      const isAllowed = constraints.allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          const category = type.split('/')[0];
          return file.type.startsWith(category + '/');
        }
        return file.type === type;
      });
      
      if (!isAllowed) {
        warnings.push(`Unsupported file type: ${file.relativePath} (${file.type})`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}