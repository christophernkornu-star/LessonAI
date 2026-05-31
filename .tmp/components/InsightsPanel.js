import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, TrendingUp, Target, } from "lucide-react";
import { useNavigate } from "react-router-dom";
export function InsightsPanel({ insights, quickActions }) {
    const navigate = useNavigate();
    const getIcon = (index) => {
        const icons = [Lightbulb, TrendingUp, Target,];
        const Icon = icons[index % icons.length];
        return _jsx(Icon, { className: "h-4 w-4" });
    };
    if (insights.length === 0 && (!quickActions || quickActions.length === 0)) {
        return null;
    }
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "flex items-center gap-2", children: "Insights & Recommendations" }), _jsx(CardDescription, { children: "Personalized suggestions to enhance your lesson planning" })] }), _jsxs(CardContent, { className: "space-y-4", children: [insights.length > 0 && (_jsx("div", { className: "space-y-2", children: insights.map((insight, index) => (_jsx(Alert, { children: _jsxs("div", { className: "flex items-start gap-2", children: [getIcon(index), _jsx(AlertDescription, { className: "flex-1", children: insight })] }) }, index))) })), quickActions && quickActions.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-sm font-semibold", children: "Quick Actions" }), _jsx("div", { className: "flex flex-wrap gap-2", children: quickActions.map((action, index) => (_jsx(Button, { variant: action.variant || "outline", size: "sm", onClick: action.action, children: action.label }, index))) })] }))] })] }));
}
