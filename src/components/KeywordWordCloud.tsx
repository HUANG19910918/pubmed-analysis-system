import React from 'react';
import { KeywordResult } from '../types/keyword';

interface KeywordWordCloudProps {
  keywords: KeywordResult[];
  onKeywordClick?: (keyword: string) => void;
}

const KeywordWordCloud: React.FC<KeywordWordCloudProps> = ({ keywords, onKeywordClick }) => {
  // 取前30个关键词
  const cloudData = keywords.slice(0, 30);
  
  // 计算字体大小和颜色
  const maxTfidf = Math.max(...cloudData.map(k => k.tfidf));
  const minTfidf = Math.min(...cloudData.map(k => k.tfidf));
  
  const getWordStyle = (keyword: KeywordResult, index: number) => {
    // 根据TF-IDF分数计算字体大小 (12px - 32px)
    const normalizedScore = (keyword.tfidf - minTfidf) / (maxTfidf - minTfidf);
    const fontSize = 12 + normalizedScore * 20;
    
    // 颜色渐变
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
      '#14B8A6', '#F43F5E', '#8B5A2B', '#7C3AED', '#DC2626'
    ];
    
    const color = colors[index % colors.length];
    
    // 透明度根据重要性
    const opacity = 0.6 + normalizedScore * 0.4;
    
    return {
      fontSize: `${fontSize}px`,
      color: color,
      opacity: opacity,
      fontWeight: normalizedScore > 0.7 ? 'bold' : 'normal',
      margin: '2px 4px',
      padding: '2px 6px',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'inline-block',
      transition: 'all 0.2s ease',
      lineHeight: '1.2'
    };
  };

  const handleWordClick = (keyword: string) => {
    if (onKeywordClick) {
      onKeywordClick(keyword);
    }
  };

  const handleWordHover = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.currentTarget.style.transform = 'scale(1.1)';
    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  };

  const handleWordLeave = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  return (
    <div className="w-full h-96 p-4 bg-gray-50 rounded-lg overflow-auto">
      <div className="flex flex-wrap justify-center items-center h-full content-center">
        {cloudData.map((keyword, index) => (
          <span
            key={keyword.word}
            style={getWordStyle(keyword, index)}
            onClick={() => handleWordClick(keyword.word)}
            onMouseEnter={handleWordHover}
            onMouseLeave={handleWordLeave}
            title={`TF-IDF: ${keyword.tfidf.toFixed(4)} | 频次: ${keyword.frequency} | 文档数: ${keyword.documentCount}`}
          >
            {keyword.word}
          </span>
        ))}
      </div>
      
      {/* 图例说明 */}
      <div className="mt-4 text-center">
        <div className="flex justify-center items-center space-x-6 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
            <span>字体大小 = TF-IDF分数</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-gray-800 rounded mr-1"></div>
            <span>透明度 = 重要程度</span>
          </div>
          <div className="text-gray-500">
            点击词汇进行搜索
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeywordWordCloud;