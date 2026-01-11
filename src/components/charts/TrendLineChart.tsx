import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  [key: string]: string | number;
}

interface TrendLineChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  xAxisKey: string;
  yAxisKey: string;
  color?: string;
  height?: number;
}

export function TrendLineChart({
  title,
  description,
  data,
  xAxisKey,
  yAxisKey,
  color = "#8884d8",
  height = 300,
}: TrendLineChartProps) {
  // Format x-axis labels for dates
  const formatXAxis = (value: string) => {
    if (value.includes('-')) {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return value;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xAxisKey} 
              tickFormatter={formatXAxis}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={formatXAxis}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={yAxisKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
