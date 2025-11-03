import { Router } from 'express';
import { DeepSeekService } from '../services/deepseek';
import { PubMedService } from '../services/pubmed';

const router = Router();

// 测试DeepSeek连接
router.post('/deepseek', async (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body;

    if (!apiKey || !baseUrl) {
      return res.status(400).json({
        success: false,
        message: 'API密钥和基础地址不能为空'
      });
    }

    // 临时设置环境变量进行测试
    const originalApiKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = apiKey;

    try {
      const deepSeekService = new DeepSeekService();
      
      // 发送一个简单的测试请求
      const testResponse = await deepSeekService.chat([
        {
          role: 'user',
          content: '请回复"连接测试成功"'
        }
      ]);

      // 恢复原始环境变量
      if (originalApiKey) {
        process.env.DEEPSEEK_API_KEY = originalApiKey;
      } else {
        delete process.env.DEEPSEEK_API_KEY;
      }

      if (testResponse && testResponse.length > 0) {
        res.json({
          success: true,
          message: 'DeepSeek连接测试成功',
          data: {
            response: testResponse
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'DeepSeek响应异常'
        });
      }
    } catch (error) {
      // 恢复原始环境变量
      if (originalApiKey) {
        process.env.DEEPSEEK_API_KEY = originalApiKey;
      } else {
        delete process.env.DEEPSEEK_API_KEY;
      }
      
      throw error;
    }
  } catch (error) {
    console.error('DeepSeek连接测试失败:', error);
    
    let errorMessage = 'DeepSeek连接测试失败';
    let suggestions: string[] = [];
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 根据错误类型提供建议
      if (error.message.includes('测试密钥')) {
        suggestions = [
          '请访问 https://platform.deepseek.com 获取真实的API密钥',
          '在设置页面更新您的DeepSeek API密钥',
          '确保API密钥格式正确（以sk-开头）'
        ];
      } else if (error.message.includes('无效') || error.message.includes('401')) {
        suggestions = [
          '请检查API密钥是否正确',
          '确认API密钥是否已激活',
          '检查API密钥是否有足够的余额'
        ];
      } else if (error.message.includes('网络') || error.message.includes('连接')) {
        suggestions = [
          '请检查网络连接',
          '确认API地址配置是否正确',
          '检查防火墙设置'
        ];
      } else if (error.message.includes('频率')) {
        suggestions = [
          '请稍后重试',
          '考虑降低请求频率'
        ];
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    });
  }
});

// 测试PubMed API连接
router.post('/pubmed', async (req, res) => {
  try {
    const { 
      baseUrl, 
      apiKey, 
      toolName, 
      email, 
      rateLimit, 
      retryAttempts, 
      retryDelay 
    } = req.body;

    if (!baseUrl) {
      return res.status(400).json({
        success: false,
        message: 'PubMed基础地址不能为空'
      });
    }

    if (!toolName) {
      return res.status(400).json({
        success: false,
        message: '工具名称不能为空'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '开发者邮箱不能为空'
      });
    }

    // 创建带有配置的PubMed服务实例
    const pubmedService = new PubMedService({
      baseUrl,
      apiKey: apiKey || undefined,
      toolName,
      email,
      rateLimit: rateLimit || 3,
      retryAttempts: retryAttempts || 3,
      retryDelay: retryDelay || 1000
    });
    
    // 发送一个简单的测试搜索请求
    const testResult = await pubmedService.searchArticles('covid', 1);

    if (testResult && testResult.articles && testResult.articles.length > 0) {
      res.json({
        success: true,
        message: 'PubMed连接测试成功',
        data: {
          totalCount: testResult.totalCount,
          testArticle: testResult.articles[0].title,
          rateLimit: apiKey ? '10次/秒 (有API密钥)' : '3次/秒 (无API密钥)'
        }
      });
    } else {
      res.json({
        success: true,
        message: 'PubMed连接成功，但测试搜索无结果',
        data: {
          totalCount: testResult.totalCount,
          rateLimit: apiKey ? '10次/秒 (有API密钥)' : '3次/秒 (无API密钥)'
        }
      });
    }
  } catch (error) {
    console.error('PubMed连接测试失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'PubMed连接测试失败'
    });
  }
});

export default router;