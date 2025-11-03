/**
 * TF-IDF算法服务
 * 实现词频计算、逆文档频率计算和TF-IDF加权
 */

export interface KeywordResult {
  word: string;
  tf: number;           // 词频
  df: number;           // 文档频率
  idf: number;          // 逆文档频率
  tfidf: number;        // TF-IDF分数
  frequency: number;    // 总出现次数
  documentCount: number; // 出现在多少个文档中
}

export interface TFIDFOptions {
  minWordLength?: number;     // 最小词长，默认3
  maxWordFrequency?: number;  // 最大词频阈值，默认无限制
  maxDocumentFrequency?: number; // 最大文档频率（百分比），默认0.8（80%）
  topPercentage?: number;     // 保留前N%的高分词，默认0.35（35%）
  language?: 'zh' | 'en' | 'mixed'; // 语言类型，默认mixed
}

export class TFIDFService {
  private stopWords: Set<string>;
  private cache: Map<string, KeywordResult[]>;
  private cacheMaxSize: number = 100; // 最大缓存条目数

  constructor() {
    this.stopWords = this.initializeStopWords();
    this.cache = new Map();
  }

  /**
   * 初始化停用词列表
   */
  private initializeStopWords(): Set<string> {
    // 英文停用词
    const englishStopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
      'her', 'its', 'our', 'their', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'not', 'no', 'nor', 'so', 'than', 'too', 'very', 'just', 'now',
      'study', 'studies', 'research', 'analysis', 'method', 'methods', 'result', 'results', 'conclusion',
      'conclusions', 'background', 'objective', 'objectives', 'purpose', 'aim', 'aims', 'data', 'patient',
      'patients', 'group', 'groups', 'control', 'treatment', 'clinical', 'trial', 'trials', 'effect',
      'effects', 'significant', 'significantly', 'associated', 'association', 'compared', 'comparison',
      'increase', 'increased', 'decrease', 'decreased', 'high', 'low', 'level', 'levels', 'rate', 'rates'
    ];

    // 中文停用词
    const chineseStopWords = [
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
      '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '里', '就是', '还', '把', '比', '让', '时', '过', '出', '小',
      '么', '起', '你们', '到了', '大', '来', '他', '真的', '手', '高', '等', '老', '什么', '这个', '中', '下', '为', '来了',
      '研究', '分析', '方法', '结果', '结论', '背景', '目的', '目标', '数据', '患者', '病人', '组', '对照', '治疗', '临床',
      '试验', '效果', '显著', '相关', '关联', '比较', '增加', '减少', '提高', '降低', '水平', '程度', '发现', '观察',
      '统计', '差异', '意义', 'P值', '置信', '区间', '样本', '例数', '病例', '疾病', '症状', '诊断', '预后', '随访'
    ];

    return new Set([...englishStopWords, ...chineseStopWords]);
  }

  /**
   * 文本预处理和分词
   */
  private tokenize(text: string): string[] {
    if (!text) return [];

    // 转换为小写
    text = text.toLowerCase();

    // 移除特殊字符，保留字母、数字、中文字符和连字符
    text = text.replace(/[^\w\u4e00-\u9fff\s-]/g, ' ');

    // 分词：按空格分割，同时处理中英文混合
    const words: string[] = [];
    
    // 先按空格分割
    const segments = text.split(/\s+/).filter(segment => segment.length > 0);
    
    for (const segment of segments) {
      // 如果包含中文，需要进一步处理
      if (/[\u4e00-\u9fff]/.test(segment)) {
        // 简单的中文分词：按字符分割，但保留英文单词
        const chars = segment.split('');
        let currentWord = '';
        
        for (const char of chars) {
          if (/[\u4e00-\u9fff]/.test(char)) {
            // 中文字符
            if (currentWord) {
              words.push(currentWord);
              currentWord = '';
            }
            words.push(char);
          } else if (/[a-zA-Z0-9-]/.test(char)) {
            // 英文字符或数字
            currentWord += char;
          } else {
            // 其他字符
            if (currentWord) {
              words.push(currentWord);
              currentWord = '';
            }
          }
        }
        
        if (currentWord) {
          words.push(currentWord);
        }
      } else {
        // 纯英文单词
        words.push(segment);
      }
    }

    return words;
  }

  /**
   * 过滤词汇
   */
  private filterWords(words: string[], options: TFIDFOptions): string[] {
    const minLength = options.minWordLength || 3;
    
    return words.filter(word => {
      // 长度过滤
      if (word.length < minLength) return false;
      
      // 停用词过滤
      if (this.stopWords.has(word)) return false;
      
      // 纯数字过滤
      if (/^\d+$/.test(word)) return false;
      
      // 单个字符过滤（除了中文）
      if (word.length === 1 && !/[\u4e00-\u9fff]/.test(word)) return false;
      
      return true;
    });
  }

  /**
   * 计算词频（TF）
   */
  private calculateTF(words: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const totalWords = words.length;
    
    // 统计词频
    for (const word of words) {
      tf.set(word, (tf.get(word) || 0) + 1);
    }
    
    // 归一化：TF = 词频 / 总词数
    for (const [word, count] of tf.entries()) {
      tf.set(word, count / totalWords);
    }
    
    return tf;
  }

  /**
   * 计算文档频率（DF）和逆文档频率（IDF）
   */
  private calculateIDF(documents: string[][], vocabulary: Set<string>): Map<string, { df: number; idf: number }> {
    const totalDocuments = documents.length;
    const idfMap = new Map<string, { df: number; idf: number }>();
    
    for (const word of vocabulary) {
      // 计算包含该词的文档数量
      const df = documents.filter(doc => doc.includes(word)).length;
      
      // 计算IDF：log(总文档数 / 包含该词的文档数)
      const idf = Math.log(totalDocuments / (df + 1)); // +1 避免除零
      
      idfMap.set(word, { df, idf });
    }
    
    return idfMap;
  }

  /**
   * 提取关键词
   */
  public extractKeywords(documents: string[], options: TFIDFOptions = {}): KeywordResult[] {
    if (!documents || documents.length === 0) {
      console.log('TF-IDF: 没有文档输入');
      return [];
    }

    console.log(`TF-IDF: 开始处理 ${documents.length} 个文档`);
    console.log('TF-IDF: 文档内容预览:', documents.slice(0, 2).map(doc => doc.substring(0, 100)));

    // 生成缓存键
    const cacheKey = this.generateCacheKey(documents, options);
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      console.log('TF-IDF: 使用缓存结果');
      return this.cache.get(cacheKey)!;
    }

    // 预处理所有文档
    const processedDocs = documents.map((doc, index) => {
      const tokens = this.tokenize(doc);
      const filtered = this.filterWords(tokens, options);
      console.log(`TF-IDF: 文档 ${index + 1} - 原始词数: ${tokens.length}, 过滤后词数: ${filtered.length}`);
      if (filtered.length > 0) {
        console.log(`TF-IDF: 文档 ${index + 1} 过滤后词汇示例:`, filtered.slice(0, 10));
      }
      return filtered;
    });

    // 构建词汇表
    const vocabulary = new Set<string>();
    const wordFrequency = new Map<string, number>();
    
    for (const doc of processedDocs) {
      for (const word of doc) {
        vocabulary.add(word);
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    }

    console.log(`TF-IDF: 总词汇表大小: ${vocabulary.size}`);
    console.log('TF-IDF: 词汇表示例:', Array.from(vocabulary).slice(0, 20));

    // 计算IDF
    const idfMap = this.calculateIDF(processedDocs, vocabulary);

    // 计算每个文档的TF-IDF
    const allTFIDF = new Map<string, number[]>();
    
    for (const doc of processedDocs) {
      const tf = this.calculateTF(doc);
      
      for (const [word, tfValue] of tf.entries()) {
        const idfData = idfMap.get(word);
        if (idfData) {
          const tfidf = tfValue * idfData.idf;
          
          if (!allTFIDF.has(word)) {
            allTFIDF.set(word, []);
          }
          allTFIDF.get(word)!.push(tfidf);
        }
      }
    }

    console.log(`TF-IDF: 计算出 ${allTFIDF.size} 个词的TF-IDF分数`);

    // 计算平均TF-IDF分数
    const results: KeywordResult[] = [];
    
    for (const [word, tfidfScores] of allTFIDF.entries()) {
      const idfData = idfMap.get(word)!;
      const avgTFIDF = tfidfScores.reduce((sum, score) => sum + score, 0) / tfidfScores.length;
      const frequency = wordFrequency.get(word) || 0;
      const documentCount = idfData.df;
      
      results.push({
        word,
        tf: tfidfScores.reduce((sum, score) => sum + score, 0) / documents.length,
        df: documentCount / documents.length,
        idf: idfData.idf,
        tfidf: avgTFIDF,
        frequency,
        documentCount
      });
    }

    console.log(`TF-IDF: 初始结果数量: ${results.length}`);
    if (results.length > 0) {
      console.log('TF-IDF: 前5个结果:', results.slice(0, 5).map(r => ({ word: r.word, tfidf: r.tfidf, df: r.df })));
    }

    // 应用过滤条件
    let filteredResults = results.filter(result => {
      // 最大词频过滤 - 只有当maxWordFrequency是一个合理的整数阈值时才应用
      // 如果maxWordFrequency < 1，则认为是百分比，不应用绝对频次过滤
      if (options.maxWordFrequency && options.maxWordFrequency >= 1 && result.frequency > options.maxWordFrequency) {
        console.log(`TF-IDF: 过滤高频词 "${result.word}" (频率: ${result.frequency})`);
        return false;
      }
      
      // 文档频率过滤（出现在过多文档中的词）
      const maxDocFreq = options.maxDocumentFrequency || 0.8;
      if (result.df > maxDocFreq) {
        console.log(`TF-IDF: 过滤高文档频率词 "${result.word}" (文档频率: ${result.df})`);
        return false;
      }
      
      return true;
    });

    console.log(`TF-IDF: 过滤后结果数量: ${filteredResults.length}`);

    // 按TF-IDF分数排序
    filteredResults.sort((a, b) => b.tfidf - a.tfidf);

    // 保留前N%的高分词
    const topPercentage = options.topPercentage || 0.35;
    const keepCount = Math.max(1, Math.floor(filteredResults.length * topPercentage));
    
    console.log(`TF-IDF: 保留前 ${topPercentage * 100}% (${keepCount}个) 高分词`);
    
    const finalResults = filteredResults.slice(0, keepCount);
    
    console.log(`TF-IDF: 最终结果数量: ${finalResults.length}`);
    if (finalResults.length > 0) {
      console.log('TF-IDF: 最终结果示例:', finalResults.slice(0, 5).map(r => ({ word: r.word, tfidf: r.tfidf })));
    }
    
    // 存储到缓存
    this.setCacheResult(cacheKey, finalResults);
    
    return finalResults;
  }

  /**
   * 添加自定义停用词
   */
  public addStopWords(words: string[]): void {
    for (const word of words) {
      this.stopWords.add(word.toLowerCase());
    }
  }

  /**
   * 移除停用词
   */
  public removeStopWords(words: string[]): void {
    for (const word of words) {
      this.stopWords.delete(word.toLowerCase());
    }
  }

  /**
   * 获取停用词列表
   */
  public getStopWords(): string[] {
    return Array.from(this.stopWords);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(documents: string[], options: TFIDFOptions): string {
    const docHash = this.hashDocuments(documents);
    const optionsStr = JSON.stringify(options);
    return `${docHash}_${optionsStr}`;
  }

  /**
   * 生成文档哈希
   */
  private hashDocuments(documents: string[]): string {
    const combined = documents.join('|');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString();
  }

  /**
   * 设置缓存结果
   */
  private setCacheResult(key: string, result: KeywordResult[]): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, result);
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.cacheMaxSize
    };
  }
}

// 导出单例实例
export const tfidfService = new TFIDFService();