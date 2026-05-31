import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
export function TrendLineChart({ title, description, data, xAxisKey, yAxisKey, color = "#8884d8", height = 300, }) {
    // Format x-axis labels for dates
    const formatXAxis = (value) => {
        if (value.includes('-')) {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return value;
    };
    return (_jsxs(Card, { className: "group relative overflow-hidden rounded-2xl border border-secondary/20 bg-background/50 backdrop-blur-sm transition-all shadow-xl hover:shadow-2xl hover:border-primary/20 h-full flex flex-col", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-xl font-bold tracking-tight", children: title }), description && _jsx(CardDescription, { children: description })] }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(LineChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: xAxisKey, tickFormatter: formatXAxis }), _jsx(YAxis, {}), _jsx(Tooltip, { labelFormatter: formatXAxis }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: yAxisKey, stroke: color, strokeWidth: 2, dot: { fill: color } })] }) }) })] }));
}
