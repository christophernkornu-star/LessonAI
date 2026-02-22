import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Upload, Trash2, Download, Heart, Share2, ArrowLeft, Star, Eye, Search, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customTemplateService, type CustomTemplate } from "@/services/customTemplateService";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Navbar } from "@/components/Navbar";
import { TableSkeleton } from "@/components/LoadingSkeletons";

const TemplateManagement = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userTemplates, setUserTemplates] = useState<CustomTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<CustomTemplate[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  
  // Upload form fields
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Search and Drawer state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      
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
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!user) throw new Error("Not authenticated");

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
    } catch (error) {
      console.error("Error uploading template:", error);
      toast.error("Failed to upload template");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleFavorite = async (templateId: string, currentFavorite: boolean) => {
    await customTemplateService.toggleFavorite(templateId, !currentFavorite);
    await loadTemplates();
  };

  const handleDelete = async () => {
    if (!deleteTemplateId) return;

    const template = userTemplates.find(t => t.id === deleteTemplateId);
    if (!template) return;

    await customTemplateService.deleteTemplate(template.id, template.file_url);
    setDeleteTemplateId(null);
    await loadTemplates();
  };

  const handleDownload = async (template: CustomTemplate) => {
    await customTemplateService.incrementDownloadCount(template.id);
    await customTemplateService.downloadTemplate(template.file_url, template.file_name);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredUserTemplates = userTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPublicTemplates = publicTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const TemplateCard = ({ template, isOwner }: { template: CustomTemplate; isOwner: boolean }) => (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {template.description || "No description"}
            </p>
          </div>
        </div>
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleFavorite(template.id, template.is_favorite)}
          >
            <Heart
              className={`h-4 w-4 ${template.is_favorite ? 'fill-red-500 text-red-500' : ''}`}
            />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {template.category && (
          <Badge variant="secondary">{template.category}</Badge>
        )}
        {template.is_public && (
          <Badge variant="outline" className="gap-1">
            <Share2 className="h-3 w-3" />
            Public
          </Badge>
        )}
        {template.is_favorite && (
          <Badge variant="outline" className="gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            Favorite
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span>{formatFileSize(template.file_size)}</span>
        <span className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          {template.download_count}
        </span>
        <span>{formatDate(template.created_at)}</span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => setSelectedTemplate(template)}
          size="sm"
          variant="secondary"
          className="flex-1"
        >
          <Info className="mr-1 h-3 w-3" />
          Details
        </Button>
        <Button
          onClick={() => handleDownload(template)}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          <Download className="mr-1 h-3 w-3" />
          Download
        </Button>
        {isOwner && (
          <Button
            onClick={() => setDeleteTemplateId(template.id)}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Card>
  );

// ...existing code...
  
  // End of component logic
  if (isLoading) {
// ...existing code...
      return (
          <div className="min-h-screen bg-gradient-subtle">
              <Navbar />
              <div className="container mx-auto px-4 py-8">
                <TableSkeleton />
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl font-bold text-foreground">Template Management</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 md:flex-none">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Template
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Custom Template</DialogTitle>
                    <DialogDescription>
                      Upload a .docx template file to use in lesson generation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-file">Template File (.docx)</Label>
                      <input
                        id="template-file"
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileSelect}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {uploadFile && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {uploadFile.name} ({formatFileSize(uploadFile.size)})
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="template-name">Template Name *</Label>
                      <Input
                        id="template-name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Ghana Lesson Plan Template"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-description">Description</Label>
                      <Textarea
                        id="template-description"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Describe what this template is for..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-category">Category</Label>
                      <Input
                        id="template-category"
                        value={templateCategory}
                        onChange={(e) => setTemplateCategory(e.target.value)}
                        placeholder="e.g., ghana, basic, custom"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is-public">Make Public</Label>
                      <Switch
                        id="is-public"
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleUpload}
                      disabled={!uploadFile || !templateName || isUploading}
                    >
                      {isUploading ? "Uploading..." : "Upload Template"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1 md:flex-none">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        <Tabs defaultValue="my-templates" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="my-templates">
              My Templates ({filteredUserTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="public">
              Public Library ({filteredPublicTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-templates" className="mt-6">
            {filteredUserTemplates.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search query" : "Upload your first custom template to get started"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Template
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUserTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} isOwner={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="public" className="mt-6">
            {filteredPublicTemplates.length === 0 ? (
              <Card className="p-12 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Public Templates Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search query" : "Check back later for community-shared templates"}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPublicTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} isOwner={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template file will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Details Drawer */}
      <Sheet open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedTemplate && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <SheetTitle className="text-xl">{selectedTemplate.name}</SheetTitle>
                </div>
                <SheetDescription>
                  Uploaded on {formatDate(selectedTemplate.created_at)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {selectedTemplate.description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Category</h4>
                    <Badge variant="secondary">{selectedTemplate.category || "None"}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Visibility</h4>
                    <Badge variant="outline" className="gap-1">
                      {selectedTemplate.is_public ? (
                        <><Share2 className="h-3 w-3" /> Public</>
                      ) : (
                        "Private"
                      )}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">File Size</h4>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedTemplate.file_size)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Downloads</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Download className="h-3 w-3" /> {selectedTemplate.download_count}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t flex flex-col gap-3">
                  <Button onClick={() => handleDownload(selectedTemplate)} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                  
                  {userTemplates.some(t => t.id === selectedTemplate.id) && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        setDeleteTemplateId(selectedTemplate.id);
                        setSelectedTemplate(null);
                      }} 
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Template
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TemplateManagement;
