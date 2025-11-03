import axios from 'axios';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekResponse {
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

export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  }

  // 动态更新配置
  updateConfig(config: { apiKey?: string; baseUrl?: string }) {
    if (config.apiKey !== undefined) {
      this.apiKey = config.apiKey;
    }
    if (config.baseUrl !== undefined) {
      this.baseUrl = config.baseUrl;
    }
  }

  // 获取当前配置
  getConfig() {
    return {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl
    };
  }

  private checkApiKey() {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required. Please set it in your .env file.');
    }
    
    // 检查是否使用测试密钥
    if (this.apiKey === 'sk-test-key-for-development' || this.apiKey.includes('test')) {
      console.warn('⚠️  Warning: You are using a test API key. Please configure a real DeepSeek API key for production use.');
      throw new Error('请配置真实的DeepSeek API密钥。当前使用的是测试密钥，无法连接到DeepSeek服务。请在设置页面更新您的API密钥。');
    }
  }

  async chat(messages: DeepSeekMessage[], model: string = 'deepseek-chat'): Promise<string> {
    this.checkApiKey();
    try {
      const response = await axios.post<DeepSeekResponse>(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('DeepSeek API Error:', error);
      
      // 详细的错误处理
      if (error.response) {
        // API返回了错误响应
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
        // 网络连接错误
        throw new Error('无法连接到DeepSeek API服务器，请检查网络连接和API地址配置');
      } else {
        // 其他错误
        throw new Error(`DeepSeek API请求失败: ${error.message}`);
      }
    }
  }

  async analyzeLiterature(abstract: string, title: string): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的医学文献分析专家。请分析给定的文献标题和摘要，提供以下内容：
1. 研究主题和目标
2. 研究方法概述
3. 主要发现和结论
4. 临床意义和应用价值
5. 研究局限性（如果有提及）

请用中文回答，保持专业性和准确性。`
      },
      {
        role: 'user',
        content: `请分析以下文献：

标题：${title}

摘要：${abstract}`
      }
    ];

    return await this.chat(messages);
  }

  async summarizeLiteratureList(literatureList: Array<{ title: string; abstract: string; authors: string; journal: string; pubDate: string }>): Promise<string> {
    const literatureText = literatureList.map((lit, index) => 
      `${index + 1}. 标题：${lit.title}
   作者：${lit.authors}
   期刊：${lit.journal}
   发表时间：${lit.pubDate}
   摘要：${lit.abstract}
   `
    ).join('\n\n');

    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的医学文献综述专家。请对给定的文献列表进行综合分析，提供以下内容：
1. 研究领域概述
2. 主要研究趋势和热点
3. 研究方法的发展
4. 主要发现和共识
5. 存在的争议或分歧
6. 未来研究方向建议

请用中文回答，保持专业性和逻辑性。`
      },
      {
        role: 'user',
        content: `请对以下文献列表进行综合分析：

${literatureText}`
      }
    ];

    return await this.chat(messages);
  }

  async generateResearchSuggestions(topic: string, existingLiterature: string): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `你是一个资深的医学研究顾问。基于给定的研究主题和现有文献情况，请提供：
1. 研究空白和机会
2. 可行的研究问题
3. 推荐的研究方法
4. 预期的研究价值
5. 实施建议和注意事项

请用中文回答，提供具体可行的建议。`
      },
      {
        role: 'user',
        content: `研究主题：${topic}

现有文献情况：${existingLiterature}`
      }
    ];

    return await this.chat(messages);
  }
}

export default new DeepSeekService();