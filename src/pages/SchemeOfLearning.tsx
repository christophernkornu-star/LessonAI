import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, BookOpen, Calendar, Download, Globe, Play } from "lucide-react";
import { extractTextFromBrowserFile } from "@/services/fileParsingService";
import { parseSchemeOfLearning } from "@/services/aiService";
import { Navbar } from "@/components/Navbar";
import { CurriculumService } from "@/services/curriculumService";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/LoadingSkeletons";

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Scheme of Learning</h1>
            <p className="text-muted-foreground">Manage and view your weekly schemes.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1 sm:flex-none">
              Back to Dashboard
            </Button>
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

        {isLoading ? (
            <TableSkeleton />
        ) : (
            <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-secondary/20">
                 <div className="rounded-md border">
                    <Table>
                    <TableHeader>
                              <TableRow>
                                <TableHead className="w-[80px]">Week</TableHead>
                                <TableHead className="w-[100px]">Ending</TableHead>
                                <TableHead className="w-[100px]">Term</TableHead>
                                <TableHead>Strand / Sub-Strand</TableHead>
                                <TableHead className="w-[100px]">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schemeData.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium bg-muted/5">{item.week}</TableCell>
                                  <TableCell>{item.weekEnding}</TableCell>
                                  <TableCell>{item.term}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-medium">{item.strand}</span>
                                      <span className="text-xs text-muted-foreground">{item.subStrand}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button size="sm" onClick={() => handleGenerate(item)}>
                                      <Play className="mr-2 h-4 w-4" />
                                      Generate
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                    </Table>
                 </div>
            </Card>
        )}
      </div>
    </div>
  );
}
