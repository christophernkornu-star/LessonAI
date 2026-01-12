import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Play, Trash2, Save } from "lucide-react";
import { extractTextFromBrowserFile } from "@/services/fileParsingService";
import { parseSchemeOfLearning } from "@/services/aiService";
import { Navbar } from "@/components/Navbar";

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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSchemeData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved scheme", e);
      }
    }
  }, []);

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
          const updated = [...prev, ...parsed];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        toast({
          title: "Success",
          description: `Added ${parsed.length} rows to your scheme list.`,
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
    if (lines.length < 2) return [];

    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';
    
    // Parse headers to map columns dynamically
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => {
      if (h.includes('week') && h.includes('ending')) headerMap['weekEnding'] = i;
      else if (h.includes('week')) headerMap['week'] = i;
      else if (h.includes('term')) headerMap['term'] = i;
      else if (h.includes('subject')) headerMap['subject'] = i;
      else if (h.includes('class') || h.includes('level')) headerMap['classLevel'] = i;
      else if (h.includes('sub-strand') || h.includes('sub strand') || h === 'sub strand') headerMap['subStrand'] = i;
      else if (h.includes('strand')) headerMap['strand'] = i;
      else if (h.includes('content') || h.includes('standard')) headerMap['contentStandard'] = i;
      else if ((h.includes('indicator') || h.includes('learning')) && !h.includes('exemplar')) headerMap['indicators'] = i;
      else if (h.includes('exemplar')) headerMap['exemplars'] = i;
      else if (h.includes('resource')) headerMap['resources'] = i;
    });

    const items: SchemeItem[] = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      let row: string[] = [];
      
      // Split respecting quotes
      if (delimiter === ',') {
         row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
      } else {
         row = lines[i].split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
      }
      
      if (row.length <= 1 && !row[0]) continue; 

      // Use header mapping if available, otherwise fallback to index
      if (Object.keys(headerMap).length > 0) {
        items.push({
          id: `scheme-${Date.now()}-${i}`,
          week: row[headerMap['week']] || "",
          weekEnding: row[headerMap['weekEnding']] || "",
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
        // Note: If the user's CSV doesn't have exemplars column, this might shift resources. 
        // But standard template usually has 10 columns now.
        
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

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the current scheme?")) {
      setSchemeData([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Scheme of Learning</h1>
            <p className="text-muted-foreground">Upload your termly scheme to automate lesson generation.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            {schemeData.length > 0 && (
              <Button variant="destructive" onClick={handleClear}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Scheme
              </Button>
            )}
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Upload Scheme (CSV, PDF, DOCX)</Label>
              <div className="flex gap-4 items-center">
                <Input 
                  type="file" 
                  accept=".csv,.pdf,.docx,.doc" 
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="max-w-md"
                />
                <Button variant="outline" onClick={() => window.open('/scheme-template.csv', '_blank')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: Week, Week Ending, Term, Subject, Class, Strand, Sub-Strand, Content Standard, Indicators, Resources
              </p>
            </div>
          </div>
        </Card>

        {schemeData.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Week Ending</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Strand / Sub-Strand</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemeData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.week}</TableCell>
                      <TableCell>{item.weekEnding}</TableCell>
                      <TableCell>{item.term}</TableCell>
                      <TableCell>{item.subject}</TableCell>
                      <TableCell>{item.classLevel}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
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
      </main>
    </div>
  );
}
