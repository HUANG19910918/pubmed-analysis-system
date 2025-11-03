import express from 'express';
import pubmedService from '../services/pubmed.js';
import deepseekService from '../services/deepseek.js';

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
      query as string,
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



export default router;
