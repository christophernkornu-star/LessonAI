import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Generator = () => {
  const navigate = useNavigate();
  const [lessonData, setLessonData] = useState({
    curriculum: "",
    subject: "",
    level: "",
    strand: "",
    subStrand: "",
    contentStandard: "",
    exemplars: "",
  });

  const handleGenerate = () => {
    // Navigate to checkout page
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">LessonAI</h1>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-3xl font-bold text-foreground">Create Your Lesson Note</h2>
            <p className="text-muted-foreground">
              Fill in the details below and let AI generate a professional lesson note
            </p>
          </div>

          <Card className="p-8 shadow-medium">
            <div className="space-y-6">
              {/* Template Upload */}
              <div className="space-y-2">
                <Label htmlFor="template">Lesson Note Template</Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Template
                  </Button>
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Browse Samples
                  </Button>
                </div>
              </div>

              {/* Curriculum Selection */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="curriculum">Curriculum</Label>
                  <Select
                    value={lessonData.curriculum}
                    onValueChange={(value) =>
                      setLessonData({ ...lessonData, curriculum: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select curriculum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">National Curriculum</SelectItem>
                      <SelectItem value="cambridge">Cambridge IGCSE</SelectItem>
                      <SelectItem value="ib">IB Curriculum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={lessonData.subject}
                    onValueChange={(value) =>
                      setLessonData({ ...lessonData, subject: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="english">English Language</SelectItem>
                      <SelectItem value="social">Social Studies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="level">Level/Grade</Label>
                  <Select
                    value={lessonData.level}
                    onValueChange={(value) =>
                      setLessonData({ ...lessonData, level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grade1">Grade 1</SelectItem>
                      <SelectItem value="grade2">Grade 2</SelectItem>
                      <SelectItem value="grade3">Grade 3</SelectItem>
                      <SelectItem value="grade4">Grade 4</SelectItem>
                      <SelectItem value="grade5">Grade 5</SelectItem>
                      <SelectItem value="grade6">Grade 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strand">Strand</Label>
                  <Input
                    id="strand"
                    placeholder="e.g., Numbers and Operations"
                    value={lessonData.strand}
                    onChange={(e) =>
                      setLessonData({ ...lessonData, strand: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subStrand">Sub-Strand</Label>
                <Input
                  id="subStrand"
                  placeholder="e.g., Addition and Subtraction"
                  value={lessonData.subStrand}
                  onChange={(e) =>
                    setLessonData({ ...lessonData, subStrand: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentStandard">Content Standard</Label>
                <Textarea
                  id="contentStandard"
                  placeholder="Enter the content standard from the curriculum"
                  value={lessonData.contentStandard}
                  onChange={(e) =>
                    setLessonData({ ...lessonData, contentStandard: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exemplars">Exemplars</Label>
                <Textarea
                  id="exemplars"
                  placeholder="Enter exemplars or learning indicators"
                  value={lessonData.exemplars}
                  onChange={(e) =>
                    setLessonData({ ...lessonData, exemplars: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <Button
                onClick={handleGenerate}
                className="w-full bg-gradient-hero hover:opacity-90"
                size="lg"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Lesson Note
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Generator;
