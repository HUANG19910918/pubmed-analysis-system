import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { KeywordResult } from '../types/keyword';

interface KeywordTrendChartProps {
  keywords: KeywordResult[];
  onKeywordClick?: (keyword: string) => void;
}

const KeywordTrendChart: React.FC<KeywordTrendChartProps> = ({ keywords, onKeywordClick }) => {
  // 准备趋势数据 - 显示TF-IDF分数的分布
  const trendData = keywords.slice(0, 30).map((keyword, index) => ({
    rank: index + 1,
    word: keyword.word,
    tfidf: Number(keyword.tfidf.toFixed(4)),
    frequency: keyword.frequency,
    documentCount: keyword.documentCount
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`排名: ${label}`}</p>
          <p className="font-medium text-blue-600">{`关键词: ${data.word}`}</p>
          <p className="text-green-600">{`TF-IDF分数: ${data.tfidf}`}</p>
          <p className="text-purple-600">{`总频次: ${data.frequency}`}</p>
          <p className="text-orange-600">{`文档数: ${data.documentCount}`}</p>
          <p className="text-xs text-gray-500 mt-1">点击搜索此关键词</p>
        </div>
      );
    }
    return null;
  };

  const handlePointClick = (data: any) => {
    if (onKeywordClick && data && data.word) {
      onKeywordClick(data.word);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* TF-IDF分数趋势图 */}
      <div className="h-80">
        <h4 className="text-lg font-medium text-gray-800 mb-3">TF-IDF分数分布趋势</h4>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="rank" 
              tick={{ fontSize: 12 }}
              label={{ value: '关键词排名', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'TF-IDF分数', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="tfidf"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4, cursor: 'pointer' }}
              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#ffffff' }}
              onClick={handlePointClick}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 频次分布对比图 */}
      <div className="h-80">
        <h4 className="text-lg font-medium text-gray-800 mb-3">词频与文档频率对比</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="rank" 
              tick={{ fontSize: 12 }}
              label={{ value: '关键词排名', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: '频次', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="frequency"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
              name="总频次"
            />
            <Line
              type="monotone"
              dataKey="documentCount"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
              name="文档数"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 统计信息卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {keywords.length}
          </div>
          <div className="text-sm text-blue-800">总关键词数</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {keywords.length > 0 ? keywords[0].tfidf.toFixed(3) : '0'}
          </div>
          <div className="text-sm text-green-800">最高TF-IDF</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {keywords.reduce((sum, k) => sum + k.frequency, 0)}
          </div>
          <div className="text-sm text-purple-800">总词频</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {keywords.length > 0 ? (keywords.reduce((sum, k) => sum + k.tfidf, 0) / keywords.length).toFixed(3) : '0'}
          </div>
          <div className="text-sm text-orange-800">平均TF-IDF</div>
        </div>
      </div>
    </div>
  );
};

export default KeywordTrendChart;