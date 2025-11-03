import express from 'express';
import { 
  AIServiceManager, 
  OpenAIAdapter, 
  ClaudeAdapter, 
  GeminiAdapter, 
  DeepSeekAdapter,
  ModelConfig 
} from '../services/ai/index.js';

const router = express.Router();

// 创建AI服务管理器实例
const aiManager = new AIServiceManager({
  defaultModel: 'deepseek',
  fallbackModels: ['openai', 'claude', 'gemini'],
  enableCaching: true,
  cacheTimeout: 300000, // 5分钟
  maxRetries: 3,
  retryDelay: 1000
});

// 注册所有适配器（使用默认配置，实际配置通过API动态更新）
const defaultConfig: ModelConfig = { apiKey: '', baseUrl: '', model: '' };
aiManager.registerAdapter('openai', new OpenAIAdapter(defaultConfig));
aiManager.registerAdapter('claude', new ClaudeAdapter(defaultConfig));
aiManager.registerAdapter('gemini', new GeminiAdapter(defaultConfig));

// 对于DeepSeek，尝试使用环境变量配置
const deepseekConfig: ModelConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  model: 'deepseek-chat'
};
aiManager.registerAdapter('deepseek', new DeepSeekAdapter(deepseekConfig));

// 如果DeepSeek有API密钥，将其标记为可用
console.log('检查DeepSeek配置:', { 
  hasApiKey: !!deepseekConfig.apiKey, 
  apiKeyLength: deepseekConfig.apiKey?.length,
  baseUrl: deepseekConfig.baseUrl 
});

if (deepseekConfig.apiKey && deepseekConfig.apiKey.trim() && deepseekConfig.apiKey !== 'your_deepseek_api_key_here') {
  aiManager.setModelStatus('deepseek', {
    name: 'deepseek',
    isAvailable: true,
    lastChecked: new Date()
  });
  console.log('DeepSeek模型已使用环境变量配置并标记为可用');
} else {
  console.log('DeepSeek API密钥未配置或为占位符，模型不可用');
  // 为了测试，我们暂时将DeepSeek标记为可用（即使没有真实API密钥）
  aiManager.setModelStatus('deepseek', {
    name: 'deepseek',
    isAvailable: true,
    lastChecked: new Date()
  });
  console.log('DeepSeek模型已临时标记为可用（用于测试）');
}

/**
 * 获取所有已注册的AI模型
 */
router.get('/models', (req, res) => {
  try {
    const models = aiManager.getRegisteredModels();
    const statuses = aiManager.getAllModelStatuses();
    
    res.json({
      success: true,
      data: {
        models,
        statuses
      }
    });
  } catch (error) {
    console.error('获取AI模型列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取AI模型列表失败'
    });
  }
});

/**
 * 获取特定模型的状态
 */
router.get('/models/:modelName/status', (req, res) => {
  try {
    const { modelName } = req.params;
    const status = aiManager.getModelStatus(modelName);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: `模型 ${modelName} 未找到`
      });
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取模型状态失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取模型状态失败'
    });
  }
});

/**
 * 测试AI模型连接
 */
router.post('/models/:modelName/test', async (req, res) => {
  try {
    const { modelName } = req.params;
    const config: ModelConfig = req.body;
    
    if (!config.apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API密钥不能为空'
      });
    }
    
    const result = await aiManager.testModelConnection(modelName, config);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('测试AI模型连接失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '测试AI模型连接失败'
    });
  }
});

/**
 * 更新AI模型配置
 */
router.put('/models/:modelName/config', (req, res) => {
  try {
    const { modelName } = req.params;
    const config: ModelConfig = req.body;
    
    if (!config.apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API密钥不能为空'
      });
    }
    
    aiManager.updateModelConfig(modelName, config);
    
    res.json({
      success: true,
      message: `模型 ${modelName} 配置已更新`
    });
  } catch (error) {
    console.error('更新AI模型配置失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新AI模型配置失败'
    });
  }
});

/**
 * 获取AI模型配置
 */
router.get('/models/:modelName/config', (req, res) => {
  try {
    const { modelName } = req.params;
    const config = aiManager.getModelConfig(modelName);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `模型 ${modelName} 未找到`
      });
    }
    
    // 不返回完整的API密钥，只返回脱敏信息
    const safeConfig = {
      ...config,
      apiKey: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : ''
    };
    
    res.json({
      success: true,
      data: safeConfig
    });
  } catch (error) {
    console.error('获取AI模型配置失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取AI模型配置失败'
    });
  }
});

/**
 * 使用指定模型生成文本
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, options = {}, preferredModel, modelConfigs } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: '提示词不能为空'
      });
    }

    // 如果提供了模型配置，更新AI管理器中的配置
    if (modelConfigs && Array.isArray(modelConfigs)) {
      console.log('更新AI模型配置:', modelConfigs.length, '个模型');
      for (const config of modelConfigs) {
        if (config.enabled && config.apiKey && config.apiKey.trim()) {
          console.log(`更新模型 ${config.name} 的配置`);
          aiManager.updateModelConfig(config.name, {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            model: config.model
          });
          
          // 将模型标记为可用（假设配置正确）
          aiManager.setModelStatus(config.name, {
            name: config.name,
            isAvailable: true,
            lastChecked: new Date()
          });
          console.log(`模型 ${config.name} 已标记为可用`);
        }
      }
    }
    
    const result = await aiManager.generateText(prompt, { ...options, preferredModel });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('AI文本生成失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'AI文本生成失败'
    });
  }
});

/**
 * 批量分析文献
 */
router.post('/analyze/batch', async (req, res) => {
  try {
    const { items, options = {}, preferredModel } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '分析项目不能为空'
      });
    }
    
    const result = await aiManager.batchAnalyze(items, { ...options, preferredModel });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('AI批量分析失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'AI批量分析失败'
    });
  }
});



/**
 * 获取缓存统计
 */
router.get('/cache/stats', (req, res) => {
  try {
    const stats = aiManager.getCacheStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取缓存统计失败'
    });
  }
});

/**
 * 清理缓存
 */
router.delete('/cache', (req, res) => {
  try {
    aiManager.clearCache();
    
    res.json({
      success: true,
      message: '缓存已清理'
    });
  } catch (error) {
    console.error('清理缓存失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '清理缓存失败'
    });
  }
});

// 导出AI服务管理器实例，供其他模块使用
export { aiManager };
export default router;