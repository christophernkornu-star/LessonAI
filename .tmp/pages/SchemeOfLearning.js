import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Loader2, AlertCircle, ChevronDown, ChevronRight, BookOpen, Download, Globe, Play, Search, MapPin } from "lucide-react";
import { extractTextFromBrowserFile } from "@/services/fileParsingService";
import { parseSchemeOfLearning, generateLessonNote } from "@/services/aiService";
import { Navbar } from "@/components/Navbar";
import { CurriculumService } from "@/services/curriculumService";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import { LessonNotesService } from "@/services/lessonNotesService";
import { ClassProfileService } from "@/services/classProfileService";
import { deductPayment } from "@/services/paymentService";
import { lessonTemplates } from "@/data/lessonTemplates";
import { Progress } from "@/components/ui/progress";
import { TimetableService } from "@/services/timetableService";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { generateGhanaLessonDocx, generateGhanaLessonFileName } from "@/services/ghanaLessonDocxService";
import { Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const STORAGE_KEY = "scheme_of_learning_data";
const BATCH_FORM_STORAGE_KEY = "batch_form_data";
const CLASS_PROFILE_STORAGE_KEY = "class_profile_data";
export default function SchemeOfLearning() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [schemeData, setSchemeData] = useState([]);
    const [classProfiles, setClassProfiles] = useState({});
    const [newProfileClass, setNewProfileClass] = useState("");
    const [expandedProfileClasses, setExpandedProfileClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Start as true for initial fetch
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importLevels, setImportLevels] = useState([]);
    const [importSubjects, setImportSubjects] = useState([]);
    const [userId, setUserId] = useState(null);
    const [loadingStep, setLoadingStep] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteClassDialogOpen, setDeleteClassDialogOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState("");
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, successes: 0, failures: 0 });
    const [batchDialogConfig, setBatchDialogConfig] = useState({ open: false, items: [] });
    const [batchFormData, setBatchFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        weekEnding: "",
        duration: "60 mins",
        classSize: "",
        templateId: "ghana-standard",
        location: "Biriwa, Central Region",
        term: "Second Term",
        weekNumber: "", // Added state for editable week number
        classLevel: "", // Added state for editable class level
        philosophy: "balanced",
        detailLevel: "brief",
        schoolName: "",
        teacherName: "",
        coverPageSubject: "", // Added state for JHS Cover Page Subject
        coverPageSource: "profiles",
        includeCoverPage: false,
    });
    const [batchResults, setBatchResults] = useState([]);
    const [showBatchSuccess, setShowBatchSuccess] = useState(false);
    const [batchStep, setBatchStep] = useState('config');
    const [selectedBatchItems, setSelectedBatchItems] = useState([]);
    const getCoverPageLevelString = (levels) => {
        const normalizedLevels = levels
            .filter(Boolean)
            .map((level) => (level || "").trim())
            .filter((level) => level !== "")
            .map((level) => {
            const matched = CLASS_LEVELS.find((l) => l.label.toLowerCase() === level.toLowerCase() || l.value.toLowerCase() === level.toLowerCase());
            return matched?.label || level;
        });
        const uniqueLevels = Array.from(new Set(normalizedLevels));
        if (uniqueLevels.length === 0)
            return "";
        if (uniqueLevels.length === 1)
            return uniqueLevels[0];
        const orderedLevels = CLASS_LEVELS.filter((l) => uniqueLevels.includes(l.label)).map((l) => l.label);
        const fallbackLevels = uniqueLevels.filter((level) => !orderedLevels.includes(level));
        const sortedLevels = [...orderedLevels, ...fallbackLevels];
        const numericPrefixGroups = sortedLevels.map((level) => {
            const match = level.match(/^(.+?)\s+(\d+)$/);
            return match ? { prefix: match[1], number: match[2] } : null;
        });
        const allSamePrefix = numericPrefixGroups.every((item) => item !== null && item?.prefix === numericPrefixGroups[0]?.prefix);
        if (allSamePrefix && numericPrefixGroups.every(Boolean)) {
            const prefix = numericPrefixGroups[0].prefix;
            const numbers = numericPrefixGroups.map((item) => item.number);
            if (numbers.length === 2) {
                return `${prefix} ${numbers[0]} & ${numbers[1]}`;
            }
            return `${prefix} ${numbers.slice(0, -1).join(', ')} & ${numbers[numbers.length - 1]}`;
        }
        if (sortedLevels.length === 2) {
            return `${sortedLevels[0]} & ${sortedLevels[1]}`;
        }
        return `${sortedLevels.slice(0, -1).join(", ")} & ${sortedLevels[sortedLevels.length - 1]}`;
    };
    // Persistence for batch form data
    useEffect(() => {
        const saved = localStorage.getItem(BATCH_FORM_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setBatchFormData(prev => ({ ...prev, ...parsed }));
            }
            catch (e) {
                console.error("Failed to load saved batch form", e);
            }
        }
    }, []);
    useEffect(() => {
        localStorage.setItem(BATCH_FORM_STORAGE_KEY, JSON.stringify(batchFormData));
    }, [batchFormData]);
    useEffect(() => {
        const loadSavedProfiles = async () => {
            const saved = localStorage.getItem(CLASS_PROFILE_STORAGE_KEY);
            let savedProfiles = {};
            if (saved) {
                try {
                    savedProfiles = JSON.parse(saved);
                    setClassProfiles(savedProfiles);
                }
                catch (e) {
                    console.error("Failed to load class profiles", e);
                }
            }
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user)
                    return;
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
                if (Object.keys(savedProfiles).length > 0) {
                    await Promise.all(Object.entries(savedProfiles).map(([level, profile]) => ClassProfileService.upsertClassProfile(user.id, normalizeClassLevel(level), profile.schoolName || "", profile.teacherName || "", profile.subjectTeachers || {})));
                }
                setClassProfiles((prev) => ({ ...prev, ...normalizedProfiles, ...savedProfiles }));
            }
            catch (error) {
                console.error("Failed to load class profiles from database", error);
            }
        };
        loadSavedProfiles();
    }, []);
    useEffect(() => {
        localStorage.setItem(CLASS_PROFILE_STORAGE_KEY, JSON.stringify(classProfiles));
    }, [classProfiles]);
    const normalizeClassLevel = (classLevel) => {
        const trimmed = (classLevel || "").trim();
        if (!trimmed)
            return "";
        const matched = CLASS_LEVELS.find((level) => level.label.toLowerCase() === trimmed.toLowerCase() || level.value.toLowerCase() === trimmed.toLowerCase());
        return matched?.label || trimmed;
    };
    const profileClassLevels = useMemo(() => {
        return Array.from(new Set([
            ...(schemeData.map(item => normalizeClassLevel(item.classLevel))),
            ...Object.keys(classProfiles).map(normalizeClassLevel)
        ])).sort();
    }, [schemeData, classProfiles]);
    const classSubjectsByLevel = useMemo(() => {
        return schemeData.reduce((acc, item) => {
            const level = normalizeClassLevel(item.classLevel) || "Unknown";
            if (!acc[level])
                acc[level] = new Set();
            if (item.subject)
                acc[level].add(item.subject);
            return acc;
        }, {});
    }, [schemeData]);
    const getClassProfile = (classLevel) => {
        const normalized = normalizeClassLevel(classLevel);
        return classProfiles[normalized] || { schoolName: "", teacherName: "", subjectTeachers: {} };
    };
    const persistClassProfile = async (classLevel, profile) => {
        if (!userId)
            return;
        try {
            await ClassProfileService.upsertClassProfile(userId, classLevel, profile.schoolName || "", profile.teacherName || "", profile.subjectTeachers || {});
        }
        catch (error) {
            console.error("Failed to save class profile to database", error);
        }
    };
    const getClassSubjectTeacher = (classLevel, subject) => {
        const profile = getClassProfile(classLevel);
        return profile.subjectTeachers?.[subject.trim()] || "";
    };
    const toggleProfileExpansion = (classLevel) => {
        setExpandedProfileClasses((prev) => prev.includes(classLevel)
            ? prev.filter((level) => level !== classLevel)
            : [...prev, classLevel]);
    };
    const updateClassProfile = (classLevel, field, value) => {
        const normalized = normalizeClassLevel(classLevel);
        setClassProfiles((prev) => {
            const nextProfile = {
                ...prev[normalized],
                [field]: value,
                subjectTeachers: prev[normalized]?.subjectTeachers || {},
            };
            void persistClassProfile(normalized, nextProfile);
            return {
                ...prev,
                [normalized]: nextProfile,
            };
        });
    };
    const updateClassSubjectTeacher = (classLevel, subject, teacherName) => {
        const normalized = normalizeClassLevel(classLevel);
        setClassProfiles((prev) => {
            const nextProfile = {
                ...prev[normalized],
                subjectTeachers: {
                    ...prev[normalized]?.subjectTeachers,
                    [subject.trim()]: teacherName,
                },
            };
            void persistClassProfile(normalized, nextProfile);
            return {
                ...prev,
                [normalized]: nextProfile,
            };
        });
    };
    const addClassProfile = (classLevel) => {
        const normalized = normalizeClassLevel(classLevel);
        if (!normalized)
            return;
        setClassProfiles((prev) => ({
            ...prev,
            [normalized]: prev[normalized] || { schoolName: "", teacherName: "", subjectTeachers: {} },
        }));
        setNewProfileClass("");
    };
    const selectedBatchClassProfile = getClassProfile(batchFormData.classLevel);
    const useProfileSource = batchFormData.coverPageSource === "profiles";
    const coverPagePreview = {
        schoolName: useProfileSource ? selectedBatchClassProfile.schoolName || batchFormData.schoolName : batchFormData.schoolName,
        teacherName: useProfileSource ? selectedBatchClassProfile.teacherName || batchFormData.teacherName : batchFormData.teacherName,
    };
    useEffect(() => {
        const init = async () => {
            try {
                // 1. Get User
                const { data: { user } } = await supabase.auth.getUser();
                setUserId(user?.id || null);
                if (!user) {
                    setIsLoading(false);
                    return;
                }
                // 2. Load from Supabase (Source of Truth)
                const { data, error } = await supabase
                    .from('schemes')
                    .select('*')
                    .eq('user_id', user.id);
                if (data && data.length > 0) {
                    // Transform DB schema to App interface
                    const loadedSchemes = data.map(item => ({
                        id: item.id,
                        week: item.week || "",
                        weekEnding: item.week_ending || "",
                        term: item.term || "",
                        subject: item.subject || "",
                        classLevel: item.class_level || "",
                        strand: item.strand || "",
                        subStrand: item.sub_strand || "",
                        contentStandard: item.content_standard || "",
                        indicators: item.indicators || "",
                        exemplars: item.exemplars || "",
                        resources: item.resources || "",
                    }));
                    setSchemeData(loadedSchemes);
                }
                else {
                    // Fallback to localStorage if DB is empty (migration scenario)
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        // Optional: You could auto-migrate here, but let's just load for now
                        setSchemeData(JSON.parse(saved));
                    }
                }
            }
            catch (e) {
                console.error(e);
            }
            finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);
    const saveToSupabase = async (items) => {
        if (!userId)
            return;
        // Convert to DB format
        const dbItems = items.map(item => ({
            user_id: userId,
            week: item.week,
            week_ending: item.weekEnding,
            term: item.term,
            subject: item.subject,
            class_level: item.classLevel,
            strand: item.strand,
            sub_strand: item.subStrand,
            content_standard: item.contentStandard,
            indicators: item.indicators,
            exemplars: item.exemplars,
            resources: item.resources,
        }));
        // Note: This is a full sync/replace approach for simplicity given the bulk import nature
        // Ideally we upsert, but we don't have stable external IDs. 
        // For this turn, we will insert new ones. 
        // IMPROVEMENT: On real app, we should manage diffs.
        // For now, let's just insert the NEW items only?
        // Actually, let's iterate and insert one by one or batch insert the *new* ones.
        // The upload handler filters duplicates already;
    };
    const handleSystemImport = async () => {
        if (importLevels.length === 0 || importSubjects.length === 0) {
            toast({ title: "Validation Error", description: "Please select at least one Class Level and one Subject", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const missingPairs = [];
            const allNewItems = [];
            for (const level of importLevels) {
                for (const subject of importSubjects) {
                    const curriculum = await CurriculumService.getCurriculumByGradeAndSubject(level, subject, user?.id);
                    const subjectLabel = SUBJECTS.find(s => s.value === subject)?.label || subject;
                    const levelLabel = CLASS_LEVELS.find(l => l.value === level)?.label || level;
                    if (curriculum.length === 0) {
                        missingPairs.push(`${subjectLabel} - ${levelLabel}`);
                        continue;
                    }
                    const newItems = curriculum.map((item, index) => ({
                        id: `sys-${level}-${subject}-${Date.now()}-${index}`,
                        week: `Week ${index + 1}`,
                        weekEnding: "",
                        term: "First Term",
                        subject: subjectLabel,
                        classLevel: levelLabel,
                        strand: item.strand || "General",
                        subStrand: item.sub_strand || "",
                        contentStandard: Array.isArray(item.content_standards) ? item.content_standards.join("; ") : (item.content_standards || ""),
                        indicators: Array.isArray(item.learning_indicators) ? item.learning_indicators.join("; ") : (item.learning_indicators || ""),
                        exemplars: item.exemplars || "",
                        resources: ""
                    }));
                    allNewItems.push(...newItems);
                }
            }
            if (allNewItems.length === 0) {
                toast({ title: "No Data Found", description: "No curriculum data was found for the selected levels and subjects.", variant: "destructive" });
                return;
            }
            setSchemeData(prev => {
                const updated = [...prev, ...allNewItems];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                if (userId) {
                    const dbRecords = allNewItems.map(item => ({
                        user_id: userId,
                        week: item.week,
                        week_ending: item.weekEnding,
                        term: item.term,
                        subject: item.subject,
                        class_level: item.classLevel,
                        strand: item.strand,
                        sub_strand: item.subStrand,
                        content_standard: item.contentStandard,
                        indicators: item.indicators,
                        exemplars: item.exemplars,
                        resources: item.resources,
                    }));
                    supabase.from('schemes').insert(dbRecords).then(({ error }) => {
                        if (error)
                            console.error("Failed to sync to DB:", error);
                    });
                }
                return updated;
            });
            const summaryDescription = missingPairs.length > 0
                ? `Loaded ${allNewItems.length} items. No data found for: ${missingPairs.join(', ')}.`
                : `Loaded ${allNewItems.length} items from system curriculum.`;
            toast({ title: "Import Successful", description: summaryDescription });
            setImportDialogOpen(false);
        }
        catch (error) {
            console.error("Import error:", error);
            toast({ title: "Import Failed", description: "Could not load curriculum data.", variant: "destructive" });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setIsLoading(true);
        try {
            const text = await extractTextFromBrowserFile(file);
            let parsed = [];
            if (file.name.endsWith('.csv')) {
                parsed = parseCSV(text);
            }
            else {
                // Use AI for PDF/Docx/Text
                toast({
                    title: "Processing with AI",
                    description: "Analyzing document structure... this may take a moment.",
                });
                const aiParsed = await parseSchemeOfLearning(text);
                parsed = aiParsed.map((item, index) => ({
                    id: `scheme-${Date.now()}-${index}`,
                    week: item.week || "",
                    weekEnding: item.weekEnding || "",
                    term: item.term || "",
                    subject: item.subject || "",
                    classLevel: item.classLevel || "",
                    strand: item.strand || "",
                    subStrand: item.subStrand || "",
                    contentStandard: item.contentStandard || "",
                    indicators: item.indicators || "",
                    exemplars: item.exemplars || "",
                    resources: item.resources || "",
                }));
            }
            if (parsed.length === 0) {
                toast({
                    title: "Error",
                    description: "No valid data found. Please check the file format.",
                    variant: "destructive",
                });
            }
            else {
                setSchemeData(prev => {
                    // Deduplication Logic
                    const existingSignatures = new Set(prev.map(item => `${item.classLevel}|${item.subject}|${item.term}|${item.week}`));
                    const newItems = parsed.filter(item => {
                        const signature = `${item.classLevel}|${item.subject}|${item.term}|${item.week}`;
                        return !existingSignatures.has(signature);
                    });
                    const skippedCount = parsed.length - newItems.length;
                    if (newItems.length === 0 && skippedCount > 0) {
                        toast({
                            title: "Duplicate Scheme Detected",
                            description: `All uploads were duplicates of existing data and were skipped.`,
                            variant: "default",
                        });
                        return prev;
                    }
                    const updated = [...prev, ...newItems];
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                    // Sync to Database
                    if (userId) {
                        const dbRecords = newItems.map(item => ({
                            user_id: userId,
                            week: item.week,
                            week_ending: item.weekEnding,
                            term: item.term,
                            subject: item.subject,
                            class_level: item.classLevel,
                            strand: item.strand,
                            sub_strand: item.subStrand,
                            content_standard: item.contentStandard,
                            indicators: item.indicators,
                            exemplars: item.exemplars,
                            resources: item.resources,
                        }));
                        supabase.from('schemes').insert(dbRecords).then(({ error }) => {
                            if (error)
                                console.error("Failed to sync to DB:", error);
                        });
                    }
                    if (skippedCount > 0) {
                        toast({
                            title: "Import Success",
                            description: `Added ${newItems.length} rows. Skipped ${skippedCount} duplicates.`,
                        });
                    }
                    else {
                        toast({
                            title: "Success",
                            description: `Added ${parsed.length} rows to your scheme list.`,
                        });
                    }
                    return updated;
                });
            }
        }
        catch (error) {
            console.error("Upload error:", error);
            toast({
                title: "Error",
                description: "Failed to process file.",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
            // Reset input so the same file can be selected again if needed
            e.target.value = '';
        }
    };
    const parseCSV = (text) => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 1)
            return [];
        // Detect delimiter (comma or semicolon)
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ';' : ',';
        // Heuristic: Check if first line is a header
        // Look for keywords AND absence of data patterns (like "Week 1", dates)
        const normalizedFirstLine = firstLine.toLowerCase();
        const hasHeaderKeywords = normalizedFirstLine.includes('week') || normalizedFirstLine.includes('subject') || normalizedFirstLine.includes('strand');
        const looksLikeData = normalizedFirstLine.match(/week\s*\d/i) || normalizedFirstLine.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
        // If it mentions typical headers but DOESN'T look like specific data row, treat as header
        // But if it says "Week 1", it's definitely data even if it contains "Week"
        const hasHeader = hasHeaderKeywords && !looksLikeData;
        let headerMap = {};
        let startIndex = 0;
        if (hasHeader) {
            startIndex = 1;
            const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
            headers.forEach((h, i) => {
                if (h.includes('week') && h.includes('ending'))
                    headerMap['weekEnding'] = i;
                else if (h.includes('week'))
                    headerMap['week'] = i;
                else if (h.includes('term'))
                    headerMap['term'] = i;
                else if (h.includes('subject'))
                    headerMap['subject'] = i;
                else if (h.includes('class') || h.includes('level') || h.includes('basic'))
                    headerMap['classLevel'] = i;
                else if (h.includes('sub-strand') || h.includes('sub strand') || h === 'sub strand')
                    headerMap['subStrand'] = i;
                else if (h.includes('strand'))
                    headerMap['strand'] = i;
                else if (h.includes('content') || h.includes('standard'))
                    headerMap['contentStandard'] = i;
                else if ((h.includes('indicator') || h.includes('learning')) && !h.includes('exemplar'))
                    headerMap['indicators'] = i;
                else if (h.includes('exemplar'))
                    headerMap['exemplars'] = i;
                else if (h.includes('resource') || h.includes('material'))
                    headerMap['resources'] = i;
            });
        }
        const items = [];
        for (let i = startIndex; i < lines.length; i++) {
            let row = [];
            // Split respecting quotes
            if (delimiter === ',') {
                row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
            }
            else {
                row = lines[i].split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
            }
            if (row.length <= 1 && !row[0])
                continue;
            if (Object.keys(headerMap).length > 0) {
                items.push({
                    id: `scheme-${Date.now()}-${i}`,
                    week: row[headerMap['week']] || "",
                    weekEnding: headerMap['weekEnding'] !== undefined ? row[headerMap['weekEnding']] : (row[1] || ""), // Fallback for week ending if mapped week but no ending
                    term: row[headerMap['term']] || "",
                    subject: row[headerMap['subject']] || "",
                    classLevel: row[headerMap['classLevel']] || "",
                    strand: row[headerMap['strand']] || "",
                    subStrand: row[headerMap['subStrand']] || "",
                    contentStandard: row[headerMap['contentStandard']] || "",
                    indicators: row[headerMap['indicators']] || "",
                    exemplars: row[headerMap['exemplars']] || "",
                    resources: row[headerMap['resources']] || "",
                });
            }
            else {
                // Fallback to standard order: Week, Week Ending, Term, Subject, Class, Strand, Sub-Strand, Content Standard, Indicators, Exemplars, Resources
                // The attached file format: Week 1, Date, Term, Subject, Class, Strand, Sub-Strand, Content Standard, Indicators, Exemplars(Maybe Empty), Resources
                const hasExemplars = row.length > 10;
                items.push({
                    id: `scheme-${Date.now()}-${i}`,
                    week: row[0] || "",
                    weekEnding: row[1] || "",
                    term: row[2] || "",
                    subject: row[3] || "",
                    classLevel: row[4] || "",
                    strand: row[5] || "",
                    subStrand: row[6] || "",
                    contentStandard: row[7] || "",
                    indicators: row[8] || "",
                    exemplars: hasExemplars ? row[9] : "",
                    resources: hasExemplars ? row[10] : row[9] || "",
                });
            }
        }
        // Group items by Week
        const groupedItems = new Map();
        // Helper to join unique strings using Set to ensure no data loss but clean duplication
        const mergeFields = (existing, incoming, separator = "\n") => {
            if (!incoming)
                return existing;
            if (!existing)
                return incoming;
            const distinctValues = new Set();
            // Add existing items
            existing.split(separator)
                .map(p => p.trim())
                .filter(p => p.length > 0)
                .forEach(p => distinctValues.add(p));
            // Add incoming items
            incoming.split(separator)
                .map(p => p.trim()) // simple match
                .filter(p => p.length > 0)
                .forEach(p => distinctValues.add(p));
            return Array.from(distinctValues).join(separator);
        };
        // Helper specifically for resources to avoiding duplicating words/phrases
        const mergeResources = (r1, r2) => {
            if (!r1)
                return r2;
            if (!r2)
                return r1;
            const parts1 = r1.split(',').map(s => s.trim()).filter(Boolean);
            const parts2 = r2.split(',').map(s => s.trim()).filter(Boolean);
            const unique = Array.from(new Set([...parts1, ...parts2]));
            return unique.join(', ');
        };
        for (const item of items) {
            // Use Week (normalized) as the primary key. 
            const key = `${item.week?.trim()}-${item.subject?.trim()}-${item.classLevel?.trim()}`;
            if (!groupedItems.has(key)) {
                groupedItems.set(key, item);
            }
            else {
                const existing = groupedItems.get(key);
                // Merge relevant fields
                // For Structure & Standards, we append if new
                existing.strand = mergeFields(existing.strand, item.strand);
                existing.subStrand = mergeFields(existing.subStrand, item.subStrand);
                existing.contentStandard = mergeFields(existing.contentStandard, item.contentStandard);
                existing.indicators = mergeFields(existing.indicators, item.indicators);
                existing.exemplars = mergeFields(existing.exemplars, item.exemplars);
                // For Resources, we use the smarter merge
                existing.resources = mergeResources(existing.resources, item.resources);
                // Keep the first instance of 'Week Ending', 'Term', etc.
            }
        }
        return Array.from(groupedItems.values());
    };
    const handleGenerate = (item) => {
        const classProfile = getClassProfile(item.classLevel);
        // Navigate to generator with state
        navigate("/generator", {
            state: {
                fromScheme: true,
                schemeData: {
                    term: item.term,
                    weekNumber: item.week,
                    weekEnding: item.weekEnding,
                    subject: item.subject,
                    level: item.classLevel,
                    strand: item.strand,
                    subStrand: item.subStrand,
                    contentStandard: item.contentStandard,
                    indicators: item.indicators,
                    exemplars: item.exemplars,
                    resources: item.resources,
                    schoolName: classProfile.schoolName,
                    teacherName: classProfile.teacherName,
                    subjectTeacher: getClassSubjectTeacher(item.classLevel, item.subject),
                    includeCoverPage: Boolean(classProfile.schoolName || classProfile.teacherName),
                }
            }
        });
    };
    const toggleSelection = (itemId) => {
        setSelectedBatchItems((prev) => prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]);
    };
    const selectGroupItems = (items) => {
        setSelectedBatchItems((prev) => Array.from(new Set([...prev, ...items.map((item) => item.id)])));
    };
    const clearGroupSelection = (items) => {
        setSelectedBatchItems((prev) => prev.filter((id) => !items.some((item) => item.id === id)));
    };
    const clearBatchSelection = () => {
        setSelectedBatchItems([]);
        toast({ title: "Selection cleared", description: "All selected scheme items have been cleared." });
    };
    const handleGenerateSelected = (items) => {
        const selectedItems = items.filter((item) => selectedBatchItems.includes(item.id));
        if (selectedItems.length === 0) {
            toast({ title: "No Items Selected", description: "Please select at least one item to generate.", variant: "destructive" });
            return;
        }
        handleBatchGenerateClick(selectedItems);
    };
    const handleClear = async () => {
        if (confirm("Are you sure you want to clear the current scheme?")) {
            setSchemeData([]);
            localStorage.removeItem(STORAGE_KEY);
            if (userId) {
                const { error } = await supabase.from('schemes').delete().eq('user_id', userId);
                if (error)
                    console.error("Failed to clear DB:", error);
            }
        }
    };
    const handleDeleteClass = async (className) => {
        if (confirm(`Are you sure you want to delete ALL schemes for ${className}? This action cannot be undone.`)) {
            setSchemeData(prev => {
                const updated = prev.filter(item => item.classLevel !== className);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
            if (userId) {
                const { error } = await supabase.from('schemes').delete().eq('user_id', userId).eq('class_level', className);
                if (error)
                    console.error("Failed to delete class from DB:", error);
            }
            toast({ title: "Class Deleted", description: `Removed all data for ${className}` });
        }
    };
    const handleDeleteSubject = async (className, subjectName) => {
        if (confirm(`Are you sure you want to delete ${subjectName} from ${className}?`)) {
            setSchemeData(prev => {
                const updated = prev.filter(item => !(item.classLevel === className && item.subject === subjectName));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
            if (userId) {
                const { error } = await supabase
                    .from('schemes')
                    .delete()
                    .eq('user_id', userId)
                    .eq('class_level', className)
                    .eq('subject', subjectName);
                if (error)
                    console.error("Failed to delete subject from DB:", error);
            }
            toast({ title: "Subject Deleted", description: `Removed ${subjectName} from ${className}` });
        }
    };
    const handleDownloadCSV = () => {
        if (schemeData.length === 0) {
            toast({ title: "No Data", description: "No scheme data to export.", variant: "destructive" });
            return;
        }
        // CSV Headers
        const headers = [
            "Week",
            "Week Ending",
            "Term",
            "Subject",
            "Class",
            "Strand",
            "Sub-Strand",
            "Content Standard",
            "Indicators",
            "Exemplars",
            "Resources"
        ];
        // CSV Rows
        const rows = schemeData.map(item => [
            item.week,
            item.weekEnding,
            item.term,
            item.subject,
            item.classLevel,
            `"${(item.strand || '').replace(/"/g, '""')}"`,
            `"${(item.subStrand || '').replace(/"/g, '""')}"`,
            `"${(item.contentStandard || '').replace(/"/g, '""')}"`,
            `"${(item.indicators || '').replace(/"/g, '""')}"`,
            `"${(item.exemplars || '').replace(/"/g, '""')}"`,
            `"${(item.resources || '').replace(/"/g, '""')}"`
        ].join(","));
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `scheme_of_learning_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const getWeekNumber = (weekStr) => {
        const match = weekStr.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 999;
    };
    const activeClasses = useMemo(() => Array.from(new Set(schemeData.map(item => item.classLevel))), [schemeData]);
    const filteredSchemeData = useMemo(() => {
        return schemeData.filter((item) => {
            const searchLower = searchTerm.toLowerCase();
            return (item.subject?.toLowerCase().includes(searchLower) ||
                item.classLevel?.toLowerCase().includes(searchLower) ||
                item.strand?.toLowerCase().includes(searchLower) ||
                item.subStrand?.toLowerCase().includes(searchLower) ||
                item.term?.toString().toLowerCase().includes(searchLower) ||
                item.week?.toString().toLowerCase().includes(searchLower));
        }).sort((a, b) => {
            // Sort by Class Level first (optional but good)
            if (a.classLevel < b.classLevel)
                return -1;
            if (a.classLevel > b.classLevel)
                return 1;
            // Then by Week Number
            return getWeekNumber(a.week) - getWeekNumber(b.week);
        });
    }, [schemeData, searchTerm]);
    // Group by Week + Class for Batch Display
    const groupedData = useMemo(() => {
        return filteredSchemeData.reduce((acc, item) => {
            const key = `${item.classLevel} - ${item.week}`;
            if (!acc[key])
                acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
    }, [filteredSchemeData]);
    // Helper to get consistent sorting for groups
    const sortedGroupKeys = useMemo(() => {
        return Object.keys(groupedData).sort((keyA, keyB) => {
            const [classA, weekA] = keyA.split(' - ');
            const [classB, weekB] = keyB.split(' - ');
            if (classA !== classB)
                return classA.localeCompare(classB);
            return getWeekNumber(weekA) - getWeekNumber(weekB);
        });
    }, [groupedData]);
    const handleBatchGenerateClick = async (items) => {
        // Pre-fill from the first item if possible (term/weekEnding)
        const first = items[0];
        // Normalize Class Level (Label -> Value)
        // e.g. "Basic 1" -> "basic1"
        let normalizedClassLevel = first.classLevel || "";
        const matchedLevel = CLASS_LEVELS.find(l => l.label.toLowerCase() === normalizedClassLevel.toLowerCase() ||
            l.value.toLowerCase() === normalizedClassLevel.toLowerCase());
        if (matchedLevel)
            normalizedClassLevel = matchedLevel.value;
        // Format Date (DD/MM/YYYY -> YYYY-MM-DD or other formats)
        const formatDateForInput = (dateStr) => {
            if (!dateStr)
                return "";
            // Check for DD/MM/YYYY
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    // Assume DD/MM/YYYY
                    if (parts[2].length === 4) {
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
            }
            // Attempt direct Date parse
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
            return "";
        };
        const weekEndingFormatted = formatDateForInput(first.weekEnding);
        // Calculate likely Start Date (Mon) from Week Ending (Fri)
        let startDateStr = new Date().toISOString().split("T")[0];
        if (weekEndingFormatted) {
            const d = new Date(weekEndingFormatted);
            d.setDate(d.getDate() - 4);
            startDateStr = d.toISOString().split('T')[0];
        }
        let fetchedClassSize = "";
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // 1. Try strict match (Class + Term)
                let timetable = await TimetableService.getTimetable(user.id, normalizedClassLevel, first.term);
                // 2. If failure, fetch ALL timetables and find best match
                if (!timetable) {
                    const allTimetables = await TimetableService.getAllTimetables(user.id);
                    const cleanItemClass = normalizedClassLevel.toLowerCase().replace(/[^a-z0-9]/g, '');
                    timetable = allTimetables.find(t => {
                        const cleanTClass = t.class_level.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return cleanTClass === cleanItemClass || cleanTClass.includes(cleanItemClass) || cleanItemClass.includes(cleanTClass);
                    }) || null;
                }
                if (timetable && timetable.class_size) {
                    fetchedClassSize = timetable.class_size.toString();
                }
            }
        }
        catch (err) {
            console.warn("Could not fetch timetable for class size:", err);
        }
        const classProfile = getClassProfile(first.classLevel);
        setBatchFormData(prev => ({
            ...prev,
            weekEnding: weekEndingFormatted || prev.weekEnding,
            term: first.term || prev.term,
            weekNumber: first.week || prev.weekNumber || "Week 1",
            classLevel: normalizedClassLevel || prev.classLevel || "",
            classSize: fetchedClassSize || prev.classSize,
            date: startDateStr,
            coverPageSubject: Array.from(new Set(items.map(i => i.subject))).join(" & "),
            schoolName: classProfile.schoolName || prev.schoolName,
            teacherName: classProfile.teacherName || prev.teacherName,
            includeCoverPage: prev.includeCoverPage || Boolean(classProfile.schoolName || classProfile.teacherName),
        }));
        setBatchDialogConfig({ open: true, items });
        setBatchStep('config');
        setSelectedBatchItems(items.map(i => i.id)); // Select all by default
    };
    const handleBatchGenerateConfirm = async () => {
        // Filter items based on selection
        const allItems = batchDialogConfig.items;
        const items = allItems.filter(item => selectedBatchItems.includes(item.id));
        if (items.length === 0) {
            toast({ title: "No Items Selected", description: "Please select at least one subject to generate.", variant: "destructive" });
            return;
        }
        setBatchDialogConfig({ open: false, items: [] });
        setBatchResults([]); // Reset results
        setIsBatchGenerating(true);
        setBatchProgress({ current: 0, total: items.length, successes: 0, failures: 0 });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
            setIsBatchGenerating(false);
            return;
        }
        // Default template
        const template = lessonTemplates.find(t => t.id === batchFormData.templateId) || lessonTemplates[0];
        // Notification for start
        toast({
            title: "Batch Generation Started",
            description: `Generating notes for ${items.length} items. Please do not close this page.`,
        });
        // Fetch Timetable ONCE for the Class/Term context (Assuming all items in batch are same Class/Term)
        // If batch spans classes, this needs to move inside loop.
        // Based on grouping, they are same class.
        let timetableMap = {};
        let fetchedClassSize = "";
        try {
            // Robust Timetable Fetching Strategy
            // 1. Try strict match (Class + Term)
            let timetable = await TimetableService.getTimetable(user.id, items[0].classLevel, items[0].term);
            // 2. If failure, fetch ALL timetables and find best match for Class Level (ignoring term mismatch issues like "Term 2" vs "Second Term")
            if (!timetable) {
                console.log("Strict timetable match failed, trying loose class match...");
                const allTimetables = await TimetableService.getAllTimetables(user.id);
                // Normalize item class level for comparison (remove spaces, lowercase)
                const cleanItemClass = items[0].classLevel.toLowerCase().replace(/[^a-z0-9]/g, '');
                timetable = allTimetables.find(t => {
                    const cleanTClass = t.class_level.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return cleanTClass === cleanItemClass || cleanTClass.includes(cleanItemClass) || cleanItemClass.includes(cleanTClass);
                }) || null;
                if (timetable)
                    console.log(`Found fallback timetable: ${timetable.class_level} - ${timetable.term}`);
            }
            if (timetable && timetable.class_size) {
                fetchedClassSize = timetable.class_size.toString();
            }
            if (timetable && timetable.subject_config) {
                Object.entries(timetable.subject_config).forEach(([sub, config]) => {
                    timetableMap[sub.toLowerCase()] = {
                        frequency: config.frequency || 1,
                        days: config.days || []
                    };
                });
            }
            else {
                console.warn("No compatible timetable found. Defaulting to 1 lesson per subject.");
            }
        }
        catch (err) {
            console.warn("Could not fetch timetable for batch context:", err);
        }
        // Process queue with concurrency limit of 3
        const CONCURRENCY_LIMIT = 3;
        let activePromises = [];
        let nextItemIndex = 0;
        const processItem = async (index) => {
            const item = items[index];
            try {
                // Update status - keep it simple, just increment processed
                // (Cannot update current index strictly in order due to async)
                // Get Lessons count from Timetable
                const subjectKey = item.subject.toLowerCase();
                let numLessons = 1; // Default
                let scheduledDays = [];
                // Helper for lookup
                const getTimetableInfo = (key) => {
                    if (timetableMap[key])
                        return timetableMap[key];
                    const match = Object.keys(timetableMap).find(k => k.includes(key) || key.includes(k));
                    return match ? timetableMap[match] : null;
                };
                const tInfo = getTimetableInfo(subjectKey);
                if (tInfo) {
                    numLessons = tInfo.frequency;
                    scheduledDays = tInfo.days;
                }
                // Use batchFormData.weekNumber if provided by user, else fallback to scheme item.week
                const finalWeekNumber = (batchFormData.weekNumber && batchFormData.weekNumber.trim() !== "")
                    ? batchFormData.weekNumber
                    : item.week;
                const itemProfile = getClassProfile(item.classLevel);
                const useProfileSource = batchFormData.coverPageSource === "profiles";
                const lessonData = {
                    subject: item.subject,
                    level: item.classLevel,
                    strand: item.strand,
                    subStrand: item.subStrand,
                    contentStandard: item.contentStandard,
                    indicators: item.indicators,
                    exemplars: item.exemplars,
                    topic: item.subStrand || item.contentStandard || "Lesson",
                    subTopic: "",
                    date: batchFormData.date,
                    duration: batchFormData.duration,
                    classSize: batchFormData.classSize || fetchedClassSize || "40",
                    coreCompetencies: "",
                    learningObjectives: "",
                    teachingLearningResources: item.resources,
                    weekNumber: finalWeekNumber,
                    weekEnding: batchFormData.weekEnding || item.weekEnding,
                    term: batchFormData.term || item.term,
                    numLessons: numLessons,
                    scheduledDays: scheduledDays,
                    template: template,
                    detailLevel: batchFormData.detailLevel,
                    philosophy: batchFormData.philosophy,
                    teachingPhilosophy: batchFormData.philosophy,
                    // ... rest unrelated fields
                    includeDiagrams: false, previousKnowledge: "", references: "", keywords: "",
                    teacherActivities: "", learnerActivities: "", evaluation: "", assignment: "",
                    remarks: "", differentiation: "", assessment: "",
                    reflection: "", gradeLevel: item.classLevel, unit: "", content: "",
                    methodology: "", materials: "", objectives: "", lesson: 1,
                    location: batchFormData.location || "",
                    subjectTeacher: getClassSubjectTeacher(item.classLevel, item.subject),
                    schoolName: useProfileSource ? itemProfile.schoolName || batchFormData.schoolName : batchFormData.schoolName,
                    teacherName: useProfileSource ? itemProfile.teacherName || batchFormData.teacherName : batchFormData.teacherName,
                    includeCoverPage: batchFormData.includeCoverPage || (useProfileSource && Boolean(itemProfile.schoolName || itemProfile.teacherName)),
                    coverPageSubject: batchFormData.coverPageSubject,
                };
                // Generate
                const content = await generateLessonNote(lessonData);
                // Pay
                const estimatedTokens = Math.max(4000, numLessons * 2500);
                const paymentResult = await deductPayment(estimatedTokens, 'lesson_note', numLessons);
                if (!paymentResult.success && paymentResult.error?.includes('Insufficient')) {
                    toast({ title: "Payment Failed", description: `Stopped at ${item.subject}: ${paymentResult.error}`, variant: "destructive" });
                    setBatchProgress(prev => ({ ...prev, failures: prev.failures + 1 }));
                    return;
                }
                // Save
                const note = await LessonNotesService.saveLessonNote(user.id, lessonData, content, template.id);
                // Add result
                setBatchResults(prev => [...prev, { data: lessonData, content: content, id: note.id }]);
                setBatchProgress(prev => ({ ...prev, current: prev.current + 1, successes: prev.successes + 1 }));
            }
            catch (error) {
                console.error(`Error generating batch item ${item.subject}:`, error);
                setBatchProgress(prev => ({ ...prev, current: prev.current + 1, failures: prev.failures + 1 }));
                toast({ title: "Error", description: `Failed to generate ${item.subject}. Skipping...`, variant: "destructive" });
            }
        };
        // Loop until all items are processed
        // We start CONCURRENCY_LIMIT items, and whenever one finishes, we start the next.
        while (nextItemIndex < items.length) {
            if (activePromises.length < CONCURRENCY_LIMIT) {
                const p = processItem(nextItemIndex).then(() => {
                    activePromises = activePromises.filter(ap => ap !== p);
                });
                activePromises.push(p);
                nextItemIndex++;
            }
            else {
                // Wait for race of any promise to finish
                await Promise.race(activePromises);
            }
        }
        // key detail: wait for remaining active promises
        await Promise.all(activePromises);
        setIsBatchGenerating(false);
        setShowBatchSuccess(true);
        // Removed trigger toast
    };
    const handleDownloadAll = async () => {
        if (batchResults.length === 0)
            return;
        toast({ title: "Preparing Download", description: "Zipping files..." });
        try {
            const zip = new PizZip();
            // Generate all docs
            const normalizeLessonPayload = (lesson, source, rawContent) => {
                const normalized = {
                    ...lesson,
                    term: lesson.term || source.term || batchFormData.term || "",
                    weekNumber: lesson.weekNumber || lesson.week || source.weekNumber || source.week || batchFormData.weekNumber || "",
                    weekEnding: lesson.weekEnding || source.weekEnding || "",
                    day: lesson.day || source.day || new Date(source.date || "").toLocaleDateString('en-GB', { weekday: 'long' }),
                    subject: lesson.subject || source.subject || "",
                    duration: lesson.duration || source.duration || "60 mins",
                    strand: lesson.strand || source.strand || "",
                    class: lesson.class || lesson.level || source.level || source.class || "",
                    classSize: lesson.classSize || source.classSize || "",
                    subStrand: lesson.subStrand || source.subStrand || "",
                    contentStandard: lesson.contentStandard || source.contentStandard || "",
                    indicator: lesson.indicator || lesson.indicators || source.indicators || "",
                    lesson: lesson.lesson || source.lesson || "1 of 1",
                    performanceIndicator: lesson.performanceIndicator || source.learningObjectives || "",
                    coreCompetencies: lesson.coreCompetencies || source.coreCompetencies || "",
                    keywords: lesson.keywords || source.keywords || "",
                    reference: lesson.reference || source.references || (source.subject ? `NaCCA ${source.subject} Curriculum for ${source.level || source.class || ''}` : ""),
                    phases: {
                        phase1_starter: {
                            duration: lesson.phases?.phase1_starter?.duration || "10 mins",
                            learnerActivities: lesson.phases?.phase1_starter?.learnerActivities || "",
                            resources: lesson.phases?.phase1_starter?.resources || "",
                        },
                        phase2_newLearning: {
                            duration: lesson.phases?.phase2_newLearning?.duration || "40 mins",
                            learnerActivities: lesson.phases?.phase2_newLearning?.learnerActivities || "",
                            resources: lesson.phases?.phase2_newLearning?.resources || "",
                        },
                        phase3_reflection: {
                            duration: lesson.phases?.phase3_reflection?.duration || "10 mins",
                            learnerActivities: lesson.phases?.phase3_reflection?.learnerActivities || "",
                            resources: lesson.phases?.phase3_reflection?.resources || "",
                        },
                    },
                };
                if (!normalized.phases.phase2_newLearning.learnerActivities.trim() && rawContent.trim() && !/^[\[\{]\s*/.test(rawContent)) {
                    normalized.phases.phase2_newLearning.learnerActivities = rawContent;
                }
                return normalized;
            };
            for (let index = 0; index < batchResults.length; index++) {
                const result = batchResults[index];
                let finalData;
                const rawContent = result.content || "";
                // Try to parse the content as JSON first (high fidelity)
                try {
                    // simple cleanup before parse
                    let cleanContent = result.content;
                    if (cleanContent.startsWith('```')) {
                        cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
                    }
                    finalData = JSON.parse(cleanContent);
                    // Ensure it's an array or object
                    // FIX: Do NOT take [0] only! Pass the full array to the docx generator.
                    // It knows how to render multiple lessons.
                    // However, we need to ensure metadata is merged into ALL items in the array if missing
                    if (Array.isArray(finalData)) {
                        finalData = finalData.map((lesson) => normalizeLessonPayload(lesson, result.data, rawContent));
                    }
                    else {
                        finalData = normalizeLessonPayload(finalData, result.data, rawContent);
                    }
                }
                catch (e) {
                    // Fallback: Construct object wrapping the raw content
                    const phases = {
                        phase1_starter: { duration: "10 mins", learnerActivities: "", resources: "" },
                        phase2_newLearning: { duration: "40 mins", learnerActivities: result.content, resources: "" },
                        phase3_reflection: { duration: "10 mins", learnerActivities: "", resources: "" }
                    };
                    finalData = {
                        weekNumber: result.data.weekNumber || result.data.week || batchFormData.weekNumber || "",
                        weekEnding: result.data.weekEnding,
                        day: new Date(result.data.date || "").toLocaleDateString('en-GB', { weekday: 'long' }),
                        subject: result.data.subject,
                        duration: result.data.duration,
                        strand: result.data.strand,
                        class: result.data.level,
                        classSize: result.data.classSize,
                        subStrand: result.data.subStrand,
                        contentStandard: result.data.contentStandard,
                        indicator: result.data.indicators,
                        term: result.data.term || batchFormData.term,
                        lesson: (result.data.lesson || 1).toString(),
                        performanceIndicator: result.data.learningObjectives,
                        coreCompetencies: result.data.coreCompetencies,
                        keywords: result.data.keywords,
                        reference: result.data.references,
                        phases: phases
                    };
                }
                // Generate filename using the standard service
                const fileName = generateGhanaLessonFileName(finalData);
                // Ensure uniqueness without forced ugly suffixes unless essential
                let uniqueName = fileName;
                // Check if this filename is already in the zip
                if (zip.file(uniqueName)) {
                    // Try adding "Lesson X" if applicable to differentiate
                    if (result.data.subTopic && result.data.subTopic.includes("Lesson")) {
                        const cleanLessonTag = result.data.subTopic.replace(/[^a-zA-Z0-9]/g, '-');
                        uniqueName = fileName.replace('.docx', `-${cleanLessonTag}.docx`);
                    }
                    // If still duplicate, increment counter
                    let counter = 1;
                    while (zip.file(uniqueName)) {
                        uniqueName = fileName.replace('.docx', `-${counter}.docx`);
                        counter++;
                    }
                }
                // Generate Blob (pass true for returnBlob)
                // We pass finalData as the first arg. generateGhanaLessonDocx handles object inputs too.
                // If it's the first document and cover page is requested, generate the cover page as a completely standalone file
                const shouldIncludeCover = batchFormData.includeCoverPage || Boolean(getClassProfile((Array.isArray(finalData) ? finalData[0].class : finalData.class) || "").schoolName || getClassProfile((Array.isArray(finalData) ? finalData[0].class : finalData.class) || "").teacherName);
                if (shouldIncludeCover && index === 0) {
                    const classLvl = normalizeClassLevel((Array.isArray(finalData) ? finalData[0].class : finalData.class) || "");
                    const coverPageLevel = getCoverPageLevelString(batchResults.map((result) => {
                        const lessonData = result.data;
                        return lessonData.level || lessonData.class || lessonData.classLevel;
                    })) || classLvl;
                    const isJHS = /\bbasic\s*[7-9]\b/i.test(coverPageLevel);
                    const subjectValue = isJHS && batchFormData.coverPageSubject?.trim() !== ""
                        ? batchFormData.coverPageSubject
                        : "ALL SUBJECTS";
                    const classProfile = getClassProfile(classLvl);
                    const useProfileSource = batchFormData.coverPageSource === "profiles";
                    const coverMeta = {
                        subject: subjectValue,
                        level: coverPageLevel,
                        term: batchFormData.term,
                        week: batchFormData.weekNumber || result.data.weekNumber?.toString() || "",
                        teacherName: useProfileSource ? classProfile.teacherName || batchFormData.teacherName : batchFormData.teacherName,
                        schoolName: useProfileSource ? classProfile.schoolName || batchFormData.schoolName : batchFormData.schoolName,
                        subjectTeacher: isJHS && subjectValue !== "ALL SUBJECTS"
                            ? getClassSubjectTeacher(classLvl, subjectValue)
                            : undefined,
                    };
                    // Create a dummy lesson payload so the generator runs, but the coverPageMeta flags the cover page creation.
                    // We'll rely on the fact that if we pass an empty array of lessons it will just render the cover page (or a very blank first page).
                    // Actually, let's just generate it using the first lesson data but tell the generator it's a cover page? 
                    // Wait, if it generates the lesson too, it's not strictly "standalone".
                    // We have access to PizZip. Let's just render the cover page as a separate document.
                    const coverBlob = await generateGhanaLessonDocx([], "Cover_Page.docx", true, coverMeta);
                    if (coverBlob && coverBlob instanceof Blob) {
                        const coverArrayBuffer = await coverBlob.arrayBuffer();
                        zip.file("00_Cover_Page.docx", coverArrayBuffer);
                    }
                }
                // Normal lesson note generation (without cover pages)
                const blob = await generateGhanaLessonDocx(finalData, uniqueName, true, undefined);
                if (blob && blob instanceof Blob) {
                    const arrayBuffer = await blob.arrayBuffer();
                    zip.file(uniqueName, arrayBuffer);
                }
                else {
                    console.error("Failed to generate blob for", uniqueName);
                }
            }
            const content = zip.generate({ type: "blob" });
            // Generate meaningful zip filename: Class_Week (e.g. BS1_WK1.zip)
            let zipName = `Batch_Lesson_Notes_${new Date().toISOString().split('T')[0]}.zip`; // Fallback
            if (batchResults.length > 0) {
                const firstItem = batchResults[0].data;
                // Helper to clean strings
                const clean = (s) => (s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                // Get Class Abbreviation (Basic 1 -> BS1, KG 1 -> KG1)
                let classAbbr = clean(firstItem.level || "");
                if (classAbbr.startsWith("BASIC"))
                    classAbbr = classAbbr.replace("BASIC", "BS");
                if (classAbbr.startsWith("BS") && !classAbbr.startsWith("BS"))
                    classAbbr = "BS" + classAbbr.replace("B", "");
                // Get Week Abbreviation (Week 1 -> WK1)
                let weekVal = clean(firstItem.weekNumber || "");
                if (weekVal.includes("WEEK"))
                    weekVal = weekVal.replace("WEEK", "WK");
                else if (/^\d+$/.test(weekVal))
                    weekVal = "WK" + weekVal;
                if (classAbbr && weekVal) {
                    zipName = `${classAbbr}_${weekVal}.zip`;
                }
            }
            saveAs(content, zipName);
            toast({ title: "Download Complete", description: "Your files have been downloaded." });
        }
        catch (e) {
            console.error("Download error", e);
            toast({ title: "Download Failed", description: "Could not create zip file.", variant: "destructive" });
        }
    };
    const handleLocationDetect = () => {
        if (!navigator.geolocation) {
            toast({
                title: "Geolocation not supported",
                description: "Your browser does not support location detection.",
                variant: "destructive",
            });
            return;
        }
        toast({
            title: "Detecting location...",
            description: "Please allow location access if prompted.",
        });
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                // Use OpenStreetMap N
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                const city = data.address.city || data.address.town || data.address.village || data.address.county;
                const region = data.address.state || data.address.region;
                const locationString = [city, region].filter(Boolean).join(", ");
                if (locationString) {
                    setBatchFormData(prev => ({ ...prev, location: locationString }));
                    toast({
                        title: "Location detected",
                        description: `Set location to: ${locationString}`,
                    });
                }
                else {
                    const coordString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    setBatchFormData(prev => ({ ...prev, location: coordString }));
                    toast({
                        title: "Location detected",
                        description: "Coordinates set. You can edit the location name manually.",
                    });
                }
            }
            catch (error) {
                console.error("Error fetching location name:", error);
                toast({
                    title: "Could not get location name",
                    description: "Please enter your location manually.",
                    variant: "destructive",
                });
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            toast({
                title: "Location detection failed",
                description: "Please enter your location manually.",
                variant: "destructive",
            });
        });
    };
    const handleDeleteGroup = (items) => {
        if (confirm("Are you sure you want to delete this entire week/group?")) {
            const idsToDelete = items.map(i => i.id);
            setSchemeData(prev => {
                const newData = prev.filter(item => !idsToDelete.includes(item.id));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
                return newData;
            });
            toast({ title: "Deleted", description: "Week group deleted successfully." });
        }
    };
    const handleDeleteItem = (id) => {
        if (confirm("Delete this item?")) {
            setSchemeData(prev => {
                const newData = prev.filter(item => item.id !== id);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
                return newData;
            });
            toast({ title: "Deleted", description: "Item deleted." });
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-background text-foreground flex flex-col font-sans", children: [_jsx(Navbar, {}), _jsxs("main", { className: "container mx-auto px-4 py-8 sm:py-12 max-w-7xl flex-grow", children: [_jsxs("div", { className: "mb-10 sm:mb-12 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between", children: [_jsxs("div", { className: "max-w-2xl", children: [_jsxs("div", { className: "mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-md animate-fade-in-up", children: [_jsx(BookOpen, { className: "h-4 w-4" }), "Curriculum Integration"] }), _jsx("h1", { className: "mb-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground", children: "Scheme of Learning" }), _jsx("p", { className: "text-base sm:text-lg text-muted-foreground font-medium", children: "Elevate your scheduling. Manage and view your weekly schemes seamlessly." })] }), _jsx("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center justify-end w-full lg:w-auto", children: _jsx("div", { className: "flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto", children: _jsxs(Dialog, { open: importDialogOpen, onOpenChange: setImportDialogOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "default", className: "w-full sm:w-auto", children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Import Scheme" }), _jsx("span", { className: "sm:hidden", children: "Import" })] }) }), _jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Import Scheme of Learning" }), _jsx(DialogDescription, { children: "Upload a file or import from the system curriculum." })] }), _jsxs("div", { className: "grid gap-4 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "font-semibold", children: "Option A: Upload File" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Supports CSV, PDF, DOCX with columns/fields for Week, Strand, Sub-strand, Content Standard, Indicators." }), _jsxs("div", { className: "grid w-full max-w-sm items-center gap-1.5", children: [_jsx(Label, { htmlFor: "scheme-upload", children: "Choose File" }), _jsx(Input, { id: "scheme-upload", type: "file", onChange: handleFileUpload, accept: ".csv,.xlsx,.xls,.docx,.pdf,.txt" })] })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("span", { className: "w-full border-t" }) }), _jsx("div", { className: "relative flex justify-center text-xs uppercase", children: _jsx("span", { className: "bg-background px-2 text-muted-foreground", children: "Or Import System Data" }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "font-semibold", children: "Option B: Generate from Database" }), _jsxs("div", { className: "grid gap-4", children: [_jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { children: "Select Class Levels" }), _jsx("div", { className: "grid max-h-[220px] overflow-y-auto rounded-md border p-3 bg-background gap-2", children: CLASS_LEVELS.map(level => (_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx(Checkbox, { checked: importLevels.includes(level.value), onCheckedChange: (checked) => {
                                                                                                        setImportLevels((prev) => {
                                                                                                            if (checked)
                                                                                                                return [...prev, level.value];
                                                                                                            return prev.filter((value) => value !== level.value);
                                                                                                        });
                                                                                                    } }), _jsx("span", { className: "text-sm", children: level.label })] }, level.value))) })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { children: "Select Subjects" }), _jsx("div", { className: "grid max-h-[220px] overflow-y-auto rounded-md border p-3 bg-background gap-2", children: SUBJECTS
                                                                                            .filter((subject) => {
                                                                                            if (importLevels.length > 0 && importLevels.every(level => level === 'kg1' || level === 'kg2')) {
                                                                                                return ['language_literacy', 'numeracy', 'our_world_our_people', 'creative_arts'].includes(subject.value);
                                                                                            }
                                                                                            return true;
                                                                                        })
                                                                                            .map(subject => (_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx(Checkbox, { checked: importSubjects.includes(subject.value), onCheckedChange: (checked) => {
                                                                                                        setImportSubjects((prev) => {
                                                                                                            if (checked)
                                                                                                                return [...prev, subject.value];
                                                                                                            return prev.filter((value) => value !== subject.value);
                                                                                                        });
                                                                                                    } }), _jsx("span", { className: "text-sm", children: subject.label })] }, subject.value))) })] }), _jsxs(Button, { onClick: handleSystemImport, disabled: isLoading || importLevels.length === 0 || importSubjects.length === 0, children: [isLoading ? _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : _jsx(Globe, { className: "mr-2 h-4 w-4" }), "Load Standard Curriculum"] })] })] })] })] })] }) }) }), isBatchGenerating && (_jsx(Card, { className: "mb-6 p-4 border-primary/20 bg-primary/5 sticky top-[160px] z-50 shadow-md backdrop-blur-sm bg-primary/10", children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm font-medium", children: [_jsx("span", { children: "Generating Batch Compliance..." }), _jsxs("span", { children: [batchProgress.current, " / ", batchProgress.total] })] }), _jsx(Progress, { value: (batchProgress.current / batchProgress.total) * 100, className: "h-2" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Please do not close this window. Processing lesson notes sequentially..." })] }) })), schemeData.length > 0 && (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "outline", onClick: handleDownloadCSV, className: "w-full sm:w-auto", children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Export CSV" }), _jsx("span", { className: "sm:hidden", children: "Export" })] }), _jsxs(Dialog, { open: deleteClassDialogOpen, onOpenChange: setDeleteClassDialogOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: "w-full sm:w-auto text-destructive border-destructive hover:bg-destructive/10", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Delete Class" }), _jsx("span", { className: "sm:hidden", children: "Class" })] }) }), _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Delete Class Scheme" }), _jsx(DialogDescription, { children: "Select a class down below to completely remove its scheme of learning. This action cannot be undone." })] }), _jsx("div", { className: "py-4 space-y-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Select Class Level" }), _jsxs(Select, { value: classToDelete, onValueChange: setClassToDelete, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select a class..." }) }), _jsx(SelectContent, { children: activeClasses.map((c) => (_jsx(SelectItem, { value: c, children: c }, c))) })] })] }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "ghost", onClick: () => setDeleteClassDialogOpen(false), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: () => {
                                                                    if (classToDelete) {
                                                                        handleDeleteClass(classToDelete);
                                                                        setDeleteClassDialogOpen(false);
                                                                        setClassToDelete("");
                                                                    }
                                                                }, disabled: !classToDelete, children: "Delete Data" })] })] })] }), _jsxs(Button, { variant: "destructive", onClick: handleClear, className: "w-full sm:w-auto", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Clear Scheme" }), _jsx("span", { className: "sm:hidden", children: "Clear" })] })] }))] }), _jsx("div", { className: "mb-6 rounded-3xl border border-secondary/10 bg-muted/80 p-5 shadow-sm", children: _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: "Class Cover Page Profiles" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Enter school and teacher names for each class to automatically populate cover page details during generation." })] }), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto", children: [_jsx(Input, { placeholder: "Add class label", value: newProfileClass, onChange: (e) => setNewProfileClass(e.target.value), className: "w-full sm:w-[220px]" }), _jsx(Button, { variant: "outline", onClick: () => addClassProfile(newProfileClass), disabled: !newProfileClass.trim(), className: "w-full sm:w-auto", children: "Add Class" })] })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: profileClassLevels.length === 0 ? (_jsx("div", { className: "col-span-full rounded-2xl border border-dashed border-secondary/50 bg-background/80 p-6 text-center text-sm text-muted-foreground", children: "No class profiles yet. Add a class label or import scheme data to start." })) : (profileClassLevels.map((classLevel) => {
                                        const profile = getClassProfile(classLevel);
                                        const subjectSet = classSubjectsByLevel[classLevel] || new Set();
                                        const subjects = Array.from(subjectSet).sort();
                                        const isJHS = /basic\s*(7|8|9)/i.test(classLevel);
                                        const expanded = expandedProfileClasses.includes(classLevel);
                                        return (_jsxs("div", { className: "rounded-2xl border border-secondary/10 bg-white/90 p-4 shadow-sm", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [_jsx("div", { className: "text-sm font-semibold text-foreground", children: classLevel }), isJHS && subjects.length > 0 ? (_jsx("button", { type: "button", className: "text-primary text-sm font-medium hover:text-primary/80", onClick: () => toggleProfileExpansion(classLevel), children: expanded ? "Hide subjects" : `Show ${subjects.length} subject${subjects.length === 1 ? "" : "s"}` })) : null] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-xs uppercase tracking-[0.18em] text-muted-foreground", children: "School Name" }), _jsx(Input, { value: profile.schoolName, onChange: (e) => updateClassProfile(classLevel, "schoolName", e.target.value), placeholder: "e.g. St. Theresa's Basic School" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-xs uppercase tracking-[0.18em] text-muted-foreground", children: "Teacher Name" }), _jsx(Input, { value: profile.teacherName, onChange: (e) => updateClassProfile(classLevel, "teacherName", e.target.value), placeholder: "e.g. Ms. Akua Mensah" })] }), isJHS && expanded && (_jsxs("div", { className: "rounded-xl border border-secondary/20 bg-slate-50 p-3", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2", children: "Subjects" }), _jsx("div", { className: "grid gap-3", children: subjects.map((subject) => (_jsxs("div", { className: "rounded-lg border border-secondary/20 bg-white p-3", children: [_jsx("div", { className: "mb-2 text-sm font-medium text-foreground", children: subject }), _jsx(Input, { value: profile.subjectTeachers?.[subject] || "", onChange: (e) => updateClassSubjectTeacher(classLevel, subject, e.target.value), placeholder: "Subject teacher name", className: "w-full" })] }, subject))) })] }))] })] }, classLevel));
                                    })) })] }) }), _jsx("div", { className: "sticky top-28 mt-8 mb-8 w-full rounded-full border border-secondary/20 bg-white/95 px-5 py-4 shadow-xl shadow-secondary/20 backdrop-blur-sm ring-1 ring-slate-200/40 z-40", children: _jsxs("div", { className: "flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between", children: [_jsxs("div", { className: "relative w-full xl:w-[48%]", children: [_jsx(Search, { className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search class, subject, strand...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10" })] }), _jsx("div", { className: "flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto", children: selectedBatchItems.length > 0 && (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "secondary", onClick: () => {
                                                    const selectedItems = schemeData.filter(item => selectedBatchItems.includes(item.id));
                                                    if (selectedItems.length === 0) {
                                                        toast({ title: "No Items Selected", description: "Please select at least one item to generate.", variant: "destructive" });
                                                        return;
                                                    }
                                                    handleBatchGenerateClick(selectedItems);
                                                }, className: "w-full sm:w-auto", children: [_jsx(Play, { className: "mr-2 h-4 w-4" }), "Generate Selected (", selectedBatchItems.length, ")"] }), _jsx(Button, { variant: "outline", onClick: clearBatchSelection, className: "w-full sm:w-auto", children: "Clear Selection" })] })) })] }) }), isBatchGenerating && (_jsx(Card, { className: "mb-6 p-4 border-primary/20 bg-primary/5 sticky top-[160px] z-50 shadow-md backdrop-blur-sm bg-primary/10", children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm font-medium", children: [_jsx("span", { children: "Generating Batch Compliance..." }), _jsxs("span", { children: [batchProgress.current, " / ", batchProgress.total] })] }), _jsx(Progress, { value: (batchProgress.current / batchProgress.total) * 100, className: "h-2" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Please do not close this window. Processing lesson notes sequentially..." })] }) })), _jsx(Dialog, { open: batchDialogConfig.open, onOpenChange: (open) => !open && setBatchDialogConfig({ open: false, items: [] }), children: _jsxs(DialogContent, { className: "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-0", children: [_jsxs("div", { className: "p-4 sm:p-6 pb-0", children: [_jsxs(DialogHeader, { className: "px-1 sm:px-0", children: [_jsx(DialogTitle, { children: "Create Your Lesson Note" }), _jsx(DialogDescription, { children: "Follow the steps below to generate a professional lesson note" })] }), _jsxs("div", { className: "flex items-center justify-between px-2 sm:px-8 py-4 mb-2", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${batchStep === 'config' ? 'bg-primary text-primary-foreground' : 'bg-green-600 text-white'}`, children: batchStep === 'review' ? _jsx(Check, { className: "h-4 w-4" }) : '1' }), _jsx("span", { className: "text-xs font-medium", children: "Basic Info" })] }), _jsx("div", { className: `h-[2px] flex-1 mx-2 sm:mx-4 ${batchStep === 'review' ? 'bg-green-600' : 'bg-muted'}` }), _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${batchStep === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`, children: "2" }), _jsx("span", { className: "text-xs font-medium", children: "Review" })] })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-4 sm:px-6 py-2", children: batchStep === 'config' ? (_jsxs("div", { className: "space-y-4 pb-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Class Level *" }), _jsxs(Select, { value: batchFormData.classLevel, onValueChange: (val) => setBatchFormData({ ...batchFormData, classLevel: val }), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Select Class" }) }), _jsx(SelectContent, { children: CLASS_LEVELS.map(level => (_jsx(SelectItem, { value: level.value, children: level.label }, level.value))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Class Size" }), _jsx(Input, { type: "number", placeholder: "Auto from Timetable", value: batchFormData.classSize, onChange: (e) => setBatchFormData({ ...batchFormData, classSize: e.target.value }) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "School Location (Optional)" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { value: batchFormData.location, onChange: (e) => setBatchFormData({ ...batchFormData, location: e.target.value }), placeholder: "e.g. Biriwa, Central Region", className: "flex-1" }), _jsx(Button, { type: "button", variant: "outline", size: "icon", onClick: handleLocationDetect, title: "Detect Location", children: _jsx(MapPin, { className: "h-4 w-4" }) })] }), _jsx("p", { className: "text-[10px] text-muted-foreground", children: "Helps generate examples relevant to your students' immediate environment." })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Term" }), _jsxs(Select, { value: batchFormData.term, onValueChange: (val) => setBatchFormData({ ...batchFormData, term: val }), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "First Term", children: "First Term" }), _jsx(SelectItem, { value: "Second Term", children: "Second Term" }), _jsx(SelectItem, { value: "Third Term", children: "Third Term" })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Week Number" }), _jsx(Input, { value: batchFormData.weekNumber, onChange: (e) => setBatchFormData({ ...batchFormData, weekNumber: e.target.value }), placeholder: "Week X" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Teaching Philosophy" }), _jsxs(Select, { value: batchFormData.philosophy, onValueChange: (val) => setBatchFormData({ ...batchFormData, philosophy: val }), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Select teaching philosophy" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "student-centered", children: "Student-Centered (Active Learning)" }), _jsx(SelectItem, { value: "teacher-led", children: "Teacher-Led (Direct Instruction)" }), _jsx(SelectItem, { value: "balanced", children: "Balanced (Mixed Approach)" }), _jsx(SelectItem, { value: "inquiry-based", children: "Inquiry-Based (Discovery Learning)" }), _jsx(SelectItem, { value: "collaborative", children: "Collaborative (Group Work)" })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Detail Level" }), _jsxs(Select, { value: batchFormData.detailLevel, onValueChange: (val) => setBatchFormData({ ...batchFormData, detailLevel: val }), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Select detail level" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "brief", children: "Brief (Key Points Only)" }), _jsx(SelectItem, { value: "moderate", children: "Moderate (Standard Detail)" }), _jsx(SelectItem, { value: "detailed", children: "Detailed (Comprehensive)" }), _jsx(SelectItem, { value: "very-detailed", children: "Very Detailed (Extensive)" })] })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Week Ending" }), _jsx(Input, { type: "date", value: batchFormData.weekEnding, onChange: (e) => setBatchFormData({ ...batchFormData, weekEnding: e.target.value }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Teaching Date (Start)" }), _jsx(Input, { type: "date", value: batchFormData.date, onChange: (e) => setBatchFormData({ ...batchFormData, date: e.target.value }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border mt-4", children: [_jsxs("div", { className: "col-span-full flex items-center gap-2", children: [_jsx(Checkbox, { id: "includeCoverPage", checked: batchFormData.includeCoverPage, onCheckedChange: (checked) => setBatchFormData({ ...batchFormData, includeCoverPage: checked }) }), _jsx(Label, { htmlFor: "includeCoverPage", className: "cursor-pointer font-medium", children: "Include Cover Page" })] }), batchFormData.includeCoverPage && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "col-span-full grid gap-3 sm:grid-cols-2", children: [_jsxs("button", { type: "button", className: `rounded-2xl border p-3 text-left ${batchFormData.coverPageSource === "profiles" ? "border-primary bg-primary/10" : "border-secondary/10 bg-white"}`, onClick: () => setBatchFormData({ ...batchFormData, coverPageSource: "profiles" }), children: [_jsx("div", { className: "text-sm font-semibold", children: "Class Cover Page Profile" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Use the selected class's stored school and teacher information." })] }), _jsxs("button", { type: "button", className: `rounded-2xl border p-3 text-left ${batchFormData.coverPageSource === "manual" ? "border-primary bg-primary/10" : "border-secondary/10 bg-white"}`, onClick: () => setBatchFormData({ ...batchFormData, coverPageSource: "manual" }), children: [_jsx("div", { className: "text-sm font-semibold", children: "Manual Entry" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Use the values entered below for the cover page." })] })] }), batchFormData.coverPageSource === "manual" ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "School Name" }), _jsx(Input, { placeholder: "e.g. Preset Academy", value: batchFormData.schoolName, onChange: e => setBatchFormData({ ...batchFormData, schoolName: e.target.value }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Teacher Name" }), _jsx(Input, { placeholder: "e.g. Mr. John Osei", value: batchFormData.teacherName, onChange: e => setBatchFormData({ ...batchFormData, teacherName: e.target.value }) })] })] })) : (_jsxs("div", { className: "col-span-full rounded-3xl border border-secondary/20 bg-slate-50 p-4", children: [_jsx("div", { className: "mb-3 text-sm font-semibold", children: "Cover Page Preview" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl bg-white p-3 border border-secondary/10", children: [_jsx("div", { className: "text-[11px] uppercase tracking-[0.18em] text-muted-foreground", children: "School Name" }), _jsx("div", { className: "mt-2 text-sm font-medium text-foreground", children: coverPagePreview.schoolName || "(will use school name entered in class profile)" })] }), _jsxs("div", { className: "rounded-2xl bg-white p-3 border border-secondary/10", children: [_jsx("div", { className: "text-[11px] uppercase tracking-[0.18em] text-muted-foreground", children: "Teacher Name" }), _jsx("div", { className: "mt-2 text-sm font-medium text-foreground", children: coverPagePreview.teacherName || "(will use teacher name entered in class profile)" })] })] }), (selectedBatchClassProfile.schoolName || selectedBatchClassProfile.teacherName) ? (_jsxs("p", { className: "mt-3 text-xs text-muted-foreground", children: ["Using class profile values for ", normalizeClassLevel(batchFormData.classLevel) || "selected class", "."] })) : (_jsx("p", { className: "mt-3 text-xs text-muted-foreground", children: "No class profile values found for this class; manual values will be used if entered." }))] })), ['basic7', 'basic8', 'basic9'].includes(batchFormData.classLevel?.toLowerCase()) && (_jsxs("div", { className: "space-y-2 col-span-full animate-fade-in-up", children: [_jsx(Label, { children: "Subjects to Display (Optional for Multiple Subjects)" }), _jsx(Input, { placeholder: "e.g. Computing and Creative Arts and Design", value: batchFormData.coverPageSubject, onChange: e => setBatchFormData({ ...batchFormData, coverPageSubject: e.target.value }) }), _jsx("p", { className: "text-[11px] text-muted-foreground mt-1", children: "For JHS classes, use this to override and list your specialized subjects on the Cover Page." })] }))] }))] })] })) : (_jsxs("div", { className: "space-y-4 pb-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2", children: [_jsx(Label, { className: "text-base font-semibold", children: "Select Subjects to Generate" }), _jsxs("div", { className: "flex gap-2 text-sm", children: [_jsx("button", { className: "text-primary hover:underline", onClick: () => setSelectedBatchItems(batchDialogConfig.items.map(i => i.id)), children: "Select All" }), _jsx("span", { className: "text-muted-foreground", children: "|" }), _jsx("button", { className: "text-primary hover:underline", onClick: () => setSelectedBatchItems([]), children: "Deselect All" })] })] }), _jsx("div", { className: "border rounded-md max-h-[300px] overflow-y-auto p-4 space-y-3 bg-muted/20", children: batchDialogConfig.items.map((item) => (_jsxs("div", { className: "flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group", onClick: () => {
                                                        if (selectedBatchItems.includes(item.id)) {
                                                            setSelectedBatchItems(prev => prev.filter(id => id !== item.id));
                                                        }
                                                        else {
                                                            setSelectedBatchItems(prev => [...prev, item.id]);
                                                        }
                                                    }, children: [_jsx(Checkbox, { id: `item-${item.id}`, checked: selectedBatchItems.includes(item.id), onCheckedChange: (checked) => {
                                                                // Event handled by parent div logic, but we keep this for a11y
                                                            }, className: "mt-1" }), _jsxs("div", { className: "grid gap-1.5 leading-none w-full pointer-events-none group-hover:text-primary transition-colors", children: [_jsx("label", { htmlFor: `item-${item.id}`, className: "text-sm font-medium leading-none", children: item.subject }), _jsxs("p", { className: "text-xs text-muted-foreground line-clamp-1", children: [item.strand, ": ", item.subStrand] })] })] }, item.id))) }), _jsxs("div", { className: "bg-blue-50 text-blue-800 p-3 rounded-md text-xs flex items-center", children: [_jsx(AlertCircle, { className: "h-4 w-4 mr-2" }), _jsxs("span", { children: ["You are about to generate ", _jsx("strong", { children: selectedBatchItems.length }), " lesson notes."] })] })] })) }), _jsx("div", { className: "p-4 sm:p-6 pt-2 border-t mt-auto bg-background rounded-b-lg", children: _jsxs(DialogFooter, { className: "flex flex-col-reverse sm:flex-row sm:justify-between w-full gap-3 sm:gap-0", children: [_jsx("div", { className: "hidden sm:block flex-1" }), " ", _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 w-full sm:w-auto", children: [batchStep === 'config' ? (_jsx(Button, { variant: "outline", onClick: () => setBatchDialogConfig({ open: false, items: [] }), className: "w-full sm:w-auto", children: "Cancel" })) : (_jsxs(Button, { variant: "outline", onClick: () => setBatchStep('config'), className: "w-full sm:w-auto", children: [_jsx(ChevronDown, { className: "mr-2 h-4 w-4 rotate-90" }), "Back"] })), batchStep === 'config' ? (_jsxs(Button, { onClick: () => setBatchStep('review'), className: "w-full sm:w-auto", children: ["Next", _jsx(ChevronRight, { className: "ml-2 h-4 w-4" })] })) : (_jsxs(Button, { onClick: handleBatchGenerateConfirm, disabled: selectedBatchItems.length === 0, className: "bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto", children: ["Generate (", selectedBatchItems.length, ")"] }))] })] }) })] }) }), _jsx(Dialog, { open: showBatchSuccess, onOpenChange: setShowBatchSuccess, children: _jsxs(DialogContent, { className: "sm:max-w-md md:max-w-lg lg:max-w-xl h-auto border-2 border-green-500/50", children: [_jsxs(DialogHeader, { className: "text-center pb-6 border-b", children: [_jsx("div", { className: "mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4", children: _jsx(Check, { className: "h-6 w-6 text-green-600" }) }), _jsx(DialogTitle, { className: "text-2xl font-bold text-green-700", children: "Batch Generation Complete!" }), _jsxs(DialogDescription, { className: "text-base mt-2", children: ["Successfully generated ", batchResults.length, " out of ", batchProgress.total, " lesson notes."] })] }), _jsxs("div", { className: "py-6 space-y-4", children: [_jsxs("div", { className: "rounded-lg bg-muted p-4 space-y-2", children: [_jsx("h4", { className: "font-semibold text-sm text-muted-foreground uppercase tracking-wider", children: "Summary" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("span", { className: "text-2xl font-bold", children: batchResults.length }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Successful" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-2xl font-bold text-destructive", children: batchProgress.failures }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Failed" })] })] })] }), _jsx("p", { className: "text-sm text-center text-muted-foreground", children: "You can now download all your files in a single zip archive." })] }), _jsxs(DialogFooter, { className: "flex-col sm:flex-row gap-3", children: [_jsx(Button, { variant: "outline", className: "w-full sm:w-auto", onClick: () => setShowBatchSuccess(false), children: "Close" }), _jsxs(Button, { className: "w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white", onClick: handleDownloadAll, children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), "Download All (", batchResults.length, ")"] })] })] }) }), isLoading ? (_jsx(TableSkeleton, {})) : (_jsx("div", { className: "space-y-8", children: sortedGroupKeys.length === 0 ? (_jsx(Card, { className: "p-8 text-center text-muted-foreground bg-muted/20", children: "No scheme data found. Import or add data to get started." })) : (sortedGroupKeys.map(groupKey => {
                            const items = groupedData[groupKey];
                            const [className, weekName] = groupKey.split(' - ');
                            return (_jsxs(Card, { className: "p-4 md:p-6 bg-card/50 backdrop-blur-sm border-secondary/20 overflow-hidden", children: [_jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold", children: weekName }), _jsx("p", { className: "text-sm text-muted-foreground", children: className })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 w-full sm:w-auto", children: [_jsxs(Button, { variant: "destructive", size: "sm", onClick: () => handleDeleteGroup(items), className: "w-full sm:w-auto", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete Week"] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => selectGroupItems(items), className: "w-full sm:w-auto", children: "Select All" }), _jsxs(Button, { variant: "secondary", size: "sm", onClick: () => handleBatchGenerateClick(items), className: "w-full sm:w-auto", children: ["Generate Full Week (", items.length, ")"] })] })] }), _jsx("div", { className: "flex flex-col gap-3", children: items.map((item) => (_jsxs("div", { className: "group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-secondary/20 bg-background/40 hover:bg-secondary/10 transition-all shadow-sm", children: [_jsxs("div", { className: "flex items-start gap-3 w-full sm:w-auto", children: [_jsx(Checkbox, { checked: selectedBatchItems.includes(item.id), onCheckedChange: (checked) => toggleSelection(item.id), className: "mt-1" }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("div", { className: "font-semibold text-foreground/90", children: item.subject }), item.weekEnding && _jsxs("div", { className: "text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-secondary/30 w-fit px-2 py-0.5 rounded-full", children: ["Ends ", item.weekEnding] })] })] }), _jsxs("div", { className: "flex flex-col gap-1 w-full sm:w-2/4", children: [_jsx("span", { className: "font-medium text-sm text-foreground/80", children: item.strand }), _jsx("span", { className: "text-xs text-muted-foreground line-clamp-2", children: item.subStrand })] }), _jsxs("div", { className: "flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border/30 justify-end flex-row", children: [_jsxs(Button, { size: "sm", variant: "default", className: "shadow-sm rounded-full flex-1 sm:flex-none", onClick: () => handleGenerate(item), children: [_jsx(Play, { className: "h-4 w-4 mr-1.5" }), "Generate"] }), _jsxs(Button, { size: "sm", variant: "outline", className: "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full", onClick: () => handleDeleteItem(item.id), children: [_jsx(Trash2, { className: "h-4 w-4 mr-0 sm:mr-0" }), _jsx("span", { className: "sm:hidden ml-1.5", children: "Delete" })] })] })] }, item.id))) })] }, groupKey));
                        })) }))] })] }));
}
