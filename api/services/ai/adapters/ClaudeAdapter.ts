import Anthropic from '@anthropic-ai/sdk';
import { BaseAdapter } from '../BaseAdapter.js';
import { 
  ModelConfig, 
  ConnectionResult, 
  GenerationOptions, 
  GenerationResult 
} from '../types.js';

export class ClaudeAdapter extends BaseAdapter {
  private client: Anthropic | null = null;

  constructor(config: ModelConfig) {
    super('claude', config);
    this.initializeClient();
  }

  /**
   * 初始化Anthropic客户端
   */
  private initializeClient(): void {
    if (this.config.apiKey) {
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl
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
      
      const testClient = new Anthropic({
        apiKey: testConfig.apiKey,
        baseURL: testConfig.baseUrl
      });

      // 发送一个简单的测试请求
      const response = await testClient.messages.create({
        model: testConfig.model || 'claude-3-haiku-20240307',
        max_tokens: 10,
        temperature: 0,
        messages: [
          { role: 'user', content: 'Hello, this is a connection test.' }
        ]
      });

      if (response.content && response.content.length > 0) {
        return {
          success: true,
          message: 'Claude连接成功',
          modelInfo: {
            name: 'Claude',
            model: testConfig.model || 'claude-3-haiku-20240307',
            version: response.model || 'unknown',
            provider: 'Anthropic'
          }
        };
      } else {
        return {
          success: false,
          error: 'Claude响应格式异常'
        };
      }
    } catch (error) {
      let errorMessage = 'Claude连接失败';
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = 'Claude API密钥无效';
        } else if (error.message.includes('429')) {
          errorMessage = 'Claude API请求频率超限';
        } else if (error.message.includes('500')) {
          errorMessage = 'Claude服务器错误';
        } else {
          errorMessage = `Claude连接失败: ${error.message}`;
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
      throw new Error('Claude客户端未初始化，请检查API密钥配置');
    }

    try {
      const model = this.config.model || 'claude-3-haiku-20240307';
      const maxTokens = options.maxTokens || 2000;
      const temperature = options.temperature || 0.7;

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        top_p: options.topP || 1,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('Claude响应格式异常');
      }

      // 提取文本内容
      let text = '';
      for (const content of response.content) {
        if (content.type === 'text') {
          text += content.text;
        }
      }

      const usage = response.usage;
      const cost = this.calculateCost({
        promptTokens: usage?.input_tokens || 0,
        completionTokens: usage?.output_tokens || 0
      });

      return {
        text,
        usage: {
          promptTokens: usage?.input_tokens || 0,
          completionTokens: usage?.output_tokens || 0,
          totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
        },
        cost,
        model: response.model,
        finishReason: response.stop_reason || 'unknown'
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude文本生成失败: ${error.message}`);
      }
      throw new Error('Claude文本生成失败: 未知错误');
    }
  }

  /**
   * 计算Claude成本
   */
  protected calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
    const model = this.config.model || 'claude-3-haiku-20240307';
    
    // Anthropic定价 (截至2024年，实际使用时应更新为最新价格)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
      'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
      'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
      'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
      'claude-3-5-haiku-20241022': { prompt: 0.001, completion: 0.005 }
    };

    const modelPricing = pricing[model] || pricing['claude-3-haiku-20240307'];
    
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
    
    if (!config.apiKey.startsWith('sk-ant-')) {
      throw new Error('Claude API密钥格式无效，应以"sk-ant-"开头');
    }
  }
}