import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card } from '../../common/ui';

interface ChartProps {
  data: any[];
  type: 'line' | 'bar';
  title: string;
  dataKey: string;
  xAxisKey: string;
  color?: string;
  height?: number;
}

const Chart: React.FC<ChartProps> = ({
  data,
  type = 'line',
  title,
  dataKey,
  xAxisKey,
  color = '#00E5FF',
  height = 300,
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-xl">
          <p className="text-white text-sm font-bold mb-1">{label}</p>
          <p className="text-[#00E5FF] font-black">
            {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-black text-white mb-6">{title}</h3>
      
      <ResponsiveContainer width="100%" height={height} minWidth={200} minHeight={200}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey={xAxisKey} 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey={xAxisKey} 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
};

export default Chart;
