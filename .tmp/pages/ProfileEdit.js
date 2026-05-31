import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { SUBJECTS } from "@/data/curriculum";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Navbar } from "@/components/Navbar";
import { ProfileSkeleton } from "@/components/LoadingSkeletons";
const TEACHING_LEVELS = [
    { id: 'lower', label: 'Lower Primary (KG1 - Basic 3)', classes: ['KG1', 'KG2', 'Basic 1', 'Basic 2', 'Basic 3'] },
    { id: 'upper', label: 'Upper Primary (Basic 4 - Basic 6)', classes: ['Basic 4', 'Basic 5', 'Basic 6'] },
    { id: 'jhs', label: 'Junior High School (JHS 1 - JHS 3)', classes: ['JHS 1', 'JHS 2', 'JHS 3'] },
];
export default function ProfileEdit() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    // Form fields
    const [schoolName, setSchoolName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [defaultClassSize, setDefaultClassSize] = useState(""); // Kept as fallback or primary if single
    const [classSizes, setClassSizes] = useState({});
    const [subjectsTaught, setSubjectsTaught] = useState([]);
    const [classesTaught, setClassesTaught] = useState([]);
    const [teachingLevel, setTeachingLevel] = useState("");
    // Temporary inputs for adding subjects
    const [newSubject, setNewSubject] = useState("");
    useEffect(() => {
        let isMounted = true;
        const loadProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted)
                    return;
                if (!session) {
                    navigate("/login");
                    return;
                }
                const { data: profileData, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", session.user.id)
                    .single();
                if (error)
                    throw error;
                // ...existing code...
                if (isMounted && profileData) {
                    setProfile(profileData);
                    setSchoolName(profileData.school_name || "");
                    setFirstName(profileData.first_name || "");
                    setMiddleName(profileData.middle_name || "");
                    setLastName(profileData.last_name || "");
                    setDefaultClassSize(profileData.default_class_size?.toString() || "");
                    // Load specific class sizes if available
                    const rawClassSizes = profileData.class_sizes;
                    const loadedClassSizes = rawClassSizes
                        ? (typeof rawClassSizes === 'object' ? rawClassSizes : {})
                        : {};
                    setClassSizes(loadedClassSizes);
                    const loadedSubjects = (Array.isArray(profileData.subjects_taught) ? profileData.subjects_taught : []);
                    setSubjectsTaught(loadedSubjects);
                    const loadedClasses = (Array.isArray(profileData.classes_taught) ? profileData.classes_taught : []);
                    setClassesTaught(loadedClasses);
                    setAvatarPreview(profileData.avatar_url || "");
                    // Infer teaching level from loaded classes
                    if (loadedClasses.length > 0) {
                        // ...existing code...
                        const isLower = loadedClasses.some(c => TEACHING_LEVELS[0].classes.includes(c));
                        const isUpper = loadedClasses.some(c => TEACHING_LEVELS[1].classes.includes(c));
                        const isJHS = loadedClasses.some(c => TEACHING_LEVELS[2].classes.includes(c));
                        if (isLower)
                            setTeachingLevel('lower');
                        else if (isUpper)
                            setTeachingLevel('upper');
                        else if (isJHS)
                            setTeachingLevel('jhs');
                    }
                }
            }
            catch (error) {
                console.error("Error loading profile:", error);
                if (isMounted) {
                    toast.error("Failed to load profile");
                }
            }
            finally {
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
    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Image size must be less than 2MB");
                return;
            }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    const uploadAvatar = async () => {
        if (!avatarFile || !profile)
            return null;
        try {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(filePath, avatarFile);
            if (uploadError)
                throw uploadError;
            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath);
            return publicUrl;
        }
        catch (error) {
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
    const handleRemoveSubject = (subject) => {
        setSubjectsTaught(subjectsTaught.filter(s => s !== subject));
    };
    const handleLevelChange = (levelId) => {
        setTeachingLevel(levelId);
        setClassesTaught([]); // Reset classes when level changes
    };
    const handleClassToggle = (className) => {
        if (teachingLevel === 'lower') {
            // Single select for Lower Primary
            setClassesTaught([className]);
        }
        else {
            // Multi select for others
            if (classesTaught.includes(className)) {
                setClassesTaught(classesTaught.filter(c => c !== className));
                // Optional: clear the size for this class
                const newSizes = { ...classSizes };
                delete newSizes[className];
                setClassSizes(newSizes);
            }
            else {
                setClassesTaught([...classesTaught, className]);
                // Initialize with default if exists
                if (defaultClassSize) {
                    setClassSizes(prev => ({ ...prev, [className]: parseInt(defaultClassSize) }));
                }
            }
        }
    };
    const handleClassSizeChange = (className, size) => {
        setClassSizes(prev => ({
            ...prev,
            [className]: parseInt(size) || 0
        }));
    };
    const handleSave = async () => {
        if (!profile)
            return;
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
            if (error)
                throw error;
            toast.success("Profile updated successfully!");
            navigate("/dashboard");
        }
        catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        }
        finally {
            setIsSaving(false);
        }
    };
    if (isLoading) {
        return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsx(ProfileSkeleton, {})] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsxs("main", { className: "container mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", children: [_jsx("h1", { className: "text-xl sm:text-2xl font-bold text-foreground", children: "Edit Profile" }), _jsxs(Button, { variant: "outline", onClick: () => navigate("/dashboard"), className: "w-full sm:w-auto", children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), "Back to Dashboard"] })] }), _jsx("div", { className: "max-w-2xl mx-auto", children: _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col items-center space-y-4", children: [_jsxs(Avatar, { className: "h-24 w-24", children: [_jsx(AvatarImage, { src: avatarPreview, alt: "Profile picture" }), _jsx(AvatarFallback, { children: _jsx(User, { className: "h-12 w-12" }) })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "avatar-upload", className: "cursor-pointer", children: _jsxs("div", { className: "flex items-center gap-2 text-sm text-primary hover:underline", children: [_jsx(Upload, { className: "h-4 w-4" }), "Upload Profile Picture"] }) }), _jsx(Input, { id: "avatar-upload", type: "file", accept: "image/*", className: "hidden", onChange: handleAvatarChange }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Max size: 2MB" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", type: "email", value: profile?.email || "", disabled: true, className: "bg-muted" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "firstName", children: "First Name" }), _jsx(Input, { id: "firstName", value: firstName, onChange: (e) => setFirstName(e.target.value), placeholder: "John" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "middleName", children: "Middle Name" }), _jsx(Input, { id: "middleName", value: middleName, onChange: (e) => setMiddleName(e.target.value), placeholder: "Optional" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "lastName", children: "Last Name" }), _jsx(Input, { id: "lastName", value: lastName, onChange: (e) => setLastName(e.target.value), placeholder: "Doe" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "schoolName", children: "School Name" }), _jsx(Input, { id: "schoolName", value: schoolName, onChange: (e) => setSchoolName(e.target.value), placeholder: "Ghana International School" })] }), _jsxs("div", { className: "space-y-4 pt-4 border-t", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Teaching Context" }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { children: "Teaching Level" }), _jsx(RadioGroup, { value: teachingLevel, onValueChange: handleLevelChange, className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: TEACHING_LEVELS.map((level) => (_jsxs("div", { className: "flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors", children: [_jsx(RadioGroupItem, { value: level.id, id: level.id }), _jsx(Label, { htmlFor: level.id, className: "cursor-pointer font-normal w-full", children: level.label })] }, level.id))) })] }), teachingLevel && (_jsxs("div", { className: "space-y-3 animate-in fade-in slide-in-from-top-2 duration-300", children: [_jsx(Label, { children: teachingLevel === 'lower' ? "Which class do you teach?" : "Which classes do you teach?" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3", children: TEACHING_LEVELS.find(l => l.id === teachingLevel)?.classes.map((className) => (_jsxs("div", { className: `flex items-center space-x-2 border p-3 rounded-md transition-all ${classesTaught.includes(className) ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'}`, children: [_jsx(Checkbox, { id: className, checked: classesTaught.includes(className), onCheckedChange: () => handleClassToggle(className) }), _jsx(Label, { htmlFor: className, className: "cursor-pointer font-normal w-full", children: className })] }, className))) })] })), classesTaught.length > 0 && (_jsxs("div", { className: "space-y-3 animate-in fade-in slide-in-from-top-2 duration-300", children: [_jsx(Label, { children: "Class Sizes" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: classesTaught.map((className) => (_jsxs("div", { className: "flex items-center gap-3 border p-3 rounded-md bg-muted/20", children: [_jsx(Label, { htmlFor: `size-${className}`, className: "min-w-[80px] font-normal", children: className }), _jsx(Input, { id: `size-${className}`, type: "number", value: classSizes[className] || "", onChange: (e) => handleClassSizeChange(className, e.target.value), placeholder: "Size", min: "1", max: "100", className: "w-24" }), _jsx("span", { className: "text-xs text-muted-foreground", children: "students" })] }, className))) })] }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Subjects Taught" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Combobox, { options: SUBJECTS.map(s => ({ value: s.value, label: s.label })), value: newSubject, onValueChange: setNewSubject, placeholder: "Select subject", searchPlaceholder: "Search subjects...", emptyText: "No subject found" }), _jsx(Button, { onClick: handleAddSubject, type: "button", size: "sm", children: "Add" })] }), _jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: subjectsTaught.map((subject) => (_jsxs(Badge, { variant: "secondary", className: "gap-1", children: [SUBJECTS.find(s => s.value === subject)?.label || subject, _jsx(X, { className: "h-3 w-3 cursor-pointer", onClick: () => handleRemoveSubject(subject) })] }, subject))) })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx(Button, { onClick: handleSave, disabled: isSaving, className: "flex-1", children: isSaving ? (_jsx(_Fragment, { children: "Saving..." })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "mr-2 h-4 w-4" }), "Save Changes"] })) }), _jsx(Button, { variant: "outline", onClick: () => navigate("/dashboard"), disabled: isSaving, children: "Cancel" })] })] }) }) })] })] }));
}
;
