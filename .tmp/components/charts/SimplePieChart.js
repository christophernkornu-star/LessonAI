import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
// Expanded accessible modern palette
const DEFAULT_COLORS = [
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#f43f5e', // Rose
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#84cc16' // Lime
];
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    // Only render inside label if slice is > 5% to avoid cramped text
    if (percent < 0.05)
        return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (_jsx("text", { x: x, y: y, fill: "white", textAnchor: "middle", dominantBaseline: "central", className: "text-xs font-semibold drop-shadow-md", children: `${(percent * 100).toFixed(0)}%` }));
};
export function SimplePieChart({ title, description, data, colors = DEFAULT_COLORS, height = 320, }) {
    return (_jsxs(Card, { className: "flex flex-col h-full border-border/50 bg-background/50 backdrop-blur-sm", children: [_jsxs(CardHeader, { className: "pb-2", children: [_jsx(CardTitle, { className: "text-lg", children: title }), description && _jsx(CardDescription, { children: description })] }), _jsx(CardContent, { className: "flex-1 pb-4", children: _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data, cx: "50%", cy: "45%", labelLine: false, label: renderCustomizedLabel, outerRadius: "85%", innerRadius: "40%" // Making it a donut chart often looks cleaner and more modern
                                , fill: "#8884d8", dataKey: "value", stroke: "var(--background)", strokeWidth: 3, children: data.map((entry, index) => (_jsx(Cell, { fill: colors[index % colors.length] }, `cell-${index}`))) }), _jsx(Tooltip, { formatter: (value, name) => [`${value} lessons`, name], contentStyle: {
                                    borderRadius: '12px',
                                    border: '1px solid hsl(var(--border))',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    backgroundColor: 'hsl(var(--background))',
                                    color: 'hsl(var(--foreground))'
                                }, itemStyle: { color: 'hsl(var(--foreground))' } }), _jsx(Legend, { layout: "horizontal", verticalAlign: "bottom", align: "center", wrapperStyle: {
                                    paddingTop: '20px',
                                    fontSize: '12px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: '4px'
                                } })] }) }) })] }));
}
