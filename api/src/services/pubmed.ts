import axios from 'axios';
import xml2js from 'xml2js';

export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string;
  journal: string;
  pubDate: string;
  doi?: string;
  keywords?: string[];
}

export interface PubMedSearchResult {
  articles: PubMedArticle[];
  totalCount: number;
  searchTerm: string;
}

export interface PubMedConfig {
  baseUrl?: string;
  apiKey?: string;
  toolName?: string;
  email?: string;
  rateLimit?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class PubMedService {
  private baseUrl: string;
  private apiKey?: string;
  private toolName: string;
  private email?: string;
  private rateLimit: number;
  private retryAttempts: number;
  private retryDelay: number;
  private lastRequestTime: number = 0;

  constructor(config?: PubMedConfig) {
    this.baseUrl = config?.baseUrl || process.env.PUBMED_BASE_URL || 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
    this.apiKey = config?.apiKey || process.env.PUBMED_API_KEY;
    this.toolName = config?.toolName || process.env.PUBMED_TOOL_NAME || 'PubMed Analysis System';
    this.email = config?.email || process.env.PUBMED_EMAIL;
    this.rateLimit = config?.rateLimit || parseInt(process.env.PUBMED_RATE_LIMIT || '3');
    this.retryAttempts = config?.retryAttempts || parseInt(process.env.PUBMED_RETRY_ATTEMPTS || '3');
    this.retryDelay = config?.retryDelay || parseInt(process.env.PUBMED_RETRY_DELAY || '1000');
  }

  // 更新配置
  updateConfig(config: PubMedConfig) {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;
    if (config.toolName) this.toolName = config.toolName;
    if (config.email !== undefined) this.email = config.email;
    if (config.rateLimit) this.rateLimit = config.rateLimit;
    if (config.retryAttempts) this.retryAttempts = config.retryAttempts;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
  }

  // 速率限制控制
  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.rateLimit; // 毫秒

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  // 构建通用请求参数
  private buildCommonParams(): Record<string, string> {
    const params: Record<string, string> = {
      tool: this.toolName
    };

    if (this.email) {
      params.email = this.email;
    }

    if (this.apiKey) {
      params.api_key = this.apiKey;
    }

    return params;
  }

  private buildDateFilter(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) {
      return '';
    }

    // 将日期格式从 YYYY-MM-DD 转换为 YYYY/MM/DD
    const formatDate = (dateStr: string): string => {
      return dateStr.replace(/-/g, '/');
    };

    if (startDate && endDate) {
      // 日期范围筛选
      return `("${formatDate(startDate)}"[Date - Publication] : "${formatDate(endDate)}"[Date - Publication])`;
    } else if (startDate) {
      // 只有开始日期
      return `("${formatDate(startDate)}"[Date - Publication] : "3000"[Date - Publication])`;
    } else if (endDate) {
      // 只有结束日期
      return `("1800"[Date - Publication] : "${formatDate(endDate)}"[Date - Publication])`;
    }

    return '';
  }

  private buildJournalFilter(journal: string): string {
    if (!journal || !journal.trim()) {
      return '';
    }

    const trimmedJournal = journal.trim();
    
    // ISSN格式检测 (XXXX-XXXX)
    const issnPattern = /^\d{4}-\d{3}[\dX]$/;
    if (issnPattern.test(trimmedJournal)) {
      // 对于ISSN，同时搜索ISSN和eISSN字段
      return `("${trimmedJournal}"[ISSN] OR "${trimmedJournal}"[eISSN])`;
    }
    
    // 期刊名称或缩写
    // 使用期刊字段进行精确匹配和模糊匹配
    return `("${trimmedJournal}"[Journal] OR "${trimmedJournal}"[TA])`;
  }

  async searchArticles(query: string, maxResults: number = 20, startIndex: number = 0, startDate?: string, endDate?: string, journal?: string): Promise<PubMedSearchResult> {
    return this.executeWithRetry(async () => {
      // Step 1: Search for PMIDs
      await this.enforceRateLimit();
      
      // 构建带时间筛选和期刊筛选的查询
      let searchTerm = '';
      const filters: string[] = [];
      
      // 添加关键词查询（如果有）
      if (query && query.trim()) {
        searchTerm = query.trim();
      }
      
      // 添加时间筛选
      if (startDate || endDate) {
        const dateFilter = this.buildDateFilter(startDate, endDate);
        if (dateFilter) {
          filters.push(dateFilter);
        }
      }
      
      // 添加期刊筛选
      if (journal && journal.trim()) {
        const journalFilter = this.buildJournalFilter(journal.trim());
        if (journalFilter) {
          filters.push(journalFilter);
        }
      }
      
      // 构建最终的搜索条件
      if (searchTerm && filters.length > 0) {
        // 有关键词和筛选条件
        searchTerm = `(${searchTerm}) AND (${filters.join(' AND ')})`;
      } else if (filters.length > 0) {
        // 只有筛选条件，没有关键词
        searchTerm = filters.join(' AND ');
      } else if (!searchTerm) {
        // 既没有关键词也没有筛选条件，使用通用查询
        searchTerm = '*';
      }
      
      const searchUrl = `${this.baseUrl}esearch.fcgi`;
      const searchParams = {
        ...this.buildCommonParams(),
        db: 'pubmed',
        term: searchTerm,
        retmax: maxResults.toString(),
        retstart: startIndex.toString(),
        retmode: 'json',
        sort: 'relevance'
      };

      const searchResponse = await axios.get(searchUrl, { params: searchParams });
      const searchData = searchResponse.data;

      if (!searchData.esearchresult || !searchData.esearchresult.idlist) {
        return {
          articles: [],
          totalCount: 0,
          searchTerm: query
        };
      }

      const pmids = searchData.esearchresult.idlist;
      const totalCount = parseInt(searchData.esearchresult.count) || 0;

      if (pmids.length === 0) {
        return {
          articles: [],
          totalCount,
          searchTerm: query
        };
      }

      // Step 2: Fetch article details
      const articles = await this.fetchArticleDetails(pmids);

      return {
        articles,
        totalCount,
        searchTerm: query
      };
    });
  }

  // 重试机制
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`PubMed API attempt ${attempt} failed:`, error);

        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    console.error('PubMed API failed after all retry attempts:', lastError);
    throw new Error(`Failed to execute PubMed API request after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  private async fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
    return this.executeWithRetry(async () => {
      await this.enforceRateLimit();
      
      const fetchUrl = `${this.baseUrl}efetch.fcgi`;
      const fetchParams = {
        ...this.buildCommonParams(),
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
        rettype: 'abstract'
      };

      const fetchResponse = await axios.get(fetchUrl, { params: fetchParams });
      const xmlData = fetchResponse.data;

      // Parse XML
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);

      const articles: PubMedArticle[] = [];
      const pubmedArticles = result.PubmedArticleSet?.PubmedArticle || [];
      const articlesArray = Array.isArray(pubmedArticles) ? pubmedArticles : [pubmedArticles];

      for (const article of articlesArray) {
        try {
          const medlineCitation = article.MedlineCitation;
          const pmid = medlineCitation.PMID._ || medlineCitation.PMID;
          
          // Extract title
          let articleTitle = 'No title available';
          if (medlineCitation.Article?.ArticleTitle) {
            const titleData = medlineCitation.Article.ArticleTitle;
            if (typeof titleData === 'string') {
              articleTitle = titleData;
            } else if (titleData._) {
              // Handle formatted title with text content
              articleTitle = titleData._;
            } else if (typeof titleData === 'object') {
              // Handle complex title objects by extracting text content
              articleTitle = this.extractTextFromObject(titleData);
            }
          }
          
          // Extract abstract
          let abstract = 'No abstract available';
          if (medlineCitation.Article?.Abstract?.AbstractText) {
            const abstractText = medlineCitation.Article.Abstract.AbstractText;
            if (typeof abstractText === 'string') {
              abstract = abstractText;
            } else if (Array.isArray(abstractText)) {
              abstract = abstractText.map(text => typeof text === 'string' ? text : text._).join(' ');
            } else if (abstractText._) {
              abstract = abstractText._;
            }
          }

          // Extract authors
          let authors = 'No authors available';
          if (medlineCitation.Article?.AuthorList?.Author) {
            const authorList = medlineCitation.Article.AuthorList.Author;
            const authorsArray = Array.isArray(authorList) ? authorList : [authorList];
            authors = authorsArray.map((author: any) => {
              if (author.LastName && author.ForeName) {
                return `${author.LastName}`;
              } else if (author.CollectiveName) {
                return author.CollectiveName;
              }
              return 'Unknown Author';
            }).join(', ');
          }

          // Extract journal
          const journal = medlineCitation.Article?.Journal?.Title || 'Unknown Journal';

          // Extract publication date
          let pubDate = 'Unknown Date';
          if (medlineCitation.Article?.Journal?.JournalIssue?.PubDate) {
            const pubDateObj = medlineCitation.Article.Journal.JournalIssue.PubDate;
            if (pubDateObj.Year) {
              pubDate = pubDateObj.Year;
              if (pubDateObj.Month) {
                pubDate += `-${pubDateObj.Month}`;
                if (pubDateObj.Day) {
                  pubDate += `-${pubDateObj.Day}`;
                }
              }
            }
          }

          // Extract DOI
          let doi: string | undefined;
          if (medlineCitation.Article?.ELocationID) {
            const eLocationID = medlineCitation.Article.ELocationID;
            const eLocationArray = Array.isArray(eLocationID) ? eLocationID : [eLocationID];
            const doiEntry = eLocationArray.find((loc: any) => loc.$ && loc.$.EIdType === 'doi');
            if (doiEntry) {
              doi = doiEntry._ || doiEntry;
            }
          }

          // Extract keywords
          let keywords: string[] = [];
          if (medlineCitation.KeywordList?.Keyword) {
            const keywordList = medlineCitation.KeywordList.Keyword;
            const keywordsArray = Array.isArray(keywordList) ? keywordList : [keywordList];
            keywords = keywordsArray.map((kw: any) => typeof kw === 'string' ? kw : kw._).filter(Boolean);
          }

          articles.push({
            pmid,
            title: articleTitle,
            abstract,
            authors,
            journal,
            pubDate,
            doi,
            keywords
          });
        } catch (articleError) {
          console.error('Error parsing article:', articleError);
          // Continue with other articles
        }
      }

      return articles;
    });
  }

  async getArticleById(pmid: string): Promise<PubMedArticle | null> {
    try {
      const articles = await this.fetchArticleDetails([pmid]);
      return articles.length > 0 ? articles[0] : null;
    } catch (error) {
      console.error('Error fetching article by ID:', error);
      return null;
    }
  }

  async getRelatedArticles(pmid: string, maxResults: number = 10): Promise<PubMedArticle[]> {
    try {
      const relatedUrl = `${this.baseUrl}elink.fcgi`;
      const relatedParams = {
        dbfrom: 'pubmed',
        db: 'pubmed',
        id: pmid,
        linkname: 'pubmed_pubmed',
        retmode: 'json'
      };

      const relatedResponse = await axios.get(relatedUrl, { params: relatedParams });
      const relatedData = relatedResponse.data;

      if (!relatedData.linksets || relatedData.linksets.length === 0) {
        return [];
      }

      const linkset = relatedData.linksets[0];
      if (!linkset.linksetdbs || linkset.linksetdbs.length === 0) {
        return [];
      }

      const relatedPmids = linkset.linksetdbs[0].links.slice(0, maxResults);
      return await this.fetchArticleDetails(relatedPmids);
    } catch (error) {
      console.error('Error fetching related articles:', error);
      return [];
    }
  }

  // Helper method to extract text content from complex objects
  private extractTextFromObject(obj: any): string {
    if (typeof obj === 'string') {
      return obj;
    }
    
    if (obj === null || obj === undefined) {
      return '';
    }
    
    // If object has a text property (_)
    if (obj._ && typeof obj._ === 'string') {
      return obj._;
    }
    
    // If it's an array, join all text content
    if (Array.isArray(obj)) {
      return obj.map(item => this.extractTextFromObject(item)).join('');
    }
    
    // If it's an object, try to extract text from all properties
    if (typeof obj === 'object') {
      let text = '';
      
      // First try common text properties
      if (obj._ && typeof obj._ === 'string') {
        text += obj._;
      }
      
      // Then check for other text content
      for (const key in obj) {
        if (key !== '_' && obj[key]) {
          if (typeof obj[key] === 'string') {
            text += obj[key];
          } else if (typeof obj[key] === 'object') {
            text += this.extractTextFromObject(obj[key]);
          }
        }
      }
      
      return text;
    }
    
    return String(obj);
  }
}

export default new PubMedService();
