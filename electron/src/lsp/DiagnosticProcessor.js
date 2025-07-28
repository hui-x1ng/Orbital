const EventEmitter = require('events');

class DiagnosticProcessor extends EventEmitter {
  constructor() {
    super();
    this.diagnosticCache = new Map();
    this.severityWeights = {
      'error': 2.0,
      'warning': 0.5,
      'information': 0.1,
      'hint': 0.1
    };
    this.recentDiagnostics = [];
    this.maxHistorySize = 100;
  }

  processDiagnostics(diagnosticData) {
    const { filePath, diagnostics, timestamp } = diagnosticData;
    const currentFingerprint = this.generateDiagnosticFingerprint(diagnostics);
    const previousFingerprint = this.diagnosticCache.get(filePath);
    if (previousFingerprint === currentFingerprint) {
      console.log(`[DiagnosticProcessor] No changes in ${filePath}, skipping`);
      return null;
    }
    this.diagnosticCache.set(filePath, currentFingerprint);
    const processedData = this.enhanceDiagnosticData(diagnosticData);
    this.addToHistory(processedData);
    const impactScore = this.calculateImpactScore(processedData);
    this.emit('processedDiagnostics', {
      ...processedData,
      impactScore,
      isNew: !previousFingerprint,
      hasImproved: this.hasImproved(filePath, diagnostics)
    });
    return processedData;
  }

  generateDiagnosticFingerprint(diagnostics) {
    return JSON.stringify(diagnostics.map(d => ({
      message: d.message,
      severity: d.severity,
      line: d.line,
      column: d.column,
      code: d.code
    })).sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.column - b.column;
    }));
  }

  enhanceDiagnosticData(diagnosticData) {
    const { diagnostics } = diagnosticData;
    const stats = this.calculateDiagnosticStats(diagnostics);
    const enhancedDiagnostics = diagnostics.map(diagnostic => ({
      ...diagnostic,
      weight: this.severityWeights[diagnostic.severity] || 0.5,
      category: this.categorizeDiagnostic(diagnostic),
      priority: this.calculatePriority(diagnostic)
    }));
    return {
      ...diagnosticData,
      diagnostics: enhancedDiagnostics,
      stats,
      totalWeight: stats.totalWeight,
      dominantSeverity: stats.dominantSeverity
    };
  }

  calculateDiagnosticStats(diagnostics) {
    const stats = {
      total: diagnostics.length,
      errors: 0,
      warnings: 0,
      information: 0,
      hints: 0,
      totalWeight: 0,
      dominantSeverity: 'hint'
    };
    let maxCount = 0;
    diagnostics.forEach(diagnostic => {
      const severity = diagnostic.severity;
      const weight = this.severityWeights[severity] || 0.5;
      stats.totalWeight += weight;
      switch (severity) {
        case 'error':
          stats.errors++;
          if (stats.errors > maxCount) {
            maxCount = stats.errors;
            stats.dominantSeverity = 'error';
          }
          break;
        case 'warning':
          stats.warnings++;
          if (stats.warnings > maxCount) {
            maxCount = stats.warnings;
            stats.dominantSeverity = 'warning';
          }
          break;
        case 'information':
          stats.information++;
          if (stats.information > maxCount) {
            maxCount = stats.information;
            stats.dominantSeverity = 'information';
          }
          break;
        case 'hint':
          stats.hints++;
          if (stats.hints > maxCount) {
            maxCount = stats.hints;
            stats.dominantSeverity = 'hint';
          }
          break;
      }
    });
    return stats;
  }

  categorizeDiagnostic(diagnostic) {
    const message = diagnostic.message.toLowerCase();
    const code = diagnostic.code?.toString().toLowerCase() || '';
    if (message.includes('syntax') || message.includes('unexpected token')) {
      return 'syntax';
    }
    if (message.includes('type') || code.includes('ts')) {
      return 'type';
    }
    if (message.includes('unused') || message.includes('never read')) {
      return 'unused';
    }
    if (message.includes('semicolon') || message.includes('quotes') || message.includes('spacing')) {
      return 'style';
    }
    if (message.includes('may be') || message.includes('might') || message.includes('could')) {
      return 'potential';
    }
    return 'general';
  }

  calculatePriority(diagnostic) {
    let priority = 1;
    switch (diagnostic.severity) {
      case 'error': priority = 5; break;
      case 'warning': priority = 3; break;
      case 'information': priority = 2; break;
      case 'hint': priority = 1; break;
    }
    const category = this.categorizeDiagnostic(diagnostic);
    switch (category) {
      case 'syntax':
        priority = Math.max(priority, 5);
        break;
      case 'type':
        priority = Math.max(priority, 4);
        break;
      case 'potential':
        priority = Math.max(priority, 3);
        break;
      case 'style':
        priority = Math.min(priority, 2);
        break;
    }
    return priority;
  }

  calculateImpactScore(diagnosticData) {
    const { stats, diagnostics } = diagnosticData;
    let hpLoss = stats.totalWeight;
    const errorDensity = stats.errors / Math.max(stats.total, 1);
    if (errorDensity > 0.5) {
      hpLoss *= 1.5;
    }
    const highPriorityCount = diagnostics.filter(d => d.priority >= 4).length;
    if (highPriorityCount > 0) {
      hpLoss += highPriorityCount * 0.5;
    }
    let animationType = 'neutral';
    if (stats.errors > 0) {
      animationType = stats.errors > 3 ? 'very_annoyed' : 'annoyed';
    } else if (stats.warnings > 0) {
      animationType = stats.warnings > 5 ? 'concerned' : 'slightly_concerned';
    }
    return {
      hpLoss: Math.round(hpLoss * 10) / 10,
      animationType,
      severity: stats.dominantSeverity,
      description: this.generateImpactDescription(stats)
    };
  }

  generateImpactDescription(stats) {
    if (stats.errors > 0) {
      return `Found ${stats.errors} errors${stats.warnings > 0 ? ` and ${stats.warnings} warnings` : ''}`;
    } else if (stats.warnings > 0) {
      return `Found ${stats.warnings} warnings`;
    } else if (stats.information > 0 || stats.hints > 0) {
      return `Found ${stats.information + stats.hints} suggestions`;
    } else {
      return 'Code quality is good';
    }
  }

  hasImproved(filePath, currentDiagnostics) {
    const history = this.recentDiagnostics.filter(h => h.filePath === filePath);
    if (history.length === 0) return false;
    const lastDiagnostics = history[history.length - 1];
    const currentErrors = currentDiagnostics.filter(d => d.severity === 'error').length;
    const lastErrors = lastDiagnostics.diagnostics.filter(d => d.severity === 'error').length;
    return currentErrors < lastErrors;
  }

  addToHistory(diagnosticData) {
    this.recentDiagnostics.push({
      ...diagnosticData,
      timestamp: Date.now()
    });
    if (this.recentDiagnostics.length > this.maxHistorySize) {
      this.recentDiagnostics = this.recentDiagnostics.slice(-this.maxHistorySize);
    }
  }

  getFileHistory(filePath) {
    return this.recentDiagnostics.filter(h => h.filePath === filePath);
  }

  getOverallStats() {
    const recent = this.recentDiagnostics.slice(-20);
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalFiles = new Set();
    recent.forEach(record => {
      totalFiles.add(record.filePath);
      totalErrors += record.stats?.errors || 0;
      totalWarnings += record.stats?.warnings || 0;
    });
    return {
      recentFiles: totalFiles.size,
      averageErrorsPerFile: totalFiles.size > 0 ? totalErrors / totalFiles.size : 0,
      averageWarningsPerFile: totalFiles.size > 0 ? totalWarnings / totalFiles.size : 0,
      totalRecords: recent.length
    };
  }

  clearCache() {
    this.diagnosticCache.clear();
    this.recentDiagnostics = [];
    console.log('[DiagnosticProcessor] Cache cleared');
  }
}

module.exports = { DiagnosticProcessor };