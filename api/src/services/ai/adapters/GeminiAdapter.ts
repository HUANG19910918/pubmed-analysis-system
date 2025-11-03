import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { BaseAdapter } from '../BaseAdapter.js';
import { 
  ModelConfig, 
  ModelInfo,
  ConnectionResult, 
  GenerationOptions, 
  GenerationResult 
} from '../types.js';

export class GeminiAdapter extends BaseAdapter {
  private client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  constructor(config: ModelConfig) {
    super('gemini', config);
    this.initializeClient();
  }

  /**
   * 初始化Google AI客户端
   */
  private initializeClient(): void {
    if (this.config.apiKey) {
      this.client = new GoogleGenerativeAI(this.config.apiKey);
      const modelName = this.config.model || 'gemini-1.5-flash';
      this.model = this.client.getGenerativeModel({ model: modelName });
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: ModelConfig): void {
    super.updateConfig(config);
    this.initializeClient();
  }

  /**
   * 测试连接
   */
  async testConnection(config?: ModelConfig): Promise<ConnectionResult> {
    const testConfig = config || this.config;
    
    try {
      this.validateConfig(testConfig);
      
      const testClient = new GoogleGenerativeAI(testConfig.apiKey);
      const modelName = testConfig.model || 'gemini-1.5-flash';
      const testModel = testClient.getGenerativeModel({ model: modelName });

      // 发送一个简单的测试请求
      const result = await testModel.generateContent('Hello, this is a connection test.');
      const response = await result.response;
      
      if (response.text()) {
        return {
          success: true,
          modelInfo: {
            name: modelName,
            provider: 'Google',
            version: modelName,
            description: `Google ${modelName} model`,
            maxTokens: this.getMaxTokensForModel(modelName),
            costPer1kTokens: this.getCostPer1kTokens(modelName),
            supportedFeatures: ['text-generation', 'chat', 'multimodal']
          }
        };
      } else {
        return {
          success: false,
          error: 'Gemini响应格式异常'
        };
      }
    } catch (error) {
      let errorMessage = 'Gemini连接失败';
      
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          errorMessage = 'Gemini API密钥无效';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          errorMessage = 'Gemini API配额已用完';
        } else if (error.message.includes('MODEL_NOT_FOUND')) {
          errorMessage = 'Gemini模型不存在';
        } else if (error.message.includes('PERMISSION_DENIED')) {
          errorMessage = 'Gemini API权限被拒绝';
        } else {
          errorMessage = `Gemini连接失败: ${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 生成文本
   */
  async generateText(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    if (!this.client || !this.model) {
      throw new Error('Gemini客户端未初始化，请检查API密钥配置');
    }

    try {
      const temperature = options.temperature || 0.7;
      const maxTokens = options.maxTokens || 2000;

      // 配置生成参数
      const generationConfig = {
        temperature,
        topP: options.topP || 1,
        maxOutputTokens: maxTokens,
        responseMimeType: 'text/plain'
      };

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });

      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Gemini响应为空');
      }

      // Gemini API目前不直接提供token使用量信息，需要估算
      const estimatedPromptTokens = this.estimateTokens(prompt);
      const estimatedCompletionTokens = this.estimateTokens(text);
      const cost = this.calculateCost({
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens
      });

      return {
        text,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens
        },
        cost,
        model: this.config.model || 'gemini-1.5-flash',
        finishReason: response.candidates?.[0]?.finishReason || 'unknown'
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini文本生成失败: ${error.message}`);
      }
      throw new Error('Gemini文本生成失败: 未知错误');
    }
  }

  /**
   * 估算token数量（简单估算，实际可能有差异）
   */
  private estimateTokens(text: string): number {
    // 简单估算：英文约4个字符=1个token，中文约1.5个字符=1个token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): ModelInfo {
    const model = this.config.model || 'gemini-1.5-flash';
    return {
      name: model,
      provider: 'Google',
      version: '1.0',
      description: `Google ${model} model`,
      maxTokens: this.getMaxTokensForModel(model),
      costPer1kTokens: this.getCostPer1kTokens(model),
      supportedFeatures: ['text-generation', 'chat', 'multimodal']
    };
  }

  /**
   * 获取模型最大token数
   */
  private getMaxTokensForModel(model: string): number {
    const tokenLimits: Record<string, number> = {
      'gemini-1.5-flash': 1048576,
      'gemini-1.5-pro': 2097152,
      'gemini-1.0-pro': 32768
    };
    return tokenLimits[model] || 1048576;
  }

  /**
   * 获取每1k token成本
   */
  private getCostPer1kTokens(model: string): number {
    const pricing: Record<string, number> = {
      'gemini-1.5-flash': 0.000075,
      'gemini-1.5-pro': 0.00125,
      'gemini-1.0-pro': 0.0005
    };
    return pricing[model] || 0.000075;
  }

  /**
   * 计算Gemini成本
   */
  calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
    const model = this.config.model || 'gemini-1.5-flash';
    
    // Google AI定价 (截至2024年，实际使用时应更新为最新价格)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gemini-1.5-flash': { prompt: 0.000075, completion: 0.0003 },
      'gemini-1.5-pro': { prompt: 0.00125, completion: 0.005 },
      'gemini-1.0-pro': { prompt: 0.0005, completion: 0.0015 }
    };

    const modelPricing = pricing[model] || pricing['gemini-1.5-flash'];
    
    // 价格是每1000个token
    const promptCost = (usage.promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (usage.completionTokens / 1000) * modelPricing.completion;
    
    return promptCost + completionCost;
  }

  /**
   * 验证配置
   */
  protected validateConfig(config: ModelConfig): void {
    super.validateConfig(config);
    
    // Google AI API密钥通常是39个字符的字符串
    if (config.apiKey.length < 30) {
      throw new Error('Gemini API密钥格式可能无效，长度过短');
    }
  }
}