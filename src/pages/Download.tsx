import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, CheckCircle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DownloadPage = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    // Simulate download
    const element = document.createElement("a");
    const file = new Blob(
      [
        "Sample Lesson Note\n\nSubject: Mathematics\nGrade: 4\nStrand: Numbers and Operations\n\n[AI-generated content would be here]",
      ],
      { type: "text/plain" }
    );
    element.href = URL.createObjectURL(file);
    element.download = "lesson-note.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">LessonAI</h1>
            <Button variant="outline" onClick={() => navigate("/")}>
              Create Another
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-secondary" />
            </div>
            <h2 className="mb-2 text-3xl font-bold text-foreground">
              Your Lesson Note is Ready!
            </h2>
            <p className="text-muted-foreground">
              Download your professionally formatted lesson note below
            </p>
          </div>

          <Card className="p-8 shadow-medium">
            <div className="space-y-6">
              {/* Preview */}
              <div className="rounded-lg border border-border bg-muted/50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold text-foreground">Lesson Note Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      Mathematics - Grade 4 - Numbers and Operations
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-foreground">
                  <p>
                    <strong>Strand:</strong> Numbers and Operations
                  </p>
                  <p>
                    <strong>Sub-Strand:</strong> Addition and Subtraction
                  </p>
                  <p>
                    <strong>Content Standard:</strong> Students will understand place value
                    and apply addition strategies...
                  </p>
                  <p className="text-muted-foreground">
                    [Full lesson note with AI-generated content ready for download]
                  </p>
                </div>
              </div>

              <Button
                onClick={handleDownload}
                className="w-full bg-gradient-hero hover:opacity-90"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Lesson Note
              </Button>

              <div className="text-center">
                <Button variant="ghost" onClick={() => navigate("/generator")}>
                  Generate Another Lesson Note
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DownloadPage;
