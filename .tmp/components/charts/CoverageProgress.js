import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
export function CoverageProgress({ title, items }) {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: title }) }), _jsx(CardContent, { className: "space-y-4", children: items.map((item, index) => {
                    const percentage = item.total > 0 ? (item.covered / item.total) * 100 : 0;
                    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "font-medium", children: item.label }), _jsxs("span", { className: "text-muted-foreground", children: [item.covered, "/", item.total, " (", Math.round(percentage), "%)"] })] }), _jsx(Progress, { value: percentage, className: "h-2" })] }, index));
                }) })] }));
}
