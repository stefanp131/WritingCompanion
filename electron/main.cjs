const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let mainWindow = null;

// Paths & config
const userDataPath = app.getPath('userData');
const settingsFilePath = path.join(userDataPath, 'settings.json');
const versionsDirPath = path.join(userDataPath, 'versions');

// Ensure directories exist
if (!fs.existsSync(versionsDirPath)) {
  fs.mkdirSync(versionsDirPath, { recursive: true });
}

function getSettings() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf8');
      const cleanData = data.replace(/^\uFEFF/, '');
      const settings = JSON.parse(cleanData);
      // Auto-migrate retired models to gemini-flash-latest
      if (settings.geminiModel === 'gemini-2.5-flash' || !settings.geminiModel) {
        settings.geminiModel = 'gemini-flash-latest';
        saveSettings(settings);
      }
      return settings;
    }
  } catch (err) {
    console.error('Error reading settings:', err);
  }
  // Defaults
  const defaultDocsPath = path.join(userDataPath, 'documents');
  if (!fs.existsSync(defaultDocsPath)) {
    fs.mkdirSync(defaultDocsPath, { recursive: true });
  }
  return {
    geminiApiKey: '',
    geminiModel: 'gemini-flash-latest',
    documentsFolder: defaultDocsPath,
  };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getDocumentsDir() {
  const settings = getSettings();
  let folder = settings.documentsFolder;
  if (!folder || !fs.existsSync(folder)) {
    folder = path.join(userDataPath, 'documents');
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
  return folder;
}

function getVersionFilePath(filePath) {
  const hash = Buffer.from(filePath).toString('base64url');
  return path.join(versionsDirPath, `${hash}.json`);
}

function loadVersions(filePath) {
  try {
    const vFile = getVersionFilePath(filePath);
    if (fs.existsSync(vFile)) {
      return JSON.parse(fs.readFileSync(vFile, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading versions:', err);
  }
  return [];
}

function recordVersion(filePath, label, content) {
  try {
    const vFile = getVersionFilePath(filePath);
    const versions = loadVersions(filePath);
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const newVersion = {
      id: 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      label: label || 'Checkpoint',
      content: content,
      wordCount: words,
    };
    versions.unshift(newVersion);
    // Keep up to 100 versions per document
    if (versions.length > 100) versions.pop();
    fs.writeFileSync(vFile, JSON.stringify(versions, null, 2), 'utf8');
    return { success: true, version: newVersion };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function resetVersions(filePath) {
  try {
    const vFile = getVersionFilePath(filePath);
    if (fs.existsSync(vFile)) {
      fs.unlinkSync(vFile);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function ensureWelcomeDoc(docsDir) {
  try {
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    if (files.length === 0) {
      const samplePath = path.join(docsDir, 'Welcome to AI Writing Studio.md');
      const sampleContent = `# Welcome to AI Writing Studio

Welcome to your intelligent, distraction-free desktop writing companion!

## ✨ Key Features

- **Rich Text & Markdown**: Write with intuitive formatting, shortcuts, and headings.
- **AI Writing Companion**: Powered by your own Gemini API key for smart rewrites, continuations, and feedback.
- **Parallel AI Window**: See AI proposals side-by-side with your original draft.
- **Git-style Diff Merging**: Review additions in green and deletions in red. Accept or reject changes sentence-by-sentence or in one click.
- **Time-Travel Version Restore**: Every save and accepted AI change creates a checkpoint you can revert to anytime.
- **Local Privacy**: Your documents and version history stay on your local disk.

---

### Try it now!
1. Click **Settings** in the top bar and enter your **Gemini API Key**.
2. Select text or click **Ask AI** to explore rewrites, critiques, or continuations.
3. Experience the parallel diff viewer and merge your favorite suggestions!
`;
      fs.writeFileSync(samplePath, sampleContent, 'utf8');
      recordVersion(samplePath, 'Initial template', sampleContent);
    }
  } catch (e) {
    console.error('Error creating welcome doc:', e);
  }
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    title: 'AI Writing Studio',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.removeMenu();

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup IPC handlers
app.whenReady().then(() => {
  const docsDir = getDocumentsDir();
  ensureWelcomeDoc(docsDir);

  // Document Handlers
  ipcMain.handle('doc:list', async () => {
    try {
      const folder = getDocumentsDir();
      const files = fs.readdirSync(folder).filter(f => f.endsWith('.md'));
      return files.map(file => {
        const fullPath = path.join(folder, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file.replace(/\.md$/, ''),
          fileName: file,
          path: fullPath,
          updatedAt: stats.mtime.toISOString(),
          size: stats.size,
        };
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.error('doc:list error:', err);
      return [];
    }
  });

  ipcMain.handle('doc:read', async (_, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File does not exist' };
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('doc:save', async (_, filePath, content) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('doc:create', async (_, name) => {
    try {
      const folder = getDocumentsDir();
      let sanitized = (name || 'Untitled').replace(/[\\/:*?"<>|]/g, '').trim();
      if (!sanitized) sanitized = 'Untitled';
      
      let fileName = `${sanitized}.md`;
      let fullPath = path.join(folder, fileName);
      let count = 1;
      while (fs.existsSync(fullPath)) {
        fileName = `${sanitized} (${count}).md`;
        fullPath = path.join(folder, fileName);
        count++;
      }

      const initialContent = `# ${sanitized}\n\nStart writing here...\n`;
      fs.writeFileSync(fullPath, initialContent, 'utf8');
      recordVersion(fullPath, 'Document created', initialContent);

      return {
        success: true,
        doc: {
          name: fileName.replace(/\.md$/, ''),
          fileName,
          path: fullPath,
          updatedAt: new Date().toISOString(),
        },
        content: initialContent,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('doc:delete', async (_, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('doc:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Folder for AI Writer Documents',
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const selected = result.filePaths[0];
      const settings = getSettings();
      settings.documentsFolder = selected;
      saveSettings(settings);
      ensureWelcomeDoc(selected);
      return { success: true, folder: selected };
    }
    return { success: false };
  });

  ipcMain.handle('doc:getPath', async () => {
    return getDocumentsDir();
  });

  // Version Handlers
  ipcMain.handle('version:list', async (_, filePath) => {
    return loadVersions(filePath);
  });

  ipcMain.handle('version:save', async (_, filePath, label, content) => {
    return recordVersion(filePath, label, content);
  });

  ipcMain.handle('version:reset', async (_, filePath) => {
    return resetVersions(filePath);
  });

  // Settings Handlers
  ipcMain.handle('settings:get', async () => {
    return getSettings();
  });

  ipcMain.handle('settings:save', async (_, settings) => {
    return saveSettings(settings);
  });

  // Gemini AI Handler
  ipcMain.handle('ai:generate', async (_, params) => {
    try {
      const settings = getSettings();
      const apiKey = params.apiKey || settings.geminiApiKey;
      if (!apiKey) {
        return {
          success: false,
          error: 'Gemini API key is not configured. Please open Settings and enter your API key.',
        };
      }

      let requestedModel = params.model || settings.geminiModel || 'gemini-flash-latest';
      if (requestedModel === 'gemini-2.5-flash') {
        requestedModel = 'gemini-flash-latest';
      }

      // Candidate models tried in sequence if high demand (503), rate limit (429), or 404 occurs
      const candidateModels = [
        requestedModel,
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.7-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      const genAI = new GoogleGenerativeAI(apiKey);

      const systemPrompt = `You are an elite, thoughtful writing companion and editor.
Your objective is to provide high-quality, articulate, context-aware suggestions for the user's document.
When rewriting or editing, maintain the author's intent while dramatically elevating clarity, style, tone, and flow.
IMPORTANT: Return ONLY the rewritten or completed markdown content directly. Do NOT wrap in explanatory chat commentary like 'Here is the revised version:' unless specifically requested.`;

      let promptText = '';
      if (params.mode === 'polish') {
        promptText = `${systemPrompt}\n\nTask: Polish the following text for grammar, flow, cadence, and vocabulary without changing the core meaning.\n\nText:\n"""\n${params.text}\n"""`;
      } else if (params.mode === 'expand') {
        promptText = `${systemPrompt}\n\nTask: Continue and organically expand upon the following text, developing key ideas with depth, examples, and engaging narrative.\n\nContext so far:\n"""\n${params.text}\n"""`;
      } else if (params.mode === 'concise') {
        promptText = `${systemPrompt}\n\nTask: Make the following text concise, sharp, and punchy. Eliminate filler and fluff while keeping all crucial points.\n\nText:\n"""\n${params.text}\n"""`;
      } else if (params.mode === 'tone') {
        promptText = `${systemPrompt}\n\nTask: Rewrite the following text with a ${params.tone || 'professional'} tone.\n\nText:\n"""\n${params.text}\n"""`;
      } else if (params.mode === 'critique') {
        promptText = `You are a perceptive editor. Provide a concise, constructive editorial critique of this writing piece. Highlight:
1. Strengths
2. Areas for improvement (pacing, clarity, tone)
3. 3 specific actionable recommendations.\n\nText:\n"""\n${params.text}\n"""`;
      } else {
        // Custom prompt
        promptText = `${systemPrompt}\n\nUser Instruction: ${params.instruction}\n\nContext Text:\n"""\n${params.text}\n"""`;
      }

      let lastError = null;
      for (const mName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: mName });
          const result = await model.generateContent(promptText);
          const response = await result.response;
          const text = response.text();
          if (text) {
            return { success: true, text, modelUsed: mName };
          }
        } catch (err) {
          console.warn(`Model ${mName} encountered issue:`, err.message || err);
          lastError = err;
          const msg = err.message || '';
          if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            break; // Stop immediately if key itself is invalid
          }
          // If high demand (503), rate limit (429), or 404, automatically try next candidate
          continue;
        }
      }

      let errorMsg = lastError?.message || 'Failed to generate with Gemini';
      if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) {
        errorMsg = 'Invalid Gemini API key. Please check your key in Settings.';
      }
      return { success: false, error: errorMsg };
    } catch (err) {
      console.error('Gemini error:', err);
      let errorMsg = err.message || 'Failed to generate with Gemini';
      if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) {
        errorMsg = 'Invalid Gemini API key. Please check your key in Settings.';
      }
      return { success: false, error: errorMsg };
    }
  });

  // Gemini AI Chat Handler (conversational discussion without document replacement/diff)
  ipcMain.handle('ai:chat', async (_, params) => {
    try {
      const settings = getSettings();
      const apiKey = params.apiKey || settings.geminiApiKey;
      if (!apiKey) {
        return {
          success: false,
          error: 'Gemini API key is not configured. Please open Settings and enter your API key.',
        };
      }

      let requestedModel = params.model || settings.geminiModel || 'gemini-flash-latest';
      if (requestedModel === 'gemini-2.5-flash') {
        requestedModel = 'gemini-flash-latest';
      }

      const candidateModels = [
        requestedModel,
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.7-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      const genAI = new GoogleGenerativeAI(apiKey);

      const systemInstruction = `You are a thoughtful, perceptive, and articulate AI writing partner and creative consultant.
You are conversing with an author in a dedicated writing chat.
You answer questions, brainstorm plot ideas, suggest character motivations, offer editorial critiques, explain stylistic choices, or discuss themes.
You provide clear, engaging, conversational answers formatted with clean Markdown.
You do NOT output raw diffs or machine replacement directives — this is a pure dialogue with the author.`;

      const contents = [];
      let docContextNotice = '';
      if (params.documentContext && params.documentContext.trim()) {
        docContextNotice = `[Current Document Context]:\n"""\n${params.documentContext.trim()}\n"""\n\n`;
      }

      const incomingMessages = params.messages || [];
      for (let i = 0; i < incomingMessages.length; i++) {
        const msg = incomingMessages[i];
        const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
        let text = msg.content;
        if (i === 0 && role === 'user' && docContextNotice) {
          text = `${docContextNotice}${text}`;
        }
        contents.push({
          role,
          parts: [{ text }],
        });
      }

      if (contents.length === 0) {
        return { success: false, error: 'No messages provided' };
      }

      let lastError = null;
      for (const mName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: mName,
            systemInstruction: systemInstruction,
          });
          const result = await model.generateContent({ contents });
          const response = await result.response;
          const text = response.text();
          if (text) {
            return { success: true, text, modelUsed: mName };
          }
        } catch (err) {
          console.warn(`Chat model ${mName} encountered issue:`, err.message || err);
          lastError = err;
          const msg = err.message || '';
          if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            break;
          }
          continue;
        }
      }

      let errorMsg = lastError?.message || 'Failed to chat with Gemini';
      if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) {
        errorMsg = 'Invalid Gemini API key. Please check your key in Settings.';
      }
      return { success: false, error: errorMsg };
    } catch (err) {
      console.error('Chat error:', err);
      let errorMsg = err.message || 'Chat generation failed';
      if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) {
        errorMsg = 'Invalid Gemini API key. Please check your key in Settings.';
      }
      return { success: false, error: errorMsg };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
