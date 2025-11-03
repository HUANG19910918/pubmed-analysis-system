import { 
  AIModelAdapter, 
  AIServiceManagerConfig, 
  ModelStatus, 
  AnalysisItem, 
  AnalysisOptions, 
  AnalysisResult,
  GenerationOptions,
  GenerationResult,
  ModelConfig,
  ConnectionResult
} from './types.js';

export class AIServiceManager {
  private adapters: Map<string, AIModelAdapter> = new Map();
  private modelStatuses: Map<string, ModelStatus> = new Map();
  private config: AIServiceManagerConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: AIServiceManagerConfig = {}) {
    this.config = {
      defaultModel: 'deepseek',
      fallbackModels: ['openai', 'claude', 'gemini'],
      enableCaching: true,
      cacheTimeout: 300000, // 5分钟
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * 注册AI模型适配器
   */
  registerAdapter(name: string, adapter: AIModelAdapter): void {
    this.adapters.set(name, adapter);
    this.modelStatuses.set(name, {
      name,
      isAvailable: false,
      lastChecked: new Date()
    });
  }

  /**
   * 获取所有已注册的模型
   */
  getRegisteredModels(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 获取模型状态
   */
  getModelStatus(modelName: string): ModelStatus | undefined {
    return this.modelStatuses.get(modelName);
  }

  /**
   * 设置模型状态
   */
  setModelStatus(modelName: string, status: ModelStatus): void {
    this.modelStatuses.set(modelName, status);
  }

  /**
   * 获取所有模型状态
   */
  getAllModelStatuses(): ModelStatus[] {
    return Array.from(this.modelStatuses.values());
  }

  /**
   * 测试模型连接
   */
  async testModelConnection(modelName: string, config: ModelConfig): Promise<ConnectionResult> {
    const adapter = this.adapters.get(modelName);
    if (!adapter) {
      return {
        success: false,
        error: `模型 ${modelName} 未注册`
      };
    }

    try {
      const startTime = Date.now();
      const result = await adapter.testConnection(config);
      const latency = Date.now() - startTime;

      // 更新模型状态
      this.modelStatuses.set(modelName, {
        name: modelName,
        isAvailable: result.success,
        lastChecked: new Date(),
        latency: result.success ? latency : undefined,
        error: result.error
      });

      return {
        ...result,
        latency
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      this.modelStatuses.set(modelName, {
        name: modelName,
        isAvailable: false,
        lastChecked: new Date(),
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }



  /**
   * 检查模型是否可用
   */
  private isModelAvailable(modelName: string): boolean {
    const status = this.modelStatuses.get(modelName);
    return status?.isAvailable || false;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }

  /**
   * 从缓存获取结果
   */
  private getFromCache<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < (this.config.cacheTimeout || 300000)) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  /**
   * 保存到缓存
   */
  private saveToCache<T>(key: string, data: T): void {
    if (!this.config.enableCaching) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 文本生成
   */
  async generateText(
    prompt: string, 
    options: GenerationOptions & { preferredModel?: string } = {}
  ): Promise<GenerationResult> {
    const { preferredModel, ...generationOptions } = options;
    const cacheKey = this.generateCacheKey('generateText', { prompt, options: generationOptions });
    
    // 尝试从缓存获取
    const cached = this.getFromCache<GenerationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!preferredModel) {
      throw new Error('必须指定AI模型');
    }
    
    if (!this.isModelAvailable(preferredModel)) {
      throw new Error(`指定的AI模型 ${preferredModel} 不可用`);
    }
    
    const modelName = preferredModel;

    const adapter = this.adapters.get(modelName)!;
    let lastError: Error | null = null;

    // 重试机制
    for (let attempt = 1; attempt <= (this.config.maxRetries || 3); attempt++) {
      try {
        const result = await adapter.generateText(prompt, generationOptions);
        
        // 保存到缓存
        this.saveToCache(cacheKey, result);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        
        if (attempt < (this.config.maxRetries || 3)) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay || 1000));
        }
      }
    }

    throw lastError || new Error('文本生成失败');
  }

  /**
   * 批量分析
   */
  async batchAnalyze(
    items: AnalysisItem[], 
    options: AnalysisOptions & { preferredModel?: string } = {}
  ): Promise<AnalysisResult> {
    const { preferredModel, ...analysisOptions } = options;
    const cacheKey = this.generateCacheKey('batchAnalyze', { items, options: analysisOptions });
    
    // 尝试从缓存获取
    const cached = this.getFromCache<AnalysisResult>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!preferredModel) {
      throw new Error('必须指定AI模型');
    }
    
    if (!this.isModelAvailable(preferredModel)) {
      throw new Error(`指定的AI模型 ${preferredModel} 不可用`);
    }
    
    const modelName = preferredModel;

    const adapter = this.adapters.get(modelName)!;
    let lastError: Error | null = null;

    // 重试机制
    for (let attempt = 1; attempt <= (this.config.maxRetries || 3); attempt++) {
      try {
        const result = await adapter.batchAnalyze(items, analysisOptions);
        
        // 保存到缓存
        this.saveToCache(cacheKey, result);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        
        if (attempt < (this.config.maxRetries || 3)) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay || 1000));
        }
      }
    }

    throw lastError || new Error('批量分析失败');
  }



  /**
   * 更新模型配置
   */
  updateModelConfig(modelName: string, config: ModelConfig): void {
    const adapter = this.adapters.get(modelName);
    if (adapter) {
      adapter.updateConfig(config);
    }
  }

  /**
   * 获取模型配置
   */
  getModelConfig(modelName: string): ModelConfig | null {
    const adapter = this.adapters.get(modelName);
    return adapter ? adapter.getConfig() : null;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}