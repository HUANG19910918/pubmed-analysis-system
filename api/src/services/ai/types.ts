// AI服务管理器类型定义

export interface ModelInfo {
  name: string;
  provider: string;
  version: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
  supportedFeatures: string[];
}

export interface ModelConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  [key: string]: any;
}

export interface ConnectionResult {
  success: boolean;
  latency?: number;
  error?: string;
  modelInfo?: ModelInfo;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  [key: string]: any;
}

export interface GenerationResult {
  text: string;
  tokensUsed?: number;
  cost?: number;
  model?: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: any;
}

export interface AnalysisItem {
  id: string;
  title: string;
  abstract: string;
  authors?: string | string[];
  journal?: string;
  year?: string;
  publicationDate?: string;
  doi?: string;
  [key: string]: any;
}

export interface AnalysisOptions {
  analysisType?: 'summary' | 'trends' | 'keywords' | 'research_suggestions';
  language?: 'zh' | 'en';
  depth?: 'basic' | 'detailed' | 'comprehensive';
  includeVisualization?: boolean;
  customPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AnalysisResult {
  modelName?: string;
  summary: string;
  keyFindings: string[];
  trends?: {
    topic: string;
    frequency: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  keywords?: {
    word: string;
    frequency: number;
    relevance: number;
  }[];
  researchSuggestions: string[];
  analyses?: any[];
  visualizationData?: any;
  tokensUsed?: number;
  cost?: number;
  processingTime: number;
  usage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
}

export interface AIModelAdapter {
  // 模型信息
  getModelInfo(): ModelInfo;
  
  // 连接测试
  testConnection(config: ModelConfig): Promise<ConnectionResult>;
  
  // 文本生成
  generateText(prompt: string, options: GenerationOptions): Promise<GenerationResult>;
  
  // 批量分析
  batchAnalyze(items: AnalysisItem[], options: AnalysisOptions): Promise<AnalysisResult>;
  
  // 成本计算
  calculateCost(usage: { promptTokens: number; completionTokens: number } | number, modelVersion?: string): number;
  
  // 更新配置
  updateConfig(config: ModelConfig): void;
  
  // 获取当前配置
  getConfig(): ModelConfig;
}

export interface AIServiceManagerConfig {
  defaultModel?: string;
  fallbackModels?: string[];
  enableCaching?: boolean;
  cacheTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ModelStatus {
  name: string;
  isAvailable: boolean;
  lastChecked: Date;
  latency?: number;
  error?: string;
}