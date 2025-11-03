export interface KeywordResult {
  word: string;
  tf: number;           // 词频
  df: number;           // 文档频率
  idf: number;          // 逆文档频率
  tfidf: number;        // TF-IDF分数
  frequency: number;    // 总出现次数
  documentCount: number; // 出现在多少个文档中
}