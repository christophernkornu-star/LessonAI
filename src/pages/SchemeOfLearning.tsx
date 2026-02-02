import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, BookOpen, Calendar, Download, Globe, Play, Search, Sparkles, MapPin } from "lucide-react";
import { extractTextFromBrowserFile } from "@/services/fileParsingService";
import { parseSchemeOfLearning, generateLessonNote, type LessonData } from "@/services/aiService";
import { Navbar } from "@/components/Navbar";
import { CurriculumService } from "@/services/curriculumService";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import { LessonNotesService } from "@/services/lessonNotesService";
import { deductPayment } from "@/services/paymentService";
import { lessonTemplates } from "@/data/lessonTemplates";
import { Progress } from "@/components/ui/progress";
import { TimetableService } from "@/services/timetableService";
import * as PizZipUtils from "pizzip/utils/index.js";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { generateGhanaLessonDocx, generateGhanaLessonFileName } from "@/services/ghanaLessonDocxService";
import { Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SchemeItem {
  id: string;
  week: string;
  weekEnding?: string;
  term: string;
  subject: string;
  classLevel: string;
  strand: string;
  subStrand: string;
  contentStandard: string;
  indicators: string;
  exemplars: string;
  resources: string;
}

const STORAGE_KEY = "scheme_of_learning_data";

export default function SchemeOfLearning() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schemeData, setSchemeData] = useState<SchemeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as true for initial fetch
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLevel, setImportLevel] = useState("");
  const [importSubject, setImportSubject] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, successes: 0, failures: 0 });
  const [batchDialogConfig, setBatchDialogConfig] = useState<{ open: boolean; items: SchemeItem[] }>({ open: false, items: [] });
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
  });
  const [batchResults, setBatchResults] = useState<{data: LessonData, content: string, id: string}[]>([]);
  const [showBatchSuccess, setShowBatchSuccess] = useState(false);
  const [batchStep, setBatchStep] = useState<'config' | 'review'>('config');
  const [selectedBatchItems, setSelectedBatchItems] = useState<string[]>([]);

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
            const loadedSchemes: SchemeItem[] = data.map(item => ({
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
          } else {
            // Fallback to localStorage if DB is empty (migration scenario)
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                // Optional: You could auto-migrate here, but let's just load for now
                setSchemeData(JSON.parse(saved));
            }
          }
      } catch (e) {
         console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const saveToSupabase = async (items: SchemeItem[]) => {
     if (!userId) return;
     
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
    if (!importLevel || !importSubject) {
        toast({ title: "Validation Error", description: "Please select both Class Level and Subject", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const curriculum = await CurriculumService.getCurriculumByGradeAndSubject(importLevel, importSubject, user?.id);
        
        if (curriculum.length === 0) {
            toast({ 
                title: "No Data Found", 
                description: `No curriculum data found for ${importSubject} - ${importLevel} in the system database.`, 
                variant: "destructive" 
            });
            setIsLoading(false);
            return;
        }

        const newItems: SchemeItem[] = curriculum.map((item, index) => ({
            id: `sys-${Date.now()}-${index}`,
            week: `Week ${index + 1}`, // Auto assign weeks sequentially
            weekEnding: "",
            term: "First Term", // Default
            subject: importSubject, // Use label if possible, but we stored values. Let's start with what we have.
            classLevel: importLevel,
            strand: item.strand || "General",
            subStrand: item.sub_strand || "",
            contentStandard: Array.isArray(item.content_standards) ? item.content_standards.join("; ") : (item.content_standards || ""),
            indicators: Array.isArray(item.learning_indicators) ? item.learning_indicators.join("; ") : (item.learning_indicators || ""),
            exemplars: item.exemplars || "",
            resources: ""
        }));

        setSchemeData(prev => {
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
                    if (error) console.error("Failed to sync to DB:", error);
                });
            }
            
            return updated;
        });

        toast({ title: "Import Successful", description: `Loaded ${newItems.length} items from system curriculum.` });
        setImportDialogOpen(false);

    } catch (error) {
        console.error("Import error:", error);
        toast({ title: "Import Failed", description: "Could not load curriculum data.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await extractTextFromBrowserFile(file);
      let parsed: SchemeItem[] = [];

      if (file.name.endsWith('.csv')) {
        parsed = parseCSV(text);
      } else {
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
      } else {
        setSchemeData(prev => {
          // Deduplication Logic
          const existingSignatures = new Set(
            prev.map(item => `${item.classLevel}|${item.subject}|${item.term}|${item.week}`)
          );
          
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
                    if (error) console.error("Failed to sync to DB:", error);
                });
            }
          
          if (skippedCount > 0) {
            toast({
              title: "Import Success",
              description: `Added ${newItems.length} rows. Skipped ${skippedCount} duplicates.`,
            });
          } else {
            toast({
              title: "Success",
              description: `Added ${parsed.length} rows to your scheme list.`,
            });
          }
          
          return updated;
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to process file.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const parseCSV = (text: string): SchemeItem[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 1) return [];

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

    let headerMap: Record<string, number> = {};
    let startIndex = 0;

    if (hasHeader) {
      startIndex = 1;
      const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      headers.forEach((h, i) => {
        if (h.includes('week') && h.includes('ending')) headerMap['weekEnding'] = i;
        else if (h.includes('week')) headerMap['week'] = i;
        else if (h.includes('term')) headerMap['term'] = i;
        else if (h.includes('subject')) headerMap['subject'] = i;
        else if (h.includes('class') || h.includes('level') || h.includes('basic')) headerMap['classLevel'] = i;
        else if (h.includes('sub-strand') || h.includes('sub strand') || h === 'sub strand') headerMap['subStrand'] = i;
        else if (h.includes('strand')) headerMap['strand'] = i;
        else if (h.includes('content') || h.includes('standard')) headerMap['contentStandard'] = i;
        else if ((h.includes('indicator') || h.includes('learning')) && !h.includes('exemplar')) headerMap['indicators'] = i;
        else if (h.includes('exemplar')) headerMap['exemplars'] = i;
        else if (h.includes('resource') || h.includes('material')) headerMap['resources'] = i;
      });
    }

    const items: SchemeItem[] = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      let row: string[] = [];
      
      // Split respecting quotes
      if (delimiter === ',') {
         row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
      } else {
         row = lines[i].split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
      }
      
      if (row.length <= 1 && !row[0]) continue; 

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
      } else {
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
    const groupedItems = new Map<string, SchemeItem>();
    
    // Helper to join unique strings using Set to ensure no data loss but clean duplication
    const mergeFields = (existing: string, incoming: string, separator: string = "\n") => {
      if (!incoming) return existing;
      if (!existing) return incoming;
      
      const distinctValues = new Set<string>();
      
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
    const mergeResources = (r1: string, r2: string) => {
      if (!r1) return r2;
      if (!r2) return r1;
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
      } else {
        const existing = groupedItems.get(key)!;
        
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

  const handleGenerate = (item: SchemeItem) => {
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
          resources: item.resources
        }
      } 
    });
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear the current scheme?")) {
      setSchemeData([]);
      localStorage.removeItem(STORAGE_KEY);
      
      if (userId) {
          const { error } = await supabase.from('schemes').delete().eq('user_id', userId);
          if (error) console.error("Failed to clear DB:", error);
      }
    }
  };

  const handleDeleteClass = async (className: string) => {
    if (confirm(`Are you sure you want to delete ALL schemes for ${className}? This action cannot be undone.`)) {
      setSchemeData(prev => {
        const updated = prev.filter(item => item.classLevel !== className);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      
      if (userId) {
          const { error } = await supabase.from('schemes').delete().eq('user_id', userId).eq('class_level', className);
          if (error) console.error("Failed to delete class from DB:", error);
      }
      
      toast({ title: "Class Deleted", description: `Removed all data for ${className}` });
    }
  };

  const handleDeleteSubject = async (className: string, subjectName: string) => {
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
            
          if (error) console.error("Failed to delete subject from DB:", error);
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

  const getWeekNumber = (weekStr: string) => {
    const match = weekStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 999;
  };

  const filteredSchemeData = useMemo(() => {
    return schemeData.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.subject?.toLowerCase().includes(searchLower) ||
        item.classLevel?.toLowerCase().includes(searchLower) ||
        item.strand?.toLowerCase().includes(searchLower) ||
        item.subStrand?.toLowerCase().includes(searchLower) ||
        item.term?.toString().toLowerCase().includes(searchLower) ||
        item.week?.toString().toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => {
       // Sort by Class Level first (optional but good)
       if (a.classLevel < b.classLevel) return -1;
       if (a.classLevel > b.classLevel) return 1;
       
       // Then by Week Number
       return getWeekNumber(a.week) - getWeekNumber(b.week);
    });
  }, [schemeData, searchTerm]);

  // Group by Week + Class for Batch Display
  const groupedData = useMemo(() => {
    return filteredSchemeData.reduce((acc, item) => {
      const key = `${item.classLevel} - ${item.week}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof schemeData>);
  }, [filteredSchemeData]);

  // Helper to get consistent sorting for groups
  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedData).sort((keyA, keyB) => {
       const [classA, weekA] = keyA.split(' - ');
       const [classB, weekB] = keyB.split(' - ');
       
       if (classA !== classB) return classA.localeCompare(classB);
       return getWeekNumber(weekA) - getWeekNumber(weekB);
    });
  }, [groupedData]);
  


  const handleBatchGenerateClick = async (items: typeof schemeData) => {
      // Pre-fill from the first item if possible (term/weekEnding)
      const first = items[0];
      
      // Normalize Class Level (Label -> Value)
      // e.g. "Basic 1" -> "basic1"
      let normalizedClassLevel = first.classLevel || "";
      const matchedLevel = CLASS_LEVELS.find(l => 
          l.label.toLowerCase() === normalizedClassLevel.toLowerCase() || 
          l.value.toLowerCase() === normalizedClassLevel.toLowerCase()
      );
      if (matchedLevel) normalizedClassLevel = matchedLevel.value;

      // Format Date (DD/MM/YYYY -> YYYY-MM-DD or other formats)
      const formatDateForInput = (dateStr?: string) => {
          if (!dateStr) return "";
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
      } catch (err) {
         console.warn("Could not fetch timetable for class size:", err);
      }

      setBatchFormData(prev => ({
          ...prev,
          weekEnding: weekEndingFormatted || prev.weekEnding,
          term: first.term || prev.term,
          weekNumber: first.week || prev.weekNumber || "Week 1",
          classLevel: normalizedClassLevel || prev.classLevel || "",
          classSize: fetchedClassSize || prev.classSize,
          date: startDateStr
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
      let timetableMap: Record<string, { frequency: number, days: string[] }> = {}; 
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
              
              if (timetable) console.log(`Found fallback timetable: ${timetable.class_level} - ${timetable.term}`);
          }

          if (timetable && timetable.class_size) {
              fetchedClassSize = timetable.class_size.toString();
          }

          if (timetable && timetable.subject_config) {
             Object.entries(timetable.subject_config).forEach(([sub, config]) => {
                  timetableMap[sub.toLowerCase()] = {
                      frequency: (config as any).frequency || 1,
                      days: (config as any).days || []
                  };
             });
          } else {
             console.warn("No compatible timetable found. Defaulting to 1 lesson per subject.");
          }
      } catch (err) {
          console.warn("Could not fetch timetable for batch context:", err);
      }

      // Process queue with concurrency limit of 3
      const CONCURRENCY_LIMIT = 3;
      let activePromises: Promise<void>[] = [];
      let nextItemIndex = 0;
      
      const processItem = async (index: number) => {
          const item = items[index];
          try {
              // Update status - keep it simple, just increment processed
              // (Cannot update current index strictly in order due to async)
              
              // Get Lessons count from Timetable
              const subjectKey = item.subject.toLowerCase();
              let numLessons = 1; // Default
              let scheduledDays: string[] = [];

              // Helper for lookup
              const getTimetableInfo = (key: string) => {
                  if (timetableMap[key]) return timetableMap[key];
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

              const lessonData: LessonData = {
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
                  detailLevel: "moderate", 
                  // ... rest unrelated fields
                  includeDiagrams: false, previousKnowledge: "", references: "", keywords: "",
                  teacherActivities: "", learnerActivities: "", evaluation: "", assignment: "",
                  remarks: "", teachingPhilosophy: "balanced", differentiation: "", assessment: "",
                  reflection: "", gradeLevel: item.classLevel, unit: "", content: "",
                  methodology: "", materials: "", objectives: "", lesson: 1, 
                  location: batchFormData.location || "",
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

          } catch (error) {
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
          } else {
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
      if (batchResults.length === 0) return;

      toast({ title: "Preparing Download", description: "Zipping files..." });
      
      try {
          const zip = new PizZip();
          
          // Generate all docs
          for (const result of batchResults) {
            let finalData: any;
            
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
                    finalData = finalData.map((lesson: any) => ({
                        ...lesson,
                        weekEnding: lesson.weekEnding || result.data.weekEnding,
                        class: lesson.class || result.data.level,
                        subject: lesson.subject || result.data.subject,
                        weekNumber: lesson.weekNumber || result.data.weekNumber,
                    }));
                } else {
                    // Merge critical metadata from result.data if missing in AI response
                    finalData.weekEnding = finalData.weekEnding || result.data.weekEnding;
                    finalData.class = finalData.class || result.data.level;
                    finalData.subject = finalData.subject || result.data.subject;
                    finalData.weekNumber = finalData.weekNumber || result.data.weekNumber;
                }
                
            } catch (e) {
                // Fallback: Construct object wrapping the raw content
                const phases = {
                    phase1_starter: { duration: "10 mins", learnerActivities: "", resources: "" },
                    phase2_newLearning: { duration: "40 mins", learnerActivities: result.content, resources: "" },
                    phase3_reflection: { duration: "10 mins", learnerActivities: "", resources: "" }
                };
                
                finalData = {
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
            const blob = await generateGhanaLessonDocx(finalData, uniqueName, true); 
            
            if (blob && blob instanceof Blob) {
                const arrayBuffer = await blob.arrayBuffer();
                zip.file(uniqueName, arrayBuffer);
            } else {
                console.error("Failed to generate blob for", uniqueName);
            }
          }
          
          const content = zip.generate({ type: "blob" });
          
          // Generate meaningful zip filename: Class_Week (e.g. BS1_WK1.zip)
          let zipName = `Batch_Lesson_Notes_${new Date().toISOString().split('T')[0]}.zip`; // Fallback
          
          if (batchResults.length > 0) {
             const firstItem = batchResults[0].data;
             // Helper to clean strings
             const clean = (s: string) => (s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
             
             // Get Class Abbreviation (Basic 1 -> BS1, KG 1 -> KG1)
             let classAbbr = clean(firstItem.level || "");
             if (classAbbr.startsWith("BASIC")) classAbbr = classAbbr.replace("BASIC", "BS");
             if (classAbbr.startsWith("BS") && !classAbbr.startsWith("BS")) classAbbr = "BS" + classAbbr.replace("B", "");

             // Get Week Abbreviation (Week 1 -> WK1)
             let weekVal = clean(firstItem.weekNumber || "");
             if (weekVal.includes("WEEK")) weekVal = weekVal.replace("WEEK", "WK");
             else if (/^\d+$/.test(weekVal)) weekVal = "WK" + weekVal;
             
             if (classAbbr && weekVal) {
                 zipName = `${classAbbr}_${weekVal}.zip`;
             }
          }

          saveAs(content, zipName);
          toast({ title: "Download Complete", description: "Your files have been downloaded." });
          
      } catch (e) {
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

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use OpenStreetMap N
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
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
          } else {
             const coordString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
             setBatchFormData(prev => ({ ...prev, location: coordString }));
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

  const handleDeleteGroup = (items: SchemeItem[]) => {
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

  const handleDeleteItem = (id: string) => {
      if (confirm("Delete this item?")) {
          setSchemeData(prev => {
              const newData = prev.filter(item => item.id !== id);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
              return newData;
          });
          toast({ title: "Deleted", description: "Item deleted." });
      }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Scheme of Learning</h1>
            <p className="text-muted-foreground">Manage and view your weekly schemes.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search class, subject, strand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1 sm:flex-none">
              Back to Dashboard
            </Button>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="flex-1 sm:flex-none">
                  <Upload className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Import Scheme</span>
                  <span className="sm:hidden">Import</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Import Scheme of Learning</DialogTitle>
                  <DialogDescription>
                    Upload a file or import from the system curriculum.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Option A: Upload File</Label>
                    <p className="text-sm text-muted-foreground">Supports CSV, PDF, DOCX with columns/fields for Week, Strand, Sub-strand, Content Standard, Indicators.</p>
                     <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="scheme-upload">Choose File</Label>
                        <Input id="scheme-upload" type="file" onChange={handleFileUpload} accept=".csv,.xlsx,.xls,.docx,.pdf,.txt" />
                     </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or Import System Data</span>
                    </div>
                  </div>

                 <div className="space-y-2">
                    <Label className="font-semibold">Option B: Generate from Database</Label>
                     <div className="grid gap-2">
                        <Select onValueChange={setImportLevel} value={importLevel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Class Level" />
                            </SelectTrigger>
                            <SelectContent>
                                {CLASS_LEVELS.map(level => (
                                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select onValueChange={setImportSubject} value={importSubject}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {SUBJECTS
                                    .filter(s => {
                                        if (importLevel === 'kg1' || importLevel === 'kg2') return s.value === 'language_literacy' || s.value === 'numeracy' || s.value === 'our_world_our_people' || s.value === 'creative_arts';
                                        return true;
                                    })
                                    .map(subject => (
                                    <SelectItem key={subject.value} value={subject.label}>{subject.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSystemImport} disabled={isLoading || !importLevel || !importSubject}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                            Load Standard Curriculum
                        </Button>
                     </div>
                 </div>
                </div>
              </DialogContent>
            </Dialog>
            {schemeData.length > 0 && (
              <>
                <Button variant="outline" onClick={handleDownloadCSV} className="flex-1 sm:flex-none">
                  <Download className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </Button>
                <Button variant="destructive" onClick={handleClear} className="flex-1 sm:flex-none">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Clear Scheme</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {isBatchGenerating && (
            <Card className="mb-6 p-4 border-primary/20 bg-primary/5">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Generating Batch Compliance...</span>
                        <span>{batchProgress.current} / {batchProgress.total}</span>
                    </div>
                    <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">Please do not close this window. Processing lesson notes sequentially...</p>
                </div>
            </Card>
        )}

        <Dialog open={batchDialogConfig.open} onOpenChange={(open) => !open && setBatchDialogConfig({ open: false, items: [] })}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                    <DialogHeader>
                        <DialogTitle>Create Your Lesson Note</DialogTitle>
                        <DialogDescription>
                            Follow the steps below to generate a professional lesson note
                        </DialogDescription>
                    </DialogHeader>

                     {/* Stepper Visual Mock */}
                    <div className="flex items-center justify-between px-4 sm:px-8 py-4 mb-4">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${batchStep === 'config' ? 'bg-primary text-primary-foreground' : 'bg-green-600 text-white'}`}>
                                {batchStep === 'review' ? <Check className="h-4 w-4" /> : '1'}
                            </div>
                            <span className="text-xs font-medium">Basic Info</span>
                        </div>
                        <div className={`h-[2px] w-16 sm:w-24 ${batchStep === 'review' ? 'bg-green-600' : 'bg-muted'}`} />
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${batchStep === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
                            <span className="text-xs font-medium">Review</span>
                        </div>
                    </div>

                    <div className="min-h-[300px] py-4">
                     {batchStep === 'config' ? (
                         <div className="space-y-4">
                            {/* Class Level - Read Only */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Class Level *</Label>
                                     <Select 
                                        value={batchFormData.classLevel} 
                                        onValueChange={(val) => setBatchFormData({...batchFormData, classLevel: val})}
                                     >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CLASS_LEVELS.map(level => (
                                                <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                     </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Class Size</Label>
                                     <Input 
                                        type="number"
                                        placeholder="Auto from Timetable"
                                        value={batchFormData.classSize}
                                        onChange={(e) => setBatchFormData({...batchFormData, classSize: e.target.value})} 
                                     />
                                </div>
                            </div>
                            
                            {/* Location */}
                            <div className="space-y-2">
                                <Label>School Location (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        value={batchFormData.location} 
                                        onChange={(e) => setBatchFormData({...batchFormData, location: e.target.value})} 
                                        placeholder="e.g. Biriwa, Central Region"
                                        className="flex-1"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="icon"
                                        onClick={handleLocationDetect}
                                        title="Detect Location"
                                    >
                                        <MapPin className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Helps generate examples relevant to your students' immediate environment.</p>
                            </div>

                            {/* Term & Week */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Term</Label>
                                     <Select 
                                        value={batchFormData.term} 
                                        onValueChange={(val) => setBatchFormData({...batchFormData, term: val})}
                                     >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="First Term">First Term</SelectItem>
                                            <SelectItem value="Second Term">Second Term</SelectItem>
                                            <SelectItem value="Third Term">Third Term</SelectItem>
                                        </SelectContent>
                                     </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Week Number</Label>
                                    <Input 
                                        value={batchFormData.weekNumber} 
                                        onChange={(e) => setBatchFormData({...batchFormData, weekNumber: e.target.value})} 
                                        placeholder="Week X"
                                    />
                                </div>
                            </div>

                            {/* Week Ending */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Week Ending</Label>
                                    <Input 
                                        type="date"
                                        value={batchFormData.weekEnding} 
                                        onChange={(e) => setBatchFormData({...batchFormData, weekEnding: e.target.value})} 
                                    />
                                </div>
                                {/* Hidden Placeholder for layout balance if needed, or Date/Time */}
                                <div className="space-y-2">
                                   <Label>Teaching Date (Start)</Label>
                                    <Input 
                                        type="date" 
                                        value={batchFormData.date} 
                                        onChange={(e) => setBatchFormData({...batchFormData, date: e.target.value})} 
                                    />
                                </div>
                            </div>
                         </div>
                     ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                                <Label className="text-base font-semibold">Select Subjects to Generate</Label>
                                <div className="flex gap-2 text-sm">
                                    <button 
                                        className="text-primary hover:underline"
                                        onClick={() => setSelectedBatchItems(batchDialogConfig.items.map(i => i.id))}
                                    >
                                        Select All
                                    </button>
                                    <span className="text-muted-foreground">|</span>
                                    <button 
                                        className="text-primary hover:underline"
                                        onClick={() => setSelectedBatchItems([])}
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>
                            
                            <div className="border rounded-md max-h-[300px] overflow-y-auto p-4 space-y-3 bg-muted/20">
                                {batchDialogConfig.items.map((item) => (
                                    <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <Checkbox 
                                            id={`item-${item.id}`} 
                                            checked={selectedBatchItems.includes(item.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedBatchItems(prev => [...prev, item.id]);
                                                } else {
                                                    setSelectedBatchItems(prev => prev.filter(id => id !== item.id));
                                                }
                                            }}
                                        />
                                        <div className="grid gap-1.5 leading-none w-full">
                                            <label
                                                htmlFor={`item-${item.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {item.subject}
                                            </label>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {item.strand}: {item.subStrand}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                <span>You are about to generate <strong>{selectedBatchItems.length}</strong> lesson notes.</span>
                            </div>
                        </div>
                     )}
                    </div>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between w-full gap-3 sm:gap-0">
                         <div className="hidden sm:block flex-1"></div> {/* Spacer */}
                         <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {batchStep === 'config' ? (
                                <Button variant="outline" onClick={() => setBatchDialogConfig({ open: false, items: [] })} className="w-full sm:w-auto">
                                    Cancel
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={() => setBatchStep('config')} className="w-full sm:w-auto">
                                    <ChevronDown className="mr-2 h-4 w-4 rotate-90" />
                                    Back
                                </Button>
                            )}
                            
                            {batchStep === 'config' ? (
                                <Button onClick={() => setBatchStep('review')} className="w-full sm:w-auto">
                                    Next
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button onClick={handleBatchGenerateConfirm} disabled={selectedBatchItems.length === 0} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate ({selectedBatchItems.length})
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showBatchSuccess} onOpenChange={setShowBatchSuccess}>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl h-auto border-2 border-green-500/50">
                    <DialogHeader className="text-center pb-6 border-b">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-green-700">Batch Generation Complete!</DialogTitle>
                        <DialogDescription className="text-base mt-2">
                             Successfully generated {batchResults.length} out of {batchProgress.total} lesson notes.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-6 space-y-4">
                        <div className="rounded-lg bg-muted p-4 space-y-2">
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Summary</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-2xl font-bold">{batchResults.length}</span>
                                    <p className="text-xs text-muted-foreground">Successful</p>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold text-destructive">{batchProgress.failures}</span>
                                    <p className="text-xs text-muted-foreground">Failed</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-center text-muted-foreground">
                            You can now download all your files in a single zip archive.
                        </p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowBatchSuccess(false)}>
                            Close
                        </Button>
                        <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" onClick={handleDownloadAll}>
                            <Download className="mr-2 h-4 w-4" />
                            Download All ({batchResults.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
        {isLoading ? (
            <TableSkeleton />
        ) : (
            <div className="space-y-8">
                {sortedGroupKeys.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground bg-muted/20">
                        No scheme data found. Import or add data to get started.
                    </Card>
                ) : (
                    sortedGroupKeys.map(groupKey => {
                        const items = groupedData[groupKey];
                        const [className, weekName] = groupKey.split(' - ');
                        
                        return (
                            <Card key={groupKey} className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-secondary/20 overflow-hidden">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                    <div>
                                        <h3 className="text-lg font-semibold">{weekName}</h3>
                                        <p className="text-sm text-muted-foreground">{className}</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            onClick={() => handleDeleteGroup(items)}
                                            className="w-full sm:w-auto"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Week
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            onClick={() => handleBatchGenerateClick(items)}
                                            className="w-full sm:w-auto"
                                        >
                                            <Sparkles className="mr-2 h-4 w-4 text-primary" />
                                            Generate Full Week ({items.length})
                                        </Button>
                                    </div>
                                </div>
                                <div className="rounded-md border bg-background/50 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[150px]">Subject</TableHead>
                                            <TableHead>Strand / Sub-Strand</TableHead>
                                            <TableHead className="hidden md:table-cell">Standard</TableHead>
                                            <TableHead className="w-[100px]">Action</TableHead>
                                        </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {items.map((item) => (
                                            <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.subject}
                                                {item.weekEnding && <div className="text-xs text-muted-foreground mt-1">Ends: {item.weekEnding}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                <span className="font-medium text-sm">{item.strand}</span>
                                                <span className="text-xs text-muted-foreground">{item.subStrand}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <span className="text-xs line-clamp-2" title={item.contentStandard}>
                                                    {item.contentStandard}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => handleGenerate(item)}>
                                                        <Play className="h-4 w-4" />
                                                        <span className="sr-only">Generate</span>
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteItem(item.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        )}
      </div>
    </div>
  );
}
