import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Check, Upload as UploadIcon } from "lucide-react";
import { getAllTemplates } from "@/services/uploadedTemplateService";
import type { LessonTemplate } from "@/data/lessonTemplates";

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onSelectTemplate: (template: LessonTemplate) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelectTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-auto py-3">
          <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
          <div className="flex flex-col items-start">
            <span className="font-medium">
              {selectedTemplate ? selectedTemplate.name : "Browse Templates"}
            </span>
            {selectedTemplate && (
              <span className="text-xs text-muted-foreground">
                {selectedTemplate.description}
              </span>
            )}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Choose a Lesson Note Template</DialogTitle>
          <DialogDescription>
            Select a template structure that fits your teaching style and curriculum requirements
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => (
              <Card
                key={template.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplateId === template.id
                    ? "border-primary border-2 bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {template.name}
                      {selectedTemplateId === template.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Includes {template.sections.length} sections:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.sections.slice(0, 5).map((section, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {section}
                      </Badge>
                    ))}
                    {template.sections.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.sections.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary hover:underline">
                      Preview structure
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap">
                      {template.structure.substring(0, 300)}...
                    </pre>
                  </details>
                </div>
              </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
