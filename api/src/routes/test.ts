import { Router } from 'express';
import { DeepSeekService } from '../services/deepseek';
import { PubMedService } from '../services/pubmed';

const router = Router();

// 通用服务连接测试
router.post('/connection', async (req, res) => {
  try {
    const { service, ...config } = req.body;

    if (!service) {
      return res.status(400).json({
        success: false,
        message: '请指定要测试的服务类型 (deepseek 或 pubmed)'
      });
    }

    if (service === 'deepseek') {
      const { apiKey, baseUrl } = config;

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
            message: 'DeepSeek返回空响应'
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
    } else if (service === 'pubmed') {
      const { 
        baseUrl, 
        apiKey, 
        toolName, 
        email, 
        rateLimit, 
        retryAttempts, 
        retryDelay 
      } = config;

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
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的服务类型，请使用 deepseek 或 pubmed'
      });
    }
  } catch (error) {
    console.error('服务连接测试失败:', error);
    
    let errorMessage = '服务连接测试失败';
    const suggestions: string[] = [];
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 根据错误类型提供建议
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        suggestions.push('请检查API密钥是否正确');
        suggestions.push('确认API密钥是否有效且未过期');
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        suggestions.push('API密钥可能没有足够的权限');
        suggestions.push('请检查账户余额或使用限制');
      } else if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        suggestions.push('网络连接超时，请检查网络连接');
        suggestions.push('可能是服务器暂时不可用，请稍后重试');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        suggestions.push('无法解析域名，请检查基础地址是否正确');
        suggestions.push('请确认网络连接正常');
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    });
  }
});

export default router;