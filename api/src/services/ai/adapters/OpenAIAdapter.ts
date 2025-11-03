import OpenAI from 'openai';
import { BaseAdapter } from '../BaseAdapter.js';
import { 
  ModelConfig, 
  ModelInfo,
  ConnectionResult, 
  GenerationOptions, 
  GenerationResult 
} from '../types.js';

export class OpenAIAdapter extends BaseAdapter {
  private client: OpenAI | null = null;

  constructor(config: ModelConfig) {
    super('openai', config);
    this.initializeClient();
  }

  /**
   * 初始化OpenAI客户端
   */
  private initializeClient(): void {
    if (this.config.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl || 'https://api.openai.com/v1'
      });
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
      
      const testClient = new OpenAI({
        apiKey: testConfig.apiKey,
        baseURL: testConfig.baseUrl || 'https://api.openai.com/v1'
      });

      // 发送一个简单的测试请求
      const response = await testClient.chat.completions.create({
        model: testConfig.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello, this is a connection test.' }
        ],
        max_tokens: 10,
        temperature: 0
      });

      if (response.choices && response.choices.length > 0) {
        return {
          success: true,
          modelInfo: {
            name: testConfig.model || 'gpt-3.5-turbo',
            provider: 'OpenAI',
            version: response.model || 'unknown',
            description: `OpenAI ${testConfig.model || 'gpt-3.5-turbo'} model`,
            maxTokens: this.getMaxTokensForModel(testConfig.model || 'gpt-3.5-turbo'),
            costPer1kTokens: this.getCostPer1kTokens(testConfig.model || 'gpt-3.5-turbo'),
            supportedFeatures: ['text-generation', 'chat', 'function-calling']
          }
        };
      } else {
        return {
          success: false,
          error: 'OpenAI响应格式异常'
        };
      }
    } catch (error) {
      let errorMessage = 'OpenAI连接失败';
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = 'OpenAI API密钥无效';
        } else if (error.message.includes('429')) {
          errorMessage = 'OpenAI API请求频率超限';
        } else if (error.message.includes('500')) {
          errorMessage = 'OpenAI服务器错误';
        } else {
          errorMessage = `OpenAI连接失败: ${error.message}`;
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
    if (!this.client) {
      throw new Error('OpenAI客户端未初始化，请检查API密钥配置');
    }

    try {
      const model = this.config.model || 'gpt-3.5-turbo';
      const maxTokens = options.maxTokens || 2000;
      const temperature = options.temperature || 0.7;

      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('OpenAI响应格式异常');
      }

      const usage = response.usage;
      const cost = this.calculateCost({
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0
      });

      return {
        text: choice.message.content || '',
        usage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0
        },
        cost,
        model: response.model,
        finishReason: choice.finish_reason || 'unknown'
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI文本生成失败: ${error.message}`);
      }
      throw new Error('OpenAI文本生成失败: 未知错误');
    }
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): ModelInfo {
    const model = this.config.model || 'gpt-3.5-turbo';
    return {
      name: model,
      provider: 'OpenAI',
      version: '1.0',
      description: `OpenAI ${model} model`,
      maxTokens: this.getMaxTokensForModel(model),
      costPer1kTokens: this.getCostPer1kTokens(model),
      supportedFeatures: ['text-generation', 'chat', 'function-calling']
    };
  }

  /**
   * 获取模型最大token数
   */
  private getMaxTokensForModel(model: string): number {
    const tokenLimits: Record<string, number> = {
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000
    };
    return tokenLimits[model] || 4096;
  }

  /**
   * 获取每1k token成本
   */
  private getCostPer1kTokens(model: string): number {
    const pricing: Record<string, number> = {
      'gpt-3.5-turbo': 0.0015,
      'gpt-3.5-turbo-16k': 0.003,
      'gpt-4': 0.03,
      'gpt-4-32k': 0.06,
      'gpt-4-turbo': 0.01,
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.00015
    };
    return pricing[model] || 0.0015;
  }

  /**
   * 计算OpenAI成本
   */
  calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
    const model = this.config.model || 'gpt-3.5-turbo';
    
    // OpenAI定价 (截至2024年，实际使用时应更新为最新价格)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
      'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-4o': { prompt: 0.005, completion: 0.015 },
      'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    
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
    
    if (!config.apiKey.startsWith('sk-')) {
      throw new Error('OpenAI API密钥格式无效，应以"sk-"开头');
    }
  }
}