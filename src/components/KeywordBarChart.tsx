import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KeywordResult } from '../types/keyword';

interface KeywordBarChartProps {
  keywords: KeywordResult[];
  onKeywordClick?: (keyword: string) => void;
}

const KeywordBarChart: React.FC<KeywordBarChartProps> = ({ keywords, onKeywordClick }) => {
  // 取前20个关键词
  const chartData = keywords.slice(0, 20).map(keyword => ({
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
          <p className="font-semibold text-gray-800">{`关键词: ${label}`}</p>
          <p className="text-blue-600">{`TF-IDF分数: ${data.tfidf}`}</p>
          <p className="text-green-600">{`总频次: ${data.frequency}`}</p>
          <p className="text-purple-600">{`文档数: ${data.documentCount}`}</p>
          <p className="text-xs text-gray-500 mt-1">点击搜索此关键词</p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data: any) => {
    if (onKeywordClick) {
      onKeywordClick(data.word);
    }
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          layout="horizontal"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            type="number" 
            domain={[0, 'dataMax']}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            type="category" 
            dataKey="word" 
            width={100}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="tfidf" 
            fill="#3B82F6"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={handleBarClick}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KeywordBarChart;