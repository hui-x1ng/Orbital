const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

class LSPManager extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.fileWatcherStarted = false;
    this.watcher = null;
    this.processedFiles = new Set();
    this.watchPath = null; // 当前监控路径
    this.pathSettingsFile = path.join(__dirname, '../data/pathSettings.json');
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('[LSPManager] Initializing...');
    
    try {
      // 加载路径设置
      await this.loadPathSettings();
      
      if (this.watchPath) {
        console.log(`[LSPManager] Using configured path: ${this.watchPath}`);
        this.startFileWatching();
      } else {
        console.log('[LSPManager] No watch path configured, waiting for user to set path');
      }
      
      this.isInitialized = true;
      console.log('[LSPManager] Initialized successfully');
    } catch (err) {
      console.error('[LSPManager] Initialization failed:', err);
      this.isInitialized = true;
    }
  }

  // 加载路径设置
  async loadPathSettings() {
    try {
      // 确保data目录存在
      const dataDir = path.dirname(this.pathSettingsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.pathSettingsFile)) {
        const data = fs.readFileSync(this.pathSettingsFile, 'utf8');
        const settings = JSON.parse(data);
        this.watchPath = settings.watchPath;
        console.log(`[LSPManager] Loaded watch path: ${this.watchPath}`);
      }
    } catch (err) {
      console.warn('[LSPManager] Failed to load path settings:', err.message);
    }
  }

  // 保存路径设置
  async savePathSettings(watchPath) {
    try {
      const settings = { watchPath };
      
      // 确保data目录存在
      const dataDir = path.dirname(this.pathSettingsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.pathSettingsFile, JSON.stringify(settings, null, 2));
      this.watchPath = watchPath;
      console.log(`[LSPManager] Saved watch path: ${watchPath}`);
      return { success: true };
    } catch (err) {
      console.error('[LSPManager] Failed to save path settings:', err);
      return { success: false, message: err.message };
    }
  }

  // 更新监控路径并重启监控
  async updateWatchPath(newPath) {
    console.log(`[LSPManager] Updating watch path to: ${newPath}`);
    
    // 停止当前监控
    this.stopFileWatching();
    
    // 保存新路径
    const result = await this.savePathSettings(newPath);
    if (!result.success) {
      return result;
    }

    // 验证路径
    if (!fs.existsSync(newPath)) {
      return { success: false, message: 'Path does not exist' };
    }

    if (!fs.statSync(newPath).isDirectory()) {
      return { success: false, message: 'Path is not a directory' };
    }

    // 重启监控
    this.startFileWatching();
    
    return { success: true, message: 'Watch path updated successfully' };
  }

  startFileWatching() {
    if (this.fileWatcherStarted || !this.watchPath) {
      console.log('[LSPManager] File watcher already started or no path configured');
      return;
    }

    try {
      const chokidar = require('chokidar');
      
      // 验证路径存在
      if (!fs.existsSync(this.watchPath)) {
        console.error(`[LSPManager] Watch path does not exist: ${this.watchPath}`);
        this.emit('error', new Error(`Watch path does not exist: ${this.watchPath}`));
        return;
      }

      // 构建监控模式
      const watchPatterns = [
        path.join(this.watchPath, '**/*.{js,ts,jsx,tsx,py}').replace(/\\/g, '/'),
        path.join(this.watchPath, '*.{js,ts,jsx,tsx,py}').replace(/\\/g, '/')
      ];
      
      console.log(`[LSPManager] Starting to watch patterns:`, watchPatterns);
      
      this.watcher = chokidar.watch(watchPatterns, {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/*.min.js',
          '**/.*'
        ],
        persistent: true,
        ignoreInitial: false,
        cwd: this.watchPath,
        depth: 10, // 允许更深的目录层级
        followSymlinks: false,
        usePolling: process.platform === 'win32', // Windows上使用轮询
        interval: 1000, // 轮询间隔
        binaryInterval: 2000,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      });

      this.setupWatcherEvents();
      this.fileWatcherStarted = true;
      
      console.log(`[LSPManager] File watching started for: ${this.watchPath}`);
      
    } catch (error) {
      console.error('[LSPManager] Failed to start file watching:', error);
      this.emit('error', error);
    }
  }

  setupWatcherEvents() {
    this.watcher.on('ready', () => {
      console.log('[LSPManager] File watcher ready');
      const watchedPaths = this.watcher.getWatched();
      console.log('[LSPManager] Watching directories:', Object.keys(watchedPaths).length);
      this.emit('watcherReady', { path: this.watchPath });
    });

    this.watcher.on('add', (filePath) => {
      const fullPath = path.resolve(this.watchPath, filePath);
      console.log(`[LSPManager] File added: ${fullPath}`);
      this.analyzeFile(fullPath);
    });

    this.watcher.on('change', (filePath) => {
      const fullPath = path.resolve(this.watchPath, filePath);
      console.log(`[LSPManager] File changed: ${fullPath}`);
      this.analyzeFile(fullPath);
    });

    this.watcher.on('unlink', (filePath) => {
      const fullPath = path.resolve(this.watchPath, filePath);
      console.log(`[LSPManager] File removed: ${fullPath}`);
      this.processedFiles.delete(fullPath);
    });

    this.watcher.on('error', (error) => {
      console.error('[LSPManager] File watcher error:', error);
      this.emit('error', error);
    });
  }

  stopFileWatching() {
    if (this.watcher) {
      console.log('[LSPManager] Stopping file watcher...');
      this.watcher.close();
      this.watcher = null;
    }
    this.fileWatcherStarted = false;
    this.processedFiles.clear();
  }

  // 检查文件是否应该被处理
  shouldProcessFile(filePath) {
    // 检查文件扩展名
    const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py'];
    const ext = path.extname(filePath);
    if (!supportedExtensions.includes(ext)) {
      return false;
    }

    // 检查文件是否存在
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      // 检查文件大小（避免处理过大文件）
      const stats = fs.statSync(filePath);
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (stats.size > maxSize) {
        console.warn(`[LSPManager] File too large, skipping: ${filePath}`);
        return false;
      }
    } catch (err) {
      console.warn(`[LSPManager] Cannot access file: ${filePath}`, err.message);
      return false;
    }

    return true;
  }

  analyzeFile(filePath) {
    try {
      // 防重复处理检查
      if (this.processedFiles.has(filePath)) {
        return;
      }

      if (!this.shouldProcessFile(filePath)) {
        return;
      }

      this.processedFiles.add(filePath);
      
      // 1秒后移除处理标记，允许再次处理
      setTimeout(() => {
        this.processedFiles.delete(filePath);
      }, 1000);

      const content = fs.readFileSync(filePath, 'utf8');
      const diagnostics = this.performSyntaxCheck(content, filePath);
      
      if (diagnostics.length > 0) {
        const diagnosticData = {
          timestamp: Date.now(),
          workspaceName: path.basename(this.watchPath || process.cwd()),
          filePath: path.resolve(filePath),
          fileName: path.basename(filePath),
          relativePath: path.relative(this.watchPath || process.cwd(), filePath),
          diagnostics: diagnostics
        };

        console.log(`[LSPManager] Found ${diagnostics.length} issues in ${diagnosticData.relativePath}`);
        this.emit('diagnostics', diagnosticData);
      } else {
        console.log(`[LSPManager] No issues found in ${path.relative(this.watchPath || process.cwd(), filePath)}`);
      }
      
    } catch (err) {
      console.error(`[LSPManager] Failed to analyze ${filePath}:`, err.message);
    }
  }

  performSyntaxCheck(content, filePath) {
    const diagnostics = [];
    const lines = content.split('\n');
    const ext = path.extname(filePath);

    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      diagnostics.push(...this.checkJavaScript(lines, content));
      diagnostics.push(...this.checkCodeQuality(lines, content, filePath));
    }

    if (ext === '.py') {
      diagnostics.push(...this.checkPython(lines, content));
      diagnostics.push(...this.checkPythonQuality(lines, content, filePath));
    }

    return diagnostics;
  }

  // 增强的JavaScript检查
  checkJavaScript(lines, content) {
    const diagnostics = [];

    lines.forEach((line, index) => {
      const lineNumber = index;
      const trimmedLine = line.trim();

      // 检查缺失分号
      if (trimmedLine.match(/^(let|const|var|return)\s+.*[^;{}\s]$/) && 
          !trimmedLine.includes('//') && 
          !trimmedLine.endsWith('{')) {
        diagnostics.push({
          message: 'Missing semicolon',
          severity: 'warning',
          line: lineNumber,
          column: line.length,
          source: 'syntax-checker',
          code: 'missing-semicolon'
        });
      }

      // 检查未闭合的括号
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens > closeParens && !line.includes('//')) {
        diagnostics.push({
          message: 'Unclosed parenthesis',
          severity: 'error',
          line: lineNumber,
          column: line.lastIndexOf('('),
          source: 'syntax-checker',
          code: 'unclosed-paren'
        });
      }

      // 检查未闭合的字符串
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      if ((singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) && !line.includes('//')) {
        diagnostics.push({
          message: 'Unclosed string literal',
          severity: 'error',
          line: lineNumber,
          column: Math.max(line.lastIndexOf('"'), line.lastIndexOf("'")),
          source: 'syntax-checker',
          code: 'unclosed-string'
        });
      }

      // 检查未使用的变量
      const varMatch = trimmedLine.match(/^(let|const|var)\s+(\w+)\s*=/);
      if (varMatch) {
        const varName = varMatch[2];
        const restOfContent = content.substring(content.indexOf(line) + line.length);
        if (!restOfContent.includes(varName) && varName !== '_') {
          diagnostics.push({
            message: `'${varName}' is declared but never used`,
            severity: 'warning',
            line: lineNumber,
            column: line.indexOf(varName),
            source: 'syntax-checker',
            code: 'unused-variable'
          });
        }
      }

      // 检查常见拼写错误
      if (trimmedLine.includes('fucntion')) {
        diagnostics.push({
          message: "Did you mean 'function'?",
          severity: 'error',
          line: lineNumber,
          column: line.indexOf('fucntion'),
          source: 'syntax-checker',
          code: 'typo'
        });
      }

      // 检查var的使用（推荐使用let/const）
      if (trimmedLine.startsWith('var ')) {
        diagnostics.push({
          message: "Use 'let' or 'const' instead of 'var'",
          severity: 'information',
          line: lineNumber,
          column: 0,
          source: 'syntax-checker',
          code: 'prefer-const-let'
        });
      }
    });

    // 检查整体括号平衡
    const totalOpenParens = (content.match(/\(/g) || []).length;
    const totalCloseParens = (content.match(/\)/g) || []).length;
    if (totalOpenParens !== totalCloseParens) {
      diagnostics.push({
        message: `Unbalanced parentheses: ${totalOpenParens} open, ${totalCloseParens} close`,
        severity: 'error',
        line: 0,
        column: 0,
        source: 'syntax-checker',
        code: 'unbalanced-parens'
      });
    }

    return diagnostics;
  }

  // 代码质量检查
  checkCodeQuality(lines, content, filePath) {
    const diagnostics = [];
    const fileName = path.basename(filePath);

    lines.forEach((line, index) => {
      const lineNumber = index;
      const trimmedLine = line.trim();

      // 检查console.log语句
      if (trimmedLine.includes('console.log')) {
        diagnostics.push({
          message: 'console.log statement (consider removing for production)',
          severity: 'information',
          line: lineNumber,
          column: line.indexOf('console.log'),
          source: 'quality-checker',
          code: 'console-log'
        });
      }

      // 检查TODO和FIXME注释
      if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME')) {
        diagnostics.push({
          message: 'TODO/FIXME comment found',
          severity: 'information',
          line: lineNumber,
          column: line.indexOf('TODO') >= 0 ? line.indexOf('TODO') : line.indexOf('FIXME'),
          source: 'quality-checker',
          code: 'todo-comment'
        });
      }

      // 检查长行
      if (line.length > 120) {
        diagnostics.push({
          message: `Line too long (${line.length} characters). Consider breaking it up.`,
          severity: 'information',
          line: lineNumber,
          column: 120,
          source: 'quality-checker',
          code: 'line-too-long'
        });
      }

      // 检查空的catch块
      if (trimmedLine.includes('catch') && lines[index + 1] && lines[index + 1].trim() === '}') {
        diagnostics.push({
          message: 'Empty catch block',
          severity: 'warning',
          line: lineNumber,
          column: 0,
          source: 'quality-checker',
          code: 'empty-catch'
        });
      }
    });

    return diagnostics;
  }

  checkPython(lines, content) {
    const diagnostics = [];

    lines.forEach((line, index) => {
      const lineNumber = index;
      const trimmedLine = line.trim();

      // 检查缩进
      if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
        const indent = line.length - line.trimLeft().length;
        if (indent % 4 !== 0 && indent > 0) {
          diagnostics.push({
            message: 'Inconsistent indentation (should be multiple of 4 spaces)',
            severity: 'warning',
            line: lineNumber,
            column: 0,
            source: 'syntax-checker',
            code: 'indentation'
          });
        }
      }

      // 检查缺失冒号
      if (trimmedLine.match(/^(if|for|while|def|class|try|except|with)\s+.*[^:]$/)) {
        diagnostics.push({
          message: 'Missing colon',
          severity: 'error',
          line: lineNumber,
          column: line.length,
          source: 'syntax-checker',
          code: 'missing-colon'
        });
      }

      // 检查未闭合的括号
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        diagnostics.push({
          message: 'Unclosed parenthesis',
          severity: 'error',
          line: lineNumber,
          column: line.lastIndexOf('('),
          source: 'syntax-checker',
          code: 'unclosed-paren'
        });
      }
    });

    return diagnostics;
  }

  checkPythonQuality(lines, content, filePath) {
    const diagnostics = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // 检查print语句
      if (trimmedLine.includes('print(')) {
        diagnostics.push({
          message: 'print() statement found (consider using logging)',
          severity: 'information',
          line: index,
          column: line.indexOf('print('),
          source: 'quality-checker',
          code: 'print-statement'
        });
      }

      // 检查长行
      if (line.length > 88) { // PEP 8 recommends 79, but 88 is more practical
        diagnostics.push({
          message: `Line too long (${line.length} characters). PEP 8 recommends max 88.`,
          severity: 'information',
          line: index,
          column: 88,
          source: 'quality-checker',
          code: 'line-too-long'
        });
      }
    });

    return diagnostics;
  }

  // 扫描指定路径
  async scanSpecificPath(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return { success: false, message: 'Path does not exist' };
    }

    if (!fs.statSync(targetPath).isDirectory()) {
      return { success: false, message: 'Path is not a directory' };
    }

    try {
      const files = this.findCodeFiles(targetPath);
      console.log(`[LSPManager] Found ${files.length} code files to analyze in ${targetPath}`);
      
      let totalIssues = 0;
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const diagnostics = this.performSyntaxCheck(content, file);
          
          if (diagnostics.length > 0) {
            totalIssues += diagnostics.length;
            const diagnosticData = {
              timestamp: Date.now(),
              workspaceName: path.basename(targetPath),
              filePath: path.resolve(file),
              fileName: path.basename(file),
              relativePath: path.relative(targetPath, file),
              diagnostics: diagnostics
            };
            
            this.emit('diagnostics', diagnosticData);
          }
        } catch (err) {
          console.warn(`[LSPManager] Failed to analyze ${file}:`, err.message);
        }
      }

      return { 
        success: true, 
        filesCount: files.length,
        totalIssues,
        message: `Scanned ${files.length} files, found ${totalIssues} issues`
      };
    } catch (err) {
      console.error('[LSPManager] Error scanning path:', err);
      return { success: false, message: err.message };
    }
  }

  // 递归查找代码文件
  findCodeFiles(dirPath, maxDepth = 10, currentDepth = 0) {
    const files = [];
    
    if (currentDepth >= maxDepth) {
      return files;
    }

    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        
        try {
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            // 跳过常见的忽略目录
            if (['node_modules', '.git', 'dist', 'build', '.vscode', '__pycache__'].includes(item)) {
              continue;
            }
            
            files.push(...this.findCodeFiles(fullPath, maxDepth, currentDepth + 1));
          } else if (stats.isFile()) {
            const ext = path.extname(fullPath);
            if (['.js', '.ts', '.jsx', '.tsx', '.py'].includes(ext)) {
              // 检查文件大小
              if (stats.size <= 5 * 1024 * 1024) { // 5MB limit
                files.push(fullPath);
              }
            }
          }
        } catch (itemErr) {
          // 跳过无法访问的文件/目录
          continue;
        }
      }
    } catch (err) {
      console.warn(`[LSPManager] Cannot read directory ${dirPath}:`, err.message);
    }

    return files;
  }

  // 获取当前状态
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      fileWatcherStarted: this.fileWatcherStarted,
      watchPath: this.watchPath,
      processedFilesCount: this.processedFiles.size
    };
  }

  // 重启监控
  async restart() {
    console.log('[LSPManager] Restarting...');
    this.stopFileWatching();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    if (this.watchPath) {
      this.startFileWatching();
    }
  }

  shutdown() {
    console.log('[LSPManager] Shutting down...');
    
    this.stopFileWatching();
    this.isInitialized = false;
    this.processedFiles.clear();
    
    console.log('[LSPManager] Shutdown complete');
  }
}

module.exports = { LSPManager };