import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, BookOpen, Check } from "lucide-react";
import { getFilteredCurriculumFiles, getFilteredResourceFiles } from "@/services/resourceFileService";
import { Skeleton } from "@/components/ui/skeleton";
export function ResourceSelector({ type, subject, gradeLevel, selectedFiles, onSelectFiles }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadFiles = async () => {
            setLoading(true);
            const fetchedFiles = type === 'curriculum'
                ? await getFilteredCurriculumFiles(subject, gradeLevel)
                : await getFilteredResourceFiles(subject, gradeLevel);
            setFiles(fetchedFiles);
            setLoading(false);
        };
        loadFiles();
    }, [type, subject, gradeLevel]);
    const toggleFile = (fileId) => {
        if (selectedFiles.includes(fileId)) {
            onSelectFiles(selectedFiles.filter(id => id !== fileId));
        }
        else {
            onSelectFiles([...selectedFiles, fileId]);
        }
    };
    const icon = type === 'curriculum' ? _jsx(BookOpen, { className: "h-4 w-4" }) : _jsx(FileText, { className: "h-4 w-4" });
    const title = type === 'curriculum' ? 'Select Curriculum Files' : 'Select Resource Files';
    const description = type === 'curriculum'
        ? 'Choose curriculum documents to guide the lesson generation'
        : 'Choose additional resources to include in the lesson note';
    return (_jsxs(Dialog, { children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: "w-full justify-start text-left font-normal select-none", children: [icon, _jsx("span", { className: "ml-2 flex-1 truncate", children: selectedFiles.length === 0 ? title : `${selectedFiles.length} files selected` }), selectedFiles.length > 0 && _jsx(Check, { className: "ml-auto h-4 w-4" })] }) }), _jsxs(DialogContent, { className: "sm:max-w-[500px]", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: title }), _jsx(DialogDescription, { children: description })] }), _jsx(ScrollArea, { className: "h-[300px] mt-4 pr-4", children: loading ? (_jsx("div", { className: "space-y-4", children: [1, 2, 3].map(i => (_jsxs("div", { className: "flex flex-col space-y-2 border p-3 rounded-md", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Skeleton, { className: "h-4 w-4 rounded" }), _jsx(Skeleton, { className: "h-4 w-3/4" })] }), _jsxs("div", { className: "flex gap-2 ml-6", children: [_jsx(Skeleton, { className: "h-4 w-16" }), _jsx(Skeleton, { className: "h-4 w-16" })] })] }, i))) })) : files.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-40 text-center", children: [_jsxs("p", { className: "text-muted-foreground", children: ["No ", type, " files found"] }), _jsx("p", { className: "text-sm text-muted-foreground mt-2", children: subject && gradeLevel
                                        ? `Try adjusting the subject or grade level filter`
                                        : `Admins can upload ${type} files from the admin dashboard` })] })) : (_jsx("div", { className: "space-y-3", children: files.map((file) => (_jsx(Card, { className: `p-4 cursor-pointer transition-all hover:shadow-md ${selectedFiles.includes(file.id)
                                    ? "border-primary border-2 bg-primary/5"
                                    : "border-border hover:border-primary/50"}`, onClick: () => toggleFile(file.id), children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Checkbox, { checked: selectedFiles.includes(file.id), onCheckedChange: () => toggleFile(file.id), className: "mt-1" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { className: "flex-1", children: [_jsxs("h3", { className: "font-semibold text-foreground flex items-center gap-2", children: [file.title, selectedFiles.includes(file.id) && (_jsx(Check, { className: "h-4 w-4 text-primary" }))] }), file.description && (_jsx("p", { className: "text-sm text-muted-foreground mt-1", children: file.description }))] }) }), _jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [file.grade_level && (_jsx(Badge, { variant: "secondary", className: "text-xs", children: file.grade_level })), file.subject && (_jsx(Badge, { variant: "secondary", className: "text-xs", children: file.subject })), file.tags?.map((tag, idx) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: tag }, idx)))] }), _jsxs("div", { className: "mt-2 text-xs text-muted-foreground", children: ["\uD83D\uDCC4 ", file.file_name] })] })] }) }, file.id))) })) }), _jsx("div", { className: "flex justify-end pt-4 border-t", children: _jsx(Button, { variant: "outline", onClick: () => onSelectFiles([]), children: "Clear Selection" }) })] })] }));
}
