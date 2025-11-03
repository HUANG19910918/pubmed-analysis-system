import express from 'express';
import pubmedService from '../services/pubmed.js';
import deepseekService from '../services/deepseek.js';
import { tfidfService } from '../services/tfidf.js';

const router = express.Router();

// Search PubMed articles
router.get('/search', async (req, res) => {
  try {
    const { query, maxResults = 20, startIndex = 0, startDate, endDate, journal } = req.query;

    // 检查是否有有效的搜索条件
    const hasQuery = query && typeof query === 'string' && query.trim();
    const hasTimeFilter = startDate || endDate;
    const hasJournalFilter = journal && typeof journal === 'string' && journal.trim();

    if (!hasQuery && !hasTimeFilter && !hasJournalFilter) {
      return res.status(400).json({
        success: false,
        message: 'At least one search condition is required (query, time filter, or journal filter)'
      });
    }

    const results = await pubmedService.searchArticles(
      query,
      parseInt(maxResults as string),
      parseInt(startIndex as string),
      startDate as string,
      endDate as string,
      journal as string
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search articles'
    });
  }
});

// Get article by PMID
router.get('/article/:pmid', async (req, res) => {
  try {
    const { pmid } = req.params;

    if (!pmid) {
      return res.status(400).json({
        success: false,
        message: 'PMID parameter is required'
      });
    }

    const article = await pubmedService.getArticleById(pmid);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get article'
    });
  }
});

// Get related articles
router.get('/article/:pmid/related', async (req, res) => {
  try {
    const { pmid } = req.params;
    const { maxResults = 10 } = req.query;

    if (!pmid) {
      return res.status(400).json({
        success: false,
        message: 'PMID parameter is required'
      });
    }

    const relatedArticles = await pubmedService.getRelatedArticles(
      pmid,
      parseInt(maxResults as string)
    );

    res.json({
      success: true,
      data: relatedArticles
    });
  } catch (error) {
    console.error('Get related articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get related articles'
    });
  }
});

// Analyze single article with AI
router.post('/analyze/article', async (req, res) => {
  try {
    const { title, abstract, deepseekConfig } = req.body;

    if (!title || !abstract) {
      return res.status(400).json({
        success: false,
        message: 'Title and abstract are required'
      });
    }

    // 如果提供了DeepSeek配置，则更新服务配置
    if (deepseekConfig) {
      const originalConfig = deepseekService.getConfig();
      try {
        deepseekService.updateConfig(deepseekConfig);
        
        const analysis = await deepseekService.analyzeLiterature(abstract, title);

        // 恢复原始配置
        deepseekService.updateConfig(originalConfig);

        res.json({
          success: true,
          data: {
            analysis,
            title,
            abstract
          }
        });
      } catch (error) {
        // 恢复原始配置
        deepseekService.updateConfig(originalConfig);
        throw error;
      }
    } else {
      const analysis = await deepseekService.analyzeLiterature(abstract, title);

      res.json({
        success: true,
        data: {
          analysis,
          title,
          abstract
        }
      });
    }
  } catch (error) {
    console.error('Article analysis error:', error);
    
    let errorMessage = 'Failed to analyze article';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// Analyze multiple articles with AI
router.post('/analyze/batch', async (req, res) => {
  try {
    const { articles, deepseekConfig } = req.body;
    
    console.log('Batch analysis request received:');
    console.log('- Articles count:', articles?.length || 0);
    console.log('- DeepSeek config provided:', !!deepseekConfig);
    console.log('- DeepSeek config details:', deepseekConfig);

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Articles array is required'
      });
    }

    // Validate article structure
    const validArticles = articles.filter(article => 
      article.title && article.abstract && article.authors && article.journal && article.pubDate
    );

    if (validArticles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid articles found'
      });
    }

    // 如果提供了DeepSeek配置，则更新服务配置
    if (deepseekConfig) {
      console.log('Using provided DeepSeek config for analysis');
      const originalConfig = deepseekService.getConfig();
      console.log('Original DeepSeek config:', originalConfig);
      
      try {
        deepseekService.updateConfig(deepseekConfig);
        console.log('Updated DeepSeek config:', deepseekService.getConfig());
        
        const summary = await deepseekService.summarizeLiteratureList(validArticles);

        // 恢复原始配置
        deepseekService.updateConfig(originalConfig);
        console.log('Restored original DeepSeek config');

        res.json({
          success: true,
          data: {
            summary,
            analyzedCount: validArticles.length,
            totalCount: articles.length
          }
        });
      } catch (error) {
        // 恢复原始配置
        deepseekService.updateConfig(originalConfig);
        throw error;
      }
    } else {
      const summary = await deepseekService.summarizeLiteratureList(validArticles);

      res.json({
        success: true,
        data: {
          summary,
          analyzedCount: validArticles.length,
          totalCount: articles.length
        }
      });
    }
  } catch (error) {
    console.error('Batch analysis error:', error);
    
    let errorMessage = 'Failed to analyze articles';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// Generate research suggestions
router.post('/suggestions', async (req, res) => {
  try {
    const { topic, existingLiterature } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    const suggestions = await deepseekService.generateResearchSuggestions(
      topic,
      existingLiterature || ''
    );

    res.json({
      success: true,
      data: {
        suggestions,
        topic
      }
    });
  } catch (error) {
    console.error('Research suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate research suggestions'
    });
  }
});

// Extract keywords using TF-IDF algorithm
router.post('/keywords', async (req, res) => {
  try {
    const { articles, options = {} } = req.body;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Articles array is required and cannot be empty'
      });
    }

    // 验证文章数据结构
    const validArticles = articles.filter(article => 
      article && (article.title || article.abstract)
    );

    if (validArticles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid articles found (articles must have title or abstract)'
      });
    }

    // 提取文本内容用于TF-IDF分析
    const documents = validArticles.map(article => {
      const title = article.title || '';
      const abstract = article.abstract || '';
      const keywords = Array.isArray(article.keywords) ? article.keywords.join(' ') : '';
      
      // 合并标题、摘要和关键词
      return [title, abstract, keywords].filter(text => text.trim()).join(' ');
    });

    // 设置TF-IDF选项
    const tfidfOptions = {
      minWordLength: options.minWordLength || 3,
      maxWordFrequency: options.maxWordFrequency,
      maxDocumentFrequency: options.maxDocumentFrequency || 0.8,
      topPercentage: options.topPercentage || 0.35,
      language: options.language || 'mixed'
    };

    console.log(`开始TF-IDF关键词提取，文档数量: ${documents.length}`);
    console.log('TF-IDF选项:', tfidfOptions);

    // 执行关键词提取
    const keywords = tfidfService.extractKeywords(documents, tfidfOptions);

    console.log(`关键词提取完成，提取到 ${keywords.length} 个关键词`);

    // 添加统计信息
    const stats = {
      totalDocuments: documents.length,
      totalUniqueWords: keywords.length,
      averageWordsPerDocument: documents.reduce((sum, doc) => sum + doc.split(/\s+/).length, 0) / documents.length,
      processingTime: Date.now()
    };

    res.json({
      success: true,
      data: {
        keywords,
        stats,
        options: tfidfOptions
      }
    });

  } catch (error) {
    console.error('Keywords extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract keywords',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get stopwords list
router.get('/keywords/stopwords', (req, res) => {
  try {
    const stopwords = tfidfService.getStopWords();
    
    res.json({
      success: true,
      data: {
        stopwords,
        count: stopwords.length
      }
    });
  } catch (error) {
    console.error('Get stopwords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stopwords'
    });
  }
});

// Add custom stopwords
router.post('/keywords/stopwords', (req, res) => {
  try {
    const { words } = req.body;

    if (!words || !Array.isArray(words)) {
      return res.status(400).json({
        success: false,
        message: 'Words array is required'
      });
    }

    tfidfService.addStopWords(words);

    res.json({
      success: true,
      message: `Added ${words.length} stopwords`
    });
  } catch (error) {
    console.error('Add stopwords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stopwords'
    });
  }
});

export default router;
