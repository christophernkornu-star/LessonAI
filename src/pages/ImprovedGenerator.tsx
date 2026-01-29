import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/ui/stepper";
import { Combobox } from "@/components/ui/combobox";
import { ComboboxWithInput } from "@/components/ui/combobox-with-input";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, ChevronLeft, ChevronRight, Save, WifiOff, Info, MapPin, ClipboardPaste, FileText } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateLessonNote, parseCurriculumPaste, type LessonData } from "@/services/aiService";
import { LessonNotesService } from "@/services/lessonNotesService";
import { TimetableService } from "@/services/timetableService";
import { useToast } from "@/hooks/use-toast";
import { useDraft } from "@/hooks/use-draft";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { TemplateSelector } from "@/components/TemplateSelector";
import { ResourceSelector } from "@/components/ResourceSelector";
import { PaymentWall } from "@/components/PaymentWall";
import { checkPaymentRequired, deductPayment, estimateLessonCost } from "@/services/paymentService";
import { lessonTemplates, type LessonTemplate } from "@/data/lessonTemplates";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { CurriculumService } from "@/services/curriculumService";
import { GeneratorSkeleton } from "@/components/LoadingSkeletons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';

import { Navbar } from "@/components/Navbar";
import { BasicInfoStep } from "@/components/generator/BasicInfoStep";
// @ts-ignore
import { FixedSizeList } from 'react-window';

const List = FixedSizeList;

const STEPS = ["Basic Info", "Details", "Review"];

const defaultLessonData: LessonData = {
  subject: "",
  level: "",
  topic: "",
  subTopic: "",
  date: new Date().toISOString().split("T")[0],
  duration: "60 mins",
  strand: "",
  subStrand: "",
  contentStandard: "",
  indicator: "",
  exemplars: "", // Added required field
  coreCompetencies: "",
  previousKnowledge: "",
  references: "",
  keywords: "",
  learningObjectives: "",
  teachingLearningResources: "",
  teacherActivities: "",
  learnerActivities: "",
  evaluation: "",
  assignment: "",
  remarks: "",
  teachingPhilosophy: "",
  differentiation: "",
  assessment: "",
  reflection: "",
  gradeLevel: "",
  unit: "",
  content: "",
  methodology: "",
  materials: "",
  objectives: "",
  classSize: "",
  lesson: 1,
  weekEnding: "",
  weekNumber: "",
  term: "",
  location: "",
  numLessons: 1,
  detailLevel: "moderate",
  includeDiagrams: false,
};

// Fetches user profile
const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
    if (error) throw error;
    return data as any;
};

const ImprovedGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  
  const { 
    data: lessonData, 
    setData: setLessonData, 
    clearDraft, 
    lastSaved, 
    isSaving, 
    saveDraft: forceSaveDraft 
  } = useDraft<LessonData>(
    defaultLessonData,
    { key: "lesson-generator", autosaveDelay: 3000 }
  );
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LessonTemplate | null>(
    lessonTemplates.find(t => t.id === "ghana-standard") || null
  );
  const [selectedCurriculumFiles, setSelectedCurriculumFiles] = useState<string[]>([]);
  const [selectedResourceFiles, setSelectedResourceFiles] = useState<string[]>([]);
  
  // lessonData managed by useDraft above

  const [currentUser, setCurrentUser] = useState<any>(null); // Kept for auth check
  const [retryCount, setRetryCount] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [availableStrands, setAvailableStrands] = useState<Array<{ value: string; label: string }>>([]);
  const [availableSubStrands, setAvailableSubStrands] = useState<Array<{ value: string; label: string }>>([]);
  const [availableContentStandards, setAvailableContentStandards] = useState<Array<{ code: string; description: string; indicators: string[]; exemplars: string[]; mappings?: Array<{ indicators: string[], exemplars: string[] }> }>>([]);
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ value: string; label: string }>>([]);
  const [availableLevels, setAvailableLevels] = useState<Array<{ value: string; label: string }>>(CLASS_LEVELS);
  const [availableIndicators, setAvailableIndicators] = useState<string[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [availableExemplars, setAvailableExemplars] = useState<string[]>([]);
  const [selectedExemplars, setSelectedExemplars] = useState<string[]>([]);
  
  // NEW: State for multi-select strands/sub-strands
  const [selectedStrands, setSelectedStrands] = useState<string[]>([]);
  const [selectedSubStrands, setSelectedSubStrands] = useState<string[]>([]);

  // NEW: State for multi-select content standards
  const [selectedContentStandards, setSelectedContentStandards] = useState<string[]>([]);
  const [isManualCurriculum, setIsManualCurriculum] = useState(false);
  
  // Track if lesson is being generated from Scheme of Learning context
  const [isFromScheme, setIsFromScheme] = useState(false);

  const [schemeItems, setSchemeItems] = useState<any[]>([]);
  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false);
  const [schemeSearch, setSchemeSearch] = useState("");
  const [showPaymentWall, setShowPaymentWall] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
            title: "Authentication Required",
            description: "Please sign in to generate lesson notes.",
            variant: "destructive",
        });
        navigate("/login");
        return;
      }
      setCurrentUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  // Use React Query for profile
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', currentUser?.id],
    queryFn: () => fetchUserProfile(currentUser.id),
    enabled: !!currentUser?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Effect to sync profile data to form defaults
  useEffect(() => {
    if (userProfile) {
        if (userProfile.default_class_size && !lessonData.classSize) {
            setLessonData(prev => ({ ...prev, classSize: userProfile.default_class_size.toString() }));
        }
    }
  }, [userProfile]);

  const isLoading = !currentUser || (!!currentUser && isProfileLoading);

  // Update class size and lesson details from Timetable when grade level or subject changes
  useEffect(() => {
    const fetchTimetableDetails = async () => {
      // Don't run if we don't have a level
      if (!lessonData.level) return;
      if (!currentUser?.id) return;

      try {
        // Fetch ALL timetables for this user to avoid query mismatch issues
        // We use getAllTimetables instead of stricter getTimetable to be more robust
        const allTimetables = await TimetableService.getAllTimetables(currentUser.id);
        
        if (!allTimetables || allTimetables.length === 0) {
            console.log("No timetables found for user.");
             // Fallback to legacy userProfile.class_sizes
            const selectedLevelObj = availableLevels.find(l => l.value === lessonData.level || l.label === lessonData.level);
            const selectedLevelLabel = selectedLevelObj?.label || lessonData.level;
            
            if (userProfile?.class_sizes) {
                const specificSize = userProfile.class_sizes[lessonData.level] || userProfile.class_sizes[selectedLevelLabel];
                if (specificSize) {
                    setLessonData(prev => ({ ...prev, classSize: specificSize.toString() }));
                }
            }
            return;
        }

        // Resolve the level label (e.g. "Basic 4") from the selected value (e.g. "basic4")
        const selectedLevelObj = availableLevels.find(l => l.value === lessonData.level || l.label === lessonData.level);
        const selectedLevelLabel = selectedLevelObj?.label || lessonData.level;
        const selectedLevelValue = selectedLevelObj?.value || lessonData.level;

        console.log("Searching for timetable matching:", { selectedLevelLabel, selectedLevelValue });
        
        // Find matching timetable (relaxed search in memory)
        const timetable = allTimetables.find(t => 
            t.class_level === selectedLevelLabel || 
            t.class_level === selectedLevelValue ||
            t.class_level.toLowerCase() === selectedLevelLabel.toLowerCase()
        );

        if (timetable) {
          console.log("Found matching timetable:", timetable);
          
          const updates: any = {};
          
          // 1. Update Class Size
          const newSize = timetable.class_size ? timetable.class_size.toString() : "";
          if (newSize) {
               updates.classSize = newSize;
          }

          // 2. Update Number of Lessons (Frequency)
          if (lessonData.subject && timetable.subject_config) {
               // Find subject config (case insensitive key search)
               const targetSubject = lessonData.subject.toLowerCase();
               
               // Try exact match first
               let configKey = Object.keys(timetable.subject_config).find(
                   k => k.toLowerCase() === targetSubject
               );

               // If not found, try fuzzy match (e.g. "History" matches "History of Ghana")
               if (!configKey) {
                   configKey = Object.keys(timetable.subject_config).find(k => {
                       const keyLower = k.toLowerCase();
                       // Check if the Selected Subject includes the Configured Subject (User's case: "History of Ghana" includes "History")
                       if (targetSubject.includes(keyLower)) return true;
                       // Check if the Configured Subject includes the Selected Subject
                       if (keyLower.includes(targetSubject)) return true;
                       
                       // Special case handling for "Language" vs "English", "Maths" vs "Mathematics"
                       if ((keyLower === "maths" && targetSubject === "mathematics") || (keyLower === "mathematics" && targetSubject === "maths")) return true;
                       
                       return false;
                   });
               }

               if (configKey) {
                   const config = timetable.subject_config[configKey];
                   if (config && config.frequency) {
                       updates.numLessons = config.frequency;
                       
                       // Optional: Also set scheduledDays if they exist
                       if (config.days && config.days.length > 0) {
                           updates.scheduledDays = config.days;
                       }
                   }
               }
          }
          
          // Apply updates
          if (Object.keys(updates).length > 0) {
              setLessonData(prev => ({ ...prev, ...updates }));
              console.log("Applied timetable updates:", updates);
          }

        } else {
             console.log("No matching timetable found in list of", allTimetables.length);
             // Fallback to legacy profile again
             if (userProfile?.class_sizes) {
                const specificSize = userProfile.class_sizes[lessonData.level] || userProfile.class_sizes[selectedLevelLabel];
                if (specificSize) {
                    setLessonData(prev => ({ ...prev, classSize: specificSize.toString() }));
                }
            }
        }
      } catch (err) {
        console.error("Error fetching timetable details:", err);
      }
    };

    fetchTimetableDetails();
  }, [lessonData.level, lessonData.subject, lessonData.term, currentUser, userProfile, availableLevels]);

  // Load available levels from database on mount and merge with static levels
  useEffect(() => {
    const loadMetadata = async () => {
      // Start with static levels
      // Use a map to handle duplicates and value/label normalization
      const levelMap = new Map<string, { value: string; label: string }>();
      CLASS_LEVELS.forEach(l => levelMap.set(l.label, l));

      // Add levels from Scheme of Learning (localStorage)
      try {
        const savedScheme = localStorage.getItem("scheme_of_learning_data");
        if (savedScheme) {
          const schemeData = JSON.parse(savedScheme);
          if (Array.isArray(schemeData)) {
            schemeData.forEach((item: any) => {
              if (item.classLevel && !levelMap.has(item.classLevel)) {
                 levelMap.set(item.classLevel, { value: item.classLevel, label: item.classLevel });
              }
            });
          }
        }
      } catch (e) {
        console.error("Error reading scheme data for levels", e);
      }

      // Load Levels from DB (Global + Personal)
      if (currentUser) {
        try {
            // Changed: Now loads ALL globally public levels + user's own levels
            // We wrap this in a try/catch specifically for the DB call so it doesn't block the rest
            try {
                const dbLevels = await CurriculumService.getUniqueGradeLevels(currentUser.id);
                dbLevels.forEach(dbLevel => {
                    const staticMatch = CLASS_LEVELS.find(l => l.label === dbLevel);
                    if (staticMatch) {
                        levelMap.set(dbLevel, staticMatch);
                    } else if (!levelMap.has(dbLevel)) {
                        levelMap.set(dbLevel, { value: dbLevel, label: dbLevel });
                    }
                });
            } catch (dbError) {
                console.warn("Could not load levels from CurriculumService", dbError);
            }

            // Also load levels from Timetables
            try {
                const timetables = await TimetableService.getAllTimetables(currentUser.id);
                if (timetables && timetables.length > 0) {
                    timetables.forEach(tt => {
                        const ttLevel = tt.class_level;
                        const staticMatch = CLASS_LEVELS.find(l => l.label === ttLevel || l.value === ttLevel);
                        
                        if (staticMatch) {
                            levelMap.set(staticMatch.label, staticMatch);
                            // Ensure the stored level string also maps to the static match
                            if (ttLevel !== staticMatch.label) levelMap.set(ttLevel, staticMatch);
                        } else if (!levelMap.has(ttLevel)) {
                            levelMap.set(ttLevel, { value: ttLevel, label: ttLevel });
                        }
                    });
                }
            } catch (ttError) {
                 console.warn("Could not load levels from TimetableService", ttError);
            }

            // Also load levels from Schemes (DB)
            try {
                const { data: schemes } = await supabase
                    .from('schemes')
                    .select('class_level')
                    .eq('user_id', currentUser.id);
                
                if (schemes && schemes.length > 0) {
                     schemes.forEach(s => {
                        const sLevel = s.class_level;
                        if (sLevel) {
                            const staticMatch = CLASS_LEVELS.find(l => l.label === sLevel || l.value === sLevel);
                            if (staticMatch) {
                                levelMap.set(staticMatch.label, staticMatch);
                            } else if (!levelMap.has(sLevel)) {
                                levelMap.set(sLevel, { value: sLevel, label: sLevel });
                            }
                        }
                     });
                }
            } catch (schemeError) {
                console.warn("Could not load levels from Schemes", schemeError);
            }

        } catch (error) {
          console.error("Error in fetching levels block", error);
        }
      }
      
      // Ensure specific sorting
      const finalLevels = Array.from(levelMap.values()).sort((a, b) => {
          // Custom sort: Basic 1 -> Basic 10, then JHS, SHS, etc.
          const getNum = (str: string) => {
             const m = str.match(/\d+/);
             return m ? parseInt(m[0]) : 999;
          };
          
          const isBasicA = a.label.includes("Basic");
          const isBasicB = b.label.includes("Basic");
          if (isBasicA && !isBasicB) return -1;
          if (!isBasicA && isBasicB) return 1;
          
          return getNum(a.label) - getNum(b.label);
      });
      
      setAvailableLevels(finalLevels);
      
      // Fix potential draft data mismatch (Label stored instead of Value)
      // If current lessonData.level matches a LABEL in our list, swap it to VALUE
      if (lessonData.level) {
          const matchLabel = finalLevels.find(l => l.label === lessonData.level);
          const matchValue = finalLevels.find(l => l.value === lessonData.level);
          
          if (matchLabel && !matchValue) {
              console.log("Fixing mismatch: converting Label to Value", lessonData.level, "->", matchLabel.value);
              setLessonData(prev => ({ ...prev, level: matchLabel.value }));
          }
      }
    };
    loadMetadata();
  }, [currentUser, lessonData.level]); // Added lessonData.level dependency only for the fix logic check, checking it safely inside

  // Load subjects when level changes
  useEffect(() => {
    const loadSubjects = async () => {
      if (lessonData.level) {
        // Resolve the level label (e.g. "Basic 4") from the selected value (e.g. "basic4")
        const selectedLevelObj = availableLevels.find(l => l.value === lessonData.level || l.label === lessonData.level);
        const selectedLevelLabel = selectedLevelObj?.label || lessonData.level;
        const selectedLevelValue = selectedLevelObj?.value || lessonData.level;

        // Check if DB subjects are available for this level
        // If the user has custom curriculum for this level, we should prioritize/restrict to it
        // OR we just mix them. The user requested strict validation.
        
        // Let's refine the subject list.
        const subjects: { value: string; label: string }[] = [];
        const addedSubjects = new Set<string>();

        // Helper to add subject securely
        const addSubject = (val: string, lbl: string) => {
            const key = val.toLowerCase();
            if (!addedSubjects.has(key)) {
                addedSubjects.add(key);
                subjects.push({ value: val, label: lbl });
            }
        };

        // 1. Load from DB (Primary Source of Truth if available)
        if (currentUser) {
          try {
            const dbSubjects = await CurriculumService.getSubjectsByGradeLevel(selectedLevelLabel, currentUser.id);
            if (dbSubjects.length > 0) {
               // If we found DB subjects for this specific level, add them first
               dbSubjects.forEach(s => addSubject(s, s));
            }
          } catch (error) {
             console.error("Error fetching subjects", error);
          }
        }
        
        // 3. Load from Scheme of Learning (Secondary Source - still useful for scheme-specific subjects)
        try {
          const savedScheme = localStorage.getItem("scheme_of_learning_data");
          if (savedScheme) {
            const schemeData = JSON.parse(savedScheme);
            if (Array.isArray(schemeData)) {
              schemeData.forEach((item: any) => {
                const itemLevel = item.classLevel;
                const isMatch = (itemLevel === selectedLevelValue) || (itemLevel === selectedLevelLabel);
                if (isMatch && item.subject) {
                   addSubject(item.subject, item.subject);
                }
              });
            }
          }
        } catch(e) {
          console.error("Error reading scheme data", e);
        }

        // 3. Load from Static Data
        // MODIFIED: User requested to strictly load from dynamic sources (CSV/DB) and NOT static data.
        // Therefore, we do not fall back to SUBJECTS if no content is found.
        
       
        // Sort subjects alphabetically
        subjects.sort((a, b) => a.label.localeCompare(b.label));
        
        setAvailableSubjects(subjects);
        
        // Show helpful message if no subjects found for this level
        if (subjects.length === 0 && currentUser) {
          toast({
            title: "No Subjects Found",
            description: `No curriculum data found for ${selectedLevelLabel}. Please upload a curriculum CSV for this class level.`,
            variant: "destructive",
            duration: 5000,
          });
        }
        
        // Auto-select if only one subject
        if (subjects.length === 1 && !lessonData.subject) {
             setLessonData(prev => ({ ...prev, subject: subjects[0].value }));
        }

        // Clear subject if it's not in the new list
        if (lessonData.subject && subjects.length > 0 && !subjects.some(s => s.value === lessonData.subject || s.label === lessonData.subject)) {
            setLessonData(prev => ({ ...prev, subject: "", strand: "", subStrand: "", contentStandard: "", indicators: "", exemplars: "" }));
        }
      } else {
        setAvailableSubjects([]);
      }
    };
    loadSubjects();
  }, [lessonData.level, availableLevels, currentUser]);

  // Load strands when subject and level change
  useEffect(() => {
    const loadStrands = async () => {
      if (lessonData.subject && lessonData.level && currentUser) {
        console.log('Loading strands for:', { subject: lessonData.subject, level: lessonData.level });
        const strands = await CurriculumService.getStrandsByGradeAndSubject(
          lessonData.level,
          lessonData.subject,
          currentUser.id
        );
        console.log('Loaded strands:', strands);
        setAvailableStrands(strands);

        // Auto-select if only one strand
        if (strands.length === 1) {
           setLessonData(prev => ({ ...prev, strand: strands[0].label }));
        }

        if (strands.length === 0) {
          // Try to give a hint about what IS available
             const allCurriculum = await CurriculumService.getUserCurriculum(currentUser.id);
             if (allCurriculum.length > 0) {
                const available = allCurriculum.slice(0, 3).map(c => `${c.subject} (${c.grade_level})`).join(", ");
                toast({
                  title: "No Strands Found",
                  description: `Found uploaded data for: ${available}... but not for ${lessonData.subject} - ${lessonData.level}.`,
                  variant: "destructive"
                });
                return;
             } else {
                toast({
                  title: "Debug: No Data Found",
                  description: `User ID: ${currentUser.id.substring(0,5)}... Total Items: ${allCurriculum.length}. Please check your uploads.`,
                  duration: 10000,
                  variant: "destructive"
                });
                return;
             }
        }
      } else {
        setAvailableStrands([]);
      }
    };
    loadStrands();
  }, [lessonData.subject, lessonData.level, currentUser]);

  // Load sub-strands when strand changes
  useEffect(() => {
    const loadSubStrands = async () => {
      // Check if we have subject and level. Strand is now optional for initial load (or we handle multiple)
      if (lessonData.subject && lessonData.level && currentUser) {
        
        // Handle Multiple Strands:
        // Use selectedStrands state if available, otherwise fall back to splitting lessonData.strand
        // (This supports both the UI selection and loading from drafts/schemes)
        const currentStrands = selectedStrands.length > 0 
            ? selectedStrands 
            : (lessonData.strand ? lessonData.strand.split('\n').filter(s => s.trim()) : []);

        if (currentStrands.length > 0) {
            let allSubStrands: Array<{ value: string; label: string }> = [];
            
            // Fetch sub-strands for EACH selected strand
            for (const strandLabel of currentStrands) {
                const subStrands = await CurriculumService.getSubStrandsByStrand(
                  lessonData.level,
                  lessonData.subject,
                  strandLabel,
                  currentUser.id
                );
                // Merge and deduplicate
                allSubStrands = [...allSubStrands, ...subStrands];
            }
            
            // Remove duplicates based on label/value
            const uniqueSubStrands = Array.from(new Map(allSubStrands.map(item => [item.label, item])).values());
            
            setAvailableSubStrands(uniqueSubStrands);

            if (uniqueSubStrands.length === 0) {
                 // Only warn if we actually had strands selected but found nothing
            }
        } else {
             // If no strands selected yet, empty the list
             setAvailableSubStrands([]);
        }
      } else {
        setAvailableSubStrands([]);
      }
    };
    loadSubStrands();
  }, [lessonData.subject, lessonData.level, selectedStrands, lessonData.strand, currentUser]);

  // Load content standards when sub-strand changes
  useEffect(() => {
    const loadContentStandards = async () => {
      if (lessonData.subject && lessonData.level && currentUser) {
        
        const currentStrands = selectedStrands.length > 0 
           ? selectedStrands 
           : (lessonData.strand ? lessonData.strand.split('\n').filter(s => s.trim()) : []);
           
        const currentSubStrands = selectedSubStrands.length > 0
           ? selectedSubStrands
           : (lessonData.subStrand ? lessonData.subStrand.split('\n').filter(s => s.trim()) : []);

        if (currentStrands.length > 0 && currentSubStrands.length > 0) {
             let allStandards: any[] = [];
             
             // We need to fetch standards that match ANY the selected strand/substrand combos.
             // Since the API takes single strand/substrand, we might need to iterate.
             // Optimization: The API likely filters by SubStrand primarily. Strand is context.
             
             // Simple iteration: For each selected SubStrand, try to find its parent Strand (if we knew it)
             // or just query for the SubStrand if possible?
             // CurriculumService.getContentStandardsBySubStrand requires strand + substrand.
             
             // We'll approximate: Iterate through all selected strands and sub-strands and fetch combinations.
             // This might be over-fetching but ensures we get everything.
             
             // OPTIMIZATION: Use Promise.all to fetch in parallel instead of sequential await
             const fetchPromises = [];

             for (const strand of currentStrands) {
                 for (const subStrand of currentSubStrands) {
                     fetchPromises.push(
                        CurriculumService.getContentStandardsBySubStrand(
                          lessonData.level,
                          lessonData.subject,
                          strand,
                          subStrand,
                          currentUser.id
                        ).catch(err => {
                            console.warn("Failed to fetch standards for", strand, subStrand, err);
                            return []; // Return empty array on failure so one failure doesn't break all
                        })
                     );
                 }
             }
             
             const results = await Promise.all(fetchPromises);
             allStandards = results.flat();

             // Deduplicate standards by code
             const uniqueStandards = Array.from(new Map(allStandards.map(item => [item.code, item])).values());
             setAvailableContentStandards(uniqueStandards);
        } else {
             setAvailableContentStandards([]);
        }
      } else {
        setAvailableContentStandards([]);
      }
    };
    loadContentStandards();
  }, [lessonData.subject, lessonData.level, selectedStrands, selectedSubStrands, lessonData.strand, lessonData.subStrand, currentUser]);

  // Show offline alert
  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "You're Offline",
        description: "You can continue working. Changes will be saved locally.",
        variant: "default",
      });
    }
  }, [isOnline]);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Info
        if (!lessonData.subject) errors.subject = "Subject is required";
        if (!lessonData.level) errors.level = "Class level is required";
        break;
      case 1: // Details
        if (!lessonData.strand) errors.strand = "Strand is required";
        if (!lessonData.subStrand) errors.subStrand = "Sub-strand is required";
        if (!lessonData.contentStandard) errors.contentStandard = "Content standard is required";
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Check if payment is required before generating
  const initiateGeneration = async () => {
    if (!validateStep(currentStep)) return;

    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please connect to the internet to generate lesson notes.",
        variant: "destructive",
      });
      return;
    }

    // Check if payment is required
    const { required } = await checkPaymentRequired();
    
    if (required) {
      // Show payment wall
      setShowPaymentWall(true);
    } else {
      // Proceed directly to generation (admin/exempt user)
      handleGenerate();
    }
  };

  // Called after payment is confirmed or if user is exempt
  const handleGenerate = async () => {
    setShowPaymentWall(false);
    setIsGenerating(true);

    try {
      // Fetch timetable configuration if available
      let scheduledDays: string[] | undefined;
      let numLessonsFromTimetable: number | undefined;
      let classSizeFromTimetable: string | undefined;

      try {
        // Only check for timetable matches if this is coming from a Scheme context
        // Otherwise, trust the user's manual input (Generic Generation)
        if (currentUser && lessonData.level && lessonData.subject && isFromScheme) {
          // Use the new ROBUST fuzzy finder instead of strict getTimetable
          const timetable = await TimetableService.findTimetable(
            currentUser.id, 
            lessonData.level, 
            lessonData.term || "First Term"
          );
          
          if (timetable) {
              // Valid timetable found!
              console.log("Timetable loaded:", timetable.class_level);
              
              // Get Class Size
              if (timetable.class_size) {
                  classSizeFromTimetable = timetable.class_size.toString();
              }

              // Get Subject Config
              if (timetable.subject_config) {
                let subjectConfig = timetable.subject_config[lessonData.subject]; 

                // If no exact match, try robust fuzzy matching
                if (!subjectConfig) {
                    const targetSubject = lessonData.subject.toLowerCase().trim();
                    
                    // Priority 1: Check for exact word containment (e.g. "Creative Arts" in "Creative Arts & Design")
                    // But avoid partial word matches (e.g. "Art" in "Language Arts") if possible.
                    
                    let bestMatchKey = "";
                    let bestMatchScore = 0;

                    Object.keys(timetable.subject_config).forEach(key => {
                        const k = key.toLowerCase().trim();
                        let score = 0;
                        
                        // Exact match (already checked above, but good for completeness)
                        if (k === targetSubject) score = 100;
                        
                        // "Creative Arts" specific handling
                        else if ((targetSubject === "creative arts" || targetSubject === "creative arts & design") && 
                                 (k.includes("creative") && k.includes("arts"))) {
                             score = 95;
                        }
                        // "History" specific handling
                        else if (targetSubject.includes("history") && k.includes("history")) {
                             score = 90;
                        }
                        // Containment with word boundaries
                        else if (k.includes(targetSubject) || targetSubject.includes(k)) {
                             // Penalize very short matches to avoid "Art" matching "Earth" or "Language Arts"
                             if (k.length > 3 && targetSubject.length > 3) {
                                 score = 50;
                                 
                                 // Boost if it's a prefix match (e.g. "Math" matches "Mathematics")
                                 if (k.startsWith(targetSubject) || targetSubject.startsWith(k)) score += 20;

                                  // Boost if it's "Our World Our People" matching "OWOP" or key words
                                 if (targetSubject.includes("world") && k.includes("world")) score += 30;
                             }
                        }

                        if (score > bestMatchScore) {
                            bestMatchScore = score;
                            bestMatchKey = key;
                        }
                    });
                    
                    if (bestMatchKey && bestMatchScore > 0) {
                        subjectConfig = timetable.subject_config[bestMatchKey];
                        console.log(`Fuzzy matched timetable subject: '${bestMatchKey}' for '${lessonData.subject}' (Score: ${bestMatchScore})`);
                    }
                }
                  
                if (subjectConfig) {
                  // CRITICAL: Ensure we actually capture the days!
                  if (subjectConfig.days && Array.isArray(subjectConfig.days) && subjectConfig.days.length > 0) {
                      scheduledDays = [...subjectConfig.days]; // Clone to ensure no ref issues
                      console.log("Found scheduled days:", scheduledDays);
                      
                      // Notify user explicitly about the schedule found
                       toast({
                        title: "📅 Schedule Match Found!",
                        description: `Using ${lessonData.subject} schedule: ${scheduledDays.join(" & ")}.`,
                        duration: 5000,
                        className: "bg-blue-50 border-l-4 border-blue-500 text-blue-800"
                      });

                  } else {
                      console.warn("Timetable entry found but NO DAYS configured:", subjectConfig);
                  }

                  if (subjectConfig.frequency) {
                      numLessonsFromTimetable = subjectConfig.frequency;
                  }
                  
                  if (scheduledDays && scheduledDays.length > 0) {
                      /* Toast moved to earlier block for better visibility */
                  } else {
                      // Explicit warning if subject found but days missing
                       toast({
                        title: "Timetable Warning",
                        description: `Found configuration for ${lessonData.subject} but no days are selected. Using default schedule.`,
                        duration: 4000,
                        variant: "destructive"
                      });
                  }
                  
                  console.log("Using timetable:", { scheduledDays, numLessonsFromTimetable, classSizeFromTimetable });
                } else { 
                    // Subject not found in config
                    /* Optional: Warn user if in debug mode

                    console.log(`No timetable config found for subject: ${lessonData.subject}`);
                    */
                }
             }
          } else {
             console.log("Timetable not found for", { userId: currentUser.id, level: lessonData.level, term: lessonData.term });
          }
        }
      } catch (ttError) {
        console.warn("Failed to fetch timetable, proceeding with defaults", ttError);
      }

      // Ensure consistency: If we found specific days, the number of lessons should match
      const finalNumLessons = (scheduledDays && scheduledDays.length > 0) 
            ? scheduledDays.length 
            : (numLessonsFromTimetable || lessonData.numLessons || 1);

      // Force default days to be the scheduled days if available, to prevent AI hallucination
      // If we have scheduledDays, we pass them. The AI prompt logic will use them.
      
      const dataWithTemplate: LessonData = {
        ...lessonData,
        // Priority: Timetable Days count -> Timetable Freq -> Manual Input -> Default 1
        numLessons: finalNumLessons,
        scheduledDays: scheduledDays,
        classSize: classSizeFromTimetable || lessonData.classSize, 
        template: selectedTemplate || undefined,
        
        // IMPORTANT: If we have scheduled days, FORCE the 'weekEnding' logic or others to align if needed?
        // No, weekEnding is a date. 
        
        selectedCurriculumFiles: selectedCurriculumFiles.length > 0 ? selectedCurriculumFiles : undefined,
        selectedResourceFiles: selectedResourceFiles.length > 0 ? selectedResourceFiles : undefined,
      };

      const generatedContent = await generateLessonNote(dataWithTemplate);

      // Deduct payment after successful generation
      // Estimate tokens used (based on content length - rough approximation)
      const estimatedTokens = Math.max(4000, Math.ceil(generatedContent.length / 4) + 1500);
      const paymentResult = await deductPayment(estimatedTokens, 'lesson_note', finalNumLessons);
      
      if (!paymentResult.success && paymentResult.error?.includes('Insufficient')) {
        // This shouldn't happen if PaymentWall worked correctly, but handle it
        toast({
          title: "Payment Error",
          description: paymentResult.error,
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      // Save lesson note to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await LessonNotesService.saveLessonNote(
          user.id,
          dataWithTemplate,
          generatedContent,
          selectedTemplate?.id
        );
      }

      // Store generated content
      sessionStorage.setItem("generatedLessonNote", generatedContent);
      sessionStorage.setItem("lessonData", JSON.stringify({
        ...lessonData,
        templateName: selectedTemplate?.name,
      }));
      if (selectedTemplate) {
        sessionStorage.setItem("selectedTemplate", JSON.stringify(selectedTemplate));
      }

      // Clear draft after successful generation
      clearDraft();

      toast({
        title: "Success!",
        description: "Your lesson note has been generated successfully.",
      });

      navigate("/download");
    } catch (error) {
      console.error("Generation error:", error);
      
      // Check if it's an API key configuration error - don't retry those
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConfigError = errorMessage.toLowerCase().includes('api key') || 
                           errorMessage.toLowerCase().includes('not configured');
      
      if (isConfigError) {
        // Configuration errors should not be retried
        toast({
          title: "Configuration Error",
          description: "API key is not configured. Please contact the administrator.",
          variant: "destructive",
        });
        setRetryCount(0);
      } else if (retryCount < 2) {
        // Only retry transient errors
        toast({
          title: "Generation Failed",
          description: `Retrying... (Attempt ${retryCount + 2} of 3)`,
          variant: "default",
        });
        setRetryCount(prev => prev + 1);
        // Retry handleGenerate directly, not initiateGeneration (which would check payment again)
        setTimeout(() => handleGenerate(), 2000);
      } else {
        toast({
          title: "Generation Failed",
          description: errorMessage || "An error occurred. Please try again.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => {
              setRetryCount(0);
              initiateGeneration();
            }}>
              Retry
            </Button>
          ),
        });
        setRetryCount(0);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Detecting location...",
      description: "Please allow location access if prompted.",
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use OpenStreetMap Nominatim API for reverse geocoding (free, no key required)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const city = data.address.city || data.address.town || data.address.village || data.address.county;
          const region = data.address.state || data.address.region;
          const locationString = [city, region].filter(Boolean).join(", ");

          if (locationString) {
            setLessonData({ ...lessonData, location: locationString });
            toast({
              title: "Location detected",
              description: `Set location to: ${locationString}`,
            });
          } else {
             setLessonData({ ...lessonData, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
             toast({
              title: "Location detected",
              description: "Coordinates set. You can edit the location name manually.",
            });
          }
        } catch (error) {
          console.error("Error fetching location name:", error);
          toast({
            title: "Could not get location name",
            description: "Please enter your location manually.",
            variant: "destructive",
          });
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Location detection failed",
          description: "Please enter your location manually.",
          variant: "destructive",
        });
      }
    );
  };

  const handlePasteCurriculum = async () => {
    if (!pastedText.trim()) return;
    
    setIsParsingPaste(true);
    try {
      const parsed = await parseCurriculumPaste(pastedText);
      setLessonData({
        ...lessonData,
        strand: parsed.strand || lessonData.strand,
        subStrand: parsed.subStrand || lessonData.subStrand,
        contentStandard: parsed.contentStandard || lessonData.contentStandard,
        exemplars: parsed.exemplars || lessonData.exemplars
      });
      
      toast({
        title: "Curriculum Data Applied",
        description: "The pasted content has been filled into the form.",
      });
      setIsPasteDialogOpen(false);
      setPastedText("");
    } catch (error) {
      toast({
        title: "Parsing Failed",
        description: "Could not parse the text. Please fill the fields manually.",
        variant: "destructive"
      });
    } finally {
      setIsParsingPaste(false);
    }
  };

  // Update lessonData.indicators when selectedIndicators changes and filter exemplars
  useEffect(() => {
    // 1. Sync state to lessonData
    if (selectedIndicators.length > 0) {
      setLessonData(prev => ({ ...prev, indicators: selectedIndicators.join("\n") }));
    }

    // 2. Filter Exemplars
    if (selectedIndicators.length > 0 && availableContentStandards.length > 0) {
        
        // Handle multiple content standards
        const currentStandards = selectedContentStandards.length > 0 
           ? selectedContentStandards 
           : (lessonData.contentStandard ? lessonData.contentStandard.split('\n').filter(Boolean) : []);

        const relevantExemplars = new Set<string>();
        let hasMapping = false;

        currentStandards.forEach(stdString => {
            // Precise match against available standards
            const selectedStandard = availableContentStandards.find(cs => 
                 stdString === `${cs.code}: ${cs.description}` || 
                 stdString.startsWith(`${cs.code}:`)
            );

            if (selectedStandard && selectedStandard.mappings && selectedStandard.mappings.length > 0) {
                 hasMapping = true;
                 selectedStandard.mappings.forEach(mapping => {
                   // Robust matching: check if any of the mapping's indicators match selected indicators
                   const indicatorsMatch = mapping.indicators.some(ind => {
                      const indNorm = ind.toLowerCase().trim();
                      return selectedIndicators.some(sel => sel.toLowerCase().trim().includes(indNorm) || indNorm.includes(sel.toLowerCase().trim()));
                   });

                   if (indicatorsMatch) {
                      mapping.exemplars.forEach(ex => relevantExemplars.add(ex));
                   }
                 });
            }
        });

        if (relevantExemplars.size > 0) {
           const newExemplars = Array.from(relevantExemplars);
           setAvailableExemplars(newExemplars);
           // Also filter selected exemplars to only those that are valid
           setSelectedExemplars(prev => prev.filter(ex => newExemplars.includes(ex)));
        } else {
           // Fallback logic
           if (hasMapping) {
             // Mappings exist but no exemplars matched.
           } else {
             // No mappings found at all, just show all exemplars from the standard(s)
             const allExemplars = new Set<string>();
             currentStandards.forEach(stdString => {
                const selectedStandard = availableContentStandards.find(cs => stdString.startsWith(cs.code));
                if (selectedStandard && selectedStandard.exemplars) {
                   selectedStandard.exemplars.forEach(ex => allExemplars.add(ex));
                }
             });
             setAvailableExemplars(Array.from(allExemplars));
           }
        }
    } else {
       // If no indicators selected, we might want to clear selected exemplars
       if (!selectedIndicators || selectedIndicators.length === 0) {
          setSelectedExemplars([]);
       }
    }
  }, [selectedIndicators, availableContentStandards, selectedContentStandards, lessonData.contentStandard]);

  // Update lessonData.exemplars when selectedExemplars changes
  useEffect(() => {
    if (selectedExemplars.length > 0) {
      setLessonData(prev => ({ ...prev, exemplars: selectedExemplars.join("\n") }));
    } else if (availableExemplars.length > 0 && selectedExemplars.length === 0) {
       // If user unchecks everything, clear the field
       setLessonData(prev => ({ ...prev, exemplars: "" }));
    }
  }, [selectedExemplars, availableExemplars]);

  // Auto-populate available indicators/exemplars if content standard matches (Legacy/Single Select)
  useEffect(() => {
    // SKIP this effect if we are using the new multi-select mode
    if (selectedContentStandards.length > 0) return;

    if (lessonData.contentStandard && availableContentStandards.length > 0) {
      const selected = availableContentStandards.find(cs => 
        lessonData.contentStandard === cs.code || 
        lessonData.contentStandard.startsWith(`${cs.code}:`) ||
        lessonData.contentStandard.startsWith(`${cs.code} `)
      );

      if (selected) {
        setAvailableIndicators(selected.indicators || []);
        setAvailableExemplars([]); // Start empty, wait for indicators
        
        // Try to sync existing text data to selections
        if (lessonData.indicators) {
           const existing = lessonData.indicators.split("\n").map(s => s.trim());
           const matches = (selected.indicators || []).filter(i => existing.some(e => i.includes(e) || e.includes(i)));
           if (matches.length > 0) setSelectedIndicators(matches);
        }
        
        if (lessonData.exemplars) {
           const existing = lessonData.exemplars.split("\n").map(s => s.trim());
           const matches = (selected.exemplars || []).filter(e => existing.some(ex => e.includes(ex) || ex.includes(e)));
           if (matches.length > 0) setSelectedExemplars(matches);
        }
      }
    } else if (lessonData.exemplars && availableExemplars.length === 0) {
      // Fallback: If we have exemplars in lessonData (e.g. from Scheme) but none in the curriculum DB,
      // parse the text and use it as the "available" list so the user can interact with it as a checklist.
      const parsed = lessonData.exemplars.split(/\n|•|;|\r|\d+\.\s/).map(e => e.trim()).filter(e => e.length > 0);
      if (parsed.length > 0) {
        setAvailableExemplars(parsed);
        setSelectedExemplars(parsed);
      }
    }
  }, [lessonData.contentStandard, availableContentStandards, lessonData.exemplars, selectedContentStandards]);

  // Handle data from Scheme of Learning
  useEffect(() => {
    if (location.state?.fromScheme && location.state?.schemeData) {
      const { schemeData } = location.state;
      console.log("Loading scheme data:", schemeData);
      
      setIsFromScheme(true);
      
      // We need to ensure we don't overwrite if the user has already started editing
      // But since they just clicked "Generate" from the scheme page, we probably SHOULD overwrite.
      
      setLessonData(prev => ({
        ...prev,
        term: schemeData.term || prev.term,
        weekNumber: schemeData.weekNumber || prev.weekNumber,
        weekEnding: schemeData.weekEnding || prev.weekEnding,
        subject: schemeData.subject || prev.subject,
        level: schemeData.level || prev.level,
        strand: schemeData.strand || prev.strand,
        subStrand: schemeData.subStrand || prev.subStrand,
        contentStandard: schemeData.contentStandard || prev.contentStandard,
        indicators: schemeData.indicators || prev.indicators,
        exemplars: schemeData.exemplars || prev.exemplars,
        schemeResources: schemeData.resources || undefined
      }));

      toast({
        title: "Scheme Data Loaded",
        description: `Loaded data for ${schemeData.weekNumber} - ${schemeData.subject}`,
      });
      
      // Clear the state to prevent re-loading on simple refreshes if desired, 
      // but actually we want it to persist if they refresh immediately.
      // We can leave it.
    } else if (location.state?.restoreData) {
      const { restoreData, autoGenerate } = location.state;
      console.log("Restoring lesson data:", restoreData);
      
      setLessonData(prev => ({
        ...prev,
        ...restoreData
      }));
      
      if (restoreData.templateName) {
        const t = lessonTemplates.find(lt => lt.name === restoreData.templateName);
        if (t) setSelectedTemplate(t);
      }

      toast({
        title: "Data Restored",
        description: "Your previous lesson settings have been restored.",
      });
      
      // If auto-generate is requested, move to review step
      if (autoGenerate) {
          setCurrentStep(2); 
      }
    }
  }, [location.state]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Load scheme data
  useEffect(() => {
    const saved = localStorage.getItem("scheme_of_learning_data");
    if (saved) {
      try {
        setSchemeItems(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  const handleApplyScheme = async (item: any) => {
    setIsFromScheme(true);
    
    // Helper to clean "STRAND X:" prefixes
    const cleanPrefix = (str: string) => {
        if (!str) return "";
        // Removes "STRAND 1: ", "STRAND ONE (1): ", "Sub-strand 2: " etc.
        return str.replace(/^(STRAND|SUB-STRAND)\s+\w+(\s+\(\d+\))?:\s*/i, "");
    };

    // 1. Apply basic data immediately
    setLessonData(prev => ({
      ...prev,
      level: item.classLevel || prev.level,
      subject: item.subject || prev.subject,
      term: item.term || prev.term,
      weekNumber: item.week || prev.weekNumber,
      weekEnding: item.weekEnding || prev.weekEnding,
      strand: cleanPrefix(item.strand) || prev.strand,
      subStrand: cleanPrefix(item.subStrand) || prev.subStrand,
      contentStandard: item.contentStandard || prev.contentStandard,
      indicators: item.indicators || prev.indicators,
      exemplars: item.exemplars || prev.exemplars,
      schemeResources: item.resources || "" 
    }));
    
    // Clear errors
    setValidationErrors({ ...validationErrors, level: "", subject: "" });
    setIsSchemeDialogOpen(false);
    toast({ 
      title: "Scheme Data Loaded", 
      description: `Loaded ${item.subject} Week ${item.week}`,
    });

    // 2. Try to find better exemplars from the uploaded curriculum
    if (item.contentStandard && item.classLevel && item.subject) {
       toast({ title: "Looking up details...", description: "Checking curriculum for specific exemplars..." });
       try {
         const foundExemplars = await CurriculumService.findRelatedExemplars(
           currentUser?.id,
           item.classLevel,
           item.subject,
           item.contentStandard
         );
         
         if (foundExemplars && foundExemplars.length > 0) {
           setAvailableExemplars(foundExemplars);
           // Don't auto-select, let user choose. Or maybe auto-select if empty?
           // Currently we keep the scheme's text as default.
           toast({ title: "Exemplars Found", description: `Found ${foundExemplars.length} matching exemplars.` });
         } else {
           setAvailableExemplars([]);
         }
       } catch (err) {
         console.error("Failed exemplar lookup", err);
       }
    }
  };

  const filteredSchemeItems = schemeItems.filter(item => {
    if (!schemeSearch) return true;
    const search = schemeSearch.toLowerCase();
    return (
      item.subject?.toLowerCase().includes(search) ||
      item.week?.toLowerCase().includes(search) ||
      item.classLevel?.toLowerCase().includes(search) ||
      item.strand?.toLowerCase().includes(search)
    );
  });

  // Sync lessonData string fields to array state on load
  useEffect(() => {
     const strFromState = selectedStrands.join('\n');
     if (lessonData.strand && lessonData.strand !== strFromState) {
         // Only update if they really differ (avoid clearing if user just cleared state)
         // But we assume lessonData is source of truth
         setSelectedStrands(lessonData.strand.split('\n').filter(Boolean));
     }
  }, [lessonData.strand]);

  useEffect(() => {
     const strFromState = selectedSubStrands.join('\n');
     if (lessonData.subStrand && lessonData.subStrand !== strFromState) {
         setSelectedSubStrands(lessonData.subStrand.split('\n').filter(Boolean));
     }
  }, [lessonData.subStrand]);

  useEffect(() => {
     const strFromState = selectedContentStandards.join('\n');
     if (lessonData.contentStandard && lessonData.contentStandard !== strFromState) {
         setSelectedContentStandards(lessonData.contentStandard.split('\n').filter(Boolean));
     }
  }, [lessonData.contentStandard]);

  if (isLoading) {
    return <GeneratorSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />
        
        {/* Payment Wall */}
        {showPaymentWall && (
          <PaymentWall
            numLessons={lessonData.numLessons || 1}
            onPaymentComplete={handleGenerate}
            onCancel={() => setShowPaymentWall(false)}
          />
        )}
        
        {/* Status Bar */}
        {( !isOnline || lastSaved ) && (
          <div className="bg-muted/50 border-b border-border px-4 py-2 text-center text-xs text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-1">
              {!isOnline && (
                  <span className="flex items-center gap-1">
                      <WifiOff className="h-3 w-3" /> Offline
                  </span>
              )}
              {lastSaved && (
                <span>
                    {isSaving ? "Saving..." : `Draft Saved ${new Date(lastSaved).toLocaleTimeString()}`}
                </span>
              )}
          </div>
        )}

        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 sm:mb-8 text-center px-2">
              <h2 className="mb-2 text-2xl sm:text-3xl font-bold text-foreground">Create Your Lesson Note</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Follow the steps below to generate a professional lesson note
              </p>
            </div>

            {/* Progress Stepper */}
            <div className="mb-6 sm:mb-8 overflow-x-auto px-2">
              <Stepper steps={STEPS} currentStep={currentStep} />
            </div>

            <Card className="p-4 sm:p-6 lg:p-8 shadow-medium">
              <div className="space-y-4 sm:space-y-6">
                {/* Step 0: Basic Info */}
                {currentStep === 0 && (
                  <BasicInfoStep
                    lessonData={lessonData}
                    setLessonData={(data) => setLessonData({ ...lessonData, ...data })}
                    availableLevels={availableLevels}
                    availableSubjects={availableSubjects}
                    userProfile={userProfile}
                    validationErrors={validationErrors}
                    setValidationErrors={setValidationErrors}
                    handleDetectLocation={handleDetectLocation}
                  />
                )}

                {/* Step 1: Curriculum Files */}
                {/* Step 1: Details */}
                {currentStep === 1 && (
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-xl font-semibold">Lesson Details</h3>
                      <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <ClipboardPaste className="h-4 w-4" />
                            <span className="hidden sm:inline">Paste Curriculum</span>
                            <span className="sm:hidden">Paste</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Paste Curriculum Details</DialogTitle>
                            <DialogDescription>
                              Paste the Strand, Sub-strand, Content Standard, and Indicators from your document here. AI will try to fill the form for you.
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea 
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="Paste text here..."
                            className="min-h-[200px]"
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPasteDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handlePasteCurriculum} disabled={isParsingPaste}>
                              {isParsingPaste ? "Parsing..." : "Apply to Form"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                      <Checkbox 
                        id="manual-mode" 
                        checked={isManualCurriculum}
                        onCheckedChange={(checked) => setIsManualCurriculum(checked as boolean)}
                      />
                      <Label htmlFor="manual-mode" className="text-sm font-medium cursor-pointer">
                        Manually enter curriculum standards (Strand, Sub-strand, etc.)
                      </Label>
                    </div>
                    
                    <div className="grid gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="strand">Strands *</Label>
                        {!isManualCurriculum && availableStrands.length === 0 && (
                           <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                              No strands found? Please select a valid subject/level combination.
                           </div>
                        )}
                        {isManualCurriculum ? (
                          <Textarea
                            id="strand"
                            placeholder="Enter strands (one per line)..."
                            value={lessonData.strand}
                            onChange={(e) => {
                              setLessonData({ ...lessonData, strand: e.target.value });
                              setValidationErrors({ ...validationErrors, strand: "" });
                            }}
                            rows={3}
                          />
                        ) : (
                          <>
                            <MultiSelectCombobox
                              options={availableStrands.map(s => s.label)}
                              selected={selectedStrands}
                              onChange={(newSelection) => {
                                setSelectedStrands(newSelection);
                                // Join with newlines for backend
                                const newStrandString = newSelection.join('\n');
                                
                                setLessonData({ 
                                  ...lessonData, 
                                  strand: newStrandString,
                                  // Don't necessarily clear sub-strands, but they might be invalid now. 
                                  // For safety, we keep them, assuming the user is building up a complex lesson.
                                });
                                
                                // Let the downstream effects handle loading sub-strands
                                setValidationErrors({ ...validationErrors, strand: "" });
                              }}
                              placeholder="Select strands..."
                              searchPlaceholder="Search strands..."
                              emptyText={!lessonData.subject || !lessonData.level ? "Select subject and level first" : "No strands found."}
                            />
                             <p className="text-xs text-muted-foreground">
                                You can select multiple strands.
                            </p>
                          </>
                        )}
                        {validationErrors.strand && (
                          <p className="text-sm text-destructive">{validationErrors.strand}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subStrand">Sub-Strands *</Label>
                        {isManualCurriculum ? (
                          <Textarea
                            id="subStrand"
                            placeholder="Enter sub-strands (one per line)..."
                            value={lessonData.subStrand}
                            onChange={(e) => {
                              setLessonData({ ...lessonData, subStrand: e.target.value });
                              setValidationErrors({ ...validationErrors, subStrand: "" });
                            }}
                            rows={3}
                          />
                        ) : (
                          <>
                            <MultiSelectCombobox
                              options={availableSubStrands.map(s => s.label)}
                              selected={selectedSubStrands}
                              onChange={(newSelection) => {
                                setSelectedSubStrands(newSelection);
                                // Join with newlines
                                const newSubStrandString = newSelection.join('\n');
                                
                                setLessonData({ 
                                  ...lessonData, 
                                  subStrand: newSubStrandString,
                                });
                                
                                setValidationErrors({ ...validationErrors, subStrand: "" });
                              }}
                              placeholder="Select sub-strands..."
                              searchPlaceholder="Search sub-strands..."
                              disabled={selectedStrands.length === 0}
                              emptyText={selectedStrands.length === 0 ? "Select a strand first" : "No sub-strands found."}
                            />
                             <p className="text-xs text-muted-foreground">
                                You can select multiple sub-strands.
                            </p>
                          </>
                        )}
                        {validationErrors.subStrand && (
                          <p className="text-sm text-destructive">{validationErrors.subStrand}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="contentStandard" className="text-sm font-medium">
                        Content Standards *
                      </Label>
                      <div className="bg-muted/30 rounded-lg border border-border/50 p-3 sm:p-4">
                        {isManualCurriculum ? (
                          <Textarea
                            id="contentStandard"
                            placeholder="Enter content standards (one per line)..."
                            value={lessonData.contentStandard}
                            onChange={(e) => {
                              setLessonData({ ...lessonData, contentStandard: e.target.value });
                              setValidationErrors({ ...validationErrors, contentStandard: "" });
                            }}
                            rows={3}
                          />
                        ) : (
                          <>
                        <MultiSelectCombobox
                          options={availableContentStandards.map(cs => `${cs.code}: ${cs.description}`)}
                          selected={selectedContentStandards}
                          onChange={(newSelection) => {
                            setSelectedContentStandards(newSelection);
                            
                            // Join with newlines
                            const newStandardString = newSelection.join('\n');
                            
                            setLessonData({ 
                              ...lessonData, 
                              contentStandard: newStandardString,
                              exemplars: "", 
                              indicators: "" 
                            });
                            
                            // Load related indicators for ALL selected standards
                            let combinedIndicators: string[] = [];
                            newSelection.forEach(val => {
                                const selected = availableContentStandards.find(cs => `${cs.code}: ${cs.description}` === val);
                                if (selected && selected.indicators) {
                                    // Parse and split indicators if they look like "Performance Indicators" list
                                    const rawIndicators = selected.indicators;
                                    const parsedIndicators: string[] = [];

                                    rawIndicators.forEach(ind => {
                                      // Check if it's the "By the end of the lesson..." generic header with numbered items
                                      // Or just a numbered list inside strict string
                                      // Regex: Look for digit-dot-space "1. " or "1.0 " occurring multiple times
                                      const matches = ind.match(/\d+\.\s+/g);
                                      if (matches && matches.length >= 1) {
                                           // It's likely a list. Split it.
                                           // We split by digit-dot-space, but keep the content.
                                           // Since JS split consumes the separator, we can use a positive lookahead or just standard split and map.
                                           
                                           // Method: Replace "1. " with "|SPLIT|1. " then split by |SPLIT|
                                           // This preserves the numbering which is often useful context
                                           
                                           // Remove common header if present
                                           let cleanInd = ind.replace(/Indicator:?\s*By the end of the lesson.*?able to:?/i, "").trim();
                                           
                                           // Normalize newlines to spaces for easier splitting if it's just one line
                                           // cleanInd = cleanInd.replace(/\n/g, " "); 
                                           
                                           // If the string starts with a number, or contains them
                                           const parts = cleanInd.split(/(\d+\.\s+)/).filter(Boolean);
                                           
                                           // Re-assemble "1. " with "Identify..."
                                           for (let i = 0; i < parts.length; i++) {
                                               if (parts[i].match(/^\d+\.\s+$/) && parts[i+1]) {
                                                   parsedIndicators.push(parts[i+1].trim());
                                                   i++;
                                               } else if (!parts[i].match(/^\d+\.\s+$/) && parts[i].length > 5) {
                                                   // Just a loose string part, maybe the header was left over
                                                   // parsedIndicators.push(parts[i].trim()); 
                                               }
                                           }

                                           // Fallback: If parsing failed to extract meaningful parts (e.g. format wasn't exactly 1.), keep original
                                           if (parsedIndicators.length === 0) parsedIndicators.push(ind);

                                      } else {
                                          parsedIndicators.push(ind);
                                      }
                                    });

                                    combinedIndicators = [...combinedIndicators, ...parsedIndicators];
                                }
                            });
                            
                            // Deduplicate
                            const uniqueIndicators = Array.from(new Set(combinedIndicators));

                            if (uniqueIndicators.length > 0) {
                              setAvailableIndicators(uniqueIndicators);
                              setSelectedIndicators([]);
                              setAvailableExemplars([]);
                              setSelectedExemplars([]);
                            } else {
                              setAvailableIndicators([]);
                              setSelectedIndicators([]);
                              setAvailableExemplars([]);
                              setSelectedExemplars([]);
                            }
                            
                            setValidationErrors({ ...validationErrors, contentStandard: "" });
                                                   }}
                          placeholder="Select content standards..."
                          searchPlaceholder="Search standards..."
                          disabled={selectedSubStrands.length === 0}
                          emptyText={selectedSubStrands.length === 0 ? "Select a sub-strand first" : "No standards found."}
                        />
                         <p className="text-xs text-muted-foreground mt-2">
                            Select multiple content standards if needed.
                        </p>
                          </>
                        )}
                      </div>
                      {validationErrors.contentStandard && (
                        <p className="text-sm text-destructive">{validationErrors.contentStandard}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="indicators" className="text-sm font-medium flex items-center gap-2">
                        Learning Indicators
                        {selectedIndicators.length > 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {selectedIndicators.length} selected
                          </span>
                        )}
                      </Label>
                      <div className="bg-muted/30 rounded-lg border border-border/50 p-3 sm:p-4">
                        {availableIndicators.length > 0 && !isManualCurriculum ? (
                          <MultiSelectCombobox
                            options={availableIndicators}
                            selected={selectedIndicators}
                            onChange={setSelectedIndicators}
                            placeholder="Select learning indicators..."
                            searchPlaceholder="Search indicators..."
                            emptyText="No indicators found."
                            maxDisplayed={3}
                          />
                        ) : (
                          <Textarea
                            id="indicators"
                            placeholder="Enter learning indicators (e.g., B4.1.2.1.1 - Demonstrate understanding of...)"
                            value={lessonData.indicators}
                            onChange={(e) => setLessonData({ ...lessonData, indicators: e.target.value })}
                            rows={3}
                            className="resize-none text-sm bg-background"
                          />
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {availableIndicators.length > 0 && !isManualCurriculum
                            ? "Click to select multiple indicators from your curriculum"
                            : "No indicators found in curriculum. Enter manually above."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="exemplars" className="text-sm font-medium flex items-center gap-2">
                        Exemplars
                        {selectedExemplars.length > 0 && (
                          <span className="text-xs bg-secondary/50 text-secondary-foreground px-2 py-0.5 rounded-full">
                            {selectedExemplars.length} selected
                          </span>
                        )}
                      </Label>
                      <div className="bg-muted/30 rounded-lg border border-border/50 p-3 sm:p-4 space-y-3">
                        {availableExemplars.length > 0 && !isManualCurriculum && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Select from curriculum:</p>
                            <MultiSelectCombobox
                              options={availableExemplars}
                              selected={selectedExemplars}
                              onChange={setSelectedExemplars}
                              placeholder="Select exemplars..."
                              searchPlaceholder="Search exemplars..."
                              emptyText="No exemplars found."
                              maxDisplayed={2}
                            />
                          </div>
                        )}
                        
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {availableExemplars.length > 0 && !isManualCurriculum ? "Or add/edit manually:" : "Enter exemplars:"}
                          </p>
                          <Textarea
                            id="exemplars"
                            placeholder="E.g., Students will demonstrate ability to identify and explain..."
                            value={lessonData.exemplars}
                            onChange={(e) => setLessonData({ ...lessonData, exemplars: e.target.value })}
                            rows={3}
                            className="resize-none text-sm bg-background"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {availableExemplars.length > 0 && !isManualCurriculum
                            ? "Combine selected items with manual edits for comprehensive coverage."
                            : "Describe what learners will be able to do by the end of the lesson."}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="philosophy">
                          Teaching Philosophy
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 inline ml-1 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Select your preferred teaching approach</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Combobox
                          options={[
                            { value: "student-centered", label: "Student-Centered (Active Learning)" },
                            { value: "teacher-led", label: "Teacher-Led (Direct Instruction)" },
                            { value: "balanced", label: "Balanced (Mixed Approach)" },
                            { value: "inquiry-based", label: "Inquiry-Based (Discovery Learning)" },
                            { value: "collaborative", label: "Collaborative (Group Work)" },
                          ]}
                          value={lessonData.philosophy}
                          onValueChange={(value) => setLessonData({ ...lessonData, philosophy: value })}
                          placeholder="Select teaching philosophy"
                          searchPlaceholder="Search philosophies..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="detailLevel">
                          Detail Level
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 inline ml-1 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>How detailed should the lesson note be?</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Combobox
                          options={[
                            { value: "brief", label: "Brief (Key Points Only)" },
                            { value: "moderate", label: "Moderate (Standard Detail)" },
                            { value: "detailed", label: "Detailed (Comprehensive)" },
                            { value: "very-detailed", label: "Very Detailed (Extensive)" },
                          ]}
                          value={lessonData.detailLevel}
                          onValueChange={(value) => setLessonData({ ...lessonData, detailLevel: value })}
                          placeholder="Select detail level"
                          searchPlaceholder="Search detail levels..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeDiagrams"
                          checked={lessonData.includeDiagrams}
                          onCheckedChange={(checked) => 
                            setLessonData({ ...lessonData, includeDiagrams: checked as boolean })
                          }
                        />
                        <Label
                          htmlFor="includeDiagrams"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Include Diagram Outlines
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 inline ml-1 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add descriptions of diagrams, charts, or illustrations to include in the lesson</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        When enabled, the lesson note will include outlines and descriptions of diagrams that should be drawn or displayed during the lesson
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template">Lesson Note Template</Label>
                      <TemplateSelector
                        selectedTemplateId={selectedTemplate?.id}
                        onSelectTemplate={setSelectedTemplate}
                      />
                      {selectedTemplate && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Selected: <span className="font-medium">{selectedTemplate.name}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Review */}
                {currentStep === 2 && (
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
                    <h3 className="text-lg sm:text-xl font-semibold">Review Your Information</h3>
                    
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Subject</p>
                          <p className="font-medium">
                            {SUBJECTS.find(s => s.value === lessonData.subject)?.label || lessonData.subject || "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Class Level</p>
                          <p className="font-medium">
                            {CLASS_LEVELS.find(l => l.value === lessonData.level)?.label || lessonData.level || "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Strand</p>
                          <p className="font-medium">
                            {availableStrands.find(s => s.value === lessonData.strand)?.label || lessonData.strand || "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Class Size</p>
                          <p className="font-medium">{lessonData.classSize || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Teaching Philosophy</p>
                          <p className="font-medium capitalize">
                            {lessonData.philosophy?.replace("-", " ") || "Balanced"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Detail Level</p>
                          <p className="font-medium capitalize">
                            {lessonData.detailLevel?.replace("-", " ") || "Moderate"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Diagram Outlines</p>
                          <p className="font-medium">
                            {lessonData.includeDiagrams ? "Included" : "Not included"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Content Standard</p>
                        <p className="font-medium">{lessonData.contentStandard || "Not set"}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Curriculum Files</p>
                        <p className="font-medium">{selectedCurriculumFiles.length} files selected</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Template</p>
                        <p className="font-medium">{selectedTemplate?.name || "Default template"}</p>
                      </div>
                    </div>

                    {!isOnline && (
                      <Alert>
                        <WifiOff className="h-4 w-4" />
                        <AlertDescription>
                          You're currently offline. Please connect to the internet to generate your lesson note.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 sm:pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0 || isGenerating}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                    {currentStep < STEPS.length - 1 ? (
                      <Button onClick={nextStep} disabled={isGenerating} className="w-full sm:w-auto">
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={initiateGeneration}
                        disabled={isGenerating || !isOnline}
                        className="bg-gradient-hero hover:opacity-90 w-full sm:w-auto"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline">Generating...</span>
                            <span className="sm:hidden">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Generate Lesson Note</span>
                            <span className="sm:hidden">Generate</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </main>

        {/* Paste Curriculum Dialog */}
        <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Paste Curriculum Data</DialogTitle>
              <DialogDescription>
                Paste the curriculum data copied from another source. The system will attempt to parse and fill the relevant fields.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your curriculum data here..."
                rows={6}
                className="resize-none"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPasteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePasteCurriculum} disabled={isParsingPaste}>
                  {isParsingPaste ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardPaste className="mr-2 h-4 w-4" />
                  )}
                  Paste and Parse
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scheme Selection Dialog */}
        <Dialog open={isSchemeDialogOpen} onOpenChange={setIsSchemeDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Select Scheme of Learning</DialogTitle>
              <DialogDescription>
                Choose a scheme from the list below to apply its data to the form. You can also paste new data directly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search by subject, week, or class level"
                  value={schemeSearch}
                  onChange={(e) => setSchemeSearch(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setSchemeSearch("");
                    setSchemeItems(JSON.parse(localStorage.getItem("scheme_of_learning_data") || "[]"));
                  }}
                  disabled={isGenerating}
                >
                  Clear Search
                </Button>
              </div>

              {/* Scheme Items List */}
              <div className="h-[400px]">
                {filteredSchemeItems.length > 0 ? (
                  <List
                    height={400}
                    itemCount={filteredSchemeItems.length}
                    itemSize={120} // Adjusted size for content
                    width="100%"
                  >
                    {({ index, style }) => {
                        const item = filteredSchemeItems[index];
                        return (
                            <div style={style} className="px-1 py-1">
                                <div
                                    className="p-4 rounded-lg bg-muted cursor-pointer hover:bg-muted/80 transition h-full overflow-hidden"
                                    onClick={() => handleApplyScheme(item)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium">{item.subject}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.classLevel} - {item.week}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApplyScheme(item);
                                            }}
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-2">
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.indicators}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                  </List>
                ) : (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    No schemes found. You can paste new data below.
                  </p>
                )}
              </div>

              {/* Paste New Scheme Data */}
              <div className="space-y-2">
                <Label htmlFor="newSchemeData">Or paste new scheme data</Label>
                <Textarea
                  id="newSchemeData"
                  placeholder="Paste your scheme of learning data here..."
                  rows={4}
                  className="resize-none"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                />
                <Button
                  onClick={async () => {
                    try {
                      const parsedData = JSON.parse(pastedText);
                      if (Array.isArray(parsedData)) {
                        localStorage.setItem("scheme_of_learning_data", JSON.stringify(parsedData));
                        setSchemeItems(parsedData);
                        toast({ title: "Data Imported", description: "New scheme data has been imported successfully." });
                      } else {
                        toast({ title: "Invalid Data", description: "Please ensure the pasted data is in the correct format.", variant: "destructive" });
                      }
                    } catch (error) {
                      toast({ title: "Error", description: "Failed to import data. Please try again.", variant: "destructive" });
                      console.error(error);
                    }
                  }}
                >
                  Import Scheme Data
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ImprovedGenerator;
