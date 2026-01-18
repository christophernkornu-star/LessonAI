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
import { lessonTemplates, type LessonTemplate } from "@/data/lessonTemplates";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { CurriculumService } from "@/services/curriculumService";
import { GeneratorSkeleton } from "@/components/LoadingSkeletons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Navbar } from "@/components/Navbar";

const STEPS = ["Basic Info", "Details", "Review"];

const ImprovedGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Set default template to Ghana Standard
  const [selectedTemplate, setSelectedTemplate] = useState<LessonTemplate | null>(
    lessonTemplates.find(t => t.id === "ghana-standard") || null
  );
  const [selectedCurriculumFiles, setSelectedCurriculumFiles] = useState<string[]>([]);
  const [selectedResourceFiles, setSelectedResourceFiles] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
  const [schemeItems, setSchemeItems] = useState<any[]>([]);
  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false);
  const [schemeSearch, setSchemeSearch] = useState("");

  const { data: lessonData, setData: setLessonData, lastSaved, isSaving, clearDraft } = useDraft(
    {
      subject: "",
      level: "",
      strand: "",
      subStrand: "",
      contentStandard: "",
      indicators: "",
      exemplars: "",
      classSize: "",
      philosophy: "balanced",
      detailLevel: "moderate",
      includeDiagrams: false,
      location: "Biriwa, Central Region",
      term: "First Term",
      weekNumber: "Week 1",
      weekEnding: "",
      numLessons: 1,
    },
    { key: "lesson-generator", autosaveDelay: 3000 }
  );

  // Check authentication and load user profile
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && isMounted) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to generate lesson notes.",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        // Load user profile
        if (session?.user) {
          setCurrentUser(session.user);
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profile && isMounted) {
            setUserProfile(profile);
            // Pre-fill class size from profile
            if (profile.default_class_size && !lessonData.classSize) {
              setLessonData({ ...lessonData, classSize: profile.default_class_size.toString() });
            }
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []); // Only runs once on mount

  // Update class size and lesson details from Timetable when grade level or subject changes
  useEffect(() => {
    const fetchTimetableDetails = async () => {
      // Don't run if we don't have a level
      if (!lessonData.level) return;

      // Note: We need currentUser ID. If it's not loaded yet, this effect might run but return early.
      // But if currentUser changes later, this effect should re-run because it's in dependency.
      if (!currentUser?.id) return;

      try {
        console.log("Fetching timetable for level:", lessonData.level);

        // Resolve the level label (e.g. "Basic 4") from the selected value (e.g. "basic4")
        // We use the availableLevels list which maps values to labels
        const selectedLevelObj = availableLevels.find(l => l.value === lessonData.level || l.label === lessonData.level);
        const selectedLevelLabel = selectedLevelObj?.label || lessonData.level;
        const selectedLevelValue = selectedLevelObj?.value || lessonData.level;

        console.log("Resolved level label:", selectedLevelLabel);

        // Try searching with the Label first (most likely in DB since Timetable saves Labels), then the exact value
        let timetable = await TimetableService.getTimetable(
          currentUser.id, 
          selectedLevelLabel, 
          lessonData.term || "First Term"
        );

        if (!timetable && selectedLevelLabel !== selectedLevelValue) {
             // Try searching with Value if Label didn't work (e.g. maybe they saved "basic4")
             console.log("Retrying with level value:", selectedLevelValue);
             timetable = await TimetableService.getTimetable(
                currentUser.id, 
                selectedLevelValue, 
                lessonData.term || "First Term"
             );
        }
        
        if (timetable) {
          console.log("Found timetable:", timetable);
          
          // Force update logic
          const newSize = timetable.class_size ? timetable.class_size.toString() : "";
          let newNumLessons = 0; // Don't default to lessonData.numLessons here, we want to see if we find a match

          // Update numLessons from subject config if subject is selected
          if (lessonData.subject && timetable.subject_config) {
               // Try exact match or case insensitive match for subject
              let subjectConfig = timetable.subject_config[lessonData.subject];
              
              if (!subjectConfig) {
                  // Case insensitive search
                  const subjectKey = Object.keys(timetable.subject_config).find(k => k.toLowerCase() === lessonData.subject.toLowerCase());
                  if (subjectKey) subjectConfig = timetable.subject_config[subjectKey];
              }

              if (subjectConfig && subjectConfig.frequency) {
                   newNumLessons = subjectConfig.frequency;
              }
          }
          
          setLessonData(prev => {
              const updates: any = {};
              if (newSize && prev.classSize !== newSize) {
                  updates.classSize = newSize;
              }
              if (newNumLessons > 0 && prev.numLessons !== newNumLessons) {
                  updates.numLessons = newNumLessons;
              }
              
              if (Object.keys(updates).length > 0) {
                  console.log("Updating lesson data with timetable info:", updates);
                  return { ...prev, ...updates };
              }
              return prev;
          });
        } else {
            console.log("No timetable found for this level.");
            // Fallback to legacy userProfile.class_sizes if no timetable found
            if (userProfile?.class_sizes) {
                const specificSize = userProfile.class_sizes[lessonData.level] || userProfile.class_sizes[selectedLevelLabel];
                if (specificSize) {
                    setLessonData(prev => {
                        if (prev.classSize !== specificSize.toString()) {
                            return { ...prev, classSize: specificSize.toString() };
                        }
                        return prev;
                    });
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

        // 2. Load from Scheme of Learning (Secondary Source)
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
        
        /* 
        const hasUserContent = addedSubjects.size > 0;
        
        if (!hasUserContent) {
          SUBJECTS.forEach(s => {
               const isLevelValid = !s.levels || 
                                    s.levels.includes(selectedLevelValue) || 
                                    s.levels.includes(selectedLevelLabel);
               
               if (isLevelValid) {
                   addSubject(s.value, s.label);
               }
          });
        } else {
             console.log(`User has custom content for ${selectedLevelLabel}, skipping static subjects.`);
        }
        */
       
        // Sort subjects alphabetically
        subjects.sort((a, b) => a.label.localeCompare(b.label));
        
        setAvailableSubjects(subjects);
        
        // Auto-select if only one subject
        if (subjects.length === 1 && !lessonData.subject) {
             // Optional: automatically select the single available subject
             // setLessonData(prev => ({ ...prev, subject: subjects[0].value }));
        }

        if (lessonData.subject && !subjects.some(s => s.value === lessonData.subject)) {
            // Keep it anyway if user manually typed it or it came from scheme, 
            // but effectively invalid if not in the list
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
      if (lessonData.subject && lessonData.level && lessonData.strand && currentUser) {
        // The strand value is already the label from ComboboxWithInput
        const strandLabel = lessonData.strand;
        
        const subStrands = await CurriculumService.getSubStrandsByStrand(
          lessonData.level,
          lessonData.subject,
          strandLabel,
          currentUser.id
        );
        setAvailableSubStrands(subStrands);

        // Auto-select if only one sub-strand
        if (subStrands.length === 1) {
           setLessonData(prev => ({ ...prev, subStrand: subStrands[0].label }));
        } else if (subStrands.length === 0) {
           toast({
             title: "No Sub-strands Found",
             description: `Found strand "${lessonData.strand}" but no sub-strands linked to it for ${lessonData.level}. Please check your uploaded curriculum.`,
             variant: "destructive"
           });
        }
      } else {
        setAvailableSubStrands([]);
      }
    };
    loadSubStrands();
  }, [lessonData.subject, lessonData.level, lessonData.strand, currentUser]);

  // Load content standards when sub-strand changes
  useEffect(() => {
    const loadContentStandards = async () => {
      if (lessonData.subject && lessonData.level && lessonData.strand && lessonData.subStrand && currentUser) {
        // The values are already labels from ComboboxWithInput
        const strandLabel = lessonData.strand;
        const subStrandLabel = lessonData.subStrand;
        
        const standards = await CurriculumService.getContentStandardsBySubStrand(
          lessonData.level,
          lessonData.subject,
          strandLabel,
          subStrandLabel,
          currentUser.id
        );
        setAvailableContentStandards(standards);
      } else {
        setAvailableContentStandards([]);
      }
    };
    loadContentStandards();
  }, [lessonData.subject, lessonData.level, lessonData.strand, lessonData.subStrand, availableStrands, availableSubStrands, currentUser]);

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

  const handleGenerate = async () => {
    if (!validateStep(currentStep)) return;

    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please connect to the internet to generate lesson notes.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Fetch timetable configuration if available
      let scheduledDays: string[] | undefined;
      let numLessonsFromTimetable: number | undefined;
      let classSizeFromTimetable: string | undefined;

      try {
        if (currentUser && lessonData.level && lessonData.subject) {
          const timetable = await TimetableService.getTimetable(
            currentUser.id, 
            lessonData.level, 
            lessonData.term || "First Term"
          );
          
          if (timetable) {
              // Get Class Size
              if (timetable.class_size) {
                  classSizeFromTimetable = timetable.class_size.toString();
              }

              // Get Subject Config
              if (timetable.subject_config) {
                // Try exact match or case insensitive
                const subjectConfig = timetable.subject_config[lessonData.subject]; 
                  
                if (subjectConfig) {
                  if (subjectConfig.days && subjectConfig.days.length > 0) {
                      scheduledDays = subjectConfig.days;
                  }
                  if (subjectConfig.frequency) {
                      numLessonsFromTimetable = subjectConfig.frequency;
                  }
                  console.log("Using timetable:", { scheduledDays, numLessonsFromTimetable, classSizeFromTimetable });
                }
             }
          }
        }
      } catch (ttError) {
        console.warn("Failed to fetch timetable, proceeding with defaults", ttError);
      }

      const dataWithTemplate: LessonData = {
        ...lessonData,
        // Prefer manual input (lessonData), fallback to timetable, then defaults
        numLessons: lessonData.numLessons || numLessonsFromTimetable || 1, 
        scheduledDays: scheduledDays,
        classSize: lessonData.classSize || classSizeFromTimetable, 
        template: selectedTemplate || undefined,
        selectedCurriculumFiles: selectedCurriculumFiles.length > 0 ? selectedCurriculumFiles : undefined,
        selectedResourceFiles: selectedResourceFiles.length > 0 ? selectedResourceFiles : undefined,
      };

      const generatedContent = await generateLessonNote(dataWithTemplate);

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
      
      // Implement retry logic
      if (retryCount < 2) {
        toast({
          title: "Generation Failed",
          description: `Retrying... (Attempt ${retryCount + 2} of 3)`,
          variant: "default",
        });
        setRetryCount(retryCount + 1);
        setTimeout(() => handleGenerate(), 2000);
      } else {
        toast({
          title: "Generation Failed",
          description: error instanceof Error ? error.message : "An error occurred. Please try again.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={handleGenerate}>
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
    if (selectedIndicators.length > 0) {
      setLessonData(prev => ({ ...prev, indicators: selectedIndicators.join("\n") }));
      
      // Filter exemplars based on selected indicators
      if (lessonData.contentStandard && availableContentStandards.length > 0) {
        // More precise matching to avoid partial code matches (e.g. "B1" matching "B10")
        const selectedStandard = availableContentStandards.find(cs => 
          lessonData.contentStandard === cs.code || 
          lessonData.contentStandard.startsWith(`${cs.code}:`) ||
          lessonData.contentStandard.startsWith(`${cs.code} `)
        );
        
        console.log("Selected Standard for filtering:", selectedStandard);

        if (selectedStandard) {
           // If we have mappings, use them
           if (selectedStandard.mappings && selectedStandard.mappings.length > 0) {
             const relevantExemplars = new Set<string>();
             
             selectedStandard.mappings.forEach(mapping => {
               // Robust matching: check if any of the mapping's indicators match selected indicators
               // We normalize by trimming and ignoring case to be safe
               const hasSelectedIndicator = mapping.indicators.some(ind => 
                 selectedIndicators.some(sel => 
                   sel.trim().toLowerCase() === ind.trim().toLowerCase() || 
                   sel.includes(ind) || 
                   ind.includes(sel)
                 )
               );
               
               if (hasSelectedIndicator) {
                 mapping.exemplars.forEach(ex => relevantExemplars.add(ex));
               }
             });
             
             const newAvailable = Array.from(relevantExemplars);
             console.log("Filtered exemplars:", newAvailable);
             
             if (newAvailable.length > 0) {
               setAvailableExemplars(newAvailable);
               // Filter selected exemplars to only those that are still available
               setSelectedExemplars(prev => prev.filter(ex => newAvailable.includes(ex)));
             } else {
               // If filtering resulted in nothing, but we have indicators selected, 
               // it might mean the mapping failed. Fallback to showing all exemplars 
               // so the user isn't blocked.
               console.warn("Filtering returned no exemplars, falling back to all.");
               setAvailableExemplars(selectedStandard.exemplars || []);
             }
           } else {
             // No mappings available (legacy data or structure), show all exemplars
             console.log("No mappings found, showing all exemplars.");
             setAvailableExemplars(selectedStandard.exemplars || []);
           }
        }
      }
    } else {
      // If no indicators selected, clear selected exemplars.
      // We do NOT clear availableExemplars here because they might have been 
      // populated via the text-pairing lookup (Scheme load) and we want them visible.
      // setAvailableExemplars([]);
      setSelectedExemplars([]);
    }
  }, [selectedIndicators, lessonData.contentStandard, availableContentStandards]);

  // Update lessonData.exemplars when selectedExemplars changes
  useEffect(() => {
    if (selectedExemplars.length > 0) {
      setLessonData(prev => ({ ...prev, exemplars: selectedExemplars.join("\n") }));
    } else if (availableExemplars.length > 0 && selectedExemplars.length === 0) {
       // If user unchecks everything, clear the field
       setLessonData(prev => ({ ...prev, exemplars: "" }));
    }
  }, [selectedExemplars, availableExemplars]);

  // Auto-populate available indicators/exemplars if content standard matches
  useEffect(() => {
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
  }, [lessonData.contentStandard, availableContentStandards, lessonData.exemplars]);

  // Handle data from Scheme of Learning
  useEffect(() => {
    if (location.state?.fromScheme && location.state?.schemeData) {
      const { schemeData } = location.state;
      console.log("Loading scheme data:", schemeData);
      
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
    // 1. Apply basic data immediately
    setLessonData(prev => ({
      ...prev,
      level: item.classLevel || prev.level,
      subject: item.subject || prev.subject,
      term: item.term || prev.term,
      weekNumber: item.week || prev.weekNumber,
      weekEnding: item.weekEnding || prev.weekEnding,
      strand: item.strand || prev.strand,
      subStrand: item.subStrand || prev.subStrand,
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

  if (isLoading) {
    return <GeneratorSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />
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
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg sm:text-xl font-semibold">Basic Information</h3>
                      {schemeItems.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsSchemeDialogOpen(true)}
                          className="gap-2 text-primary border-primary hover:bg-primary/10"
                        >
                          <FileText className="h-4 w-4" />
                          Load from Scheme
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="level">
                          Class Level *
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 inline ml-1 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Select the class level first</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Combobox
                          options={availableLevels}
                          value={lessonData.level}
                          onValueChange={(value) => {
                            // Find the label for this value if possible, to store consistent data
                            // Actually, let's keep storing value, but ensure our lookups handle it.
                            console.log("Selected level:", value);
                            setLessonData({ ...lessonData, level: value, subject: "", strand: "", subStrand: "" });
                            setValidationErrors({ ...validationErrors, level: "" });
                          }}
                          placeholder={availableLevels.length > 0 ? "Select class level" : "Loading levels..."}
                          searchPlaceholder="Search levels..."
                          emptyText="No levels found."
                        />
                        {validationErrors.level && (
                          <p className="text-sm text-destructive">{validationErrors.level}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">
                          Subject *
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 inline ml-1 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Select the subject for your lesson</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Combobox
                          options={availableSubjects}
                          value={lessonData.subject}
                          onValueChange={(value) => {
                            setLessonData({ ...lessonData, subject: value, strand: "", subStrand: "" });
                            setValidationErrors({ ...validationErrors, subject: "" });
                          }}
                          placeholder="Select subject"
                          searchPlaceholder="Search subjects..."
                          emptyText={!lessonData.level ? "Select a class level first" : "No subjects found for this level."}
                          disabled={!lessonData.level}
                        />
                        {validationErrors.subject && (
                          <p className="text-sm text-destructive">{validationErrors.subject}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="classSize">
                        Class Size
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 inline ml-1 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of students in your class</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="classSize"
                        type="number"
                        placeholder={userProfile?.default_class_size ? `Default: ${userProfile.default_class_size}` : "Enter class size"}
                        value={lessonData.classSize}
                        onChange={(e) => setLessonData({ ...lessonData, classSize: e.target.value })}
                        min="1"
                        max="100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">
                        School Location (Optional)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 inline ml-1 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enter your city/town to get location-specific examples (e.g., nearby landmarks, local context)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="location"
                          placeholder="e.g. Kumasi, Ashanti Region"
                          value={lessonData.location || ""}
                          onChange={(e) => setLessonData({ ...lessonData, location: e.target.value })}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={handleDetectLocation}
                          title="Detect my location"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Helps generate examples relevant to your students' immediate environment.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="term">Term</Label>
                        <Select
                          value={lessonData.term || ""}
                          onValueChange={(val) => setLessonData({ ...lessonData, term: val })}
                        >
                          <SelectTrigger id="term">
                             <SelectValue placeholder="Select Term" />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="First Term">First Term</SelectItem>
                             <SelectItem value="Second Term">Second Term</SelectItem>
                             <SelectItem value="Third Term">Third Term</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weekNumber">Week Number</Label>
                        <Input
                          id="weekNumber"
                          value={lessonData.weekNumber || ""}
                          onChange={(e) => setLessonData({ ...lessonData, weekNumber: e.target.value })}
                          placeholder="e.g. Week 1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weekEnding">Week Ending</Label>
                        <Input
                          id="weekEnding"
                          value={lessonData.weekEnding || ""}
                          onChange={(e) => setLessonData({ ...lessonData, weekEnding: e.target.value })}
                          placeholder="e.g. Friday, Jan 24"
                        />
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="numLessons">Number of Lessons</Label>
                         <div className="flex items-center gap-2">
                           <Input
                             id="numLessons"
                             type="number"
                             min={1}
                             max={5}
                             className="w-20"
                             value={lessonData.numLessons || 1}
                             onChange={(e) => {
                               const val = parseInt(e.target.value);
                               if (val > 0) setLessonData({ ...lessonData, numLessons: val });
                             }}
                           />
                           <TooltipProvider>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                               </TooltipTrigger>
                               <TooltipContent className="max-w-[300px]">
                                 <p>If you have many exemplars, you can split them across multiple lessons. The AI will generate a lesson plan for each part.</p>
                               </TooltipContent>
                             </Tooltip>
                           </TooltipProvider>
                         </div>
                      </div>
                    </div>
                  </div>
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
                    
                    <div className="grid gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="strand">Strand *</Label>
                        {availableStrands.length === 0 && (
                           <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                              No strands found? Please select a valid subject/level combination or type manually.
                           </div>
                        )}
                        <ComboboxWithInput
                          options={availableStrands}
                          value={lessonData.strand}
                          onValueChange={(value) => {
                            setLessonData({ 
                              ...lessonData, 
                              strand: value, 
                              subStrand: "", 
                              contentStandard: "",
                              indicators: "",
                              exemplars: ""
                            });
                            setSelectedIndicators([]);
                            setSelectedExemplars([]);
                            setAvailableIndicators([]);
                            setAvailableExemplars([]);
                            setValidationErrors({ ...validationErrors, strand: "" });
                          }}
                          placeholder="Type or select strand"
                          searchPlaceholder="Search strands..."
                          disabled={!lessonData.subject || !lessonData.level}
                          emptyText={!lessonData.subject || !lessonData.level ? "Select subject and level first" : "No strands found. Type manually."}
                          allowCustom={true}
                        />
                        {validationErrors.strand && (
                          <p className="text-sm text-destructive">{validationErrors.strand}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subStrand">Sub-Strand *</Label>
                        <ComboboxWithInput
                          options={availableSubStrands}
                          value={lessonData.subStrand}
                          onValueChange={(value) => {
                            setLessonData({ 
                              ...lessonData, 
                              subStrand: value, 
                              contentStandard: "",
                              indicators: "",
                              exemplars: ""
                            });
                            setSelectedIndicators([]);
                            setSelectedExemplars([]);
                            setAvailableIndicators([]);
                            setAvailableExemplars([]);
                            setValidationErrors({ ...validationErrors, subStrand: "" });
                          }}
                          placeholder="Type or select sub-strand"
                          searchPlaceholder="Search sub-strands..."
                          disabled={!lessonData.strand}
                          emptyText={!lessonData.strand ? "Select a strand first" : "No sub-strands found. Type manually."}
                          allowCustom={true}
                        />
                        {validationErrors.subStrand && (
                          <p className="text-sm text-destructive">{validationErrors.subStrand}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contentStandard">Content Standard *</Label>
                      <ComboboxWithInput
                        options={availableContentStandards.map(cs => ({ 
                          value: `${cs.code}: ${cs.description}`, 
                          label: `${cs.code}: ${cs.description}` 
                        }))}
                        value={lessonData.contentStandard}
                        onValueChange={(value) => {
                          const selected = availableContentStandards.find(cs => `${cs.code}: ${cs.description}` === value);
                          
                          setLessonData({ 
                            ...lessonData, 
                            contentStandard: value,
                            exemplars: "", 
                            indicators: "" 
                          });
                          
                          if (selected) {
                            setAvailableIndicators(selected.indicators || []);
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
                        placeholder="Type or select content standard"
                        searchPlaceholder="Search standards..."
                        disabled={!lessonData.subStrand}
                        emptyText={!lessonData.subStrand ? "Select a sub-strand first" : "No standards found. Type manually."}
                        allowCustom={true}
                      />
                      {validationErrors.contentStandard && (
                        <p className="text-sm text-destructive">{validationErrors.contentStandard}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="indicators">Learning Indicators</Label>
                      {availableIndicators.length > 0 ? (
                        <MultiSelectCombobox
                          options={availableIndicators}
                          selected={selectedIndicators}
                          onChange={setSelectedIndicators}
                          placeholder="Select indicators..."
                          searchPlaceholder="Search indicators..."
                          emptyText="No indicators found."
                        />
                      ) : (
                        <Textarea
                          id="indicators"
                          placeholder="Enter learning indicators..."
                          value={lessonData.indicators}
                          onChange={(e) => setLessonData({ ...lessonData, indicators: e.target.value })}
                          rows={3}
                          className="resize-none"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exemplars">Exemplars</Label>
                      {availableExemplars.length > 0 && (
                        <div className="mb-2">
                           <p className="text-xs text-muted-foreground mb-1">Select from curriculum:</p>
                           <MultiSelectCombobox
                              options={availableExemplars}
                              selected={selectedExemplars}
                              onChange={setSelectedExemplars}
                              placeholder="Select exemplars from curriculum..."
                              searchPlaceholder="Search exemplars..."
                              emptyText="No exemplars found."
                           />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                         <Textarea
                          id="exemplars"
                          placeholder="Exemplars found in scheme (or selected above)..."
                          value={lessonData.exemplars}
                          onChange={(e) => setLessonData({ ...lessonData, exemplars: e.target.value })}
                          rows={3}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          {availableExemplars.length > 0 
                            ? "You can combine selected items with manual edits in the box above."
                            : "Manually enter exemplars if none were found in the curriculum."}
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
                        onClick={handleGenerate}
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
              <div className="max-h-[400px] overflow-y-auto">
                {filteredSchemeItems.length > 0 ? (
                  filteredSchemeItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-muted cursor-pointer hover:bg-muted/80 transition"
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
                  ))
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
