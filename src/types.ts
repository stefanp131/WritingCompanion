export interface DocumentItem {
  name: string;
  fileName: string;
  path: string;
  updatedAt: string;
  size?: number;
}

export interface VersionItem {
  id: string;
  timestamp: string;
  label: string;
  content: string;
  wordCount: number;
}

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  documentsFolder: string;
}

export type DiffChunkType = 'equal' | 'added' | 'removed' | 'modified';
export type ChunkStatus = 'pending' | 'accepted' | 'rejected';

export interface DiffChunk {
  id: string;
  type: DiffChunkType;
  originalText: string;
  suggestedText: string;
  status: ChunkStatus;
}

export type ParagraphDiffType = 'equal' | 'added' | 'removed' | 'modified';
export type ParagraphStatus = 'pending' | 'accepted' | 'rejected';

export interface ParagraphDiffItem {
  id: string;
  type: ParagraphDiffType;
  originalParagraphNumber?: number;
  suggestedParagraphNumber?: number;
  originalContent: string;
  suggestedContent: string;
  status: ParagraphStatus;
}

export type LineDiffType = 'equal' | 'added' | 'removed' | 'modified';
export type LineStatus = 'pending' | 'accepted' | 'rejected';

export interface LineDiffItem {
  id: string;
  type: LineDiffType;
  content: string;
  originalLineNumber?: number;
  suggestedLineNumber?: number;
  status: LineStatus;
  separator?: string;
  paragraphStart?: boolean;
}

export interface ElectronAPI {
  listDocuments: () => Promise<DocumentItem[]>;
  readDocument: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  saveDocument: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  createDocument: (fileName: string) => Promise<{ success: boolean; doc?: DocumentItem; content?: string; error?: string }>;
  deleteDocument: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  selectDocumentsFolder: () => Promise<{ success: boolean; folder?: string }>;
  getDocumentsPath: () => Promise<string>;
  getVersions: (filePath: string) => Promise<VersionItem[]>;
  saveVersion: (filePath: string, label: string, content: string) => Promise<{ success: boolean; version?: VersionItem; error?: string }>;
  resetVersions: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>;
  generateAI: (params: {
    prompt?: string;
    text: string;
    mode: 'polish' | 'expand' | 'concise' | 'tone' | 'critique' | 'custom';
    tone?: string;
    instruction?: string;
    apiKey?: string;
    model?: string;
  }) => Promise<{ success: boolean; text?: string; error?: string }>;
  chatAI: (params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    documentContext?: string;
    apiKey?: string;
    model?: string;
  }) => Promise<{ success: boolean; text?: string; error?: string }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
