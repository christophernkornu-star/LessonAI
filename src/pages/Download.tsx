import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, CheckCircle, FileText, Printer, RotateCw, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
// Dynamic imports moved to usage sites
import { toast } from "sonner";
import { cleanAndSplitText, parseMarkdownLine } from "@/lib/textFormatting";
import { Navbar } from "@/components/Navbar";
import * as katex from 'katex';
import 'katex/dist/katex.min.css';

const normalizeLatexDelimiters = (text: string) => {
  if (!text) return text;
  return text.replace(/(\${3,})([\s\S]*?)(\${3,})/g, (match, open, body, close) => {
    if (open.length !== close.length) return match;
    const delimiter = body.includes('\n') ? '$$' : '$';
    return `${delimiter}${body}${delimiter}`;
  });
};

// Function to render text with LaTeX support (only inline math)
const renderTextWithLatex = (text: string) => {
  const normalizedText = normalizeLatexDelimiters(text);
  // Split text by inline LaTeX delimiters ($...$) only - block math handled separately
  const parts = normalizedText.split(/(\$[^$\n]+\$)/g);
  
  return parts.map((part, index) => {
    // Check if this part is inline LaTeX
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      // Inline math
      const math = part.slice(1, -1);
      if (katex && katex.renderToString) {
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (e) {
          return <span key={index}>{math}</span>;
        }
      } else {
        return <span key={index}>{math}</span>;
      }
    } else {
      // Regular text - apply markdown formatting
      const tokens = parseMarkdownLine(part);
      return tokens.map((token, i) => {
        if (token.bold) return <strong key={i}>{token.text}</strong>;
        if (token.italic) return <em key={i}>{token.text}</em>;
        return <span key={i}>{token.text}</span>;
      });
    }
  });
};

// Function to check if a line contains block math
const containsBlockMath = (text: string): boolean => {
  return /\$\$[\s\S]*?\$\$/.test(text);
};

// Function to render a line that may contain block math
const renderLineWithBlockMath = (line: string, index: number) => {
  const normalizedLine = normalizeLatexDelimiters(line);

  // Check if line contains block math
  if (containsBlockMath(normalizedLine)) {
    // Split by block math delimiters
    const parts = normalizedLine.split(/(\$\$[\s\S]*?\$\$)/g);
    
    return (
      <div key={index} className="my-2">
        {parts.map((part, partIndex) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            // Block math
            const math = part.slice(2, -2);
            if (katex && katex.renderToString) {
              try {
                const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
                return <div key={partIndex} dangerouslySetInnerHTML={{ __html: html }} />;
              } catch (e) {
                return <p key={partIndex} className="leading-relaxed whitespace-pre-wrap mb-2">{math}</p>;
              }
            } else {
              return <p key={partIndex} className="leading-relaxed whitespace-pre-wrap mb-2">{math}</p>;
            }
          } else if (part.trim()) {
            // Regular text with inline math
            return <p key={partIndex} className="leading-relaxed whitespace-pre-wrap mb-2">{renderTextWithLatex(part)}</p>;
          }
          return null;
        })}
      </div>
    );
  } else {
    // No block math, render normally
    return <p key={index} className="leading-relaxed whitespace-pre-wrap">{renderTextWithLatex(line)}</p>;
  }
};

// Simple Markdown Renderer Component with LaTeX support
const MarkdownPreview = ({ content }: { content: string }) => {
  if (!content) return null;

  // Pre-process content to handle jumbled lists (same logic as docxService)
  const lines = cleanAndSplitText(content);

  return (
    <div className="space-y-2 text-sm sm:text-base font-sans text-left">
      {lines.map((line, index) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />;

        // Handle Markdown Headers
        let isHeaderLine = false;
        if (trimmed.match(/^#+\s/)) {
            trimmed = trimmed.replace(/^#+\s/, '');
            isHeaderLine = true;
        }

        // Handle Bullet Points
        if (trimmed.match(/^[-*]\s/)) {
            trimmed = trimmed.replace(/^[-*]\s/, '• ');
        }

        // Headings (Legacy check, kept for compatibility if not caught above)
        if (trimmed.startsWith('# ')) return <h1 key={index} className="text-2xl font-bold mt-4 mb-2">{renderTextWithLatex(trimmed.slice(2))}</h1>;
        if (trimmed.startsWith('## ')) return <h2 key={index} className="text-xl font-bold mt-3 mb-2">{renderTextWithLatex(trimmed.slice(3))}</h2>;
        if (trimmed.startsWith('### ')) return <h3 key={index} className="text-lg font-bold mt-2 mb-1">{renderTextWithLatex(trimmed.slice(4))}</h3>;

        // Lists
        const isBullet = trimmed.match(/^[-*•]\s/);
        const isNumbered = trimmed.match(/^\d+\.\s/);

        let content = trimmed;
        if (isBullet) content = trimmed.replace(/^[-*•]\s/, '');
        if (isNumbered) content = trimmed.replace(/^\d+\.\s/, '');

        // Check if this line contains block math
        if (containsBlockMath(content)) {
          if (isHeaderLine) {
              return <div key={index} className="font-bold mt-2">{renderLineWithBlockMath(content, index)}</div>;
          }

          if (isBullet || isNumbered) {
            return (
              <div key={index} className="flex gap-2 ml-4">
                <span className="min-w-[1.5rem] font-medium">{isNumbered ? trimmed.match(/^\d+\./)?.[0] : '•'}</span>
                <div>{renderLineWithBlockMath(content, index)}</div>
              </div>
            );
          }

          return renderLineWithBlockMath(content, index);
        }

        // Render content with inline LaTeX support only
        const renderedContent = renderTextWithLatex(content);

        if (isHeaderLine) {
            return <div key={index} className="font-bold mt-2">{renderedContent}</div>;
        }

        if (isBullet || isNumbered) {
          return (
            <div key={index} className="flex gap-2 ml-4">
              <span className="min-w-[1.5rem] font-medium">{isNumbered ? trimmed.match(/^\d+\./)?.[0] : '•'}</span>
              <span>{renderedContent}</span>
            </div>
          );
        }

        return <p key={index} className="leading-relaxed whitespace-pre-wrap">{renderedContent}</p>;
      })}
    </div>
  );
};

const DownloadPage = () => {
  const navigate = useNavigate();
  const [generatedContent, setGeneratedContent] = useState("");
  const [lessonData, setLessonData] = useState<any>(null);

  useEffect(() => {
    const content = sessionStorage.getItem("generatedLessonNote");
    const data = sessionStorage.getItem("lessonData");
    
    if (content) {
      setGeneratedContent(content);
    }
    
    if (data) {
      setLessonData(JSON.parse(data));
    }
  }, []);

  const handleDownload = async () => {
    try {
      const content = generatedContent || "Sample Lesson Note\n\nSubject: Mathematics\nGrade: Basic 4\nStrand: Numbers and Operations\n\n[AI-generated content would be here]";
      // Clean content of markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Check if the content is JSON (Ghana template)
      const isJsonFormat = cleanContent.startsWith('{') || cleanContent.startsWith('[') || cleanContent.includes('---');
      
      if (isJsonFormat) {
        // Handle Ghana template JSON format
        try {
          const { parseAIJsonResponse, generateGhanaLessonFileName, generateGhanaLessonDocx } = await import("@/services/ghanaLessonDocxService");
          
          const parsedResult = parseAIJsonResponse(cleanContent);
          
          // Normalize to array for processing metadata
          const parsedArray = Array.isArray(parsedResult) ? parsedResult : [parsedResult];
          
          // Process each lesson object to merge metadata and enforce strict formatting rules
          parsedArray.forEach(data => {
            if (lessonData) {
               data.term = lessonData.term || data.term;
               data.weekNumber = lessonData.weekNumber || data.weekNumber;
               data.weekEnding = lessonData.weekEnding || data.weekEnding;
               data.class = lessonData.level || data.class;
            }
            
            // STRICT REQUIREMENT: "NaCCA [subject] Curriculum for [Class]"
            // This ensures consistent reference formatting across both template and programmatic generation
            data.reference = `NaCCA ${data.subject || ''} Curriculum for ${data.class || ''}`;

            // STRICT REQUIREMENT: Fixed Phase Durations (10/40/10)
            if (data.phases) {
                if (data.phases.phase1_starter) data.phases.phase1_starter.duration = "10 mins";
                if (data.phases.phase2_newLearning) data.phases.phase2_newLearning.duration = "40 mins";
                if (data.phases.phase3_reflection) data.phases.phase3_reflection.duration = "10 mins";
            }
          });

          // Common metadata for cover page
          const coverPageMeta = lessonData && lessonData.includeCoverPage ? {
            subject: lessonData.coverPageSubject || lessonData.subject,
            level: lessonData.level,
            term: lessonData.term,
            week: lessonData.weekNumber,
            teacherName: lessonData.teacherName,
            schoolName: lessonData.schoolName
          } : undefined;
          
          // Check if a template file URL is available (template-based approach)
          const templateUrl = sessionStorage.getItem("ghanaTemplateUrl");
          
          if (templateUrl && !(lessonData && lessonData.includeCoverPage)) {
            // Note: generateLessonFromJson typically only handles single object. 
            // If multiple, we might need to loop or warn. 
            // For now, if multiple, we use the programmatic generator which we just updated to handle arrays.
            if (parsedArray.length > 1) {
                const filename = generateGhanaLessonFileName(parsedArray[0]);
                // Use the updated programmatic generator which handles arrays
                await generateGhanaLessonDocx(parsedArray, filename, false, coverPageMeta);
            } else {
                const { generateLessonFromJson } = await import("@/services/templateDocxService");
                await generateLessonFromJson(parsedArray[0], templateUrl);
            }
            toast.success("Ghana lesson plan downloaded successfully!");
          } else {
            // Fallback to programmatic table generation
            const filename = generateGhanaLessonFileName(parsedArray[0]);
            // Pass the original result (array or object) - simpler to pass array as our updated service handles it
            await generateGhanaLessonDocx(parsedArray, filename, false, coverPageMeta);
            toast.success("Ghana lesson plan downloaded successfully!");
          }
        } catch (jsonError) {
          console.error("JSON parsing error:", jsonError);
          toast.error("Failed to parse lesson data. Please regenerate the lesson.");
        }
      } else {
        // Handle regular text-based templates
        const metadata = lessonData ? {
          subject: lessonData.subject || "General",
          level: lessonData.level || "Basic 1",
          strand: lessonData.strand,
          subStrand: lessonData.subStrand,
          contentStandard: lessonData.contentStandard,
          templateName: lessonData.templateName,
          term: lessonData.term,
          week: lessonData.weekNumber,
          teacherName: lessonData.teacherName,
          schoolName: lessonData.schoolName,
          includeCoverPage: lessonData.includeCoverPage,
        } : {
          subject: "General",
          level: "Basic 1",
        };

        const { generateFileName, generateLessonNoteDocx } = await import("@/services/docxService");

        const filename = lessonData 
          ? generateFileName(metadata)
          : "lesson-note.docx";
        
        await generateLessonNoteDocx(content, metadata, filename);
        
        toast.success("Lesson note downloaded successfully!");
      }
    } catch (error: any) {
      console.error("Download error:", error);
      if (error?.message?.includes('Failed to fetch dynamically imported module') || error?.message?.includes('Importing a module script failed')) {
        toast.error("Updating application... Please wait.");
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      toast.error("Failed to download lesson note. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="mx-auto max-w-2xl">
           <div className="mb-4 sm:mb-8 text-right sm:hidden">
              <Button variant="outline" onClick={() => navigate("/dashboard")} size="sm" className="w-full">
                Back to Dashboard
              </Button>
           </div>
          <div className="mb-6 sm:mb-8 text-center px-2">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-secondary" />
            </div>
            <h2 className="mb-2 text-2xl sm:text-3xl font-bold text-foreground">
              Your Lesson Note is Ready!
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Download your professionally formatted lesson note below
            </p>
          </div>

          <Card className="p-4 sm:p-6 lg:p-8 shadow-medium">
            <div className="space-y-4 sm:space-y-6">
              {/* Preview */}
              <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-6">
                <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold text-foreground">Lesson Note Preview</h3>
                    {lessonData && (
                      <p className="text-sm text-muted-foreground">
                        {lessonData.subject} - {lessonData.level} - {lessonData.strand || "General"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto text-sm text-foreground">
                  {generatedContent ? (
                    (() => {
                      try {
                        // Try to parse as JSON
                        let cleanText = generatedContent.trim();
                        if (cleanText.startsWith('```json')) {
                          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                        } else if (cleanText.startsWith('```')) {
                          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                        }
                        
                        let data = null;
                        let isJson = false;

                        if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
                          try {
                            const parsed = JSON.parse(cleanText);
                            data = Array.isArray(parsed) ? parsed[0] : parsed;
                            isJson = true;
                          } catch (e) {
                            console.error("Preview JSON Parsing Error:", e);
                          }
                        }

                        if (isJson && data) {
                          return (
                              <div className="space-y-0">
                                <table className="w-full border border-border mt-0">
                                <tbody>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted">Week Ending:</td>
                                    <td className="p-2">{data.weekEnding || ''}</td>
                                    <td className="p-2 font-semibold bg-muted">Day:</td>
                                    <td className="p-2">{data.day || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted" colSpan={2}>Subject:</td>
                                    <td className="p-2" colSpan={2}>{data.subject || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted">Duration:</td>
                                    <td className="p-2">{data.duration || ''}</td>
                                    <td className="p-2 font-semibold bg-muted">Strand:</td>
                                    <td className="p-2">{data.strand || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted">Class:</td>
                                    <td className="p-2">{data.class || ''}</td>
                                    <td className="p-2 font-semibold bg-muted">Class Size:</td>
                                    <td className="p-2">{data.classSize || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted" colSpan={2}>Sub Strand:</td>
                                    <td className="p-2" colSpan={2}>{data.subStrand || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted align-top" colSpan={2}>Content Standard:</td>
                                    <td className="p-2" colSpan={2}>{data.contentStandard || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted align-top">Indicator:</td>
                                    <td className="p-2" colSpan={3}>{data.indicator || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted align-top" colSpan={2}>Performance Indicator:</td>
                                    <td className="p-2" colSpan={2}>{data.performanceIndicator || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted align-top" colSpan={2}>Core Competencies:</td>
                                    <td className="p-2" colSpan={2}>{data.coreCompetencies || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted">Key Words:</td>
                                    <td className="p-2" colSpan={3}>{data.keywords || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border">
                                    <td className="p-2 font-semibold bg-muted">Reference:</td>
                                    <td className="p-2" colSpan={3}>{data.reference || ''}</td>
                                  </tr>
                                  <tr className="border-b border-border bg-muted">
                                    <td className="p-2 font-semibold text-center">Phase/Duration</td>
                                    <td className="p-2 font-semibold text-center" colSpan={2}>Learners Activities</td>
                                    <td className="p-2 font-semibold text-center">Resources</td>
                                  </tr>
                                  {data.phases?.phase1_starter && (
                                    <tr className="border-b border-border">
                                      <td className="p-2 font-semibold align-top">PHASE 1: STARTER</td>
                                      <td className="p-2 align-top" colSpan={2}><MarkdownPreview content={data.phases.phase1_starter.learnerActivities || ''} /></td>
                                      <td className="p-2 align-top"><MarkdownPreview content={data.phases.phase1_starter.resources || ''} /></td>
                                    </tr>
                                  )}
                                  {data.phases?.phase2_newLearning && (
                                    <tr className="border-b border-border">
                                      <td className="p-2 font-semibold align-top">PHASE 2: NEW LEARNING</td>
                                      <td className="p-2 align-top" colSpan={2}><MarkdownPreview content={data.phases.phase2_newLearning.learnerActivities || ''} /></td>
                                      <td className="p-2 align-top"><MarkdownPreview content={data.phases.phase2_newLearning.resources || ''} /></td>
                                    </tr>
                                  )}
                                  {data.phases?.phase3_reflection && (
                                    <tr className="border-b border-border">
                                      <td className="p-2 font-semibold align-top">PHASE 3: REFLECTION</td>
                                      <td className="p-2 align-top" colSpan={2}><MarkdownPreview content={data.phases.phase3_reflection.learnerActivities || ''} /></td>
                                      <td className="p-2 align-top"><MarkdownPreview content={data.phases.phase3_reflection.resources || ''} /></td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                      } catch (e) {
                        // Not JSON, render as text
                      }
                      return <MarkdownPreview content={generatedContent} />;
                    })()
                  ) : (
                    <div className="space-y-2">
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
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <Button
                  onClick={handleDownload}
                  className="w-full bg-gradient-hero hover:opacity-90"
                  size="lg"
                  aria-label="Download lesson note as Word document"
                >
                  <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Download Lesson Note (.docx)</span>
                </Button>
              </div>
              
              <p className="text-center text-xs sm:text-sm text-muted-foreground">
                Download as Word document (.docx)
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/generator", { 
                      state: { 
                          restoreData: lessonData,
                          autoGenerate: true 
                      } 
                  })} 
                  className="w-full border-primary/20 hover:bg-primary/5 text-primary"
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  Regenerate Lesson
                </Button>
                
                <Button variant="ghost" onClick={() => navigate("/generator")} className="text-sm sm:text-base">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Lesson
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
