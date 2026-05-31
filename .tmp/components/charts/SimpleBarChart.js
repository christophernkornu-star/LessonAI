import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export function SimpleBarChart({ title, description, data, dataKey = "value", nameKey = "name", color = "#8884d8", height = 300, }) {
    return (_jsxs(Card, { className: "group relative overflow-hidden rounded-2xl border border-secondary/20 bg-background/50 backdrop-blur-sm transition-all shadow-xl hover:shadow-2xl hover:border-primary/20 h-full flex flex-col", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-xl font-bold tracking-tight", children: title }), description && _jsx(CardDescription, { children: description })] }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(BarChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: nameKey }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: dataKey, fill: color })] }) }) })] }));
}
