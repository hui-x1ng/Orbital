const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

class FileWatcher extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      watchPaths: options.watchPaths || ['**/*.{js,ts,jsx,tsx,py,java,cpp,c,go,rs}'],
      ignorePaths: options.ignorePaths || [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '**/*.min.js',
        '**/.*'
      ],
      debounceDelay: options.debounceDelay || 300, 
      enableRealTimeMode: options.enableRealTimeMode || false,
      ...options
    };

    this.watcher = null;
    this.debounceTimers = new Map(); 
    this.fileStats = new Map(); 
    this.isWatching = false;
  }

  start() {
    if (this.isWatching) {
      console.log('[FileWatcher] Already watching files');
      return;
    }

    console.log('[FileWatcher] Starting file watcher...');

    this.watcher = chokidar.watch(this.options.watchPaths, {
      ignored: this.options.ignorePaths,
      persistent: true,
      ignoreInitial: false,
      followSymlinks: true,
      depth: 10,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      },
      usePolling: false, 
      interval: 100,
      binaryInterval: 300
    });

    this.setupEventHandlers();
    this.isWatching = true;

    console.log(`[FileWatcher] Watching patterns: ${this.options.watchPaths.join(', ')}`);
  }

  setupEventHandlers() {
    this.watcher.on('ready', () => {
      console.log('[FileWatcher] Initial scan complete. Ready for changes');
      this.emit('ready');
    });

    this.watcher.on('add', (filePath, stats) => {
      console.log(`[FileWatcher] File added: ${filePath}`);
      this.handleFileEvent('add', filePath, stats);
    });

    this.watcher.on('change', (filePath, stats) => {
      console.log(`[FileWatcher] File changed: ${filePath}`);
      this.handleFileEvent('change', filePath, stats);
    });

    this.watcher.on('unlink', (filePath) => {
      console.log(`[FileWatcher] File removed: ${filePath}`);
      this.handleFileEvent('unlink', filePath);
      this.cleanupFile(filePath);
    });

    this.watcher.on('addDir', (dirPath) => {
      console.log(`[FileWatcher] Directory added: ${dirPath}`);
      this.emit('dirAdd', dirPath);
    });

    this.watcher.on('unlinkDir', (dirPath) => {
      console.log(`[FileWatcher] Directory removed: ${dirPath}`);
      this.emit('dirRemove', dirPath);
    });

    this.watcher.on('error', (error) => {
      console.error('[FileWatcher] Error:', error);
      this.emit('error', error);
    });
  }

  handleFileEvent(eventType, filePath, stats) {
    const absolutePath = path.resolve(filePath);

    if (!this.shouldProcessFile(absolutePath)) {
      return;
    }

    if (stats) {
      this.fileStats.set(absolutePath, {
        size: stats.size,
        mtime: stats.mtime,
        lastProcessed: Date.now()
      });
    }

    if (this.options.debounceDelay > 0) {
      this.debounceFileEvent(eventType, absolutePath, stats);
    } else {
      this.processFileEvent(eventType, absolutePath, stats);
    }
  }

  debounceFileEvent(eventType, filePath, stats) {
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    const timer = setTimeout(() => {
      this.processFileEvent(eventType, filePath, stats);
      this.debounceTimers.delete(filePath);
    }, this.options.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  processFileEvent(eventType, filePath, stats) {
    try {
      const fileInfo = {
        path: filePath,
        absolutePath: path.resolve(filePath),
        fileName: path.basename(filePath),
        extension: path.extname(filePath),
        directory: path.dirname(filePath),
        eventType,
        timestamp: Date.now(),
        stats
      };

      if (eventType === 'change' || eventType === 'add') {
        try {
          fileInfo.content = fs.readFileSync(filePath, 'utf8');
          fileInfo.contentLength = fileInfo.content.length;
          fileInfo.lineCount = fileInfo.content.split('\n').length;
        } catch (err) {
          console.warn(`[FileWatcher] Could not read file content: ${filePath}`, err.message);
          fileInfo.content = null;
        }
      }

      this.emit('fileEvent', fileInfo);
      this.emit(eventType, fileInfo);

      const language = this.getLanguageFromExtension(fileInfo.extension);
      if (language) {
        this.emit(`${language}FileChanged`, fileInfo);
      }

    } catch (err) {
      console.error(`[FileWatcher] Error processing file event for ${filePath}:`, err);
      this.emit('error', err);
    }
  }

  shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.vue', '.svelte'];

    if (!supportedExtensions.includes(ext)) {
      return false;
    }

    try {
      const stats = fs.statSync(filePath);
      const maxSize = 5 * 1024 * 1024; 
      if (stats.size > maxSize) {
        console.warn(`[FileWatcher] File too large, skipping: ${filePath} (${stats.size} bytes)`);
        return false;
      }
    } catch (err) {
      console.warn(`[FileWatcher] Could not stat file: ${filePath}`, err.message);
      return false;
    }

    if (this.isBinaryFile(filePath)) {
      return false;
    }

    return true;
  }

  isBinaryFile(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      const chunkLength = Math.min(512, buffer.length);
      const chunk = buffer.slice(0, chunkLength);

      return chunk.indexOf(0) !== -1;
    } catch (err) {
      return false;
    }
  }

  getLanguageFromExtension(extension) {
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.vue': 'vue',
      '.svelte': 'svelte'
    };

    return languageMap[extension] || null;
  }

  getStats() {
    const stats = {
      totalFiles: this.fileStats.size,
      filesByLanguage: {},
      averageFileSize: 0,
      oldestFile: null,
      newestFile: null
    };

    let totalSize = 0;
    let oldestTime = Date.now();
    let newestTime = 0;

    for (const [filePath, fileInfo] of this.fileStats) {
      const ext = path.extname(filePath);
      const language = this.getLanguageFromExtension(ext);

      if (language) {
        stats.filesByLanguage[language] = (stats.filesByLanguage[language] || 0) + 1;
      }

      totalSize += fileInfo.size || 0;

      const mtime = fileInfo.mtime ? fileInfo.mtime.getTime() : 0;
      if (mtime < oldestTime) {
        oldestTime = mtime;
        stats.oldestFile = filePath;
      }
      if (mtime > newestTime) {
        newestTime = mtime;
        stats.newestFile = filePath;
      }
    }

    stats.averageFileSize = stats.totalFiles > 0 ? Math.round(totalSize / stats.totalFiles) : 0;

    return stats;
  }

  getFilesByLanguage(language) {
    const files = [];

    for (const filePath of this.fileStats.keys()) {
      const ext = path.extname(filePath);
      const fileLanguage = this.getLanguageFromExtension(ext);

      if (fileLanguage === language) {
        files.push(filePath);
      }
    }

    return files;
  }

  triggerFileCheck(filePath) {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      console.warn(`[FileWatcher] File does not exist: ${absolutePath}`);
      return;
    }

    try {
      const stats = fs.statSync(absolutePath);
      this.handleFileEvent('change', absolutePath, stats);
      console.log(`[FileWatcher] Manually triggered check for: ${absolutePath}`);
    } catch (err) {
      console.error(`[FileWatcher] Error manually checking file: ${absolutePath}`, err);
    }
  }

  addWatchPath(paths) {
    if (!this.watcher) {
      console.warn('[FileWatcher] Watcher not initialized');
      return;
    }

    const pathsArray = Array.isArray(paths) ? paths : [paths];

    pathsArray.forEach(watchPath => {
      this.watcher.add(watchPath);
      console.log(`[FileWatcher] Added watch path: ${watchPath}`);
    });
  }

  removeWatchPath(paths) {
    if (!this.watcher) {
      console.warn('[FileWatcher] Watcher not initialized');
      return;
    }

    const pathsArray = Array.isArray(paths) ? paths : [paths];

    pathsArray.forEach(watchPath => {
      this.watcher.unwatch(watchPath);
      console.log(`[FileWatcher] Removed watch path: ${watchPath}`);
    });
  }

  cleanupFile(filePath) {
    const absolutePath = path.resolve(filePath);

    this.fileStats.delete(absolutePath);

    if (this.debounceTimers.has(absolutePath)) {
      clearTimeout(this.debounceTimers.get(absolutePath));
      this.debounceTimers.delete(absolutePath);
    }
  }

  stop() {
    if (!this.isWatching) {
      console.log('[FileWatcher] Not currently watching');
      return;
    }

    console.log('[FileWatcher] Stopping file watcher...');

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.fileStats.clear();
    this.isWatching = false;

    console.log('[FileWatcher] File watcher stopped');
    this.emit('stopped');
  }

  restart() {
    console.log('[FileWatcher] Restarting file watcher...');
    this.stop();

    setTimeout(() => {
      this.start();
    }, 100);
  }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };

    if (this.isWatching) {
      console.log('[FileWatcher] Options updated, restarting watcher...');
      this.restart();
    }
  }
}

module.exports = { FileWatcher };