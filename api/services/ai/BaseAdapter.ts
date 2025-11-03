import { 
  AIModelAdapter, 
  ModelConfig, 
  ModelInfo,
  ConnectionResult, 
  GenerationOptions, 
  GenerationResult,
  AnalysisItem,
  AnalysisOptions,
  AnalysisResult
} from './types.js';

export abstract class BaseAdapter implements AIModelAdapter {
  protected config: ModelConfig;
  protected modelName: string;

  constructor(modelName: string, config: ModelConfig) {
    this.modelName = modelName;
    this.config = config;
  }

  /**
   * 更新配置
   */
  updateConfig(config: ModelConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): ModelConfig {
    return { ...this.config };
  }

  /**
   * 获取模型信息 - 子类必须实现
   */
  abstract getModelInfo(): ModelInfo;

  /**
   * 测试连接 - 子类必须实现
   */
  abstract testConnection(config?: ModelConfig): Promise<ConnectionResult>;

  /**
   * 生成文本 - 子类必须实现
   */
  abstract generateText(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;

  /**
   * 批量分析 - 默认实现，子类可以重写以优化性能
   */
  async batchAnalyze(items: AnalysisItem[], options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const startTime = Date.now();
    const analyses: any[] = [];
    let totalCost = 0;
    let totalTokens = 0;

    // 构建分析提示词
    const analysisPrompt = this.buildAnalysisPrompt(items, options);

    try {
      const result = await this.generateText(analysisPrompt, {
        maxTokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7
      });

      totalCost += result.cost || 0;
      totalTokens += result.usage?.totalTokens || 0;

      // 解析分析结果
      const parsedResult = this.parseAnalysisResult(result.text, items);
      
      return {
        modelName: this.modelName,
        summary: parsedResult.summary,
        keyFindings: parsedResult.keyFindings,
        researchSuggestions: parsedResult.researchSuggestions,
        analyses: parsedResult.analyses,
        processingTime: Date.now() - startTime,
        cost: totalCost,
        usage: {
          totalTokens,
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0
        }
      };
    } catch (error) {
      throw new Error(`批量分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 构建分析提示词
   */
  protected buildAnalysisPrompt(items: AnalysisItem[], options: AnalysisOptions): string {
    const language = options.language || 'zh-CN';
    const analysisType = options.analysisType || 'comprehensive';
    
    let prompt = '';
    
    if (language === 'zh-CN') {
      prompt = `请对以下${items.length}篇文献进行${this.getAnalysisTypeText(analysisType)}分析：\n\n`;
      
      items.forEach((item, index) => {
        prompt += `文献${index + 1}：\n`;
        prompt += `标题：${item.title}\n`;
        if (item.abstract) {
          prompt += `摘要：${item.abstract}\n`;
        }
        if (item.authors) {
          const authorsStr = Array.isArray(item.authors) ? item.authors.join(', ') : item.authors;
          prompt += `作者：${authorsStr}\n`;
        }
        if (item.journal) {
          prompt += `期刊：${item.journal}\n`;
        }
        if (item.year) {
          prompt += `年份：${item.year}\n`;
        }
        prompt += '\n';
      });

      prompt += `请提供以下格式的分析结果：\n`;
      prompt += `## 总体概述\n[对所有文献的整体分析和总结]\n\n`;
      prompt += `## 关键发现\n[列出3-5个最重要的发现，每个发现一行]\n\n`;
      prompt += `## 研究建议\n[基于分析结果提出3-5个研究建议，每个建议一行]\n\n`;
      prompt += `## 详细分析\n[对每篇文献的详细分析]\n`;
    } else {
      prompt = `Please conduct a ${this.getAnalysisTypeText(analysisType)} analysis of the following ${items.length} literature(s):\n\n`;
      
      items.forEach((item, index) => {
        prompt += `Literature ${index + 1}:\n`;
        prompt += `Title: ${item.title}\n`;
        if (item.abstract) {
          prompt += `Abstract: ${item.abstract}\n`;
        }
        if (item.authors) {
          const authorsStr = Array.isArray(item.authors) ? item.authors.join(', ') : item.authors;
          prompt += `Authors: ${authorsStr}\n`;
        }
        if (item.journal) {
          prompt += `Journal: ${item.journal}\n`;
        }
        if (item.year) {
          prompt += `Year: ${item.year}\n`;
        }
        prompt += '\n';
      });

      prompt += `Please provide analysis results in the following format:\n`;
      prompt += `## Overall Summary\n[Overall analysis and summary of all literature]\n\n`;
      prompt += `## Key Findings\n[List 3-5 most important findings, one per line]\n\n`;
      prompt += `## Research Suggestions\n[Provide 3-5 research suggestions based on analysis, one per line]\n\n`;
      prompt += `## Detailed Analysis\n[Detailed analysis of each literature]\n`;
    }

    return prompt;
  }

  /**
   * 获取分析类型文本
   */
  protected getAnalysisTypeText(analysisType: string): string {
    const typeMap: Record<string, { zh: string; en: string }> = {
      'comprehensive': { zh: '综合性', en: 'comprehensive' },
      'methodology': { zh: '方法学', en: 'methodology' },
      'results': { zh: '结果导向', en: 'results-focused' },
      'trends': { zh: '趋势', en: 'trend' }
    };

    return typeMap[analysisType]?.zh || '综合性';
  }

  /**
   * 解析分析结果
   */
  protected parseAnalysisResult(text: string, items: AnalysisItem[]): {
    summary: string;
    keyFindings: string[];
    researchSuggestions: string[];
    analyses: any[];
  } {
    const sections = this.extractSections(text);
    
    return {
      summary: sections.summary || '分析完成',
      keyFindings: this.extractListItems(sections.keyFindings || ''),
      researchSuggestions: this.extractListItems(sections.researchSuggestions || ''),
      analyses: items.map((item, index) => ({
        id: item.id,
        title: item.title,
        analysis: sections.detailedAnalysis || `文献${index + 1}的分析结果`,
        score: Math.floor(Math.random() * 20) + 80, // 临时评分，实际应该基于分析质量
        tags: this.extractTags(item.title + ' ' + (item.abstract || ''))
      }))
    };
  }

  /**
   * 提取文本段落
   */
  protected extractSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    
    // 匹配中文标题
    const chinesePatterns = {
      summary: /##\s*总体概述\s*\n([\s\S]*?)(?=##|$)/i,
      keyFindings: /##\s*关键发现\s*\n([\s\S]*?)(?=##|$)/i,
      researchSuggestions: /##\s*研究建议\s*\n([\s\S]*?)(?=##|$)/i,
      detailedAnalysis: /##\s*详细分析\s*\n([\s\S]*?)(?=##|$)/i
    };

    // 匹配英文标题
    const englishPatterns = {
      summary: /##\s*Overall Summary\s*\n([\s\S]*?)(?=##|$)/i,
      keyFindings: /##\s*Key Findings\s*\n([\s\S]*?)(?=##|$)/i,
      researchSuggestions: /##\s*Research Suggestions\s*\n([\s\S]*?)(?=##|$)/i,
      detailedAnalysis: /##\s*Detailed Analysis\s*\n([\s\S]*?)(?=##|$)/i
    };

    // 尝试中文模式
    Object.entries(chinesePatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        sections[key] = match[1].trim();
      }
    });

    // 如果中文模式没有匹配到，尝试英文模式
    if (Object.keys(sections).length === 0) {
      Object.entries(englishPatterns).forEach(([key, pattern]) => {
        const match = text.match(pattern);
        if (match) {
          sections[key] = match[1].trim();
        }
      });
    }

    // 如果都没有匹配到，使用整个文本作为总结
    if (Object.keys(sections).length === 0) {
      sections.summary = text.trim();
    }

    return sections;
  }

  /**
   * 提取列表项
   */
  protected extractListItems(text: string): string[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const items: string[] = [];

    for (const line of lines) {
      // 移除列表标记
      const cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      if (cleaned && !cleaned.startsWith('#')) {
        items.push(cleaned);
      }
    }

    return items.slice(0, 5); // 最多返回5个项目
  }

  /**
   * 提取标签
   */
  protected extractTags(text: string): string[] {
    const commonTags = [
      '临床研究', '基础研究', '综述', '荟萃分析', '随机对照试验',
      '队列研究', '病例对照', '横断面研究', '系统评价', '指南',
      'clinical study', 'basic research', 'review', 'meta-analysis', 'RCT',
      'cohort study', 'case-control', 'cross-sectional', 'systematic review', 'guideline'
    ];

    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    for (const tag of commonTags) {
      if (lowerText.includes(tag.toLowerCase())) {
        tags.push(tag);
      }
    }

    return tags.slice(0, 3); // 最多返回3个标签
  }

  /**
   * 计算成本 - 子类可以重写
   */
  calculateCost(usage: { promptTokens: number; completionTokens: number } | number, modelVersion?: string): number {
    if (typeof usage === 'number') {
      // 兼容旧的接口
      return usage * 0.0001;
    }
    // 默认成本计算，子类应该根据实际模型定价重写
    const promptCost = usage.promptTokens * 0.0001;
    const completionCost = usage.completionTokens * 0.0002;
    return promptCost + completionCost;
  }

  /**
   * 验证配置 - 子类可以重写
   */
  protected validateConfig(config: ModelConfig): void {
    if (!config.apiKey) {
      throw new Error(`${this.modelName} API密钥未配置`);
    }
  }
}