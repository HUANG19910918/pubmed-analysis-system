import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, EyeOff, TestTube, Save, Trash2, Plus } from 'lucide-react';

interface AIModelConfig {
  name: string;
  displayName: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

interface AIModelStatus {
  name: string;
  isAvailable: boolean;
  lastChecked: Date;
  latency?: number;
  error?: string;
}

interface AIModelSettingsProps {
  onConfigChange?: (configs: AIModelConfig[]) => void;
}

const DEFAULT_MODELS: Omit<AIModelConfig, 'apiKey' | 'enabled'>[] = [
  {
    name: 'openai',
    displayName: 'OpenAI GPT',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  },
  {
    name: 'claude',
    displayName: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-haiku-20240307'
  },
  {
    name: 'gemini',
    displayName: 'Google Gemini',
    baseUrl: '',
    model: 'gemini-1.5-flash'
  },
  {
    name: 'deepseek',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  }
];

export default function AIModelSettings({ onConfigChange }: AIModelSettingsProps) {
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AIModelStatus>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 从localStorage加载配置
  useEffect(() => {
    const savedConfigs = localStorage.getItem('ai-models-config');
    if (savedConfigs) {
      try {
        const parsedConfigs = JSON.parse(savedConfigs);
        setConfigs(parsedConfigs);
      } catch (error) {
        console.error('Failed to parse AI models config:', error);
        initializeDefaultConfigs();
      }
    } else {
      initializeDefaultConfigs();
    }
  }, []);

  // 初始化默认配置
  const initializeDefaultConfigs = () => {
    const defaultConfigs = DEFAULT_MODELS.map(model => ({
      ...model,
      apiKey: '',
      enabled: model.name === 'deepseek' // 默认启用DeepSeek
    }));
    setConfigs(defaultConfigs);
  };

  // 更新配置
  const updateConfig = (name: string, updates: Partial<AIModelConfig>) => {
    setConfigs(prev => prev.map(config => 
      config.name === name ? { ...config, ...updates } : config
    ));
  };

  // 切换API密钥显示
  const toggleApiKeyVisibility = (name: string) => {
    setShowApiKeys(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // 测试单个模型连接
  const testModelConnection = async (config: AIModelConfig) => {
    if (!config.apiKey.trim()) {
      setStatuses(prev => ({
        ...prev,
        [config.name]: {
          name: config.name,
          isAvailable: false,
          lastChecked: new Date(),
          error: 'API密钥不能为空'
        }
      }));
      return;
    }

    setIsTesting(prev => ({ ...prev, [config.name]: true }));

    try {
      const response = await fetch(`/api/ai/models/${config.name}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model
        })
      });

      const result = await response.json();

      if (result.success && result.data.success) {
        setStatuses(prev => ({
          ...prev,
          [config.name]: {
            name: config.name,
            isAvailable: true,
            lastChecked: new Date(),
            latency: result.data.latency
          }
        }));
      } else {
        setStatuses(prev => ({
          ...prev,
          [config.name]: {
            name: config.name,
            isAvailable: false,
            lastChecked: new Date(),
            error: result.data?.error || result.error || '连接失败'
          }
        }));
      }
    } catch (error) {
      setStatuses(prev => ({
        ...prev,
        [config.name]: {
          name: config.name,
          isAvailable: false,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : '网络错误'
        }
      }));
    } finally {
      setIsTesting(prev => ({ ...prev, [config.name]: false }));
    }
  };

  // 测试所有启用的模型
  const testAllConnections = async () => {
    const enabledConfigs = configs.filter(config => config.enabled && config.apiKey.trim());
    
    for (const config of enabledConfigs) {
      await testModelConnection(config);
    }
  };

  // 保存配置
  const saveConfigs = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // 验证配置
      const enabledConfigs = configs.filter(config => config.enabled);
      if (enabledConfigs.length === 0) {
        throw new Error('至少需要启用一个AI模型');
      }

      for (const config of enabledConfigs) {
        if (!config.apiKey.trim()) {
          throw new Error(`${config.displayName} 的API密钥不能为空`);
        }
      }

      // 保存到localStorage
      localStorage.setItem('ai-models-config', JSON.stringify(configs));
      
      // 通知父组件
      if (onConfigChange) {
        onConfigChange(configs);
      }

      setSaveMessage('AI模型配置保存成功！');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // 获取状态图标
  const getStatusIcon = (name: string) => {
    const status = statuses[name];
    if (!status) {
      return <div className="h-5 w-5 bg-gray-300 rounded-full" />;
    }

    if (status.isAvailable) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  // 获取状态文本
  const getStatusText = (name: string) => {
    const status = statuses[name];
    if (!status) {
      return '未测试';
    }

    if (status.isAvailable) {
      return `连接正常${status.latency ? ` (${status.latency}ms)` : ''}`;
    } else {
      return `连接失败: ${status.error || '未知错误'}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">AI模型配置</h2>
        <div className="flex space-x-2">
          <button
            onClick={testAllConnections}
            disabled={Object.values(isTesting).some(Boolean)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <TestTube className="mr-1.5 h-4 w-4" />
            测试所有
          </button>
          <button
            onClick={saveConfigs}
            disabled={isSaving}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin -ml-1 mr-1.5 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                保存配置
              </>
            )}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-md text-sm ${
          saveMessage.includes('成功') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {saveMessage}
        </div>
      )}

      <div className="grid gap-6">
        {configs.map((config) => (
          <div key={config.name} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => updateConfig(config.name, { enabled: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <h3 className="text-lg font-medium text-gray-900">{config.displayName}</h3>
                <span className="text-sm text-gray-500">({config.name})</span>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(config.name)}
                <span className="text-sm text-gray-600">
                  {getStatusText(config.name)}
                </span>
                <button
                  onClick={() => testModelConnection(config)}
                  disabled={isTesting[config.name] || !config.enabled}
                  className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isTesting[config.name] ? (
                    <>
                      <div className="animate-spin -ml-1 mr-1 h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                      测试中
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-1 h-3 w-3" />
                      测试
                    </>
                  )}
                </button>
              </div>
            </div>

            {config.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API 密钥 *
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKeys[config.name] ? 'text' : 'password'}
                        value={config.apiKey}
                        onChange={(e) => updateConfig(config.name, { apiKey: e.target.value })}
                        placeholder={`输入${config.displayName} API密钥`}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => toggleApiKeyVisibility(config.name)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showApiKeys[config.name] ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => updateConfig(config.name, { model: e.target.value })}
                      placeholder="模型名称"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {config.name !== 'gemini' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API 基础地址
                    </label>
                    <input
                      type="url"
                      value={config.baseUrl}
                      onChange={(e) => updateConfig(config.name, { baseUrl: e.target.value })}
                      placeholder="API基础地址"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* 模型特定的配置提示 */}
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-sm text-gray-600">
                    {config.name === 'openai' && (
                      <>
                        <strong>OpenAI配置提示:</strong> API密钥格式为 sk-xxx，支持 GPT-3.5、GPT-4 等模型
                      </>
                    )}
                    {config.name === 'claude' && (
                      <>
                        <strong>Claude配置提示:</strong> API密钥格式为 sk-ant-xxx，支持 Claude-3 系列模型
                      </>
                    )}
                    {config.name === 'gemini' && (
                      <>
                        <strong>Gemini配置提示:</strong> 使用Google AI Studio获取API密钥，支持 Gemini-1.5 系列模型
                      </>
                    )}
                    {config.name === 'deepseek' && (
                      <>
                        <strong>DeepSeek配置提示:</strong> 从DeepSeek官网获取API密钥，支持 deepseek-chat 等模型
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">使用说明</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• 至少需要启用一个AI模型才能使用文献分析功能</p>
          <p>• 建议配置多个模型以实现备份</p>
          <p>• 测试连接成功后再保存配置，确保模型可正常使用</p>
          <p>• 不同模型有不同的定价策略，请根据需求选择合适的模型</p>
        </div>
      </div>
    </div>
  );
}