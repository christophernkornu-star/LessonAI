import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, FileText, Sparkles, Brain, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Combobox } from "@/components/ui/combobox";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { 
  assessmentService, 
  type AssessmentConfig, 
  type Assessment,
  type AssessmentType,
  type DifficultyLevel,
  type QuestionType 
} from "@/services/assessmentService";

import { Navbar } from "@/components/Navbar";
import { GeneratorSkeleton } from "@/components/LoadingSkeletons";

export default function AssessmentGenerator() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssessment, setGeneratedAssessment] = useState<Assessment | null>(null);

  // Form fields
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("quiz");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [numberOfQuestions, setNumberOfQuestions] = useState("10");
  const [timeLimit, setTimeLimit] = useState("");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  
  // Question types
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["multiple_choice"]);
  
  // Differentiation options
  const [specialNeeds, setSpecialNeeds] = useState(false);
  const [ellSupport, setEllSupport] = useState(false);
  const [giftedExtensions, setGiftedExtensions] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      
      if (!session) {
        navigate("/login");
        return;
      }

      setIsLoading(false);
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleQuestionTypeToggle = (type: QuestionType) => {
    setQuestionTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleGenerate = async () => {
    // Validation
    if (!subject || !level || !topic || questionTypes.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const numQuestions = parseInt(numberOfQuestions);
    if (isNaN(numQuestions) || numQuestions < 1 || numQuestions > 50) {
      toast.error("Number of questions must be between 1 and 50");
      return;
    }

    setIsGenerating(true);

    try {
      const config: AssessmentConfig = {
        type: assessmentType,
        subject,
        level,
        topic,
        difficulty,
        questionTypes,
        numberOfQuestions: numQuestions,
        includeAnswerKey,
        timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
        specialNeeds,
        ellSupport,
        giftedExtensions,
      };

      const assessment = await assessmentService.generateAssessment(config);
      
      if (assessment) {
        setGeneratedAssessment(assessment);
      }
    } catch (error) {
      console.error("Error generating assessment:", error);
      toast.error("Failed to generate assessment");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (includeAnswers: boolean) => {
    if (!generatedAssessment) return;
    await assessmentService.exportToDocx(generatedAssessment, includeAnswers);
  };

  const handleNewAssessment = () => {
    setGeneratedAssessment(null);
    setTopic("");
  };

  if (isLoading) {
    return <GeneratorSkeleton />;
  }

  if (generatedAssessment) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">{generatedAssessment.title}</h2>
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  <span>{generatedAssessment.subject}</span>
                  <span>•</span>
                  <span>{generatedAssessment.level}</span>
                  <span>•</span>
                  <span className="capitalize">{generatedAssessment.difficulty}</span>
                  {generatedAssessment.timeLimit && (
                    <>
                      <span>•</span>
                      <span>{generatedAssessment.timeLimit} min</span>
                    </>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <p className="text-muted-foreground">{generatedAssessment.instructions}</p>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {generatedAssessment.questions.map((question, index) => (
                  <div key={question.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">
                        {index + 1}. {question.question}
                      </p>
                      <Badge variant="secondary">{question.points} pts</Badge>
                    </div>
                    
                    {question.options && (
                      <div className="ml-6 space-y-1">
                        {question.options.map((option, i) => (
                          <p key={i} className="text-sm text-muted-foreground">{option}</p>
                        ))}
                      </div>
                    )}

                    {question.type === "short_answer" && (
                      <div className="ml-6 mt-2">
                        <div className="border-b border-dashed border-border h-8"></div>
                      </div>
                    )}

                    {question.type === "essay" && (
                      <div className="ml-6 mt-2 space-y-2">
                        <div className="border-b border-dashed border-border h-8"></div>
                        <div className="border-b border-dashed border-border h-8"></div>
                        <div className="border-b border-dashed border-border h-8"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Extensions */}
              {generatedAssessment.extensions && generatedAssessment.extensions.length > 0 && (
                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Extension Activities
                  </h3>
                  <ul className="space-y-1 ml-6">
                    {generatedAssessment.extensions.map((ext, i) => (
                      <li key={i} className="text-sm">{ext}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Accommodations */}
              {generatedAssessment.accommodations && generatedAssessment.accommodations.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Suggested Accommodations
                  </h3>
                  <ul className="space-y-1 ml-6">
                    {generatedAssessment.accommodations.map((acc, i) => (
                      <li key={i} className="text-sm">• {acc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => handleExport(false)}
                className="flex-1"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">Download (Student Copy)</span>
                <span className="sm:hidden">Student Copy</span>
              </Button>
              <Button
                onClick={() => handleExport(true)}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <FileText className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">Download (With Answers)</span>
                <span className="sm:hidden">With Answers</span>
              </Button>
            </div>

            <Button
              onClick={handleNewAssessment}
              variant="ghost"
              className="w-full"
            >
              Create Another Assessment
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Assessment Type *</Label>
                <Select value={assessmentType} onValueChange={(val) => setAssessmentType(val as AssessmentType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="worksheet">Worksheet</SelectItem>
                    <SelectItem value="homework">Homework</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject and Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Combobox
                    options={SUBJECTS.map(s => ({ value: s.value, label: s.label }))}
                    value={subject}
                    onValueChange={setSubject}
                    placeholder="Select subject"
                    searchPlaceholder="Search subjects..."
                    emptyText="No subject found"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Level *</Label>
                  <Combobox
                    options={CLASS_LEVELS.map(c => ({ value: c.value, label: c.label }))}
                    value={level}
                    onValueChange={setLevel}
                    placeholder="Select level"
                    searchPlaceholder="Search levels..."
                    emptyText="No level found"
                  />
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Fractions, Photosynthesis, Ghana's Independence"
                />
              </div>

              {/* Difficulty and Number of Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select value={difficulty} onValueChange={(val) => setDifficulty(val as DifficultyLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numQuestions">Number of Questions *</Label>
                  <Input
                    id="numQuestions"
                    type="number"
                    min="1"
                    max="50"
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(e.target.value)}
                  />
                </div>
              </div>

              {/* Time Limit */}
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes, optional)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="5"
                  max="180"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="Leave blank for untimed"
                />
              </div>

              {/* Question Types */}
              <div className="space-y-3">
                <Label>Question Types * (select at least one)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { value: "multiple_choice", label: "Multiple Choice" },
                    { value: "true_false", label: "True/False" },
                    { value: "short_answer", label: "Short Answer" },
                    { value: "essay", label: "Essay" },
                    { value: "fill_blank", label: "Fill in the Blank" },
                    { value: "matching", label: "Matching" },
                  ].map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={questionTypes.includes(type.value as QuestionType)}
                        onCheckedChange={() => handleQuestionTypeToggle(type.value as QuestionType)}
                      />
                      <Label htmlFor={type.value} className="cursor-pointer font-normal">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Differentiation Options */}
              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="text-base">Differentiation & Support</Label>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="specialNeeds" className="font-normal">Special Needs Accommodations</Label>
                    <p className="text-sm text-muted-foreground">Include supports for diverse learners</p>
                  </div>
                  <Switch
                    id="specialNeeds"
                    checked={specialNeeds}
                    onCheckedChange={setSpecialNeeds}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ellSupport" className="font-normal">ELL Support</Label>
                    <p className="text-sm text-muted-foreground">Adapt for English Language Learners</p>
                  </div>
                  <Switch
                    id="ellSupport"
                    checked={ellSupport}
                    onCheckedChange={setEllSupport}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="giftedExtensions" className="font-normal">Gifted Extensions</Label>
                    <p className="text-sm text-muted-foreground">Add challenge activities</p>
                  </div>
                  <Switch
                    id="giftedExtensions"
                    checked={giftedExtensions}
                    onCheckedChange={setGiftedExtensions}
                  />
                </div>
              </div>

              {/* Answer Key Option */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Label htmlFor="answerKey" className="font-normal">Include Answer Key</Label>
                <Switch
                  id="answerKey"
                  checked={includeAnswerKey}
                  onCheckedChange={setIncludeAnswerKey}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !subject || !level || !topic || questionTypes.length === 0}
                className="w-full bg-gradient-hero hover:opacity-90"
                size="lg"
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Assessment
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
