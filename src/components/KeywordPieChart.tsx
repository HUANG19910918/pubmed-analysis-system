import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { KeywordResult } from '../types/keyword';

interface KeywordPieChartProps {
  keywords: KeywordResult[];
  onKeywordClick?: (keyword: string) => void;
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const KeywordPieChart: React.FC<KeywordPieChartProps> = ({ keywords, onKeywordClick }) => {
  // 取前10个关键词
  const chartData = keywords.slice(0, 10).map((keyword, index) => ({
    name: keyword.word,
    value: Number(keyword.tfidf.toFixed(4)),
    frequency: keyword.frequency,
    documentCount: keyword.documentCount,
    color: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`关键词: ${data.name}`}</p>
          <p className="text-blue-600">{`TF-IDF分数: ${data.value}`}</p>
          <p className="text-green-600">{`占比: ${percentage}%`}</p>
          <p className="text-purple-600">{`总频次: ${data.frequency}`}</p>
          <p className="text-orange-600">{`文档数: ${data.documentCount}`}</p>
          <p className="text-xs text-gray-500 mt-1">点击搜索此关键词</p>
        </div>
      );
    }
    return null;
  };

  const handlePieClick = (data: any) => {
    if (onKeywordClick) {
      onKeywordClick(data.name);
    }
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // 不显示小于5%的标签
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            onClick={handlePieClick}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color, fontSize: '12px' }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KeywordPieChart;