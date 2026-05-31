import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { FileText, Upload, Trash2, Download, Heart, Share2, ArrowLeft, Star, Eye, Search, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customTemplateService } from "@/services/customTemplateService";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, } from "@/components/ui/sheet";
import { Navbar } from "@/components/Navbar";
import { TableSkeleton } from "@/components/LoadingSkeletons";
const TemplateManagement = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [userTemplates, setUserTemplates] = useState([]);
    const [publicTemplates, setPublicTemplates] = useState([]);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [deleteTemplateId, setDeleteTemplateId] = useState(null);
    // Upload form fields
    const [uploadFile, setUploadFile] = useState(null);
    const [templateName, setTemplateName] = useState("");
    const [templateDescription, setTemplateDescription] = useState("");
    const [templateCategory, setTemplateCategory] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    // Search and Drawer state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    useEffect(() => {
        let isMounted = true;
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!isMounted)
                return;
            if (!session) {
                navigate("/login");
                return;
            }
            await loadTemplates();
        };
        checkAuth();
        return () => {
            isMounted = false;
        };
    }, [navigate]);
    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const [userTemps, publicTemps] = await Promise.all([
                customTemplateService.getUserTemplates(),
                customTemplateService.getPublicTemplates(),
            ]);
            setUserTemplates(userTemps);
            setPublicTemplates(publicTemps);
        }
        catch (error) {
            console.error("Error loading templates:", error);
            toast.error("Failed to load templates");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.docx')) {
                toast.error("Only .docx files are supported");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be less than 10MB");
                return;
            }
            setUploadFile(file);
            if (!templateName) {
                setTemplateName(file.name.replace('.docx', ''));
            }
        }
    };
    const handleUpload = async () => {
        if (!uploadFile || !templateName) {
            toast.error("Please provide a file and template name");
            return;
        }
        setIsUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                throw new Error("Not authenticated");
            // Upload file
            const fileUrl = await customTemplateService.uploadTemplate(uploadFile, user.id);
            if (!fileUrl) {
                throw new Error("Failed to upload file");
            }
            // Create template record
            await customTemplateService.createTemplate({
                name: templateName,
                description: templateDescription,
                file_url: fileUrl,
                file_name: uploadFile.name,
                file_size: uploadFile.size,
                category: templateCategory,
                is_public: isPublic,
            });
            // Reset form
            setUploadFile(null);
            setTemplateName("");
            setTemplateDescription("");
            setTemplateCategory("");
            setIsPublic(false);
            setIsUploadDialogOpen(false);
            // Reload templates
            await loadTemplates();
        }
        catch (error) {
            console.error("Error uploading template:", error);
            toast.error("Failed to upload template");
        }
        finally {
            setIsUploading(false);
        }
    };
    const handleToggleFavorite = async (templateId, currentFavorite) => {
        await customTemplateService.toggleFavorite(templateId, !currentFavorite);
        await loadTemplates();
    };
    const handleDelete = async () => {
        if (!deleteTemplateId)
            return;
        const template = userTemplates.find(t => t.id === deleteTemplateId);
        if (!template)
            return;
        await customTemplateService.deleteTemplate(template.id, template.file_url);
        setDeleteTemplateId(null);
        await loadTemplates();
    };
    const handleDownload = async (template) => {
        await customTemplateService.incrementDownloadCount(template.id);
        await customTemplateService.downloadTemplate(template.file_url, template.file_name);
    };
    const formatFileSize = (bytes) => {
        if (!bytes)
            return "Unknown";
        const mb = bytes / (1024 * 1024);
        return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    const filteredUserTemplates = userTemplates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase())));
    const filteredPublicTemplates = publicTemplates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase())));
    const TemplateCard = ({ template, isOwner }) => (_jsxs(Card, { className: "p-4 hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-start gap-3 flex-1", children: [_jsx("div", { className: "p-2 rounded-lg bg-primary/10", children: _jsx(FileText, { className: "h-5 w-5 text-primary" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-semibold text-foreground truncate", children: template.name }), _jsx("p", { className: "text-sm text-muted-foreground line-clamp-2", children: template.description || "No description" })] })] }), isOwner && (_jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleToggleFavorite(template.id, template.is_favorite), children: _jsx(Heart, { className: `h-4 w-4 ${template.is_favorite ? 'fill-red-500 text-red-500' : ''}` }) }))] }), _jsxs("div", { className: "flex flex-wrap gap-2 mb-3", children: [template.category && (_jsx(Badge, { variant: "secondary", children: template.category })), template.is_public && (_jsxs(Badge, { variant: "outline", className: "gap-1", children: [_jsx(Share2, { className: "h-3 w-3" }), "Public"] })), template.is_favorite && (_jsxs(Badge, { variant: "outline", className: "gap-1", children: [_jsx(Star, { className: "h-3 w-3 fill-yellow-500 text-yellow-500" }), "Favorite"] }))] }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-muted-foreground mb-3", children: [_jsx("span", { children: formatFileSize(template.file_size) }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Download, { className: "h-3 w-3" }), template.download_count] }), _jsx("span", { children: formatDate(template.created_at) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { onClick: () => setSelectedTemplate(template), size: "sm", variant: "secondary", className: "flex-1", children: [_jsx(Info, { className: "mr-1 h-3 w-3" }), "Details"] }), _jsxs(Button, { onClick: () => handleDownload(template), size: "sm", variant: "outline", className: "flex-1", children: [_jsx(Download, { className: "mr-1 h-3 w-3" }), "Download"] }), isOwner && (_jsx(Button, { onClick: () => setDeleteTemplateId(template.id), size: "sm", variant: "destructive", children: _jsx(Trash2, { className: "h-3 w-3" }) }))] })] }));
    // ...existing code...
    // End of component logic
    if (isLoading) {
        // ...existing code...
        return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsx("div", { className: "container mx-auto px-4 py-8", children: _jsx(TableSkeleton, {}) })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsxs("main", { className: "container mx-auto px-4 py-8", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-center justify-between mb-8 gap-4", children: [_jsx("h1", { className: "text-2xl font-bold text-foreground", children: "Template Management" }), _jsxs("div", { className: "flex gap-2 w-full md:w-auto", children: [_jsxs(Dialog, { open: isUploadDialogOpen, onOpenChange: setIsUploadDialogOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { className: "flex-1 md:flex-none", children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), "Upload Template"] }) }), _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Upload Custom Template" }), _jsx(DialogDescription, { children: "Upload a .docx template file to use in lesson generation" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "template-file", children: "Template File (.docx)" }), _jsx("input", { id: "template-file", type: "file", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", onChange: handleFileSelect, className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" }), uploadFile && (_jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [uploadFile.name, " (", formatFileSize(uploadFile.size), ")"] }))] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "template-name", children: "Template Name *" }), _jsx(Input, { id: "template-name", value: templateName, onChange: (e) => setTemplateName(e.target.value), placeholder: "Ghana Lesson Plan Template" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "template-description", children: "Description" }), _jsx(Textarea, { id: "template-description", value: templateDescription, onChange: (e) => setTemplateDescription(e.target.value), placeholder: "Describe what this template is for...", rows: 3 })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "template-category", children: "Category" }), _jsx(Input, { id: "template-category", value: templateCategory, onChange: (e) => setTemplateCategory(e.target.value), placeholder: "e.g., ghana, basic, custom" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { htmlFor: "is-public", children: "Make Public" }), _jsx(Switch, { id: "is-public", checked: isPublic, onCheckedChange: setIsPublic })] })] }), _jsx(DialogFooter, { children: _jsx(Button, { onClick: handleUpload, disabled: !uploadFile || !templateName || isUploading, children: isUploading ? "Uploading..." : "Upload Template" }) })] })] }), _jsxs(Button, { variant: "outline", onClick: () => navigate("/dashboard"), className: "flex-1 md:flex-none", children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), "Back"] })] })] }), _jsxs("div", { className: "mb-6 relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search templates by name, description, or category...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "pl-10 max-w-md" })] }), _jsxs(Tabs, { defaultValue: "my-templates", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full max-w-md grid-cols-2", children: [_jsxs(TabsTrigger, { value: "my-templates", children: ["My Templates (", filteredUserTemplates.length, ")"] }), _jsxs(TabsTrigger, { value: "public", children: ["Public Library (", filteredPublicTemplates.length, ")"] })] }), _jsx(TabsContent, { value: "my-templates", className: "mt-6", children: filteredUserTemplates.length === 0 ? (_jsxs(Card, { className: "p-12 text-center", children: [_jsx(FileText, { className: "h-12 w-12 text-muted-foreground mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-semibold mb-2", children: "No Templates Found" }), _jsx("p", { className: "text-muted-foreground mb-4", children: searchQuery ? "Try adjusting your search query" : "Upload your first custom template to get started" }), !searchQuery && (_jsxs(Button, { onClick: () => setIsUploadDialogOpen(true), children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), "Upload Template"] }))] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: filteredUserTemplates.map((template) => (_jsx(TemplateCard, { template: template, isOwner: true }, template.id))) })) }), _jsx(TabsContent, { value: "public", className: "mt-6", children: filteredPublicTemplates.length === 0 ? (_jsxs(Card, { className: "p-12 text-center", children: [_jsx(Eye, { className: "h-12 w-12 text-muted-foreground mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-semibold mb-2", children: "No Public Templates Found" }), _jsx("p", { className: "text-muted-foreground", children: searchQuery ? "Try adjusting your search query" : "Check back later for community-shared templates" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: filteredPublicTemplates.map((template) => (_jsx(TemplateCard, { template: template, isOwner: false }, template.id))) })) })] })] }), _jsx(AlertDialog, { open: !!deleteTemplateId, onOpenChange: () => setDeleteTemplateId(null), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Delete Template?" }), _jsx(AlertDialogDescription, { children: "This action cannot be undone. The template file will be permanently deleted." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleDelete, className: "bg-destructive", children: "Delete" })] })] }) }), _jsx(Sheet, { open: !!selectedTemplate, onOpenChange: (open) => !open && setSelectedTemplate(null), children: _jsx(SheetContent, { className: "sm:max-w-md overflow-y-auto", children: selectedTemplate && (_jsxs(_Fragment, { children: [_jsxs(SheetHeader, { className: "mb-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("div", { className: "p-2 rounded-lg bg-primary/10", children: _jsx(FileText, { className: "h-6 w-6 text-primary" }) }), _jsx(SheetTitle, { className: "text-xl", children: selectedTemplate.name })] }), _jsxs(SheetDescription, { children: ["Uploaded on ", formatDate(selectedTemplate.created_at)] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-medium mb-2", children: "Description" }), _jsx("p", { className: "text-sm text-muted-foreground bg-muted/50 p-3 rounded-md", children: selectedTemplate.description || "No description provided." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-medium mb-1", children: "Category" }), _jsx(Badge, { variant: "secondary", children: selectedTemplate.category || "None" })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-medium mb-1", children: "Visibility" }), _jsx(Badge, { variant: "outline", className: "gap-1", children: selectedTemplate.is_public ? (_jsxs(_Fragment, { children: [_jsx(Share2, { className: "h-3 w-3" }), " Public"] })) : ("Private") })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-medium mb-1", children: "File Size" }), _jsx("p", { className: "text-sm text-muted-foreground", children: formatFileSize(selectedTemplate.file_size) })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-medium mb-1", children: "Downloads" }), _jsxs("p", { className: "text-sm text-muted-foreground flex items-center gap-1", children: [_jsx(Download, { className: "h-3 w-3" }), " ", selectedTemplate.download_count] })] })] }), _jsxs("div", { className: "pt-6 border-t flex flex-col gap-3", children: [_jsxs(Button, { onClick: () => handleDownload(selectedTemplate), className: "w-full", children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), "Download Template"] }), userTemplates.some(t => t.id === selectedTemplate.id) && (_jsxs(Button, { variant: "destructive", onClick: () => {
                                                    setDeleteTemplateId(selectedTemplate.id);
                                                    setSelectedTemplate(null);
                                                }, className: "w-full", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete Template"] }))] })] })] })) }) })] }));
};
export default TemplateManagement;
