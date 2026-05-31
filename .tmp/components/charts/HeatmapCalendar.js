import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export function HeatmapCalendar({ title, description, data, maxCount }) {
    // Generate last 12 weeks of dates
    const weeks = 12;
    const days = weeks * 7;
    const today = new Date();
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
    }
    // Create a map for quick lookup
    const dataMap = new Map(data.map(d => [d.date, d.count]));
    // Find max count for color scaling
    const max = maxCount || Math.max(...data.map(d => d.count), 1);
    // Get color intensity based on count
    const getColor = (count) => {
        if (count === 0)
            return 'bg-gray-100 dark:bg-gray-800';
        const intensity = Math.min(Math.floor((count / max) * 4) + 1, 4);
        const colors = [
            'bg-green-200 dark:bg-green-900',
            'bg-green-300 dark:bg-green-700',
            'bg-green-400 dark:bg-green-600',
            'bg-green-500 dark:bg-green-500',
        ];
        return colors[intensity - 1];
    };
    // Group dates by week
    const weekGroups = [];
    for (let i = 0; i < dates.length; i += 7) {
        weekGroups.push(dates.slice(i, i + 7));
    }
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: title }), description && _jsx(CardDescription, { children: description })] }), _jsx(CardContent, { children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("div", { className: "inline-block min-w-full", children: [_jsxs("div", { className: "flex mb-2", children: [_jsx("div", { className: "w-8" }), _jsx("div", { className: "flex-1 flex gap-1", children: weekGroups.map((week, weekIndex) => {
                                            const firstDay = week[0];
                                            const showMonth = firstDay.getDate() <= 7;
                                            return (_jsx("div", { className: "flex-1 text-xs text-muted-foreground", children: showMonth && monthLabels[firstDay.getMonth()] }, weekIndex));
                                        }) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("div", { className: "flex flex-col gap-1", children: dayLabels.map((label, index) => (_jsx("div", { className: "h-3 text-xs text-muted-foreground flex items-center", children: index % 2 === 1 ? label : '' }, index))) }), _jsx("div", { className: "flex gap-1", children: weekGroups.map((week, weekIndex) => (_jsx("div", { className: "flex flex-col gap-1", children: week.map((date, dayIndex) => {
                                                const dateStr = date.toISOString().split('T')[0];
                                                const count = dataMap.get(dateStr) || 0;
                                                const isFuture = date > today;
                                                return (_jsx(TooltipProvider, { children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: `w-3 h-3 rounded-sm ${isFuture
                                                                        ? 'bg-gray-50 dark:bg-gray-900 opacity-50'
                                                                        : getColor(count)} hover:ring-2 hover:ring-primary transition-all cursor-pointer` }) }), _jsxs(TooltipContent, { children: [_jsx("p", { className: "text-xs", children: date.toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric'
                                                                        }) }), _jsxs("p", { className: "text-xs font-semibold", children: [count, " lesson", count !== 1 ? 's' : ''] })] })] }) }, dayIndex));
                                            }) }, weekIndex))) })] }), _jsxs("div", { className: "flex items-center gap-2 mt-4 text-xs text-muted-foreground", children: [_jsx("span", { children: "Less" }), _jsxs("div", { className: "flex gap-1", children: [_jsx("div", { className: "w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" }), _jsx("div", { className: "w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" }), _jsx("div", { className: "w-3 h-3 rounded-sm bg-green-300 dark:bg-green-700" }), _jsx("div", { className: "w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" }), _jsx("div", { className: "w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500" })] }), _jsx("span", { children: "More" })] })] }) }) })] }));
}
