import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Check } from "lucide-react";
import { getAllTemplates } from "@/services/uploadedTemplateService";
export function TemplateSelector({ selectedTemplateId, onSelectTemplate }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadTemplates = async () => {
            setLoading(true);
            const allTemplates = await getAllTemplates();
            setTemplates(allTemplates);
            setLoading(false);
        };
        loadTemplates();
    }, []);
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    return (_jsxs(Dialog, { children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: "w-full justify-start h-auto py-3 px-3", children: [_jsx(FileText, { className: "mr-2 h-4 w-4 flex-shrink-0 self-start mt-0.5" }), _jsxs("div", { className: "flex flex-col items-start min-w-0 flex-1 text-left", children: [_jsx("span", { className: "font-medium text-sm sm:text-base break-words whitespace-normal", children: selectedTemplate ? selectedTemplate.name : "Browse Templates" }), selectedTemplate && (_jsx("span", { className: "text-xs text-muted-foreground break-words whitespace-normal line-clamp-2 sm:line-clamp-none", children: selectedTemplate.description }))] })] }) }), _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh]", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Choose a Lesson Note Template" }), _jsx(DialogDescription, { children: "Select a template structure that fits your teaching style and curriculum requirements" })] }), _jsx(ScrollArea, { className: "h-[600px] pr-4", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-40", children: _jsx("p", { className: "text-muted-foreground", children: "Loading templates..." }) })) : (_jsx("div", { className: "grid gap-4 md:grid-cols-2", children: templates.map((template) => (_jsxs(Card, { className: `p-4 cursor-pointer transition-all hover:shadow-md ${selectedTemplateId === template.id
                                    ? "border-primary border-2 bg-primary/5"
                                    : "border-border hover:border-primary/50"}`, onClick: () => onSelectTemplate(template), children: [_jsx("div", { className: "flex items-start justify-between mb-2", children: _jsxs("div", { className: "flex-1", children: [_jsxs("h3", { className: "font-semibold text-foreground flex items-center gap-2", children: [template.name, selectedTemplateId === template.id && (_jsx(Check, { className: "h-4 w-4 text-primary" }))] }), _jsx("p", { className: "text-sm text-muted-foreground mt-1", children: template.description })] }) }), _jsxs("div", { className: "mt-3", children: [_jsxs("p", { className: "text-xs font-medium text-muted-foreground mb-2", children: ["Includes ", template.sections.length, " sections:"] }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [template.sections.slice(0, 5).map((section, idx) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: section }, idx))), template.sections.length > 5 && (_jsxs(Badge, { variant: "outline", className: "text-xs", children: ["+", template.sections.length - 5, " more"] }))] })] }), _jsx("div", { className: "mt-3 pt-3 border-t border-border", children: _jsxs("details", { className: "text-xs", children: [_jsx("summary", { className: "cursor-pointer text-primary hover:underline", children: "Preview structure" }), _jsxs("pre", { className: "mt-2 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap", children: [template.structure.substring(0, 300), "..."] })] }) })] }, template.id))) })) })] })] }));
}
