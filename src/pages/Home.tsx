import React, { useState, useEffect } from 'react';
import { Search, FileText, Brain, TrendingUp, BookOpen, Loader2, Settings, ChevronDown, CheckCircle, XCircle, Zap, Calendar, RotateCcw, Square, CheckSquare, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { log } from '../utils/logger';


interface Article {
  pmid: string;
  title: string;
  abstract: string;
  authors: string;
  journal: string;
  pubDate: string;
  doi?: string;
  keywords?: string[];
}

interface SearchResult {
  articles: Article[];
  totalCount: number;
  searchTerm: string;
}

interface AIModel {
  name: string;
  displayName: string;
  enabled: boolean;
  isAvailable?: boolean;
}

interface AnalysisResult {
  modelName: string;
  modelDisplayName: string;
  analysis: string;
  error?: string;
  duration?: number;
}





interface DateRange {
  startDate: string;
  endDate: string;
}

interface TimeFilterPreset {
  label: string;
  value: string;
  getDateRange: () => DateRange;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'analysis'>('search');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // 时间筛选相关状态
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [selectedPreset, setSelectedPreset] = useState<string>('all');
  const [showTimeFilter, setShowTimeFilter] = useState(false);

  // 期刊筛选相关状态
  const [journalFilter, setJournalFilter] = useState<string>('');
  const [showJournalFilter, setShowJournalFilter] = useState(false);
  const [journalError, setJournalError] = useState<string>('');

  // 搜索结果数量配置
  const [maxResults, setMaxResults] = useState<number>(20);

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);





  // 时间筛选预设选项
  const timeFilterPresets: TimeFilterPreset[] = [
    {
      label: '全部时间',
      value: 'all',
      getDateRange: () => ({ startDate: '', endDate: '' })
    },
    {
      label: '最近1年',
      value: '1year',
      getDateRange: () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
    },
    {
      label: '最近3年',
      value: '3years',
      getDateRange: () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 3);
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
    },
    {
      label: '最近5年',
      value: '5years',
      getDateRange: () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 5);
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
    },
    {
      label: '最近10年',
      value: '10years',
      getDateRange: () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 10);
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
    },
    {
      label: '自定义',
      value: 'custom',
      getDateRange: () => dateRange
    }
  ];

  // 加载可用的AI模型
  useEffect(() => {
    loadAvailableModels();
  }, []);

  // 加载搜索配置
  useEffect(() => {
    const loadSearchConfig = () => {
      try {
        const savedConfig = localStorage.getItem('pubmed-analysis-config');
        
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          
          if (config.pubmedMaxResults && typeof config.pubmedMaxResults === 'number') {
            setMaxResults(config.pubmedMaxResults);
          }
        }
      } catch (error) {
        log.error('加载搜索配置失败', error);
      }
    };
    
    loadSearchConfig();
  }, []);

  const loadAvailableModels = async () => {
    try {
      // 从localStorage加载AI模型配置
      const savedConfig = localStorage.getItem('ai-models-config');
      if (savedConfig) {
        const configs = JSON.parse(savedConfig);
        const enabledModels = configs
          .filter((config: any) => config.enabled && config.apiKey.trim())
          .map((config: any) => ({
            name: config.name,
            displayName: config.displayName,
            enabled: true
          }));
        
        // 检查模型状态
        const modelsWithStatus = await Promise.all(
          enabledModels.map(async (model: AIModel) => {
            try {
              const response = await fetch(`/api/ai/models/${model.name}/status`);
              const data = await response.json();
              return {
                ...model,
                isAvailable: data.success && data.data.isAvailable
              };
            } catch {
              return { ...model, isAvailable: false };
            }
          })
        );

        setAvailableModels(modelsWithStatus);
        
        // 如果没有选择模型，自动选择第一个可用模型
        if (!selectedModel && modelsWithStatus.length > 0) {
          const firstAvailableModel = modelsWithStatus.find(m => m.isAvailable);
          if (firstAvailableModel) {
            setSelectedModel(firstAvailableModel.name);
          }
        }
      }
    } catch (error) {
      log.error('加载AI模型失败', error);
    }
  };

  // 时间筛选处理函数
  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    const preset = timeFilterPresets.find(p => p.value === presetValue);
    if (preset) {
      const newDateRange = preset.getDateRange();
      setDateRange(newDateRange);
    }
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    // 如果用户手动修改日期，切换到自定义模式
    if (selectedPreset !== 'custom') {
      setSelectedPreset('custom');
    }
  };

  const resetTimeFilter = () => {
    setSelectedPreset('all');
    setDateRange({ startDate: '', endDate: '' });
  };

  // 期刊筛选处理函数
  const validateJournalFormat = (journal: string): { isValid: boolean; error?: string } => {
    if (!journal.trim()) {
      return { isValid: true }; // 空值是有效的（表示不筛选）
    }

    const trimmedJournal = journal.trim();

    // ISSN格式验证 (XXXX-XXXX)
    const issnPattern = /^\d{4}-\d{3}[\dX]$/;
    if (issnPattern.test(trimmedJournal)) {
      return { isValid: true };
    }

    // eISSN格式验证 (XXXX-XXXX)
    if (issnPattern.test(trimmedJournal)) {
      return { isValid: true };
    }

    // 期刊全名验证（允许字母、数字、空格、连字符、点、冒号、括号等常见字符）
    const journalNamePattern = /^[a-zA-Z0-9\s\-\.\:\(\)\&\,\'\"]+$/;
    if (journalNamePattern.test(trimmedJournal) && trimmedJournal.length >= 3) {
      return { isValid: true };
    }

    // 期刊缩写验证（通常较短，包含点号）
    const abbreviationPattern = /^[a-zA-Z0-9\s\-\.]+$/;
    if (abbreviationPattern.test(trimmedJournal) && trimmedJournal.length >= 2) {
      return { isValid: true };
    }

    return { 
      isValid: false, 
      error: '期刊格式不正确。请输入期刊全名、标准缩写或ISSN号码（如：Nature, Nat. Med., 1234-5678）' 
    };
  };

  const handleJournalFilterChange = (value: string) => {
    setJournalFilter(value);
    
    if (value.trim()) {
      const validation = validateJournalFormat(value);
      if (!validation.isValid) {
        setJournalError(validation.error || '期刊格式不正确');
      } else {
        setJournalError('');
      }
    } else {
      setJournalError('');
    }
  };

  const clearJournalFilter = () => {
    setJournalFilter('');
    setJournalError('');
  };

  // 检查是否有有效的搜索条件
  const hasValidSearchConditions = () => {
    // 1. 有关键词
    if (searchQuery.trim()) {
      return true;
    }
    
    // 2. 有时间筛选条件
    const hasTimeFilter = selectedPreset !== 'all' || dateRange.startDate || dateRange.endDate;
    
    // 3. 有期刊筛选条件（且格式正确）
    const hasJournalFilter = journalFilter.trim() && !journalError;
    
    return hasTimeFilter || hasJournalFilter;
  };



  // 执行搜索的核心函数，支持分页
  const performSearch = async (page: number = 1, resetPage: boolean = false) => {
    // 检查是否有有效的搜索条件
    if (!hasValidSearchConditions()) {
      return;
    }

    // 验证期刊格式（如果有输入）
    if (journalFilter.trim()) {
      const validation = validateJournalFormat(journalFilter);
      if (!validation.isValid) {
        setJournalError(validation.error || '期刊格式不正确');
        return;
      }
    }

    setIsSearching(true);
    try {
      // 计算分页参数
      const startIndex = (page - 1) * pageSize;
      
      // 构建搜索URL，包含分页、时间筛选和期刊筛选参数
      let searchUrl = `/api/literature/search?maxResults=${pageSize}&startIndex=${startIndex}`;
      
      // 添加查询参数（如果有）
      if (searchQuery.trim()) {
        searchUrl += `&query=${encodeURIComponent(searchQuery)}`;
      }
      
      // 添加时间筛选参数
      const currentDateRange = selectedPreset === 'custom' ? dateRange : 
        timeFilterPresets.find(p => p.value === selectedPreset)?.getDateRange() || { startDate: '', endDate: '' };
      
      if (currentDateRange.startDate) {
        searchUrl += `&startDate=${encodeURIComponent(currentDateRange.startDate)}`;
      }
      if (currentDateRange.endDate) {
        searchUrl += `&endDate=${encodeURIComponent(currentDateRange.endDate)}`;
      }

      // 添加期刊筛选参数
      if (journalFilter.trim()) {
        searchUrl += `&journal=${encodeURIComponent(journalFilter.trim())}`;
      }

      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
        setActiveTab('search');
        
        // 更新分页信息
        const totalCount = data.data.totalCount;
        const calculatedTotalPages = Math.ceil(totalCount / pageSize);
        setTotalPages(calculatedTotalPages);
        
        if (resetPage) {
          setCurrentPage(1);
        } else {
          setCurrentPage(page);
        }
      } else {
        log.error('搜索失败', null, { message: data.message });
      }
    } catch (error) {
      log.error('搜索错误', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 处理新搜索（重置到第一页）
  const handleSearch = () => {
    performSearch(1, true);
  };

  // 处理页码变更
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      performSearch(page, false);
    }
  };

  // 处理每页数量变更
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // 重置到第一页并重新搜索
    performSearch(1, true);
  };

  const handleArticleSelect = (article: Article) => {
    setSelectedArticles(prev => {
      const isSelected = prev.some(a => a.pmid === article.pmid);
      if (isSelected) {
        return prev.filter(a => a.pmid !== article.pmid);
      } else {
        return [...prev, article];
      }
    });
  };

  // 全选/取消全选功能
  const handleSelectAll = () => {
    if (!searchResults?.articles) return;
    
    const allSelected = searchResults.articles.every(article => 
      selectedArticles.some(selected => selected.pmid === article.pmid)
    );
    
    if (allSelected) {
      // 取消全选：移除当前搜索结果中的所有文章
      setSelectedArticles(prev => 
        prev.filter(selected => 
          !searchResults.articles.some(article => article.pmid === selected.pmid)
        )
      );
    } else {
      // 全选：添加当前搜索结果中未选择的文章
      setSelectedArticles(prev => {
        const newSelections = searchResults.articles.filter(article => 
          !prev.some(selected => selected.pmid === article.pmid)
        );
        return [...prev, ...newSelections];
      });
    }
  };

  // 检查是否全选状态
  const isAllSelected = () => {
    if (!searchResults?.articles || searchResults.articles.length === 0) return false;
    return searchResults.articles.every(article => 
      selectedArticles.some(selected => selected.pmid === article.pmid)
    );
  };

  // 检查是否部分选择状态
  const isPartiallySelected = () => {
    if (!searchResults?.articles || searchResults.articles.length === 0) return false;
    const selectedCount = searchResults.articles.filter(article => 
      selectedArticles.some(selected => selected.pmid === article.pmid)
    ).length;
    return selectedCount > 0 && selectedCount < searchResults.articles.length;
  };





  const handleAnalyzeSelected = async () => {
    // 使用函数式更新来获取最新的selectedArticles状态
    setSelectedArticles(currentSelected => {
      if (currentSelected.length === 0) return currentSelected;
      
      // 立即执行AI分析，使用当前最新的选中文献
      handleSingleModelAnalysis(currentSelected);
      return currentSelected;
    });
  };

  const handleSingleModelAnalysis = async (articlesToAnalyze?: Article[]) => {
    // 如果没有传入参数，使用当前状态中的selectedArticles
    const targetArticles = articlesToAnalyze || selectedArticles;
    
    setIsAnalyzing(true);
    try {
      log.userAction('开始AI分析', { 
        selectedArticlesCount: targetArticles.length, 
        selectedModel 
      });
      
      // 从localStorage获取AI模型配置
      const savedConfig = localStorage.getItem('ai-models-config');
      let modelConfigs = [];
      if (savedConfig) {
        try {
          modelConfigs = JSON.parse(savedConfig);
          log.debug('加载AI模型配置', { configCount: modelConfigs.length });
        } catch (error) {
          log.error('解析AI模型配置失败', error);
        }
      }
      
      log.debug('准备发送API请求');
      
      // 始终使用包含完整文献信息的详细prompt
      const analysisPrompt = buildAnalysisPrompt(targetArticles);
      
      const requestBody = {
        prompt: analysisPrompt,
        preferredModel: selectedModel,
        modelConfigs: modelConfigs,
        options: {
          maxTokens: 4000, // 增加token限制以支持更多文献
          temperature: 0.7
        }
      };
      
      const requestSize = JSON.stringify(requestBody).length;
      log.debug('发送AI分析请求', { requestSize: `${requestSize}字符` });
      
      const startTime = Date.now();
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const duration = Date.now() - startTime;
      log.apiRequest('POST', '/api/ai/generate', duration, response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.data.text);
        setActiveTab('analysis');
        log.userAction('AI分析完成', { duration: `${duration}ms` });
      } else {
        const errorMessage = data.error || data.message || '未知错误';
        log.error('AI分析失败', null, { errorMessage });
        alert(`分析失败: ${errorMessage}`);
      }
    } catch (error) {
      log.error('AI分析错误', error);
      alert('分析过程中发生错误，请检查网络连接或稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };



  const buildAnalysisPrompt = (articles: Article[]): string => {
    // 构建文献信息，确保每篇文献都包含完整信息
    const literatureText = articles.map((article, index) => {
      let articleInfo = `文献${index + 1}：\n`;
      articleInfo += `标题：${article.title || '未提供标题'}\n`;
      articleInfo += `发表时间：${article.pubDate || '未知'}\n`;
      
      // 确保摘要存在且不为空
      if (article.abstract && article.abstract.trim()) {
        articleInfo += `摘要：${article.abstract.trim()}\n`;
      } else {
        articleInfo += `摘要：暂无摘要信息\n`;
      }
      
      // 添加关键词（如果有）
      if (article.keywords && Array.isArray(article.keywords) && article.keywords.length > 0) {
        articleInfo += `关键词：${article.keywords.join(', ')}\n`;
      }
      
      // 添加作者信息（如果有）
      if (article.authors && typeof article.authors === 'string' && article.authors.trim()) {
        articleInfo += `作者：${article.authors.trim()}\n`;
      }
      
      return articleInfo;
    }).join('\n');

    return `你是一位专业的医学研究趋势分析专家。我已经为你提供了${articles.length}篇相关文献的详细信息，包括标题、摘要、发表时间和关键词等。请基于这些具体的文献内容进行深入分析。

以下是需要分析的文献：

${literatureText}

请通过分析这些文献的标题和摘要，深入分析当前研究领域的主要发展趋势。请用一段逻辑清楚、连贯流畅的文字来阐述你的分析结果，重点关注研究的演进方向、技术发展脉络、临床应用前景以及未来可能的突破点。请避免使用分点列举的方式，不要使用任何markdown格式标记，而是用自然的段落形式来呈现你的专业见解和趋势判断。`;
  };

  const getModelDisplayName = (modelName: string): string => {
    const model = availableModels.find(m => m.name === modelName);
    return model ? model.displayName : (modelName || '请选择模型');
  };

  // 分页控件组件
  const renderPagination = () => {
    if (!searchResults || totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex items-center space-x-4">
          {/* 每页数量选择器 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">每页显示:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-700">条</span>
          </div>
          
          {/* 分页信息 */}
          <div className="text-sm text-gray-700">
            第 {currentPage} 页，共 {totalPages} 页，总计 {searchResults.totalCount} 条结果
          </div>
        </div>

        {/* 分页导航 */}
        <div className="flex items-center space-x-1">
          {/* 上一页 */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* 页码按钮 */}
          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                1
              </button>
              {startPage > 2 && (
                <span className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`relative inline-flex items-center px-3 py-2 border text-sm font-medium ${
                page === currentPage
                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          {/* 下一页 */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">PubMed 文献分析系统</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                已选择 {selectedArticles.length} 篇文献
              </span>
              
              {/* AI模型选择 */}
              {selectedArticles.length > 0 && (
                <div className="flex items-center space-x-2">
                  {/* 模型选择器 */}
                  <div className="relative">
                    <button
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Zap className="mr-1.5 h-4 w-4" />
                      {getModelDisplayName(selectedModel)}
                      <ChevronDown className="ml-1.5 h-4 w-4" />
                    </button>

                    {showModelSelector && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          {availableModels.map((model) => (
                            <button
                              key={model.name}
                              onClick={() => {
                                setSelectedModel(model.name);
                                setShowModelSelector(false);
                              }}
                              disabled={!model.isAvailable}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                                selectedModel === model.name ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span>{model.displayName}</span>
                                {model.isAvailable ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                              {selectedModel === model.name && <CheckCircle className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAnalyzeSelected}
                    disabled={isAnalyzing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        AI 分析
                      </>
                    )}
                  </button>
                </div>
              )}
              
              <Link
                to="/settings"
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                title="系统设置"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="输入关键词搜索 PubMed 文献..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowTimeFilter(!showTimeFilter)}
              className={`inline-flex items-center px-4 py-3 border text-base font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                showTimeFilter 
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50' 
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <Calendar className="mr-2 h-5 w-5" />
              时间筛选
            </button>
            <button
              onClick={() => setShowJournalFilter(!showJournalFilter)}
              className={`inline-flex items-center px-4 py-3 border text-base font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                showJournalFilter 
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50' 
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              期刊筛选
            </button>
            <button
              onClick={handleSearch}
              disabled={isSearching || !hasValidSearchConditions()}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  搜索中...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  搜索
                </>
              )}
            </button>
          </div>

          {/* Time Filter Panel */}
          {showTimeFilter && (
            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">时间范围:</span>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {timeFilterPresets.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPreset === 'custom' && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <label className="text-sm text-gray-600">从:</label>
                      <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <label className="text-sm text-gray-600">到:</label>
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {(selectedPreset !== 'all' || dateRange.startDate || dateRange.endDate) && (
                  <button
                    onClick={resetTimeFilter}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    重置
                  </button>
                )}

                {selectedPreset !== 'all' && (
                  <div className="text-xs text-gray-500">
                    {selectedPreset === 'custom' ? (
                      `${dateRange.startDate || '不限'} 至 ${dateRange.endDate || '不限'}`
                    ) : (
                      (() => {
                        const preset = timeFilterPresets.find(p => p.value === selectedPreset);
                        if (preset) {
                          const range = preset.getDateRange();
                          return `${range.startDate} 至 ${range.endDate}`;
                        }
                        return '';
                      })()
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Journal Filter Panel */}
          {showJournalFilter && (
            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">目标期刊:</span>
                  <div className="relative">
                    <input
                      type="text"
                      value={journalFilter}
                      onChange={(e) => handleJournalFilterChange(e.target.value)}
                      placeholder="输入期刊名称、缩写或ISSN..."
                      className={`border rounded-md px-3 py-1.5 text-sm w-64 focus:ring-2 focus:ring-indigo-500 ${
                        journalError 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-300 focus:border-indigo-500'
                      }`}
                    />
                    {journalFilter && (
                      <button
                        onClick={clearJournalFilter}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {journalError && (
                  <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    {journalError}
                  </div>
                )}

                {journalFilter && !journalError && (
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex items-center">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    期刊格式正确
                  </div>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                <div className="mb-1"><strong>支持的格式:</strong></div>
                <div className="space-y-1">
                  <div>• 期刊全名: Nature, Science, Cell</div>
                  <div>• 标准缩写: Nat. Med., J. Biol. Chem.</div>
                  <div>• ISSN号码: 1234-5678</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('search')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'search'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="inline mr-2 h-4 w-4" />
              搜索结果
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analysis'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="inline mr-2 h-4 w-4" />
              AI 分析结果
            </button>

          </nav>
        </div>

        {/* Content */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {searchResults && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* 搜索结果头部 */}
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      搜索结果: "{searchResults.searchTerm}"
                    </h2>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleSelectAll}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        title={isAllSelected() ? "取消全选" : "全选"}
                      >
                        {isAllSelected() ? (
                          <>
                            <CheckSquare className="mr-1.5 h-4 w-4 text-indigo-600" />
                            取消全选
                          </>
                        ) : isPartiallySelected() ? (
                          <>
                            <Minus className="mr-1.5 h-4 w-4 text-indigo-600" />
                            全选
                          </>
                        ) : (
                          <>
                            <Square className="mr-1.5 h-4 w-4" />
                            全选
                          </>
                        )}
                      </button>
                      <span className="text-sm text-gray-500">
                        当前页选择 {selectedArticles.length} 篇文献
                      </span>
                    </div>
                  </div>
                </div>

                {/* 顶部分页控件 */}
                {renderPagination()}
                
                {/* 文章列表 */}
                <div className="p-6 pt-4">
                  <div className="space-y-4">
                    {searchResults.articles.map((article) => (
                      <div
                        key={article.pmid}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedArticles.some(a => a.pmid === article.pmid)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleArticleSelect(article)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {article.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">作者:</span> {article.authors}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">期刊:</span> {article.journal} ({article.pubDate})
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {article.abstract}
                            </p>
                            {article.keywords && article.keywords.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {article.keywords.slice(0, 5).map((keyword, index) => (
                                  <span
                                    key={index}
                                    className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedArticles.some(a => a.pmid === article.pmid)}
                              onChange={() => handleArticleSelect(article)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 底部分页控件 */}
                {renderPagination()}
              </div>
            )}

            {!searchResults && !isSearching && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">开始搜索文献</h3>
                <p className="text-gray-500">
                  输入关键词搜索 PubMed 数据库中的医学文献
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* AI分析报告 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {analysis ? (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    AI 文献分析报告
                  </h2>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {analysis}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">AI 分析</h3>
                  <p className="text-gray-500">
                    选择文献后点击"AI 分析"按钮获取智能分析报告
                  </p>
                </div>
              )}
            </div>


          </div>
        )}


      </div>
    </div>
  );
}