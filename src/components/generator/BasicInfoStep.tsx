import React, { useState, useEffect } from "react";
import { Info, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { toast } from "sonner";

export interface BasicInfoStepProps {
  lessonData: any;
  setLessonData: React.Dispatch<React.SetStateAction<any>>;
  availableLevels: Array<{ value: string; label: string }>;
  availableSubjects: Array<{ value: string; label: string }>;
  userProfile: any;
  validationErrors: Record<string, string>;
  setValidationErrors: (errors: any) => void;
  handleDetectLocation: () => void;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  lessonData,
  setLessonData,
  availableLevels,
  availableSubjects,
  userProfile,
  validationErrors,
  setValidationErrors,
  handleDetectLocation,
}) => {
  // Local string state for Number of Lessons input so mobile users can freely type/delete
  const [numLessonsText, setNumLessonsText] = useState<string>(
    lessonData.numLessons != null ? String(lessonData.numLessons) : ""
  );

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
      setLessonData((prev: any) => ({ ...prev, numLessons: 1 }));
    } else {
      const parsed = parseInt(numLessonsText);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        setLessonData((prev: any) => ({ ...prev, numLessons: parsed }));
      } else if (!isNaN(parsed) && parsed > 5) {
        toast.error("Maximum 5 lessons allowed");
        setNumLessonsText("5");
        setLessonData((prev: any) => ({ ...prev, numLessons: 5 }));
      } else if (!isNaN(parsed) && parsed < 1) {
        setNumLessonsText("1");
        setLessonData((prev: any) => ({ ...prev, numLessons: 1 }));
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
            emptyText={!lessonData.level ? "Select a class level first" : "No subjects found. Upload curriculum for this level."}
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
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
               <Input
                 id="numLessons"
                 type="text"
                 inputMode="numeric"
                 className="w-20"
                 value={numLessonsText}
                 placeholder="1-5"
                 onChange={(e) => {
                   const val = e.target.value;
                   // Allow empty or digits only
                   if (val === "" || /^\d+$/.test(val)) {
                     setNumLessonsText(val);
                   }
                 }}
                 onBlur={handleNumLessonsBlur}
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
             {validationErrors.numLessons && (
                <p className="text-sm text-destructive">{validationErrors.numLessons}</p>
             )}
             {parseInt(numLessonsText) > 5 && (
                <p className="text-sm text-destructive">Maximum 5 lessons allowed</p>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
