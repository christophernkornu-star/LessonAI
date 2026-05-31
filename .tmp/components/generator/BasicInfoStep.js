import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Info, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
export const BasicInfoStep = ({ lessonData, setLessonData, availableLevels, availableSubjects, userProfile, validationErrors, setValidationErrors, handleDetectLocation, }) => {
    // Local string state for Number of Lessons input so mobile users can freely type/delete
    const [numLessonsText, setNumLessonsText] = useState(lessonData.numLessons != null ? String(lessonData.numLessons) : "");
    // Sync from parent → local when parent value changes externally (e.g., timetable auto-fill)
    useEffect(() => {
        const parentVal = lessonData.numLessons;
        const localVal = numLessonsText === "" ? undefined : parseInt(numLessonsText);
        // Only update local text if parent value is different AND parent value is defined
        // This prevents the local text from being reset to "1" if the parent state re-renders
        if (parentVal !== undefined && parentVal !== localVal) {
            setNumLessonsText(String(parentVal));
        }
    }, [lessonData.numLessons]);
    // Sync from local → parent on blur
    const handleNumLessonsBlur = () => {
        if (numLessonsText === "") {
            setNumLessonsText("1");
            setLessonData((prev) => ({ ...prev, numLessons: 1 }));
        }
        else {
            const parsed = parseInt(numLessonsText);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
                setLessonData((prev) => ({ ...prev, numLessons: parsed }));
            }
            else if (!isNaN(parsed) && parsed > 5) {
                toast.error("Maximum 5 lessons allowed");
                setNumLessonsText("5");
                setLessonData((prev) => ({ ...prev, numLessons: 5 }));
            }
            else if (!isNaN(parsed) && parsed < 1) {
                setNumLessonsText("1");
                setLessonData((prev) => ({ ...prev, numLessons: 1 }));
            }
        }
    };
    return (_jsxs("div", { className: "space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "level", children: ["Class Level *", _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Info, { className: "h-4 w-4 inline ml-1 text-muted-foreground cursor-help" }) }), _jsx(TooltipContent, { children: _jsx("p", { children: "Select the class level first" }) })] })] }), _jsx(Combobox, { options: availableLevels, value: lessonData.level, onValueChange: (value) => {
                                    console.log("Selected level:", value);
                                    setLessonData({ ...lessonData, level: value, subject: "", strand: "", subStrand: "" });
                                    setValidationErrors({ ...validationErrors, level: "" });
                                }, placeholder: availableLevels.length > 0 ? "Select class level" : "Loading levels...", searchPlaceholder: "Search levels...", emptyText: "No levels found." }), validationErrors.level && (_jsx("p", { className: "text-sm text-destructive", children: validationErrors.level }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "subject", children: ["Subject *", _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Info, { className: "h-4 w-4 inline ml-1 text-muted-foreground cursor-help" }) }), _jsx(TooltipContent, { children: _jsx("p", { children: "Select the subject for your lesson" }) })] })] }), _jsx(Combobox, { options: availableSubjects, value: lessonData.subject, onValueChange: (value) => {
                                    setLessonData({ ...lessonData, subject: value, strand: "", subStrand: "" });
                                    setValidationErrors({ ...validationErrors, subject: "" });
                                }, placeholder: "Select subject", searchPlaceholder: "Search subjects...", emptyText: !lessonData.level ? "Select a class level first" : "No subjects found. Upload curriculum for this level.", disabled: !lessonData.level }), validationErrors.subject && (_jsx("p", { className: "text-sm text-destructive", children: validationErrors.subject }))] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "classSize", children: ["Class Size", _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Info, { className: "h-4 w-4 inline ml-1 text-muted-foreground cursor-help" }) }), _jsx(TooltipContent, { children: _jsx("p", { children: "Number of students in your class" }) })] })] }), _jsx(Input, { id: "classSize", type: "number", placeholder: userProfile?.default_class_size ? `Default: ${userProfile.default_class_size}` : "Enter class size", value: lessonData.classSize, onChange: (e) => setLessonData({ ...lessonData, classSize: e.target.value }), min: "1", max: "100" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "location", children: ["School Location (Optional)", _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Info, { className: "h-4 w-4 inline ml-1 text-muted-foreground cursor-help" }) }), _jsx(TooltipContent, { children: _jsx("p", { children: "Enter your city/town to get location-specific examples (e.g., nearby landmarks, local context)" }) })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { id: "location", placeholder: "e.g. Kumasi, Ashanti Region", value: lessonData.location || "", onChange: (e) => setLessonData({ ...lessonData, location: e.target.value }) }), _jsx(Button, { type: "button", variant: "outline", size: "icon", onClick: handleDetectLocation, title: "Detect my location", children: _jsx(MapPin, { className: "h-4 w-4" }) })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Helps generate examples relevant to your students' immediate environment." })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "term", children: "Term" }), _jsxs(Select, { value: lessonData.term || "", onValueChange: (val) => setLessonData({ ...lessonData, term: val }), children: [_jsx(SelectTrigger, { id: "term", children: _jsx(SelectValue, { placeholder: "Select Term" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "First Term", children: "First Term" }), _jsx(SelectItem, { value: "Second Term", children: "Second Term" }), _jsx(SelectItem, { value: "Third Term", children: "Third Term" })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "weekNumber", children: "Week Number" }), _jsx(Input, { id: "weekNumber", value: lessonData.weekNumber || "", onChange: (e) => setLessonData({ ...lessonData, weekNumber: e.target.value }), placeholder: "e.g. Week 1" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "weekEnding", children: "Week Ending" }), _jsx(Input, { id: "weekEnding", value: lessonData.weekEnding || "", onChange: (e) => setLessonData({ ...lessonData, weekEnding: e.target.value }), placeholder: "e.g. Friday, Jan 24" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "numLessons", children: "Number of Lessons" }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { id: "numLessons", type: "text", inputMode: "numeric", className: "w-20", value: numLessonsText, placeholder: "1-5", onChange: (e) => {
                                                    const val = e.target.value;
                                                    // Allow empty or digits only
                                                    if (val === "" || /^\d+$/.test(val)) {
                                                        setNumLessonsText(val);
                                                    }
                                                }, onBlur: handleNumLessonsBlur }), _jsx(TooltipProvider, { children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Info, { className: "h-4 w-4 text-muted-foreground cursor-help" }) }), _jsx(TooltipContent, { className: "max-w-[300px]", children: _jsx("p", { children: "If you have many exemplars, you can split them across multiple lessons. The AI will generate a lesson plan for each part." }) })] }) })] }), validationErrors.numLessons && (_jsx("p", { className: "text-sm text-destructive", children: validationErrors.numLessons })), parseInt(numLessonsText) > 5 && (_jsx("p", { className: "text-sm text-destructive", children: "Maximum 5 lessons allowed" }))] })] })] })] }));
};
