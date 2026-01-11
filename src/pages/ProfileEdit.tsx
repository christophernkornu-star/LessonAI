import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, ArrowLeft, Save, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface ProfileData {
  id: string;
  email: string;
  school_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  subjects_taught?: string[];
  classes_taught?: string[];
  class_sizes?: Record<string, number>;
  default_class_size?: number;
  avatar_url?: string;
}

const TEACHING_LEVELS = [
  { id: 'lower', label: 'Lower Primary (KG1 - Basic 3)', classes: ['KG1', 'KG2', 'Basic 1', 'Basic 2', 'Basic 3'] },
  { id: 'upper', label: 'Upper Primary (Basic 4 - Basic 6)', classes: ['Basic 4', 'Basic 5', 'Basic 6'] },
  { id: 'jhs', label: 'Junior High School (JHS 1 - JHS 3)', classes: ['JHS 1', 'JHS 2', 'JHS 3'] },
];

import { Navbar } from "@/components/Navbar";

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  
  // Form fields
  const [schoolName, setSchoolName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [defaultClassSize, setDefaultClassSize] = useState(""); // Kept as fallback or primary if single
  const [classSizes, setClassSizes] = useState<Record<string, number>>({});
  const [subjectsTaught, setSubjectsTaught] = useState<string[]>([]);
  const [classesTaught, setClassesTaught] = useState<string[]>([]);
  const [teachingLevel, setTeachingLevel] = useState<string>("");
  
  // Temporary inputs for adding subjects
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (!session) {
          navigate("/login");
          return;
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        if (isMounted && profileData) {
          setProfile(profileData);
          setSchoolName(profileData.school_name || "");
          setFirstName(profileData.first_name || "");
          setMiddleName(profileData.middle_name || "");
          setLastName(profileData.last_name || "");
          setDefaultClassSize(profileData.default_class_size?.toString() || "");
          
          // Load specific class sizes if available
           const loadedClassSizes = profileData.class_sizes 
            ? (typeof profileData.class_sizes === 'object' ? profileData.class_sizes : {}) as Record<string, number> 
            : {};
          setClassSizes(loadedClassSizes);
          
          const loadedSubjects = Array.isArray(profileData.subjects_taught) ? profileData.subjects_taught : [];
          setSubjectsTaught(loadedSubjects);
          
          const loadedClasses = Array.isArray(profileData.classes_taught) ? profileData.classes_taught : [];
          setClassesTaught(loadedClasses);
          setAvatarPreview(profileData.avatar_url || "");
          
          // Infer teaching level from loaded classes
          if (loadedClasses.length > 0) {
            const isLower = loadedClasses.some(c => TEACHING_LEVELS[0].classes.includes(c));
            const isUpper = loadedClasses.some(c => TEACHING_LEVELS[1].classes.includes(c));
            const isJHS = loadedClasses.some(c => TEACHING_LEVELS[2].classes.includes(c));
            
            if (isLower) setTeachingLevel('lower');
            else if (isUpper) setTeachingLevel('upper');
            else if (isJHS) setTeachingLevel('jhs');
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        if (isMounted) {
          toast.error("Failed to load profile");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !profile) return null;

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
      return null;
    }
  };

  const handleAddSubject = () => {
    if (newSubject && !subjectsTaught.includes(newSubject)) {
      setSubjectsTaught([...subjectsTaught, newSubject]);
      setNewSubject("");
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setSubjectsTaught(subjectsTaught.filter(s => s !== subject));
  };

  const handleLevelChange = (levelId: string) => {
    setTeachingLevel(levelId);
    setClassesTaught([]); // Reset classes when level changes
  };

  const handleClassToggle = (className: string) => {
    if (teachingLevel === 'lower') {
      // Single select for Lower Primary
      setClassesTaught([className]);
    } else {
      // Multi select for others
      if (classesTaught.includes(className)) {
        setClassesTaught(classesTaught.filter(c => c !== className));
        // Optional: clear the size for this class
        const newSizes = { ...classSizes };
        delete newSizes[className];
        setClassSizes(newSizes);
      } else {
        setClassesTaught([...classesTaught, className]);
        // Initialize with default if exists
        if (defaultClassSize) {
           setClassSizes(prev => ({ ...prev, [className]: parseInt(defaultClassSize) }));
        }
      }
    }
  };

  const handleClassSizeChange = (className: string, size: string) => {
    setClassSizes(prev => ({
      ...prev,
      [className]: parseInt(size) || 0
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      // If only one class is selected, we can also sync it to default_class_size for backward compatibility
      let finalDefaultSize = defaultClassSize ? parseInt(defaultClassSize) : null;
      if (classesTaught.length === 1 && classSizes[classesTaught[0]]) {
         finalDefaultSize = classSizes[classesTaught[0]];
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          school_name: schoolName,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          default_class_size: finalDefaultSize,
          class_sizes: classSizes, // Save the map
          subjects_taught: subjectsTaught,
          classes_taught: classesTaught,
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
        </div>
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview} alt="Profile picture" />
                  <AvatarFallback>
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Upload className="h-4 w-4" />
                      Upload Profile Picture
                    </div>
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max size: 2MB</p>
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* School Name */}
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Ghana International School"
                />
              </div>

              {/* Teaching Context Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Teaching Context</h3>
                
                {/* Teaching Level Selection */}
                <div className="space-y-3">
                  <Label>Teaching Level</Label>
                  <RadioGroup value={teachingLevel} onValueChange={handleLevelChange} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TEACHING_LEVELS.map((level) => (
                      <div key={level.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={level.id} id={level.id} />
                        <Label htmlFor={level.id} className="cursor-pointer font-normal w-full">{level.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Class Selection - Conditional */}
                {teachingLevel && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label>
                      {teachingLevel === 'lower' ? "Which class do you teach?" : "Which classes do you teach?"}
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TEACHING_LEVELS.find(l => l.id === teachingLevel)?.classes.map((className) => (
                        <div key={className} className={`flex items-center space-x-2 border p-3 rounded-md transition-all ${classesTaught.includes(className) ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'}`}>
                          <Checkbox 
                            id={className} 
                            checked={classesTaught.includes(className)}
                            onCheckedChange={() => handleClassToggle(className)}
                          />
                          <Label 
                            htmlFor={className} 
                            className="cursor-pointer font-normal w-full"
                          >
                            {className}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Class Sizes - Per Class */}
                {classesTaught.length > 0 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label>Class Sizes</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {classesTaught.map((className) => (
                        <div key={className} className="flex items-center gap-3 border p-3 rounded-md bg-muted/20">
                          <Label htmlFor={`size-${className}`} className="min-w-[80px] font-normal">
                            {className}
                          </Label>
                          <Input
                            id={`size-${className}`}
                            type="number"
                            value={classSizes[className] || ""}
                            onChange={(e) => handleClassSizeChange(className, e.target.value)}
                            placeholder="Size"
                            min="1"
                            max="100"
                            className="w-24"
                          />
                          <span className="text-xs text-muted-foreground">students</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
      
              </div>

              {/* Subjects Taught */}
              <div className="space-y-2">
                <Label>Subjects Taught</Label>
                <div className="flex gap-2">
                  <Combobox
                    options={SUBJECTS.map(s => ({ value: s.value, label: s.label }))}
                    value={newSubject}
                    onValueChange={setNewSubject}
                    placeholder="Select subject"
                    searchPlaceholder="Search subjects..."
                    emptyText="No subject found"
                  />
                  <Button onClick={handleAddSubject} type="button" size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {subjectsTaught.map((subject) => (
                    <Badge key={subject} variant="secondary" className="gap-1">
                      {SUBJECTS.find(s => s.value === subject)?.label || subject}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveSubject(subject)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
