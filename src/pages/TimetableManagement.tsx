import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Save, ArrowLeft, Loader2, BookOpen, Clock, Plus, Trash2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import { TimetableService, TimetableData, SubjectConfig } from "@/services/timetableService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { Input } from "@/components/ui/input";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TimetableManagement() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classSize, setClassSize] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [activeSubjects, setActiveSubjects] = useState<Record<string, SubjectConfig>>({});
  const [configuredClasses, setConfiguredClasses] = useState<TimetableData[]>([]);
  
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
      if (!currentUser || !selectedClass) return;
      
      setLoading(true);
      try {
        const data = await TimetableService.getTimetable(currentUser.id, selectedClass);
        if (data) {
          setTimetable(data);
          setActiveSubjects(data.subject_config || {});
          setClassSize(data.class_size ? data.class_size.toString() : "");
        } else {
          setTimetable(null);
          // Initialize empty state based on SUBJECTS applicable to this level
          // Or just empty, and let user add them
          setActiveSubjects({}); 
          setClassSize("");
        }
      } catch (err) {
        toast.error("Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };
    loadTimetable();
  }, [currentUser, selectedClass]);

  // Moved conditional return AFTER all hooks
  if (loading && !selectedClass && configuredClasses.length === 0) {
      // Still verifying initial user load
      return <div className="min-h-screen bg-gradient-subtle"><Navbar /><TableSkeleton /></div>;
  }

  // Handler for toggling a day for a subject
  const handleDayToggle = (subject: string, day: string) => {
    setActiveSubjects(prev => {
      const currentConfig = prev[subject] || { days: [], frequency: 0 };
      const currentDays = currentConfig.days;
      
      let newDays;
      if (currentDays.includes(day)) {
        newDays = currentDays.filter(d => d !== day);
      } else {
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
    if (!currentUser || !selectedClass) return;
    
    setSaving(true);
    try {
      const timetableData: TimetableData = {
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
    } catch (err) {
      toast.error("Failed to save timetable");
    } finally {
      setSaving(false);
    }
  };

  // Filter subjects relevant to selected class if possible, otherwise show all
  // Simple logic: If subject has 'levels' property, check if it includes selectedClass (normalized)
  // But our levels form 'basic1' doesn't match 'Basic 1' perfectly without normalization
  const relevantSubjects = SUBJECTS.map(s => s.label); 

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />
      
      <main className="container max-w-5xl mx-auto p-4 md:p-8 pt-20">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="pl-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Timetable Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Configure which days subjects are taught for each class.
            </p>
          </div>
          <Button onClick={handleSave} disabled={!selectedClass || saving} className="bg-gradient-hero w-full sm:w-auto">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Timetable
          </Button>
        </div>

        {/* Configured Classes Overview */}
        <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Your Class Schedules
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-4 items-stretch -mx-4 px-4 sm:mx-0 sm:px-0">
                {configuredClasses.length === 0 && (
                    <div className="text-sm text-muted-foreground italic border-2 border-dashed rounded-lg p-4 flex items-center">
                        No classes configured yet. Click "Add Class" to start.
                    </div>
                )}
                
                {configuredClasses.map(c => (
                <Button 
                    key={c.class_level} 
                    variant={selectedClass === c.class_level ? "default" : "outline"}
                    className="whitespace-nowrap h-auto py-3 px-4 flex flex-col items-start gap-1 min-w-[140px]"
                    onClick={() => setSelectedClass(c.class_level)}
                >
                    <span className="font-bold text-base">{c.class_level}</span>
                    <span className={`text-xs ${selectedClass === c.class_level ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {c.class_size ? `${c.class_size} students` : 'N/A students'}
                    </span>
                </Button>
                ))}
                
                <Button 
                    variant={selectedClass === "" ? "secondary" : "ghost"} 
                    onClick={() => {
                        setSelectedClass("");
                        setClassSize("");
                        setActiveSubjects({});
                    }} 
                    className="border-dashed border-2 h-auto py-3 min-w-[120px] flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground"
                >
                    <Plus className="h-6 w-6" />
                    <span className="text-xs font-semibold">Add New Class</span>
                </Button>
            </div>
        </div>

        <Card className="mb-8 border-primary/20 shadow-sm">
          <CardHeader className="pb-4 bg-slate-50/50">
            <CardTitle>{selectedClass ? `Edit Schedule: ${selectedClass}` : "Create New Class Schedule"}</CardTitle>
            <CardDescription>
                {selectedClass ? "Update the teaching days and class size below." : "Select a class level to begin configuring its schedule."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6 items-end pt-6">
            <div className="flex-1 space-y-2">
              <Label>Class Level</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a class..." />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.label}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Class Size per Subject/General</Label>
              <Input 
                 placeholder="e.g. 45" 
                 value={classSize} 
                 onChange={(e) => setClassSize(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">This class size will automatically apply to lessons.</p>
            </div>
          </CardContent>
        </Card>

        {selectedClass ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Subject Schedule - {selectedClass}
                </CardTitle>
                <CardDescription>
                  Select the days each subject is taught. Frequency updates automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {relevantSubjects.map((subject) => {
                     const config = activeSubjects[subject] || { days: [], frequency: 0 };
                     return (
                      <div key={subject} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="mb-4 md:mb-0 w-1/3">
                          <div className="flex items-center gap-2 font-semibold text-lg">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {subject}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                             <Clock className="h-3 w-3" />
                             Frequency: {config.frequency} times/week
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 md:gap-4 flex-1 justify-end">
                          {DAYS.map(day => {
                            const isSelected = config.days.includes(day);
                            return (
                              <div key={day} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`${subject}-${day}`} 
                                  checked={isSelected}
                                  onCheckedChange={() => handleDayToggle(subject, day)}
                                />
                                <Label 
                                  htmlFor={`${subject}-${day}`}
                                  className={`cursor-pointer ${isSelected ? 'font-medium text-primary' : ''}`}
                                >
                                  {day.substring(0, 3)}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                     );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed">
            <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4">
               <Calendar className="h-full w-full" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground">Please select a class level to view the timetable</h3>
          </div>
        )}
      </main>
    </div>
  );
}
