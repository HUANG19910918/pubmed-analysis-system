import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, TestTube, CheckCircle, XCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import AIModelSettings from '../components/AIModelSettings';

interface ConfigSettings {
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  pubmedMaxResults: number;
  pubmedBaseUrl: string;
  pubmedApiKey: string;
  pubmedToolName: string;
  pubmedEmail: string;
  pubmedRateLimit: number;
  pubmedRetryAttempts: number;
  pubmedRetryDelay: number;
}

interface SystemStatus {
  deepseekConnection: 'unknown' | 'connected' | 'error';
  pubmedConnection: 'unknown' | 'connected' | 'error';
}

export default function Settings() {
  const [config, setConfig] = useState<ConfigSettings>({
    deepseekApiKey: '',
    deepseekBaseUrl: 'https://api.deepseek.com',
    pubmedMaxResults: 20,
    pubmedBaseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
    pubmedApiKey: '',
    pubmedToolName: 'PubMed Analysis System',
    pubmedEmail: '',
    pubmedRateLimit: 3,
    pubmedRetryAttempts: 3,
    pubmedRetryDelay: 1000
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    deepseekConnection: 'unknown',
    pubmedConnection: 'unknown'
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 从localStorage加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('pubmed-analysis-config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      } catch (error) {
        console.error('Failed to parse saved config:', error);
      }
    }
  }, []);

  // 保存配置到localStorage
  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // 验证必填字段
      if (!config.deepseekApiKey.trim()) {
        throw new Error('DeepSeek API密钥不能为空');
      }

      if (!config.deepseekBaseUrl.trim()) {
        throw new Error('DeepSeek API地址不能为空');
      }

      if (!config.pubmedToolName.trim()) {
        throw new Error('PubMed工具名称不能为空');
      }

      if (!config.pubmedEmail.trim()) {
        throw new Error('PubMed开发者邮箱不能为空');
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.pubmedEmail)) {
        throw new Error('请输入有效的邮箱地址');
      }

      if (config.pubmedMaxResults < 1 || config.pubmedMaxResults > 100) {
        throw new Error('PubMed搜索结果数量必须在1-100之间');
      }

      if (config.pubmedRateLimit < 1 || config.pubmedRateLimit > 10) {
        throw new Error('请求频率限制必须在1-10之间');
      }

      if (config.pubmedRetryAttempts < 1 || config.pubmedRetryAttempts > 10) {
        throw new Error('重试次数必须在1-10之间');
      }

      if (config.pubmedRetryDelay < 100 || config.pubmedRetryDelay > 10000) {
        throw new Error('重试延迟必须在100-10000毫秒之间');
      }

      // 保存到localStorage
      localStorage.setItem('pubmed-analysis-config', JSON.stringify(config));
      
      setSaveMessage('配置保存成功！');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // 测试连接
  const handleTestConnections = async () => {
    setIsTesting(true);
    setSystemStatus({
      deepseekConnection: 'unknown',
      pubmedConnection: 'unknown'
    });

    // 测试DeepSeek连接
    try {
      const response = await fetch('/api/test/deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: config.deepseekApiKey,
          baseUrl: config.deepseekBaseUrl
        })
      });

      if (response.ok) {
        setSystemStatus(prev => ({ ...prev, deepseekConnection: 'connected' }));
      } else {
        setSystemStatus(prev => ({ ...prev, deepseekConnection: 'error' }));
      }
    } catch (error) {
      setSystemStatus(prev => ({ ...prev, deepseekConnection: 'error' }));
    }

    // 测试PubMed连接
    try {
      const response = await fetch('/api/test/pubmed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: config.pubmedBaseUrl,
          apiKey: config.pubmedApiKey,
          toolName: config.pubmedToolName,
          email: config.pubmedEmail,
          rateLimit: config.pubmedRateLimit,
          retryAttempts: config.pubmedRetryAttempts,
          retryDelay: config.pubmedRetryDelay
        })
      });

      if (response.ok) {
        setSystemStatus(prev => ({ ...prev, pubmedConnection: 'connected' }));
      } else {
        setSystemStatus(prev => ({ ...prev, pubmedConnection: 'error' }));
      }
    } catch (error) {
      setSystemStatus(prev => ({ ...prev, pubmedConnection: 'error' }));
    }

    setIsTesting(false);
  };

  const getStatusIcon = (status: 'unknown' | 'connected' | 'error') => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 bg-gray-300 rounded-full" />;
    }
  };

  const getStatusText = (status: 'unknown' | 'connected' | 'error') => {
    switch (status) {
      case 'connected':
        return '连接正常';
      case 'error':
        return '连接失败';
      default:
        return '未测试';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link 
                to="/" 
                className="inline-flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                返回主页
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">系统配置</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* AI模型配置区块 */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <AIModelSettings />
            </div>
          </div>

          {/* 原有配置区块 */}
          <div className="bg-white rounded-lg shadow-md">
            {/* DeepSeek API 配置 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">DeepSeek API 配置</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API 密钥 *
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={config.deepseekApiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, deepseekApiKey: e.target.value }))}
                      placeholder="sk-your-deepseek-api-key-here"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API 基础地址
                  </label>
                  <input
                    type="url"
                    value={config.deepseekBaseUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, deepseekBaseUrl: e.target.value }))}
                    placeholder="https://api.deepseek.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  {getStatusIcon(systemStatus.deepseekConnection)}
                  <span className="text-sm text-gray-600">
                    DeepSeek 连接状态: {getStatusText(systemStatus.deepseekConnection)}
                  </span>
                </div>
              </div>
            </div>

            {/* PubMed API 配置 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">PubMed API 配置</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API 基础地址
                  </label>
                  <input
                    type="url"
                    value={config.pubmedBaseUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, pubmedBaseUrl: e.target.value }))}
                    placeholder="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NCBI API 密钥
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={config.pubmedApiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, pubmedApiKey: e.target.value }))}
                      placeholder="输入您的NCBI API密钥（可选）"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    有API密钥可将请求限制从3次/秒提升至10次/秒
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      工具名称 *
                    </label>
                    <input
                      type="text"
                      value={config.pubmedToolName}
                      onChange={(e) => setConfig(prev => ({ ...prev, pubmedToolName: e.target.value }))}
                      placeholder="PubMed Analysis System"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      必须向NCBI注册的工具名称
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开发者邮箱 *
                    </label>
                    <input
                      type="email"
                      value={config.pubmedEmail}
                      onChange={(e) => setConfig(prev => ({ ...prev, pubmedEmail: e.target.value }))}
                      placeholder="your-email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      必须向NCBI注册的联系邮箱
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      请求频率限制 (次/秒)
                    </label>
                    <select
                      value={config.pubmedRateLimit}
                      onChange={(e) => setConfig(prev => ({ ...prev, pubmedRateLimit: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value={1}>1 次/秒</option>
                      <option value={2}>2 次/秒</option>
                      <option value={3}>3 次/秒</option>
                      <option value={5}>5 次/秒</option>
                      <option value={10}>10 次/秒</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      重试次数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.pubmedRetryAttempts}
                      onChange={(e) => setConfig(prev => ({ ...prev, pubmedRetryAttempts: parseInt(e.target.value) || 3 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      重试延迟 (毫秒)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      step="100"
                      value={config.pubmedRetryDelay}
                      onChange={(e) => setConfig(prev => ({ ...prev, pubmedRetryDelay: parseInt(e.target.value) || 1000 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    默认搜索结果数量
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.pubmedMaxResults}
                    onChange={(e) => setConfig(prev => ({ ...prev, pubmedMaxResults: parseInt(e.target.value) || 20 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">建议设置为10-50之间，过多可能影响性能</p>
                </div>

                <div className="flex items-center space-x-3">
                  {getStatusIcon(systemStatus.pubmedConnection)}
                  <span className="text-sm text-gray-600">
                    PubMed 连接状态: {getStatusText(systemStatus.pubmedConnection)}
                  </span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  <button
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存配置
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleTestConnections}
                    disabled={isTesting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                        测试中...
                      </>
                    ) : (
                      <>
                        <TestTube className="mr-2 h-4 w-4" />
                        测试连接
                      </>
                    )}
                  </button>
                </div>

                {saveMessage && (
                  <div className={`text-sm ${saveMessage.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
                    {saveMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 配置说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">配置说明</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">DeepSeek API 配置:</p>
              <p>• <strong>API密钥</strong>: 用于AI文献分析功能，请从DeepSeek官网获取</p>
              <p>• <strong>基础地址</strong>: 通常使用默认地址即可，除非有特殊需求</p>
            </div>
            
            <div>
              <p className="font-semibold mb-1">PubMed API 配置:</p>
              <p>• <strong>NCBI API密钥</strong>: 可选，有密钥可将请求限制从3次/秒提升至10次/秒</p>
              <p>• <strong>工具名称</strong>: 必填，向NCBI标识您的应用程序</p>
              <p>• <strong>开发者邮箱</strong>: 必填，NCBI要求提供联系方式</p>
              <p>• <strong>请求频率</strong>: 控制API调用频率，避免被限制访问</p>
              <p>• <strong>重试设置</strong>: 网络异常时的重试策略</p>
              <p>• <strong>搜索结果数量</strong>: 控制每次搜索返回的文献数量，建议10-50之间</p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
              <p className="font-semibold text-yellow-800">重要提示:</p>
              <p className="text-yellow-700">
                • 工具名称和邮箱是NCBI E-utilities的必需参数<br/>
                • 请确保邮箱地址真实有效，NCBI可能会发送重要通知<br/>
                • 配置保存后会立即生效，建议先测试连接确保配置正确
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}