'use client';

import React, { useState, useEffect } from 'react';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface FileCategory {
  [category: string]: FileInfo[];
}

interface FileStats {
  size: number;
  modified: string;
  created: string;
}

interface DataManagementPanelProps {
  className?: string;
}

export default function DataManagementPanel({ className = '' }: DataManagementPanelProps) {
  const [files, setFiles] = useState<FileCategory>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<any>(null);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/data-management?action=list');
      const data = await response.json();
      
      if (data.files) {
        setFiles(data.files);
        // Expand all categories by default
        setExpandedCategories(new Set(Object.keys(data.files)));
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setMessage('Error loading files');
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (filePath: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/data-management?action=read&path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      
      if (data.content) {
        setSelectedFile(filePath);
        setFileContent(data.content);
        setFileStats(data.stats);
        setMessage('');
      } else {
        setMessage(`Error loading file: ${data.error}`);
      }
    } catch (error) {
      console.error('Error loading file content:', error);
      setMessage('Error loading file content');
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile || !fileContent) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/data-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          filePath: selectedFile,
          content: fileContent
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('File saved successfully!');
        // Reload file stats
        await loadFileContent(selectedFile);
      } else {
        setMessage(`Error saving file: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setMessage('Error saving file');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredFiles = Object.entries(files).reduce((acc, [category, fileList]) => {
    const filtered = fileList.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as FileCategory);

  const renderJsonEditor = (obj: any, path: string = '') => {
    return Object.entries(obj).map(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
      const isArray = Array.isArray(value);
      
      return (
        <div key={currentPath} className="mb-2">
          {isObject ? (
            <div>
              <div className="flex items-center">
                <button
                  onClick={() => toggleJsonPath(currentPath)}
                  className="text-blue-600 hover:text-blue-800 font-medium mr-2"
                >
                  {expandedJsonPaths.has(currentPath) ? '▼' : '▶'} {key}
                </button>
                <span className="text-gray-500 text-sm">(object)</span>
              </div>
              {expandedJsonPaths.has(currentPath) && (
                <div className="ml-4 mt-2 border-l-2 border-gray-200 pl-4">
                  {renderJsonEditor(value, currentPath)}
                </div>
              )}
            </div>
          ) : isArray ? (
            <div>
              <div className="flex items-center">
                <button
                  onClick={() => toggleJsonPath(currentPath)}
                  className="text-green-600 hover:text-green-800 font-medium mr-2"
                >
                  {expandedJsonPaths.has(currentPath) ? '▼' : '▶'} {key}
                </button>
                <span className="text-gray-500 text-sm">(array, {value.length} items)</span>
              </div>
              {expandedJsonPaths.has(currentPath) && (
                <div className="ml-4 mt-2 border-l-2 border-gray-200 pl-4">
                  {value.map((item: any, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-600 text-sm">[{index}]:</span>
                      {typeof item === 'object' && item !== null ? (
                        <div className="ml-4">
                          {renderJsonEditor(item, `${currentPath}[${index}]`)}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={String(item)}
                          onChange={(e) => updateJsonValue(`${currentPath}[${index}]`, e.target.value)}
                          className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm w-64"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center">
              <label className="text-gray-700 font-medium mr-2 min-w-[120px]">{key}:</label>
              <input
                type="text"
                value={String(value)}
                onChange={(e) => updateJsonValue(currentPath, e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
        </div>
      );
    });
  };

  const [expandedJsonPaths, setExpandedJsonPaths] = useState<Set<string>>(new Set());

  const toggleJsonPath = (path: string) => {
    const newExpanded = new Set(expandedJsonPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedJsonPaths(newExpanded);
  };

  const updateJsonValue = (path: string, value: string) => {
    if (!fileContent) return;

    const keys = path.split('.');
    const arrayMatch = keys[keys.length - 1].match(/^(.+)\[(\d+)\]$/);
    
    let current: any = fileContent;
    
    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      let key = keys[i];
      
      if (key.includes('[')) {
        const match = key.match(/^(.+)\[(\d+)\]$/);
        if (match) {
          key = match[1];
          const index = parseInt(match[2]);
          current = current[key][index];
        }
      } else {
        current = current[key];
      }
    }
    
    // Update the final value
    const lastKey = keys[keys.length - 1];
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = parseInt(arrayMatch[2]);
      current[key][index] = value;
    } else {
      // Try to convert to appropriate type
      if (value === 'true' || value === 'false') {
        current[lastKey] = value === 'true';
      } else if (!isNaN(Number(value))) {
        current[lastKey] = Number(value);
      } else {
        current[lastKey] = value;
      }
    }
    
    setFileContent({ ...fileContent });
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">Data Management</h2>
        <p className="text-gray-600 mt-1">Browse and edit JSON data files</p>
      </div>

      {message && (
        <div className={`mx-6 mt-4 p-3 rounded ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="flex h-[calc(100vh-300px)]">
        {/* File Browser - Left Side */}
        <div className="w-1/4 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading files...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(filteredFiles).map(([category, fileList]) => (
                  <div key={category} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-700">{category}</span>
                      <span className="text-gray-500 text-sm">{fileList.length} files</span>
                    </button>
                    
                    {expandedCategories.has(category) && (
                      <div className="p-2 space-y-1">
                        {fileList.map((file) => (
                          <button
                            key={file.path}
                            onClick={() => loadFileContent(file.path)}
                            className={`w-full text-left p-2 rounded text-sm hover:bg-blue-50 ${
                              selectedFile === file.path ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                            }`}
                          >
                            <div className="font-medium truncate">{file.name}</div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(file.size)} • {formatDate(file.modified)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* JSON Editor - Right Side */}
        <div className="flex-1 overflow-y-auto">
          {selectedFile ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{selectedFile}</h3>
                  {fileStats && (
                    <p className="text-sm text-gray-500">
                      {formatFileSize(fileStats.size)} • Modified: {formatDate(fileStats.modified)}
                    </p>
                  )}
                </div>
                <button
                  onClick={saveFile}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {fileContent && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-y-auto max-h-[calc(100vh-400px)]">
                  {renderJsonEditor(fileContent)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 text-6xl mb-4">📁</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No file selected</h3>
                <p className="text-gray-500">Choose a file from the left panel to view and edit its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 