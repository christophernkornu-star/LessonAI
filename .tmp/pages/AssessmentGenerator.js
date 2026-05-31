import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Download, FileText, Brain, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Combobox } from "@/components/ui/combobox";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { assessmentService } from "@/services/assessmentService";
import { Navbar } from "@/components/Navbar";
import { GeneratorSkeleton } from "@/components/LoadingSkeletons";
export default function AssessmentGenerator() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAssessment, setGeneratedAssessment] = useState(null);
    // Form fields
    const [assessmentType, setAssessmentType] = useState("quiz");
    const [subject, setSubject] = useState("");
    const [level, setLevel] = useState("");
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState("medium");
    const [numberOfQuestions, setNumberOfQuestions] = useState("10");
    const [timeLimit, setTimeLimit] = useState("");
    const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
    // Question types
    const [questionTypes, setQuestionTypes] = useState(["multiple_choice"]);
    // Differentiation options
    const [specialNeeds, setSpecialNeeds] = useState(false);
    const [ellSupport, setEllSupport] = useState(false);
    const [giftedExtensions, setGiftedExtensions] = useState(false);
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
            setIsLoading(false);
        };
        checkAuth();
        return () => {
            isMounted = false;
        };
    }, [navigate]);
    const handleQuestionTypeToggle = (type) => {
        setQuestionTypes(prev => {
            if (prev.includes(type)) {
                return prev.filter(t => t !== type);
            }
            else {
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
            const config = {
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
        }
        catch (error) {
            console.error("Error generating assessment:", error);
            toast.error("Failed to generate assessment");
        }
        finally {
            setIsGenerating(false);
        }
    };
    const handleExport = async (includeAnswers) => {
        if (!generatedAssessment)
            return;
        try {
            await assessmentService.exportToDocx(generatedAssessment, includeAnswers);
        }
        catch (error) {
            console.error("Export error:", error);
            if (error?.message?.includes('Failed to fetch dynamically imported module') || error?.message?.includes('Importing a module script failed')) {
                toast.error("Updating application... Please wait.");
                setTimeout(() => window.location.reload(), 1500);
                return;
            }
            toast.error("Failed to export assessment. Please try again.");
        }
    };
    const handleNewAssessment = () => {
        setGeneratedAssessment(null);
        setTopic("");
    };
    if (isLoading) {
        return _jsx(GeneratorSkeleton, {});
    }
    if (generatedAssessment) {
        return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsx("main", { className: "container mx-auto px-4 py-8", children: _jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [_jsxs(Card, { className: "p-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h2", { className: "text-3xl font-bold mb-2", children: generatedAssessment.title }), _jsxs("div", { className: "flex justify-center gap-4 text-sm text-muted-foreground", children: [_jsx("span", { children: generatedAssessment.subject }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: generatedAssessment.level }), _jsx("span", { children: "\u2022" }), _jsx("span", { className: "capitalize", children: generatedAssessment.difficulty }), generatedAssessment.timeLimit && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsxs("span", { children: [generatedAssessment.timeLimit, " min"] })] }))] })] }), _jsxs("div", { className: "mb-6", children: [_jsx("h3", { className: "font-semibold mb-2", children: "Instructions:" }), _jsx("p", { className: "text-muted-foreground", children: generatedAssessment.instructions })] }), _jsx("div", { className: "space-y-6", children: generatedAssessment.questions.map((question, index) => (_jsxs("div", { className: "border-b border-border pb-4 last:border-0", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsxs("p", { className: "font-medium", children: [index + 1, ". ", question.question] }), _jsxs(Badge, { variant: "secondary", children: [question.points, " pts"] })] }), question.options && (_jsx("div", { className: "ml-6 space-y-1", children: question.options.map((option, i) => (_jsx("p", { className: "text-sm text-muted-foreground", children: option }, i))) })), question.type === "short_answer" && (_jsx("div", { className: "ml-6 mt-2", children: _jsx("div", { className: "border-b border-dashed border-border h-8" }) })), question.type === "essay" && (_jsxs("div", { className: "ml-6 mt-2 space-y-2", children: [_jsx("div", { className: "border-b border-dashed border-border h-8" }), _jsx("div", { className: "border-b border-dashed border-border h-8" }), _jsx("div", { className: "border-b border-dashed border-border h-8" })] }))] }, question.id))) }), generatedAssessment.extensions && generatedAssessment.extensions.length > 0 && (_jsxs("div", { className: "mt-8 p-4 bg-muted rounded-lg", children: [_jsxs("h3", { className: "font-semibold mb-2 flex items-center gap-2", children: [_jsx(Brain, { className: "h-5 w-5 text-primary" }), "Extension Activities"] }), _jsx("ul", { className: "space-y-1 ml-6", children: generatedAssessment.extensions.map((ext, i) => (_jsx("li", { className: "text-sm", children: ext }, i))) })] })), generatedAssessment.accommodations && generatedAssessment.accommodations.length > 0 && (_jsxs("div", { className: "mt-4 p-4 bg-muted rounded-lg", children: [_jsxs("h3", { className: "font-semibold mb-2 flex items-center gap-2", children: [_jsx(Target, { className: "h-5 w-5 text-primary" }), "Suggested Accommodations"] }), _jsx("ul", { className: "space-y-1 ml-6", children: generatedAssessment.accommodations.map((acc, i) => (_jsxs("li", { className: "text-sm", children: ["\u2022 ", acc] }, i))) })] }))] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs(Button, { onClick: () => handleExport(false), className: "flex-1", size: "lg", children: [_jsx(Download, { className: "mr-2 h-5 w-5" }), _jsx("span", { className: "hidden sm:inline", children: "Download (Student Copy)" }), _jsx("span", { className: "sm:hidden", children: "Student Copy" })] }), _jsxs(Button, { onClick: () => handleExport(true), variant: "outline", className: "flex-1", size: "lg", children: [_jsx(FileText, { className: "mr-2 h-5 w-5" }), _jsx("span", { className: "hidden sm:inline", children: "Download (With Answers)" }), _jsx("span", { className: "sm:hidden", children: "With Answers" })] })] }), _jsx(Button, { onClick: handleNewAssessment, variant: "ghost", className: "w-full", children: "Create Another Assessment" })] }) })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsx("main", { className: "container mx-auto px-4 py-8", children: _jsx("div", { className: "max-w-2xl mx-auto", children: _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Assessment Type *" }), _jsxs(Select, { value: assessmentType, onValueChange: (val) => setAssessmentType(val), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select type" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "quiz", children: "Quiz" }), _jsx(SelectItem, { value: "worksheet", children: "Worksheet" }), _jsx(SelectItem, { value: "homework", children: "Homework" }), _jsx(SelectItem, { value: "test", children: "Test" })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Subject *" }), _jsx(Combobox, { options: SUBJECTS.map(s => ({ value: s.value, label: s.label })), value: subject, onValueChange: setSubject, placeholder: "Select subject", searchPlaceholder: "Search subjects...", emptyText: "No subject found" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Level *" }), _jsx(Combobox, { options: CLASS_LEVELS.map(c => ({ value: c.value, label: c.label })), value: level, onValueChange: setLevel, placeholder: "Select level", searchPlaceholder: "Search levels...", emptyText: "No level found" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "topic", children: "Topic *" }), _jsx(Input, { id: "topic", value: topic, onChange: (e) => setTopic(e.target.value), placeholder: "e.g., Fractions, Photosynthesis, Ghana's Independence" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "difficulty", children: "Difficulty *" }), _jsxs(Select, { value: difficulty, onValueChange: (val) => setDifficulty(val), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "easy", children: "Easy" }), _jsx(SelectItem, { value: "medium", children: "Medium" }), _jsx(SelectItem, { value: "hard", children: "Hard" }), _jsx(SelectItem, { value: "mixed", children: "Mixed" })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "numQuestions", children: "Number of Questions *" }), _jsx(Input, { id: "numQuestions", type: "number", min: "1", max: "50", value: numberOfQuestions, onChange: (e) => setNumberOfQuestions(e.target.value) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "timeLimit", children: "Time Limit (minutes, optional)" }), _jsx(Input, { id: "timeLimit", type: "number", min: "5", max: "180", value: timeLimit, onChange: (e) => setTimeLimit(e.target.value), placeholder: "Leave blank for untimed" })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { children: "Question Types * (select at least one)" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3", children: [
                                                { value: "multiple_choice", label: "Multiple Choice" },
                                                { value: "true_false", label: "True/False" },
                                                { value: "short_answer", label: "Short Answer" },
                                                { value: "essay", label: "Essay" },
                                                { value: "fill_blank", label: "Fill in the Blank" },
                                                { value: "matching", label: "Matching" },
                                            ].map((type) => (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: type.value, checked: questionTypes.includes(type.value), onCheckedChange: () => handleQuestionTypeToggle(type.value) }), _jsx(Label, { htmlFor: type.value, className: "cursor-pointer font-normal", children: type.label })] }, type.value))) })] }), _jsxs("div", { className: "space-y-3 pt-4 border-t border-border", children: [_jsx(Label, { className: "text-base", children: "Differentiation & Support" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "specialNeeds", className: "font-normal", children: "Special Needs Accommodations" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Include supports for diverse learners" })] }), _jsx(Switch, { id: "specialNeeds", checked: specialNeeds, onCheckedChange: setSpecialNeeds })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "ellSupport", className: "font-normal", children: "ELL Support" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Adapt for English Language Learners" })] }), _jsx(Switch, { id: "ellSupport", checked: ellSupport, onCheckedChange: setEllSupport })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "giftedExtensions", className: "font-normal", children: "Gifted Extensions" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Add challenge activities" })] }), _jsx(Switch, { id: "giftedExtensions", checked: giftedExtensions, onCheckedChange: setGiftedExtensions })] })] }), _jsxs("div", { className: "flex items-center justify-between pt-4 border-t border-border", children: [_jsx(Label, { htmlFor: "answerKey", className: "font-normal", children: "Include Answer Key" }), _jsx(Switch, { id: "answerKey", checked: includeAnswerKey, onCheckedChange: setIncludeAnswerKey })] }), _jsx(Button, { onClick: handleGenerate, disabled: isGenerating || !subject || !level || !topic || questionTypes.length === 0, className: "w-full bg-gradient-hero hover:opacity-90", size: "lg", children: isGenerating ? (_jsx(_Fragment, { children: "Generating..." })) : (_jsx(_Fragment, { children: "Generate Assessment" })) })] }) }) }) })] }));
}
;
