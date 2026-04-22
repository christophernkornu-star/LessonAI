import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  name: string;
  value: number;
}

interface SimpleBarChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  dataKey?: string;
  nameKey?: string;
  color?: string;
  height?: number;
}

export function SimpleBarChart({
  title,
  description,
  data,
  dataKey = "value",
  nameKey = "name",
  color = "#8884d8",
  height = 300,
}: SimpleBarChartProps) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-secondary/20 bg-background/50 backdrop-blur-sm transition-all shadow-xl hover:shadow-2xl hover:border-primary/20 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={nameKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={dataKey} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
