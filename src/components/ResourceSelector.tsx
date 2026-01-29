import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, BookOpen, Check } from "lucide-react";
import { getFilteredCurriculumFiles, getFilteredResourceFiles, type ResourceFile } from "@/services/resourceFileService";
import { Skeleton } from "@/components/ui/skeleton";

interface ResourceSelectorProps {
  type: 'curriculum' | 'resource';
  subject?: string;
  gradeLevel?: string;
  selectedFiles: string[];
  onSelectFiles: (fileIds: string[]) => void;
}

export function ResourceSelector({ type, subject, gradeLevel, selectedFiles, onSelectFiles }: ResourceSelectorProps) {
  const [files, setFiles] = useState<ResourceFile[]>([]);
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

  const toggleFile = (fileId: string) => {
    if (selectedFiles.includes(fileId)) {
      onSelectFiles(selectedFiles.filter(id => id !== fileId));
    } else {
      onSelectFiles([...selectedFiles, fileId]);
    }
  };

  const icon = type === 'curriculum' ? <BookOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  const title = type === 'curriculum' ? 'Select Curriculum Files' : 'Select Resource Files';
  const description = type === 'curriculum' 
    ? 'Choose curriculum documents to guide the lesson generation'
    : 'Choose additional resources to include in the lesson note';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal select-none">
          {icon}
          <span className="ml-2 flex-1 truncate">
            {selectedFiles.length === 0 ? title : `${selectedFiles.length} files selected`}
          </span>
          {selectedFiles.length > 0 && <Check className="ml-auto h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[300px] mt-4 pr-4">
          {loading ? (
             <div className="space-y-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex flex-col space-y-2 border p-3 rounded-md">
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="flex gap-2 ml-6">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                 </div>
               ))}
             </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-muted-foreground">No {type} files found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {subject && gradeLevel 
                  ? `Try adjusting the subject or grade level filter`
                  : `Admins can upload ${type} files from the admin dashboard`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <Card
                  key={file.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedFiles.includes(file.id)
                      ? "border-primary border-2 bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleFile(file.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedFiles.includes(file.id)}
                      onCheckedChange={() => toggleFile(file.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            {file.title}
                            {selectedFiles.includes(file.id) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </h3>
                          {file.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {file.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {file.grade_level && (
                          <Badge variant="secondary" className="text-xs">
                            {file.grade_level}
                          </Badge>
                        )}
                        {file.subject && (
                          <Badge variant="secondary" className="text-xs">
                            {file.subject}
                          </Badge>
                        )}
                        {file.tags?.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        📄 {file.file_name}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onSelectFiles([])}>
            Clear Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
