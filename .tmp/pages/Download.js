import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, CheckCircle, FileText, RotateCw, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
// Dynamic imports moved to usage sites
import { toast } from "sonner";
import { cleanAndSplitText, parseMarkdownLine } from "@/lib/textFormatting";
import { Navbar } from "@/components/Navbar";
import { CLASS_LEVELS } from "@/data/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { ClassProfileService } from "@/services/classProfileService";
import * as katex from 'katex';
import 'katex/dist/katex.min.css';
const CLASS_PROFILE_STORAGE_KEY = "class_profile_data";
const normalizeClassLevel = (classLevel) => {
    const trimmed = (classLevel || "").trim();
    if (!trimmed)
        return "";
    const matched = CLASS_LEVELS.find((level) => level.label.toLowerCase() === trimmed.toLowerCase() ||
        level.value.toLowerCase() === trimmed.toLowerCase());
    return matched?.label || trimmed;
};
const getSavedClassProfile = (classLevel) => {
    const normalizedLevel = normalizeClassLevel(classLevel);
    if (!normalizedLevel) {
        return { schoolName: "", teacherName: "", subjectTeachers: {} };
    }
    const saved = localStorage.getItem(CLASS_PROFILE_STORAGE_KEY);
    if (!saved) {
        return { schoolName: "", teacherName: "", subjectTeachers: {} };
    }
    try {
        const profiles = JSON.parse(saved);
        return profiles[normalizedLevel] || {
            schoolName: "",
            teacherName: "",
            subjectTeachers: {},
        };
    }
    catch (error) {
        console.warn("Failed to parse saved class profiles:", error);
        return { schoolName: "", teacherName: "", subjectTeachers: {} };
    }
};
const normalizeLatexDelimiters = (text) => {
    if (!text)
        return text;
    return text.replace(/(\${3,})([\s\S]*?)(\${3,})/g, (match, open, body, close) => {
        if (open.length !== close.length)
            return match;
        const delimiter = body.includes('\n') ? '$$' : '$';
        return `${delimiter}${body}${delimiter}`;
    });
};
// Function to render text with LaTeX support (only inline math)
const renderTextWithLatex = (text) => {
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
                    return _jsx("span", { dangerouslySetInnerHTML: { __html: html } }, index);
                }
                catch (e) {
                    return _jsx("span", { children: math }, index);
                }
            }
            else {
                return _jsx("span", { children: math }, index);
            }
        }
        else {
            // Regular text - apply markdown formatting
            const tokens = parseMarkdownLine(part);
            return tokens.map((token, i) => {
                if (token.bold)
                    return _jsx("strong", { children: token.text }, i);
                if (token.italic)
                    return _jsx("em", { children: token.text }, i);
                return _jsx("span", { children: token.text }, i);
            });
        }
    });
};
// Function to check if a line contains block math
const containsBlockMath = (text) => {
    return /\$\$[\s\S]*?\$\$/.test(text);
};
// Function to render a line that may contain block math
const renderLineWithBlockMath = (line, index) => {
    const normalizedLine = normalizeLatexDelimiters(line);
    // Check if line contains block math
    if (containsBlockMath(normalizedLine)) {
        // Split by block math delimiters
        const parts = normalizedLine.split(/(\$\$[\s\S]*?\$\$)/g);
        return (_jsx("div", { className: "my-2", children: parts.map((part, partIndex) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    // Block math
                    const math = part.slice(2, -2);
                    if (katex && katex.renderToString) {
                        try {
                            const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
                            return _jsx("div", { dangerouslySetInnerHTML: { __html: html } }, partIndex);
                        }
                        catch (e) {
                            return _jsx("p", { className: "leading-relaxed whitespace-pre-wrap mb-2", children: math }, partIndex);
                        }
                    }
                    else {
                        return _jsx("p", { className: "leading-relaxed whitespace-pre-wrap mb-2", children: math }, partIndex);
                    }
                }
                else if (part.trim()) {
                    // Regular text with inline math
                    return _jsx("p", { className: "leading-relaxed whitespace-pre-wrap mb-2", children: renderTextWithLatex(part) }, partIndex);
                }
                return null;
            }) }, index));
    }
    else {
        // No block math, render normally
        return _jsx("p", { className: "leading-relaxed whitespace-pre-wrap", children: renderTextWithLatex(line) }, index);
    }
};
// Simple Markdown Renderer Component with LaTeX support
const MarkdownPreview = ({ content }) => {
    if (!content)
        return null;
    // Pre-process content to handle jumbled lists (same logic as docxService)
    const lines = cleanAndSplitText(content);
    return (_jsx("div", { className: "space-y-2 text-sm sm:text-base font-sans text-left", children: lines.map((line, index) => {
            let trimmed = line.trim();
            if (!trimmed)
                return _jsx("div", { className: "h-2" }, index);
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
            if (trimmed.startsWith('# '))
                return _jsx("h1", { className: "text-2xl font-bold mt-4 mb-2", children: renderTextWithLatex(trimmed.slice(2)) }, index);
            if (trimmed.startsWith('## '))
                return _jsx("h2", { className: "text-xl font-bold mt-3 mb-2", children: renderTextWithLatex(trimmed.slice(3)) }, index);
            if (trimmed.startsWith('### '))
                return _jsx("h3", { className: "text-lg font-bold mt-2 mb-1", children: renderTextWithLatex(trimmed.slice(4)) }, index);
            // Lists
            const isBullet = trimmed.match(/^[-*•]\s/);
            const isNumbered = trimmed.match(/^\d+\.\s/);
            let content = trimmed;
            if (isBullet)
                content = trimmed.replace(/^[-*•]\s/, '');
            if (isNumbered)
                content = trimmed.replace(/^\d+\.\s/, '');
            // Check if this line contains block math
            if (containsBlockMath(content)) {
                if (isHeaderLine) {
                    return _jsx("div", { className: "font-bold mt-2", children: renderLineWithBlockMath(content, index) }, index);
                }
                if (isBullet || isNumbered) {
                    return (_jsxs("div", { className: "flex gap-2 ml-4", children: [_jsx("span", { className: "min-w-[1.5rem] font-medium", children: isNumbered ? trimmed.match(/^\d+\./)?.[0] : '•' }), _jsx("div", { children: renderLineWithBlockMath(content, index) })] }, index));
                }
                return renderLineWithBlockMath(content, index);
            }
            // Render content with inline LaTeX support only
            const renderedContent = renderTextWithLatex(content);
            if (isHeaderLine) {
                return _jsx("div", { className: "font-bold mt-2", children: renderedContent }, index);
            }
            if (isBullet || isNumbered) {
                return (_jsxs("div", { className: "flex gap-2 ml-4", children: [_jsx("span", { className: "min-w-[1.5rem] font-medium", children: isNumbered ? trimmed.match(/^\d+\./)?.[0] : '•' }), _jsx("span", { children: renderedContent })] }, index));
            }
            return _jsx("p", { className: "leading-relaxed whitespace-pre-wrap", children: renderedContent }, index);
        }) }));
};
const DownloadPage = () => {
    const navigate = useNavigate();
    const [generatedContent, setGeneratedContent] = useState("");
    const [lessonData, setLessonData] = useState(null);
    const [dbClassProfiles, setDbClassProfiles] = useState({});
    useEffect(() => {
        const loadSavedProfiles = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return;
            try {
                const profiles = await ClassProfileService.getClassProfiles(user.id);
                const normalizedProfiles = profiles.reduce((acc, profile) => {
                    const normalizedLevel = normalizeClassLevel(profile.class_level);
                    if (!normalizedLevel)
                        return acc;
                    acc[normalizedLevel] = {
                        schoolName: profile.school_name || "",
                        teacherName: profile.teacher_name || "",
                        subjectTeachers: profile.subject_teachers || {},
                    };
                    return acc;
                }, {});
                setDbClassProfiles(normalizedProfiles);
            }
            catch (error) {
                console.error("Failed to load class profiles from database", error);
            }
        };
        loadSavedProfiles();
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
            }
            else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            // Check if the content is JSON (Ghana template)
            const isJsonFormat = /^\s*[{[]/.test(cleanContent) || /^```(?:json)?[\s\S]*```$/.test(cleanContent);
            const classProfile = lessonData?.coverPageSource === "profiles"
                ? (() => {
                    const normalized = normalizeClassLevel(lessonData.level || "");
                    return (dbClassProfiles[normalized] || getSavedClassProfile(lessonData.level || ""));
                })()
                : { schoolName: "", teacherName: "", subjectTeachers: {} };
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
                            if (data.phases.phase1_starter)
                                data.phases.phase1_starter.duration = "10 mins";
                            if (data.phases.phase2_newLearning)
                                data.phases.phase2_newLearning.duration = "40 mins";
                            if (data.phases.phase3_reflection)
                                data.phases.phase3_reflection.duration = "10 mins";
                        }
                    });
                    // Common metadata for cover page
                    const coverPageMeta = lessonData && lessonData.includeCoverPage ? {
                        subject: lessonData.coverPageSubject || lessonData.subject,
                        level: lessonData.level,
                        term: lessonData.term,
                        week: lessonData.weekNumber,
                        teacherName: classProfile.teacherName || lessonData.teacherName,
                        schoolName: classProfile.schoolName || lessonData.schoolName,
                        subjectTeacher: lessonData.coverPageSource === "profiles"
                            ? classProfile.subjectTeachers?.[lessonData.subject?.trim() || ""] || lessonData.subjectTeacher
                            : lessonData.subjectTeacher,
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
                        }
                        else {
                            const { generateLessonFromJson } = await import("@/services/templateDocxService");
                            await generateLessonFromJson(parsedArray[0], templateUrl);
                        }
                        toast.success("Ghana lesson plan downloaded successfully!");
                    }
                    else {
                        // Fallback to programmatic table generation
                        const filename = generateGhanaLessonFileName(parsedArray[0]);
                        // Pass the original result (array or object) - simpler to pass array as our updated service handles it
                        await generateGhanaLessonDocx(parsedArray, filename, false, coverPageMeta);
                        toast.success("Ghana lesson plan downloaded successfully!");
                    }
                }
                catch (jsonError) {
                    console.error("JSON parsing error:", jsonError);
                    toast.error("Failed to parse lesson data. Please regenerate the lesson.");
                }
            }
            else {
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
                    teacherName: classProfile.teacherName || lessonData.teacherName,
                    schoolName: classProfile.schoolName || lessonData.schoolName,
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
        }
        catch (error) {
            console.error("Download error:", error);
            if (error?.message?.includes('Failed to fetch dynamically imported module') || error?.message?.includes('Importing a module script failed')) {
                toast.error("Updating application... Please wait.");
                setTimeout(() => window.location.reload(), 1500);
                return;
            }
            toast.error("Failed to download lesson note. Please try again.");
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsx("main", { className: "container mx-auto px-3 sm:px-4 py-6 sm:py-12", children: _jsxs("div", { className: "mx-auto max-w-2xl", children: [_jsx("div", { className: "mb-4 sm:mb-8 text-right sm:hidden", children: _jsx(Button, { variant: "outline", onClick: () => navigate("/dashboard"), size: "sm", className: "w-full", children: "Back to Dashboard" }) }), _jsxs("div", { className: "mb-6 sm:mb-8 text-center px-2", children: [_jsx("div", { className: "mb-4 flex justify-center", children: _jsx(CheckCircle, { className: "h-12 w-12 sm:h-16 sm:w-16 text-secondary" }) }), _jsx("h2", { className: "mb-2 text-2xl sm:text-3xl font-bold text-foreground", children: "Your Lesson Note is Ready!" }), _jsx("p", { className: "text-sm sm:text-base text-muted-foreground", children: "Download your professionally formatted lesson note below" })] }), _jsx(Card, { className: "p-4 sm:p-6 lg:p-8 shadow-medium", children: _jsxs("div", { className: "space-y-4 sm:space-y-6", children: [_jsxs("div", { className: "rounded-lg border border-border bg-muted/50 p-3 sm:p-6", children: [_jsxs("div", { className: "mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3", children: [_jsx(FileText, { className: "h-5 w-5 sm:h-6 sm:w-6 text-primary" }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-foreground", children: "Lesson Note Preview" }), lessonData && (_jsxs("p", { className: "text-sm text-muted-foreground", children: [lessonData.subject, " - ", lessonData.level, " - ", lessonData.strand || "General"] }))] })] }), _jsx("div", { className: "max-h-96 overflow-y-auto text-sm text-foreground", children: generatedContent ? ((() => {
                                                    try {
                                                        // Try to parse as JSON
                                                        let cleanText = generatedContent.trim();
                                                        if (cleanText.startsWith('```json')) {
                                                            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                                                        }
                                                        else if (cleanText.startsWith('```')) {
                                                            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                                                        }
                                                        let data = null;
                                                        let isJson = false;
                                                        if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
                                                            try {
                                                                const parsed = JSON.parse(cleanText);
                                                                data = Array.isArray(parsed) ? parsed[0] : parsed;
                                                                isJson = true;
                                                            }
                                                            catch (e) {
                                                                console.error("Preview JSON Parsing Error:", e);
                                                            }
                                                        }
                                                        if (isJson && data) {
                                                            return (_jsx("div", { className: "space-y-0", children: _jsx("table", { className: "w-full border border-border mt-0", children: _jsxs("tbody", { children: [_jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted", children: "Week Ending:" }), _jsx("td", { className: "p-2", children: data.weekEnding || '' }), _jsx("td", { className: "p-2 font-semibold bg-muted", children: "Day:" }), _jsx("td", { className: "p-2", children: data.day || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted", colSpan: 2, children: "Subject:" }), _jsx("td", { className: "p-2", colSpan: 2, children: data.subject || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted", children: "Duration:" }), _jsx("td", { className: "p-2", children: data.duration || '' }), _jsx("td", { className: "p-2 font-semibold bg-muted", children: "Strand:" }), _jsx("td", { className: "p-2", children: data.strand || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted", children: "Class:" }), _jsx("td", { className: "p-2", children: data.class || '' }), _jsx("td", { className: "p-2 font-semibold bg-muted", children: "Class Size:" }), _jsx("td", { className: "p-2", children: data.classSize || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted", colSpan: 2, children: "Sub Strand:" }), _jsx("td", { className: "p-2", colSpan: 2, children: data.subStrand || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted align-top", colSpan: 2, children: "Content Standard:" }), _jsx("td", { className: "p-2", colSpan: 2, children: data.contentStandard || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted align-top", children: "Indicator:" }), _jsx("td", { className: "p-2", colSpan: 3, children: data.indicator || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted align-top", colSpan: 2, children: "Performance Indicator:" }), _jsx("td", { className: "p-2", colSpan: 2, children: data.performanceIndicator || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted align-top", colSpan: 2, children: "Core Competencies:" }), _jsx("td", { className: "p-2", colSpan: 2, children: data.coreCompetencies || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted", children: "Key Words:" }), _jsx("td", { className: "p-2", colSpan: 3, children: data.keywords || '' })] }), _jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold bg-muted", children: "Reference:" }), _jsx("td", { className: "p-2", colSpan: 3, children: data.reference || '' })] }), _jsxs("tr", { className: "border-b border-border bg-muted", children: [_jsx("td", { className: "p-2 font-semibold text-center", children: "Phase/Duration" }), _jsx("td", { className: "p-2 font-semibold text-center", colSpan: 2, children: "Learners Activities" }), _jsx("td", { className: "p-2 font-semibold text-center", children: "Resources" })] }), data.phases?.phase1_starter && (_jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold align-top", children: "PHASE 1: STARTER" }), _jsx("td", { className: "p-2 align-top", colSpan: 2, children: _jsx(MarkdownPreview, { content: data.phases.phase1_starter.learnerActivities || '' }) }), _jsx("td", { className: "p-2 align-top", children: _jsx(MarkdownPreview, { content: data.phases.phase1_starter.resources || '' }) })] })), data.phases?.phase2_newLearning && (_jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold align-top", children: "PHASE 2: NEW LEARNING" }), _jsx("td", { className: "p-2 align-top", colSpan: 2, children: _jsx(MarkdownPreview, { content: data.phases.phase2_newLearning.learnerActivities || '' }) }), _jsx("td", { className: "p-2 align-top", children: _jsx(MarkdownPreview, { content: data.phases.phase2_newLearning.resources || '' }) })] })), data.phases?.phase3_reflection && (_jsxs("tr", { className: "border-b border-border", children: [_jsx("td", { className: "p-2 font-semibold align-top", children: "PHASE 3: REFLECTION" }), _jsx("td", { className: "p-2 align-top", colSpan: 2, children: _jsx(MarkdownPreview, { content: data.phases.phase3_reflection.learnerActivities || '' }) }), _jsx("td", { className: "p-2 align-top", children: _jsx(MarkdownPreview, { content: data.phases.phase3_reflection.resources || '' }) })] }))] }) }) }));
                                                        }
                                                    }
                                                    catch (e) {
                                                        // Not JSON, render as text
                                                    }
                                                    return _jsx(MarkdownPreview, { content: generatedContent });
                                                })()) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: [_jsx("strong", { children: "Strand:" }), " Numbers and Operations"] }), _jsxs("p", { children: [_jsx("strong", { children: "Sub-Strand:" }), " Addition and Subtraction"] }), _jsxs("p", { children: [_jsx("strong", { children: "Content Standard:" }), " Students will understand place value and apply addition strategies..."] }), _jsx("p", { className: "text-muted-foreground", children: "[Full lesson note with AI-generated content ready for download]" })] })) })] }), _jsx("div", { className: "space-y-2 sm:space-y-3", children: _jsxs(Button, { onClick: handleDownload, className: "w-full bg-gradient-hero hover:opacity-90", size: "lg", "aria-label": "Download lesson note as Word document", children: [_jsx(Download, { className: "mr-2 h-4 w-4 sm:h-5 sm:w-5" }), _jsx("span", { className: "text-sm sm:text-base", children: "Download Lesson Note (.docx)" })] }) }), _jsx("p", { className: "text-center text-xs sm:text-sm text-muted-foreground", children: "Download as Word document (.docx)" }), _jsxs("div", { className: "flex flex-col gap-3 pt-2", children: [_jsxs(Button, { variant: "outline", onClick: () => navigate("/generator", {
                                                    state: {
                                                        restoreData: lessonData,
                                                        autoGenerate: true
                                                    }
                                                }), className: "w-full border-primary/20 hover:bg-primary/5 text-primary", children: [_jsx(RotateCw, { className: "mr-2 h-4 w-4" }), "Regenerate Lesson"] }), _jsxs(Button, { variant: "ghost", onClick: () => navigate("/generator"), className: "text-sm sm:text-base", children: [_jsx(PlusCircle, { className: "mr-2 h-4 w-4" }), "Create New Lesson"] })] })] }) })] }) })] }));
};
export default DownloadPage;
