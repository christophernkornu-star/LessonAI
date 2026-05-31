import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar, Save, ArrowLeft, Loader2, BookOpen, Clock, Plus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import { TimetableService } from "@/services/timetableService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { Input } from "@/components/ui/input";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export default function TimetableManagement() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedClass, setSelectedClass] = useState("");
    const [classSize, setClassSize] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [timetable, setTimetable] = useState(null);
    const [activeSubjects, setActiveSubjects] = useState({});
    const [configuredClasses, setConfiguredClasses] = useState([]);
    // Load user
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }
            setCurrentUser(user);
            // Load all configured timetables
            const timetables = await TimetableService.getAllTimetables(user.id);
            setConfiguredClasses(timetables);
            setLoading(false);
        };
        getUser();
    }, [navigate]);
    // Load timetable when class changes
    useEffect(() => {
        const loadTimetable = async () => {
            if (!currentUser || !selectedClass)
                return;
            setLoading(true);
            try {
                const data = await TimetableService.getTimetable(currentUser.id, selectedClass);
                if (data) {
                    setTimetable(data);
                    setActiveSubjects(data.subject_config || {});
                    setClassSize(data.class_size ? data.class_size.toString() : "");
                }
                else {
                    setTimetable(null);
                    // Initialize empty state based on SUBJECTS applicable to this level
                    // Or just empty, and let user add them
                    setActiveSubjects({});
                    setClassSize("");
                }
            }
            catch (err) {
                toast.error("Failed to load timetable");
            }
            finally {
                setLoading(false);
            }
        };
        loadTimetable();
    }, [currentUser, selectedClass]);
    // Moved conditional return AFTER all hooks
    if (loading && !selectedClass && configuredClasses.length === 0) {
        // Still verifying initial user load
        return _jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsx(TableSkeleton, {})] });
    }
    // Handler for toggling a day for a subject
    const handleDayToggle = (subject, day) => {
        setActiveSubjects(prev => {
            const currentConfig = prev[subject] || { days: [], frequency: 0 };
            const currentDays = currentConfig.days;
            let newDays;
            if (currentDays.includes(day)) {
                newDays = currentDays.filter(d => d !== day);
            }
            else {
                // Sort days based on standard week order
                newDays = [...currentDays, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
            }
            return {
                ...prev,
                [subject]: {
                    days: newDays,
                    frequency: newDays.length
                }
            };
        });
    };
    const handleSave = async () => {
        if (!currentUser || !selectedClass)
            return;
        setSaving(true);
        try {
            const timetableData = {
                user_id: currentUser.id,
                class_level: selectedClass,
                subject_config: activeSubjects,
                class_size: classSize ? parseInt(classSize) : undefined,
                term: "First Term" // Default for now, could make selectable
            };
            await TimetableService.saveTimetable(timetableData);
            toast.success("Timetable saved successfully");
            // Refresh list
            const timetables = await TimetableService.getAllTimetables(currentUser.id);
            setConfiguredClasses(timetables);
        }
        catch (err) {
            toast.error("Failed to save timetable");
        }
        finally {
            setSaving(false);
        }
    };
    // Filter subjects relevant to selected class
    const relevantSubjects = SUBJECTS.filter(s => {
        // Find the value associated with the selected class label
        const selectedLevelValue = CLASS_LEVELS.find(l => l.label === selectedClass)?.value;
        // If no valid level selected or subject has no restrictions, include it (though UI hides this section if no class selected)
        // Otherwise check if subject levels include the selected level value
        return !selectedLevelValue || !s.levels || s.levels.includes(selectedLevelValue);
    }).map(s => s.label);
    return (_jsxs("div", { className: "min-h-screen bg-gray-50/50", children: [_jsx(Navbar, {}), _jsxs("main", { className: "container max-w-5xl mx-auto p-4 md:p-8 pt-20", children: [_jsx("div", { className: "flex items-center gap-4 mb-6", children: _jsxs(Button, { variant: "ghost", onClick: () => navigate("/dashboard"), className: "pl-0", children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), "Back to Dashboard"] }) }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start gap-4 mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-bold tracking-tight", children: "Timetable Management" }), _jsx("p", { className: "text-sm sm:text-base text-muted-foreground mt-2", children: "Configure which days subjects are taught for each class." })] }), _jsxs(Button, { onClick: handleSave, disabled: !selectedClass || saving, className: "bg-gradient-hero w-full sm:w-auto", children: [saving ? _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : _jsx(Save, { className: "mr-2 h-4 w-4" }), "Save Timetable"] })] }), _jsxs("div", { className: "mb-8", children: [_jsxs("h2", { className: "text-lg font-semibold mb-4 flex items-center gap-2", children: [_jsx(BookOpen, { className: "h-5 w-5 text-primary" }), "Your Class Schedules"] }), _jsxs("div", { className: "flex gap-3 overflow-x-auto pb-4 items-stretch -mx-4 px-4 sm:mx-0 sm:px-0", children: [configuredClasses.length === 0 && (_jsx("div", { className: "text-sm text-muted-foreground italic border-2 border-dashed rounded-lg p-4 flex items-center", children: "No classes configured yet. Click \"Add Class\" to start." })), configuredClasses.map(c => (_jsxs(Button, { variant: selectedClass === c.class_level ? "default" : "outline", className: "whitespace-nowrap h-auto py-3 px-4 flex flex-col items-start gap-1 min-w-[140px]", onClick: () => setSelectedClass(c.class_level), children: [_jsx("span", { className: "font-bold text-base", children: c.class_level }), _jsx("span", { className: `text-xs ${selectedClass === c.class_level ? 'text-primary-foreground/80' : 'text-muted-foreground'}`, children: c.class_size ? `${c.class_size} students` : 'N/A students' })] }, c.class_level))), _jsxs(Button, { variant: selectedClass === "" ? "secondary" : "ghost", onClick: () => {
                                            setSelectedClass("");
                                            setClassSize("");
                                            setActiveSubjects({});
                                        }, className: "border-dashed border-2 h-auto py-3 min-w-[120px] flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground", children: [_jsx(Plus, { className: "h-6 w-6" }), _jsx("span", { className: "text-xs font-semibold", children: "Add New Class" })] })] })] }), _jsxs(Card, { className: "mb-8 border-primary/20 shadow-sm", children: [_jsxs(CardHeader, { className: "pb-4 bg-slate-50/50", children: [_jsx(CardTitle, { children: selectedClass ? `Edit Schedule: ${selectedClass}` : "Create New Class Schedule" }), _jsx(CardDescription, { children: selectedClass ? "Update the teaching days and class size below." : "Select a class level to begin configuring its schedule." })] }), _jsxs(CardContent, { className: "flex flex-col md:flex-row gap-6 items-end pt-6", children: [_jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(Label, { children: "Class Level" }), _jsxs(Select, { value: selectedClass, onValueChange: setSelectedClass, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Select a class..." }) }), _jsx(SelectContent, { children: CLASS_LEVELS.map((level) => (_jsx(SelectItem, { value: level.label, children: level.label }, level.value))) })] })] }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(Label, { children: "Class Size per Subject/General" }), _jsx(Input, { placeholder: "e.g. 45", value: classSize, onChange: (e) => setClassSize(e.target.value) }), _jsx("p", { className: "text-xs text-muted-foreground", children: "This class size will automatically apply to lessons." })] })] })] }), selectedClass ? (_jsx("div", { className: "grid gap-6", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-5 w-5 text-primary" }), "Subject Schedule - ", selectedClass] }), _jsx(CardDescription, { children: "Select the days each subject is taught. Frequency updates automatically." })] }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-6", children: relevantSubjects.map((subject) => {
                                            const config = activeSubjects[subject] || { days: [], frequency: 0 };
                                            return (_jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors", children: [_jsxs("div", { className: "mb-4 md:mb-0 w-1/3", children: [_jsxs("div", { className: "flex items-center gap-2 font-semibold text-lg", children: [_jsx(BookOpen, { className: "h-4 w-4 text-muted-foreground" }), subject] }), _jsxs("div", { className: "text-sm text-muted-foreground mt-1 flex items-center gap-1", children: [_jsx(Clock, { className: "h-3 w-3" }), "Frequency: ", config.frequency, " times/week"] })] }), _jsx("div", { className: "flex flex-wrap gap-2 md:gap-4 flex-1 justify-end", children: DAYS.map(day => {
                                                            const isSelected = config.days.includes(day);
                                                            return (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: `${subject}-${day}`, checked: isSelected, onCheckedChange: () => handleDayToggle(subject, day) }), _jsx(Label, { htmlFor: `${subject}-${day}`, className: `cursor-pointer ${isSelected ? 'font-medium text-primary' : ''}`, children: day.substring(0, 3) })] }, day));
                                                        }) })] }, subject));
                                        }) }) })] }) })) : (_jsxs("div", { className: "text-center py-12 bg-white rounded-lg border border-dashed", children: [_jsx("div", { className: "mx-auto h-12 w-12 text-muted-foreground/50 mb-4", children: _jsx(Calendar, { className: "h-full w-full" }) }), _jsx("h3", { className: "text-lg font-medium text-muted-foreground", children: "Please select a class level to view the timetable" })] }))] })] }));
}
