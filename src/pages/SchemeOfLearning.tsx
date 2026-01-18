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
import { Upload, FileText, Play, Trash2, Save, Download, Globe } from "lucide-react";
import { extractTextFromBrowserFile } from "@/services/fileParsingService";
import { parseSchemeOfLearning } from "@/services/aiService";
import { Navbar } from "@/components/Navbar";
import { CurriculumService } from "@/services/curriculumService";
import { SUBJECTS, CLASS_LEVELS } from "@/data/curriculum";
import { supabase } from "@/integrations/supabase/client";

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
  const [isLoading, setIsLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLevel, setImportLevel] = useState("");
  const [importSubject, setImportSubject] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (!user) return;

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
          try {
             // Optional: You could auto-migrate here, but let's just load for now
             setSchemeData(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to load saved scheme", e);
          }
        }
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
     // The upload handler filters duplicates already.
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
        // Fallback to standard order: Week, Week Ending, Term, Subject, Class, Strand, SubStrand, Content Standard, Indicators, Exemplars, Resources
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Scheme of Learning</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Upload your termly scheme to automate lesson generation.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1 sm:flex-none">
              Back to Dashboard
            </Button>
            {schemeData.length > 0 && (
              <Button variant="destructive" onClick={handleClear} className="flex-1 sm:flex-none">
                <Trash2 className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Clear Scheme</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            )}
          </div>
        </div>

        <Card className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Upload Scheme (CSV, PDF, DOCX)</Label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                <Input 
                  type="file" 
                  accept=".csv,.pdf,.docx,.doc" 
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="w-full sm:max-w-md"
                />
                <Button variant="outline" onClick={() => window.open('/scheme-template.csv', '_blank')} className="w-full sm:w-auto">
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="sm:hidden">Template</span>
                  <span className="hidden sm:inline">Download Template</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: Week, Week Ending, Term, Subject, Class, Strand, Sub-Strand, Content Standard, Indicators, Resources
              </p>
            </div>
            
            <div className="flex gap-4 items-center pl-0 sm:pl-4 border-l-0 sm:border-l">
                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full sm:w-auto">
                            <Globe className="mr-2 h-4 w-4" />
                            Import from System
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Import System Curriculum</DialogTitle>
                            <DialogDescription>
                                Select a class and subject to load standard curriculum data into your scheme.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="class" className="text-right">Class</Label>
                                <Select onValueChange={setImportLevel} value={importLevel}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select Class Level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLASS_LEVELS.map((level) => (
                                            <SelectItem key={level.value} value={level.label}>{level.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="subject" className="text-right">Subject</Label>
                                <Select onValueChange={setImportSubject} value={importSubject}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUBJECTS.map((subject) => (
                                            <SelectItem key={subject.value} value={subject.label}>{subject.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSystemImport} disabled={isLoading}>
                                {isLoading ? "Loading..." : "Import Data"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </Card>

        {schemeData.length > 0 && (
          <div className="space-y-8">
            {Object.entries(
              schemeData.reduce((acc, item) => {
                const cls = item.classLevel || "Unspecified Class";
                if (!acc[cls]) acc[cls] = [];
                acc[cls].push(item);
                return acc;
              }, {} as Record<string, SchemeItem[]>)
            ).sort((a, b) => {
              // Try to sort naturally (e.g. Basic 2 before Basic 10)
              return a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });
            }).map(([className, classItems]) => {
              
              // Group by Subject within this class
              const subjectGroups = classItems.reduce((acc, item) => {
                 const subj = item.subject || "Unspecified Subject";
                 if (!acc[subj]) acc[subj] = [];
                 acc[subj].push(item);
                 return acc;
              }, {} as Record<string, SchemeItem[]>);

              return (
                <Card key={className} className="overflow-hidden border-t-4 border-t-primary">
                  <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground">{className}</h2>
                      <span className="text-sm text-muted-foreground bg-background px-2 py-1 rounded border">
                        {classItems.length} entries
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteClass(className)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Class
                    </Button>
                  </div>
                  
                  <div className="divide-y">
                    {Object.entries(subjectGroups).map(([subjectName, subjectItems]) => (
                      <div key={subjectName} className="p-0">
                        <div className="bg-muted/10 px-4 py-2 flex justify-between items-center">
                           <h3 className="font-semibold text-primary">{subjectName}</h3>
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteSubject(className, subjectName)}
                              className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Remove Subject
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
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
                              {subjectItems.map((item) => (
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
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
