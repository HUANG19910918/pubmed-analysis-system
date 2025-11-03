import axios from 'axios';
import { BaseAdapter } from '../BaseAdapter.js';
import { 
  ModelConfig, 
  ConnectionResult, 
  GenerationOptions, 
  GenerationResult 
} from '../types.js';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DeepSeekAdapter extends BaseAdapter {
  constructor(config: ModelConfig) {
    super('deepseek', config);
  }

  /**
   * 测试连接
   */
  async testConnection(config?: ModelConfig): Promise<ConnectionResult> {
    const testConfig = config || this.config;
    
    try {
      this.validateConfig(testConfig);
      
      // 如果是测试API密钥，返回模拟成功响应
      if (!testConfig.apiKey || testConfig.apiKey === 'sk-test-key-for-development' || testConfig.apiKey.startsWith('sk-test-')) {
        console.log('DeepSeek测试连接：使用模拟响应（测试模式）');
        return {
          success: true,
          message: 'DeepSeek连接测试成功（测试模式）'
        };
      }
      
      const baseUrl = testConfig.baseUrl || 'https://api.deepseek.com';
      const model = testConfig.model || 'deepseek-chat';

      // 发送一个简单的测试请求
      const response = await axios.post<DeepSeekResponse>(
        `${baseUrl}/v1/chat/completions`,
        {
          model,
          messages: [
            { role: 'user', content: 'Hello, this is a connection test.' }
          ],
          temperature: 0,
          max_tokens: 10,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${testConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return {
          success: true,
          message: 'DeepSeek连接成功',
          modelInfo: {
            name: 'DeepSeek',
            model: model,
            version: response.data.model || 'unknown',
            provider: 'DeepSeek'
          }
        };
      } else {
        return {
          success: false,
          error: 'DeepSeek响应格式异常'
        };
      }
    } catch (error: any) {
      let errorMessage = 'DeepSeek连接失败';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          errorMessage = 'DeepSeek API密钥无效或已过期';
        } else if (status === 403) {
          errorMessage = 'DeepSeek API访问被拒绝，请检查API密钥权限';
        } else if (status === 429) {
          errorMessage = 'DeepSeek API请求频率过高';
        } else if (status >= 500) {
          errorMessage = 'DeepSeek服务器错误';
        } else {
          errorMessage = `DeepSeek API错误 (${status}): ${data?.error?.message || '未知错误'}`;
        }
      } else if (error.request) {
        errorMessage = '无法连接到DeepSeek API服务器，请检查网络连接';
      } else {
        errorMessage = `DeepSeek连接失败: ${error.message}`;
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
    try {
      this.validateConfig(this.config);
      
      // 如果是测试API密钥，返回模拟响应
      if (!this.config.apiKey || this.config.apiKey === 'sk-test-key-for-development' || this.config.apiKey.startsWith('sk-test-')) {
        console.log('使用DeepSeek模拟响应（测试模式）');
        return {
          text: `通过对所提供文献的深入分析，我观察到该研究领域正呈现出几个显著的发展趋势。首先，研究方法正在从传统的单一维度分析向多组学整合分析转变，这种转变反映了科研人员对复杂生物学问题理解的深化。同时，人工智能和机器学习技术在该领域的应用日益广泛，不仅提高了数据处理的效率，也为发现新的生物标志物和治疗靶点提供了强有力的工具。\n\n从研究热点来看，精准医学和个体化治疗正成为当前研究的核心方向，这一趋势与临床需求的变化密切相关。研究者们越来越关注如何将基础研究成果转化为临床应用，特别是在疾病早期诊断和预后评估方面。此外，跨学科合作的重要性日益凸显，生物医学与工程学、计算科学等领域的融合正在催生新的研究范式。\n\n展望未来，该领域的发展将更加注重转化医学的实践，同时伴随着新兴技术如单细胞测序、基因编辑等的成熟应用，预计将在疾病机制理解和治疗策略开发方面取得重大突破。请注意：这是测试模式下的模拟响应，实际使用时请配置有效的DeepSeek API密钥。`,
          model: 'deepseek-chat',
          usage: {
            promptTokens: prompt.length / 4,
            completionTokens: 200,
            totalTokens: prompt.length / 4 + 200
          }
        };
      }
      
      const baseUrl = this.config.baseUrl || 'https://api.deepseek.com';
      const model = this.config.model || 'deepseek-chat';
      const maxTokens = options.maxTokens || 2000;
      const temperature = options.temperature || 0.7;

      const response = await axios.post<DeepSeekResponse>(
        `${baseUrl}/v1/chat/completions`,
        {
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: options.topP || 1,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000
        }
      );

      const choice = response.data.choices[0];
      if (!choice || !choice.message) {
        throw new Error('DeepSeek响应格式异常');
      }

      const usage = response.data.usage;
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
        model: response.data.model,
        finishReason: choice.finish_reason || 'unknown'
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          throw new Error('DeepSeek API密钥无效或已过期，请检查API密钥配置');
        } else if (status === 403) {
          throw new Error('DeepSeek API访问被拒绝，请检查API密钥权限');
        } else if (status === 429) {
          throw new Error('DeepSeek API请求频率过高，请稍后重试');
        } else if (status >= 500) {
          throw new Error('DeepSeek服务器错误，请稍后重试');
        } else {
          throw new Error(`DeepSeek API错误 (${status}): ${data?.error?.message || '未知错误'}`);
        }
      } else if (error.request) {
        throw new Error('无法连接到DeepSeek API服务器，请检查网络连接和API地址配置');
      } else {
        throw new Error(`DeepSeek文本生成失败: ${error.message}`);
      }
    }
  }

  /**
   * 计算DeepSeek成本
   */
  protected calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
    // DeepSeek定价 (截至2024年，实际使用时应更新为最新价格)
    // DeepSeek通常价格较低
    const promptCost = (usage.promptTokens / 1000) * 0.0014; // $0.0014 per 1K prompt tokens
    const completionCost = (usage.completionTokens / 1000) * 0.0028; // $0.0028 per 1K completion tokens
    
    return promptCost + completionCost;
  }

  /**
   * 验证配置
   */
  protected validateConfig(config: ModelConfig): void {
    super.validateConfig(config);
    
    // 检查是否使用测试密钥
    if (config.apiKey === 'sk-test-key-for-development' || config.apiKey.includes('test')) {
      throw new Error('请配置真实的DeepSeek API密钥。当前使用的是测试密钥，无法连接到DeepSeek服务。');
    }
  }
}