const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Documents
  listDocuments: () => ipcRenderer.invoke('doc:list'),
  readDocument: (filePath) => ipcRenderer.invoke('doc:read', filePath),
  saveDocument: (filePath, content) => ipcRenderer.invoke('doc:save', filePath, content),
  createDocument: (fileName) => ipcRenderer.invoke('doc:create', fileName),
  deleteDocument: (filePath) => ipcRenderer.invoke('doc:delete', filePath),
  selectDocumentsFolder: () => ipcRenderer.invoke('doc:selectFolder'),
  getDocumentsPath: () => ipcRenderer.invoke('doc:getPath'),

  // Version History
  getVersions: (filePath) => ipcRenderer.invoke('version:list', filePath),
  saveVersion: (filePath, label, content) => ipcRenderer.invoke('version:save', filePath, label, content),
  resetVersions: (filePath) => ipcRenderer.invoke('version:reset', filePath),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Gemini AI
  generateAI: (params) => ipcRenderer.invoke('ai:generate', params),
  chatAI: (params) => ipcRenderer.invoke('ai:chat', params),
});
