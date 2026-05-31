import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CurriculumService } from "@/services/curriculumService";
import { Upload, Plus, Trash2, FileJson, FileText, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractCurriculumFromText } from "@/services/aiService";
import { extractTextFromBrowserFile } from "@/services/fileParsingService";
import { checkIsAdmin } from "@/services/adminService";
import { CLASS_LEVELS } from "@/data/curriculum";
import { Navbar } from "@/components/Navbar";
export default function CurriculumUpload() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [extractedQueue, setExtractedQueue] = useState([]);
    const [activeTab, setActiveTab] = useState("manual");
    const [formData, setFormData] = useState({
        curriculum_name: "",
        grade_level: "",
        subject: "",
        strand: "",
        sub_strand: "",
        content_standards: [""],
        learning_indicators: [""],
        exemplars: "",
        is_public: false,
    });
    const [userCurriculum, setUserCurriculum] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const fetchUserCurriculum = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const data = await CurriculumService.getUserCurriculum(user.id);
                setUserCurriculum(data);
            }
        };
        fetchUserCurriculum();
    }, []);
    useEffect(() => {
        const checkAdmin = async () => {
            // Check authentication first
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate("/login");
                return;
            }
            const adminStatus = await checkIsAdmin();
            setIsAdmin(adminStatus);
            if (!adminStatus) {
                toast({
                    title: "Access Restricted",
                    description: "Curriculum upload is restricted to administrators only.",
                    variant: "destructive"
                });
                navigate("/dashboard");
                return;
            }
            // If admin, default to public
            if (adminStatus) {
                setFormData(prev => ({ ...prev, is_public: true }));
            }
        };
        checkAdmin();
    }, []);
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setIsProcessingFile(true);
        try {
            toast({
                title: "Reading file...",
                description: "Extracting text from document.",
            });
            const text = await extractTextFromBrowserFile(file);
            toast({
                title: "Analyzing...",
                description: "AI is identifying curriculum structure. This may take a moment.",
            });
            const extractedData = await extractCurriculumFromText(text);
            if (extractedData && extractedData.length > 0) {
                setExtractedQueue(extractedData);
                loadItemIntoForm(extractedData[0]);
                setActiveTab("manual"); // Switch to manual tab to review
                toast({
                    title: "Extraction Complete",
                    description: `Found ${extractedData.length} curriculum units. Please review the first one.`,
                });
            }
            else {
                toast({
                    title: "No Data Found",
                    description: "Could not identify structured curriculum data in this file.",
                    variant: "destructive",
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
            setIsProcessingFile(false);
            // Reset input
            e.target.value = "";
        }
    };
    const loadItemIntoForm = (item) => {
        setFormData({
            curriculum_name: formData.curriculum_name || "", // Keep existing name if set
            grade_level: item.grade_level || formData.grade_level,
            subject: item.subject || formData.subject,
            strand: item.strand || "",
            sub_strand: item.sub_strand || "",
            content_standards: Array.isArray(item.content_standards) && item.content_standards.length > 0 ? item.content_standards : [""],
            learning_indicators: Array.isArray(item.learning_indicators) && item.learning_indicators.length > 0 ? item.learning_indicators : [""],
            exemplars: item.exemplars || "",
            is_public: formData.is_public,
        });
    };
    const handleSkipCurrent = () => {
        if (extractedQueue.length <= 1) {
            setExtractedQueue([]);
            toast({ title: "Queue Finished", description: "All items processed." });
            return;
        }
        const nextQueue = extractedQueue.slice(1);
        setExtractedQueue(nextQueue);
        loadItemIntoForm(nextQueue[0]);
    };
    const handleAddField = (field) => {
        setFormData({
            ...formData,
            [field]: [...formData[field], ""],
        });
    };
    const handleRemoveField = (field, index) => {
        const newArray = formData[field].filter((_, i) => i !== index);
        setFormData({
            ...formData,
            [field]: newArray,
        });
    };
    const handleUpdateField = (field, index, value) => {
        const newArray = [...formData[field]];
        newArray[index] = value;
        setFormData({
            ...formData,
            [field]: newArray,
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }
            const filteredStandards = formData.content_standards.filter(s => s.trim() !== "");
            const filteredIndicators = formData.learning_indicators.filter(i => i.trim() !== "");
            const result = await CurriculumService.addCurriculum({
                ...formData,
                content_standards: filteredStandards,
                learning_indicators: filteredIndicators,
            }, user.id);
            if (result) {
                toast({
                    title: "Success!",
                    description: "Curriculum added successfully.",
                });
                // Check if we have more in queue
                if (extractedQueue.length > 0) {
                    const nextQueue = extractedQueue.slice(1);
                    setExtractedQueue(nextQueue);
                    if (nextQueue.length > 0) {
                        loadItemIntoForm(nextQueue[0]);
                        toast({
                            title: "Next Item Loaded",
                            description: `${nextQueue.length} items remaining in queue.`,
                        });
                    }
                    else {
                        // Reset form if queue is done
                        setFormData({
                            curriculum_name: "",
                            grade_level: "",
                            subject: "",
                            strand: "",
                            sub_strand: "",
                            content_standards: [""],
                            learning_indicators: [""],
                            exemplars: "",
                            is_public: false,
                        });
                    }
                }
                else {
                    // Reset form
                    setFormData({
                        curriculum_name: "",
                        grade_level: "",
                        subject: "",
                        strand: "",
                        sub_strand: "",
                        content_standards: [""],
                        learning_indicators: [""],
                        exemplars: "",
                        is_public: false,
                    });
                }
            }
            else {
                throw new Error("Failed to add curriculum");
            }
        }
        catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to add curriculum",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleJSONUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }
            setIsLoading(true);
            if (Array.isArray(jsonData)) {
                const dataToUpload = jsonData.map(item => ({
                    ...item,
                    is_public: isAdmin ? true : (item.is_public || false)
                }));
                const success = await CurriculumService.bulkUploadCurriculum(dataToUpload, user.id);
                if (success) {
                    toast({
                        title: "Success!",
                        description: `${jsonData.length} curriculum entries uploaded successfully.`,
                    });
                }
            }
            else {
                const itemToUpload = {
                    ...jsonData,
                    is_public: isAdmin ? true : (jsonData.is_public || false)
                };
                const result = await CurriculumService.addCurriculum(itemToUpload, user.id);
                if (result) {
                    toast({
                        title: "Success!",
                        description: "Curriculum uploaded successfully.",
                    });
                }
            }
        }
        catch (error) {
            toast({
                title: "Upload Failed",
                description: error.message || "Invalid JSON file",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleCSVUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        // Check file extension
        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast({
                title: "Invalid File Type",
                description: "Please upload a CSV file (.csv). Excel files (.xlsx) are not supported directly. Please Save As CSV first.",
                variant: "destructive",
            });
            event.target.value = ""; // Reset input
            return;
        }
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }
            const text = await file.text();
            // Check for binary content (null bytes)
            if (text.includes('\u0000')) {
                throw new Error("File appears to be binary (like Excel .xlsx). Please save as CSV (Comma Delimited) and try again.");
            }
            const lines = text.split(/\r?\n/).filter(line => line.trim());
            if (lines.length < 2) {
                throw new Error("CSV file must have headers and at least one data row");
            }
            // Detect delimiter
            const firstLine = lines[0];
            const commaCount = (firstLine.match(/,/g) || []).length;
            const semiCount = (firstLine.match(/;/g) || []).length;
            const delimiter = semiCount > commaCount ? ';' : ',';
            console.log(`Detected delimiter: '${delimiter}'`);
            // Parse CSV
            const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
            console.log('Detected headers:', headers);
            const rows = lines.slice(1).map(line => {
                // Handle quoted values with delimiter
                const values = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    }
                    else if (char === delimiter && !inQuotes) {
                        values.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
                        current = '';
                    }
                    else {
                        current += char;
                    }
                }
                values.push(current.trim().replace(/^"|"$/g, ''));
                return values;
            });
            // Group by content standard code
            const grouped = new Map();
            rows.forEach(row => {
                if (row.length < 3)
                    return; // Skip invalid rows
                // Map columns based on headers or fallback to index
                let classLevel = "", subject = "Computing", strand = "", subStrand = "", contentStandard = "", indicators = "", exemplars = "";
                // Check if we have the user's specific format
                // We check for "content standard" and some variation of "indicators"
                const hasContentStandard = headers.some(h => h.includes("content standard"));
                const hasIndicators = headers.some(h => h.includes("indicator") || h.includes("exemplar"));
                const hasUserFormat = hasContentStandard && hasIndicators;
                let pageRef = "";
                if (hasUserFormat) {
                    // User provided format: Class,Strand,Sub-Strand,Content Standard,Indicators & Exemplars,...
                    // We try to find indices dynamically
                    const classIdx = headers.findIndex(h => h.includes("class") || h.includes("grade") || h.includes("year"));
                    const subjectIdx = headers.findIndex(h => h.includes("subject"));
                    const strandIdx = headers.findIndex(h => h.includes("strand") && !h.includes("sub"));
                    const subStrandIdx = headers.findIndex(h => h.includes("sub") && (h.includes("strand") || h.includes("std")));
                    const contentIdx = headers.findIndex(h => h.includes("content") || h.includes("standard"));
                    // Prioritize "indicator" only for indicators, and "exemplar" for exemplars
                    const indIdx = headers.findIndex(h => (h.includes("indicator") || h.includes("learning")) && !h.includes("exemplar"));
                    // If no specific indicator column, check for combined or fallback
                    const fallbackIndIdx = headers.findIndex(h => h.includes("indicator") || h.includes("learning"));
                    const exIdx = headers.findIndex(h => h.includes("exemplar"));
                    const pageIdx = headers.findIndex(h => h.includes("page") || h.includes("pg") || h.includes("ref"));
                    // Fallback to fixed indices if dynamic lookup fails (assuming standard order)
                    // Standard order assumption: Class, Subject, Strand, Sub-strand, Content Standard, Indicators
                    classLevel = classIdx >= 0 ? row[classIdx] : row[0];
                    if (subjectIdx >= 0)
                        subject = row[subjectIdx];
                    // If we found the indices, use them. Otherwise try to guess based on column count
                    if (strandIdx >= 0) {
                        strand = row[strandIdx];
                    }
                    else {
                        // Fallback: if subject is at 1, strand is likely at 2
                        strand = subjectIdx === 1 ? row[2] : row[1];
                    }
                    if (subStrandIdx >= 0) {
                        subStrand = row[subStrandIdx];
                    }
                    else {
                        // Fallback: if strand is at 2, sub-strand is likely at 3
                        subStrand = subjectIdx === 1 ? row[3] : row[2];
                    }
                    if (contentIdx >= 0) {
                        contentStandard = row[contentIdx];
                    }
                    else {
                        contentStandard = subjectIdx === 1 ? row[4] : row[3];
                    }
                    if (indIdx >= 0) {
                        indicators = row[indIdx];
                    }
                    else if (fallbackIndIdx >= 0 && exIdx === -1) {
                        // Only use fallback if we didn't find a specific exemplar column (avoid double mapping)
                        indicators = row[fallbackIndIdx];
                    }
                    else {
                        indicators = subjectIdx === 1 ? row[5] : row[4];
                    }
                    // Extract exemplars if column exists
                    if (exIdx >= 0) {
                        exemplars = row[exIdx];
                    }
                    else if (row.length > 7) {
                        // If no explicit header but we have extra columns, assume 7th index (8th column) might be exemplars
                        // Standard template: Class(0), Strand(1), Sub(2), CS Code(3), CS Desc(4), Ind Code(5), Ind Desc(6), Exemplars(7)
                        exemplars = row[7];
                    }
                    if (pageIdx >= 0) {
                        pageRef = row[pageIdx];
                    }
                }
                else if (row.length >= 7) {
                    // Default template format
                    classLevel = row[0];
                    strand = row[1];
                    subStrand = row[2];
                    // row[3] is code, row[4] is desc
                    contentStandard = `${row[3]}: ${row[4]}`;
                    // row[5] is ind code, row[6] is ind desc
                    indicators = `${row[5]}: ${row[6]}`;
                    // Check for exemplars in 8th column (index 7)
                    if (row.length > 7) {
                        exemplars = row[7];
                    }
                }
                else {
                    // Fallback
                    classLevel = row[0];
                    strand = row[1];
                    subStrand = row[2];
                    contentStandard = row[3] || "";
                    indicators = row[4] || "";
                }
                // Normalize class level (e.g. "B4" -> "Basic 4", "Class 6" -> "Basic 6")
                // This ensures consistency with the generator's expectations
                const classNumMatch = classLevel.match(/(\d+)/);
                if (classNumMatch) {
                    classLevel = `Basic ${classNumMatch[1]}`;
                }
                // Clean up data
                // Extract code from content standard if possible (e.g. "B6.1.1.1: Identify...")
                const contentCodeMatch = contentStandard.match(/^([A-Z0-9\.]+):?/);
                const contentCode = contentCodeMatch ? contentCodeMatch[1] : "CS";
                // Clean indicators (split by newlines, bullets, or semicolons if multiple)
                // FIXED: Don't consume the numbering (1. ) when splitting. 
                // Instead, ensure numbered items start on a new line, then split by newline/semicolon.
                const indicatorList = indicators
                    .replace(/(\s|^)(\d+\.\s+)/g, '\n$2') // Ensure " 1. " becomes "\n1. "
                    .split(/(?:\r\n|\r|\n|•|;)/g)
                    .map(i => i.trim())
                    .filter(i => i.length > 0);
                // We include the indicators in the key to ensure that distinct rows in the CSV 
                // (which represent distinct Indicator-Exemplar relationships) are preserved as separate entries in the DB.
                // This allows the Generator to correctly map specific exemplars to specific indicators.
                const indicatorsKey = indicatorList.join("|").substring(0, 200);
                const key = `${classLevel}_${strand}_${subStrand}_${contentCode}_${indicatorsKey}`;
                if (!grouped.has(key)) {
                    // Clean exemplars if present (handle semicolons/newlines)
                    let cleanExemplars = exemplars;
                    if (exemplars && (exemplars.includes(';') || exemplars.includes('•'))) {
                        cleanExemplars = exemplars.split(/;|•|\r?\n/).map(e => e.trim()).filter(e => e).join('\n');
                    }
                    grouped.set(key, {
                        curriculum_name: `Ghana Curriculum ${classLevel}`,
                        grade_level: classLevel,
                        subject: subject,
                        strand: strand,
                        sub_strand: subStrand,
                        content_standards: [contentStandard],
                        learning_indicators: indicatorList,
                        exemplars: cleanExemplars,
                        page_reference: pageRef, // Add page reference
                        is_public: isAdmin, // Only public if admin
                    });
                }
                else {
                    const existing = grouped.get(key);
                    // If pageRef exists for this row and not on existing, add it
                    if (pageRef && !existing.page_reference) {
                        existing.page_reference = pageRef;
                    } // Add unique indicators
                    indicatorList.forEach(ind => {
                        if (!existing.learning_indicators.includes(ind)) {
                            existing.learning_indicators.push(ind);
                        }
                    });
                    // Add unique exemplars
                    if (exemplars) {
                        const currentExemplars = existing.exemplars ? existing.exemplars.split("\n") : [];
                        const newExemplars = exemplars.split(/(?:\r\n|\r|\n|•|;)/).map(e => e.trim()).filter(e => e.length > 0);
                        newExemplars.forEach(ex => {
                            if (!currentExemplars.includes(ex)) {
                                currentExemplars.push(ex);
                            }
                        });
                        existing.exemplars = currentExemplars.join("\n");
                    }
                }
            });
            // Upload to database
            const curricula = Array.from(grouped.values());
            console.log('Uploading curricula:', curricula.length, 'items');
            // Count items with exemplars for debug
            const withExemplars = curricula.filter(c => c.exemplars && c.exemplars.length > 0).length;
            console.log(`Items with exemplars: ${withExemplars} / ${curricula.length}`);
            if (curricula.length === 0) {
                toast({
                    title: "Parse Error",
                    description: "Could not find any valid curriculum items in the CSV. Please check the headers.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }
            console.log('Sample curriculum item:', curricula[0]);
            let successCount = 0;
            let errorCount = 0;
            for (const curriculum of curricula) {
                try {
                    const result = await CurriculumService.addCurriculum(curriculum, user.id);
                    if (result) {
                        successCount++;
                    }
                    else {
                        errorCount++;
                        console.error("Failed to add curriculum item:", curriculum);
                    }
                }
                catch (e) {
                    errorCount++;
                    console.error("Exception adding item:", e);
                }
            }
            if (successCount > 0) {
                const message = errorCount > 0
                    ? `Partial success: ${successCount} items uploaded, ${errorCount} failed.`
                    : `All ${successCount} items uploaded successfully.`;
                toast({
                    title: errorCount > 0 ? "Upload Completed with Errors" : "Upload Complete",
                    description: `Processed ${rows.length} CSV rows into ${curricula.length} curriculum units. ${message}`,
                    variant: errorCount > 0 ? "destructive" : "default",
                });
            }
            else {
                toast({
                    title: "Upload Failed",
                    description: `Failed to upload any of the ${curricula.length} items found. Please check your data format.`,
                    variant: "destructive"
                });
            }
            // Reset file input
            event.target.value = "";
        }
        catch (error) {
            toast({
                title: "Error",
                description: error.message || "Invalid CSV file format",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx(Navbar, {}), _jsxs("main", { className: "container mx-auto px-4 py-8", children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-4 mb-6", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "text-2xl font-bold text-foreground", children: "Curriculum Upload" }), isAdmin && (_jsx("span", { className: "bg-primary/10 text-primary text-xs px-2 py-1 rounded-full border border-primary/20 font-medium", children: "Admin Mode" }))] }), _jsx("div", { className: "flex gap-3 w-full sm:w-auto", children: _jsx(Button, { variant: "outline", onClick: () => navigate(isAdmin ? "/admin-dashboard" : "/dashboard"), className: "flex-1 sm:flex-none", children: "Back to Dashboard" }) })] }), _jsx(Card, { className: "max-w-4xl mx-auto p-4 sm:p-6 lg:p-8", children: _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, children: [_jsxs(TabsList, { className: "grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1", children: [_jsx(TabsTrigger, { value: "manual", className: "text-xs sm:text-sm py-2", children: "Manual" }), _jsx(TabsTrigger, { value: "doc-upload", className: "text-xs sm:text-sm py-2", children: "Doc Upload" }), _jsx(TabsTrigger, { value: "csv", className: "text-xs sm:text-sm py-2", children: "CSV Upload" }), _jsx(TabsTrigger, { value: "upload", className: "text-xs sm:text-sm py-2", children: "JSON" }), _jsx(TabsTrigger, { value: "my-curriculum", className: "text-xs sm:text-sm py-2 col-span-2 sm:col-span-1", children: "My Data" })] }), _jsx(TabsContent, { value: "doc-upload", children: _jsxs("div", { className: "flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg bg-muted/50 mt-6", children: [_jsx("div", { className: "bg-background p-4 rounded-full mb-4 shadow-sm", children: isProcessingFile ? (_jsx(Loader2, { className: "h-8 w-8 text-primary animate-spin" })) : (_jsx(FileText, { className: "h-8 w-8 text-primary" })) }), _jsx("h3", { className: "text-lg font-semibold mb-2", children: "Upload Curriculum Document" }), _jsx("p", { className: "text-muted-foreground text-center mb-6 max-w-md", children: "Upload a PDF, DOCX, or Text file containing your curriculum. Our AI will analyze it and extract the structured data for you to review." }), _jsx("div", { className: "flex gap-4", children: _jsx(Input, { type: "file", accept: ".pdf,.docx,.txt,.md", onChange: handleFileUpload, disabled: isProcessingFile, className: "max-w-xs" }) }), isProcessingFile && (_jsx("p", { className: "text-sm text-muted-foreground mt-4 animate-pulse", children: "Analyzing document structure... This may take a minute." }))] }) }), _jsxs(TabsContent, { value: "manual", children: [extractedQueue.length > 0 && (_jsxs("div", { className: "bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-primary", children: "Reviewing Extracted Data" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [extractedQueue.length, " items remaining in queue. Review and save each one."] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: handleSkipCurrent, children: "Skip This Item" }), _jsx(Button, { variant: "destructive", size: "sm", onClick: () => setExtractedQueue([]), children: "Clear Queue" })] })] })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6 mt-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "curriculum_name", children: "Curriculum Name" }), _jsx(Input, { id: "curriculum_name", placeholder: "e.g., National Curriculum", value: formData.curriculum_name, onChange: (e) => setFormData({ ...formData, curriculum_name: e.target.value }), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "grade_level", children: "Class Level" }), _jsxs(Select, { value: formData.grade_level, onValueChange: (value) => setFormData({ ...formData, grade_level: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select class level" }) }), _jsx(SelectContent, { children: CLASS_LEVELS.map((level) => (_jsx(SelectItem, { value: level.label, children: level.label }, level.value))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "subject", children: "Subject" }), _jsx(Input, { id: "subject", placeholder: "e.g., Mathematics, Social Studies", value: formData.subject, onChange: (e) => setFormData({ ...formData, subject: e.target.value }), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "strand", children: "Strand" }), _jsx(Input, { id: "strand", placeholder: "e.g., Numbers and Operations", value: formData.strand, onChange: (e) => setFormData({ ...formData, strand: e.target.value }) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "sub_strand", children: "Sub-Strand" }), _jsx(Input, { id: "sub_strand", placeholder: "e.g., Addition and Subtraction", value: formData.sub_strand, onChange: (e) => setFormData({ ...formData, sub_strand: e.target.value }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { children: "Content Standards" }), _jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: () => handleAddField("content_standards"), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Add"] })] }), formData.content_standards.map((standard, index) => (_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: `Content Standard ${index + 1}`, value: standard, onChange: (e) => handleUpdateField("content_standards", index, e.target.value) }), formData.content_standards.length > 1 && (_jsx(Button, { type: "button", variant: "outline", size: "icon", onClick: () => handleRemoveField("content_standards", index), children: _jsx(Trash2, { className: "h-4 w-4" }) }))] }, index)))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { children: "Learning Indicators" }), _jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: () => handleAddField("learning_indicators"), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Add"] })] }), formData.learning_indicators.map((indicator, index) => (_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: `Learning Indicator ${index + 1}`, value: indicator, onChange: (e) => handleUpdateField("learning_indicators", index, e.target.value) }), formData.learning_indicators.length > 1 && (_jsx(Button, { type: "button", variant: "outline", size: "icon", onClick: () => handleRemoveField("learning_indicators", index), children: _jsx(Trash2, { className: "h-4 w-4" }) }))] }, index)))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "exemplars", children: "Exemplars" }), _jsx(Textarea, { id: "exemplars", placeholder: "Enter exemplars or additional notes", value: formData.exemplars, onChange: (e) => setFormData({ ...formData, exemplars: e.target.value }), rows: 4 })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("input", { type: "checkbox", id: "is_public", checked: formData.is_public, onChange: (e) => setFormData({ ...formData, is_public: e.target.checked }), className: "h-4 w-4" }), _jsx(Label, { htmlFor: "is_public", children: "Make this curriculum public" })] }), _jsx(Button, { type: "submit", className: "w-full bg-gradient-hero", disabled: isLoading, children: isLoading ? "Adding..." : "Add Curriculum" })] })] }), _jsx(TabsContent, { value: "upload", children: _jsxs("div", { className: "mt-6 space-y-6", children: [_jsxs("div", { className: "border-2 border-dashed border-border rounded-lg p-12 text-center", children: [_jsx(FileJson, { className: "h-12 w-12 mx-auto mb-4 text-muted-foreground" }), _jsx("h3", { className: "text-lg font-semibold mb-2", children: "Upload JSON File" }), _jsx("p", { className: "text-sm text-muted-foreground mb-4", children: "Upload a JSON file with your curriculum data" }), _jsx("input", { type: "file", accept: ".json,application/json", onChange: handleJSONUpload, className: "hidden", id: "json-upload", disabled: isLoading }), _jsx("label", { htmlFor: "json-upload", children: _jsx(Button, { type: "button", variant: "outline", asChild: true, disabled: isLoading, children: _jsxs("span", { children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), isLoading ? "Uploading..." : "Choose File"] }) }) })] }), _jsxs("div", { className: "bg-muted p-4 rounded-lg", children: [_jsx("h4", { className: "font-semibold mb-2", children: "JSON Format Example:" }), _jsx("pre", { className: "text-xs bg-background p-3 rounded overflow-x-auto", children: `{
  "curriculum_name": "National Curriculum",
  "grade_level": "Grade 4",
  "subject": "Mathematics",
  "strand": "Numbers and Operations",
  "sub_strand": "Addition and Subtraction",
  "content_standards": [
    "Students will add and subtract numbers",
    "Students will solve word problems"
  ],
  "learning_indicators": [
    "Add two 3-digit numbers",
    "Subtract with regrouping"
  ],
  "exemplars": "Example problems...",
  "is_public": false
}` }), _jsx("p", { className: "text-xs text-muted-foreground mt-2", children: "For bulk upload, use an array of curriculum objects." })] })] }) }), _jsx(TabsContent, { value: "csv", children: _jsxs("div", { className: "space-y-6 mt-6", children: [_jsxs("div", { className: "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-blue-900 dark:text-blue-100 mb-2", children: "\uD83D\uDCCA CSV/Excel Bulk Upload" }), _jsx("p", { className: "text-sm text-blue-800 dark:text-blue-200 mb-3", children: "Upload a CSV or Excel file with your curriculum data. The file should have the following columns:" }), _jsxs("ul", { className: "text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside", children: [_jsxs("li", { children: [_jsx("strong", { children: "Class" }), " - Grade level (e.g., Basic 4, Basic 5, Basic 6)"] }), _jsxs("li", { children: [_jsx("strong", { children: "Strand" }), " - Main curriculum strand"] }), _jsxs("li", { children: [_jsx("strong", { children: "Sub-Strand" }), " - Sub-category within the strand"] }), _jsxs("li", { children: [_jsx("strong", { children: "Content Standard Code" }), " - Unique code for the standard"] }), _jsxs("li", { children: [_jsx("strong", { children: "Content Standard Description" }), " - What students should know/do"] }), _jsxs("li", { children: [_jsx("strong", { children: "Indicator Code" }), " - Unique code for the indicator"] }), _jsxs("li", { children: [_jsx("strong", { children: "Indicator Description" }), " - Specific measurable outcome"] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("input", { id: "csv-upload", type: "file", accept: ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", onChange: handleCSVUpload, className: "hidden", disabled: isLoading }), _jsx("label", { htmlFor: "csv-upload", children: _jsx(Button, { type: "button", variant: "outline", className: "w-full", asChild: true, disabled: isLoading, children: _jsxs("span", { children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), isLoading ? "Processing..." : "Choose CSV/Excel File"] }) }) })] }), _jsxs(Button, { type: "button", variant: "secondary", className: "w-full", onClick: () => window.open('/curriculum-template.csv', '_blank'), children: [_jsx(FileJson, { className: "mr-2 h-4 w-4" }), "Download Template"] })] }), _jsxs("div", { className: "bg-muted p-4 rounded-lg", children: [_jsx("h4", { className: "font-semibold mb-2", children: "Sample CSV Format:" }), _jsx("pre", { className: "text-xs bg-background p-3 rounded overflow-x-auto whitespace-pre-wrap", children: `Class,Strand,Sub-Strand,Content Standard Code,Content Standard Description,Indicator Code,Indicator Description
Basic 4,1: Introduction to Computing,1: Generation of Computers and Parts of a Computer and Other Gadgets,B4.1.1.1,Identify parts of a computer and technology tools,B4.1.1.1.1,Identify parts of a computer and technology tools
Basic 4,1: Introduction to Computing,1: Generation of Computers and Parts of a Computer and Other Gadgets,B4.1.1.1,Identify parts of a computer and technology tools,B4.1.1.1.2,Describe the types of input devices of a computer and their uses` }), _jsxs("div", { className: "mt-3 space-y-2", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "Tip:" }), " Your data will be automatically grouped by Content Standard Code, combining all indicators under each standard."] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["\u2705 ", _jsx("strong", { children: "Subject:" }), " The system will auto-detect the subject from your data (e.g., \"Computing\" for Basic 4-6 curriculum)."] })] })] })] }) }), _jsx(TabsContent, { value: "my-curriculum", children: _jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold", children: "My Uploaded Curriculum" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "These are the curriculum items you have uploaded." })] }), userCurriculum.length > 0 && (_jsxs(Button, { variant: "destructive", size: "sm", onClick: async () => {
                                                            if (confirm("WARNING: This will delete ALL your uploaded curriculum items. This cannot be undone. Are you sure?")) {
                                                                setIsLoading(true);
                                                                try {
                                                                    const { data: { user } } = await supabase.auth.getUser();
                                                                    if (user) {
                                                                        const success = await CurriculumService.deleteAllUserCurriculum(user.id);
                                                                        if (success) {
                                                                            setUserCurriculum([]);
                                                                            toast({ title: "Cleared", description: "All your curriculum data has been deleted." });
                                                                        }
                                                                        else {
                                                                            throw new Error("Deletion failed");
                                                                        }
                                                                    }
                                                                }
                                                                catch (e) {
                                                                    toast({ title: "Error", description: "Failed to delete items. Please try again.", variant: "destructive" });
                                                                }
                                                                finally {
                                                                    setIsLoading(false);
                                                                }
                                                            }
                                                        }, children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete All Data"] }))] }), userCurriculum.length === 0 ? (_jsx("div", { className: "text-center p-8 border rounded-lg bg-muted/20", children: _jsx("p", { className: "text-muted-foreground", children: "No curriculum uploaded yet." }) })) : (_jsx("div", { className: "border rounded-lg overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm text-left", children: [_jsx("thead", { className: "bg-muted text-muted-foreground font-medium", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "Class" }), _jsx("th", { className: "p-3", children: "Subject" }), _jsx("th", { className: "p-3", children: "Strand" }), _jsx("th", { className: "p-3", children: "Sub-Strand" }), _jsx("th", { className: "p-3", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y", children: [...userCurriculum]
                                                                    .sort((a, b) => {
                                                                    const getGradeValue = (grade) => {
                                                                        if (!grade)
                                                                            return 999;
                                                                        // Check exact match in CLASS_LEVELS
                                                                        const idx = CLASS_LEVELS.findIndex(c => c.label === grade || c.value === grade);
                                                                        if (idx !== -1)
                                                                            return idx;
                                                                        // Fallback: extract number
                                                                        const match = grade.match(/\d+/);
                                                                        return match ? parseInt(match[0]) : 999;
                                                                    };
                                                                    const valA = getGradeValue(a.grade_level);
                                                                    const valB = getGradeValue(b.grade_level);
                                                                    if (valA !== valB)
                                                                        return valA - valB;
                                                                    return (a.subject || "").localeCompare(b.subject || "");
                                                                })
                                                                    .map((item) => (_jsxs("tr", { className: "hover:bg-muted/50", children: [_jsx("td", { className: "p-3", children: item.grade_level }), _jsx("td", { className: "p-3", children: item.subject }), _jsx("td", { className: "p-3", children: item.strand }), _jsx("td", { className: "p-3", children: item.sub_strand }), _jsx("td", { className: "p-3", children: _jsx(Button, { variant: "ghost", size: "sm", className: "text-destructive hover:text-destructive", onClick: async () => {
                                                                                    if (confirm("Are you sure you want to delete this item?")) {
                                                                                        await CurriculumService.deleteCurriculum(item.id);
                                                                                        setUserCurriculum(userCurriculum.filter(c => c.id !== item.id));
                                                                                        toast({ title: "Deleted", description: "Curriculum item deleted." });
                                                                                    }
                                                                                }, children: _jsx(Trash2, { className: "h-4 w-4" }) }) })] }, item.id))) })] }) }) }))] }) })] }) })] })] }));
}
