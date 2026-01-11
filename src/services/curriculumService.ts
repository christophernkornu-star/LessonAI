import { supabase } from "@/integrations/supabase/client";

export interface CurriculumData {
  id?: string;
  user_id?: string;
  curriculum_name: string;
  grade_level: string;
  subject: string;
  strand?: string;
  sub_strand?: string;
  content_standards: string[];
  learning_indicators: string[];
  exemplars?: string;
  is_public?: boolean;
}

export class CurriculumService {
  // Get all curriculum (public + user's own)
  static async getAllCurriculum(userId?: string): Promise<CurriculumData[]> {
    try {
      let query = supabase.from("curriculum").select("*");

      if (userId) {
        query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
      } else {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as any[]) || [];
    } catch (error) {
      console.error("Error fetching curriculum:", error);
      return [];
    }
  }

  // Get curriculum by grade and subject
  static async getCurriculumByGradeAndSubject(
    gradeLevel: string,
    subject: string,
    userId?: string
  ): Promise<CurriculumData[]> {
    try {
      // Normalize grade level to match database format (e.g., "basic4" -> "Basic 4")
      // The database stores "Basic 4" format from CSV uploads
      let normalizedGradeLevel = gradeLevel;
      if (gradeLevel && !gradeLevel.includes(" ")) {
        // Convert "basic4" to "Basic 4"
        const match = gradeLevel.match(/^basic(\d+)$/i);
        if (match) {
          normalizedGradeLevel = `Basic ${match[1]}`;
        }
        // Convert "B4" to "Basic 4"
        const bMatch = gradeLevel.match(/^b(\d+)$/i);
        if (bMatch) {
           normalizedGradeLevel = `Basic ${bMatch[1]}`;
        }
      }
      
      console.log('Query params:', { 
        original: { gradeLevel, subject }, 
        normalized: { gradeLevel: normalizedGradeLevel },
        userId 
      });
      
      let query = supabase
        .from("curriculum")
        .select("*")
        .ilike("subject", `%${subject}%`);

      // Handle grade level variations (e.g., "Basic 4", "B4", "Class 4")
      if (normalizedGradeLevel.toLowerCase().startsWith("basic ")) {
        const num = normalizedGradeLevel.split(" ")[1];
        query = query.or(`grade_level.ilike.%Basic ${num}%,grade_level.ilike.%B${num}%,grade_level.ilike.%Class ${num}%`);
      } else {
        query = query.ilike("grade_level", `%${normalizedGradeLevel}%`);
      }

      if (userId) {
        query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
      } else {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;

      console.log('Query result:', { data: data?.length || 0, error });
      
      if (!error && data && data.length > 0) {
        return data as any[];
      }

      // Fallback: Fetch all for user/public and filter in memory
      // This handles cases where the database format is very different from expected
      console.log("Strict query failed, trying broader search...");
      let broadQuery = supabase.from("curriculum").select("*");
      if (userId) {
        broadQuery = broadQuery.or(`is_public.eq.true,user_id.eq.${userId}`);
      } else {
        broadQuery = broadQuery.eq("is_public", true);
      }
      
      const { data: allData } = await broadQuery;
      
      if (allData) {
        console.log(`Fallback: Fetched ${allData.length} total items from DB.`);
        if (allData.length > 0) {
            console.log("Sample item:", allData[0]);
            console.log("Available subjects:", [...new Set(allData.map(i => i.subject))]);
            console.log("Available levels:", [...new Set(allData.map(i => i.grade_level))]);
        }

        const searchSubject = subject.toLowerCase();
        // Extract number from grade level (e.g. "basic6" -> "6")
        const levelNum = gradeLevel.match(/\d+/)?.[0] || "";
        
        // Subject aliases
        const subjectAliases: Record<string, string[]> = {
          "computing": ["ict", "information", "technology", "computer"],
          "mathematics": ["math", "numeracy"],
          "english": ["language", "literacy"],
          "science": ["natural science", "integrated science"]
        };
        const aliases = subjectAliases[searchSubject] || [];

        const filtered = allData.filter((item: any) => {
          const itemSubject = (item.subject || "").toLowerCase();
          const itemLevel = (item.grade_level || "").toLowerCase();
          
          // Check subject (fuzzy + aliases)
          const subjectMatch = itemSubject.includes(searchSubject) || 
                               searchSubject.includes(itemSubject) ||
                               aliases.some(alias => itemSubject.includes(alias));
          
          // Check level (fuzzy)
          // If we have a number, check if it exists in the item level
          const levelMatch = levelNum ? itemLevel.includes(levelNum) : itemLevel.includes(gradeLevel.toLowerCase());
          
          return subjectMatch && levelMatch;
        });
        
        console.log(`Fallback found ${filtered.length} items`);
        return filtered;
      }

      if (error) throw error;

      return [];
    } catch (error) {
      console.error("Error fetching curriculum:", error);
      return [];
    }
  }

  // Get strands for a subject and grade
  static async getStrandsByGradeAndSubject(
    gradeLevel: string,
    subject: string,
    userId?: string
  ): Promise<Array<{ value: string; label: string }>> {
    try {
      console.log('getStrandsByGradeAndSubject called with:', { gradeLevel, subject, userId });
      const curriculum = await this.getCurriculumByGradeAndSubject(gradeLevel, subject, userId);
      console.log('Found curriculum items:', curriculum.length);
      
      const strandsSet = new Set<string>();
      
      curriculum.forEach((c) => {
        if (c.strand && c.strand.trim() !== "") {
          strandsSet.add(c.strand);
        }
      });

      // If no strands found, try fetching for the subject regardless of grade level
      // This helps if the grade level naming doesn't match exactly (e.g. "B6" vs "Basic 6")
      if (strandsSet.size === 0) {
        console.log("No strands found for specific grade, checking all grades for subject...");
        const allSubjectCurriculum = await this.getCurriculumByGradeAndSubject("", subject, userId);
        
        allSubjectCurriculum.forEach((c) => {
          if (c.strand && c.strand.trim() !== "") {
            strandsSet.add(c.strand);
          }
        });
      }

      return Array.from(strandsSet).map(strand => ({
        value: strand.toLowerCase().replace(/\s+/g, "-"),
        label: strand
      }));
    } catch (error) {
      console.error("Error fetching strands:", error);
      return [];
    }
  }

  // Get sub-strands for a subject, grade, and strand
  static async getSubStrandsByStrand(
    gradeLevel: string,
    subject: string,
    strand: string,
    userId?: string
  ): Promise<Array<{ value: string; label: string }>> {
    try {
      const curriculum = await this.getCurriculumByGradeAndSubject(gradeLevel, subject, userId);
      const subStrandsSet = new Set<string>();
      
      curriculum.forEach((c) => {
        // Robust match for strand
        const searchStrand = strand.trim().toLowerCase();
        const searchStrandSlug = searchStrand.replace(/\s+/g, "-");
        
        const itemStrand = c.strand?.trim().toLowerCase() || "";
        const itemStrandSlug = itemStrand.replace(/\s+/g, "-");

        const strandMatch = itemStrand === searchStrand || 
                            itemStrandSlug === searchStrandSlug ||
                            itemStrand.includes(searchStrand) ||
                            searchStrand.includes(itemStrand);
                            
        if (strandMatch && c.sub_strand && c.sub_strand.trim() !== "") {
          subStrandsSet.add(c.sub_strand);
        }
      });

      // Fallback: If no sub-strands found for specific grade, try fetching for the subject regardless of grade level
      if (subStrandsSet.size === 0) {
        console.log("No sub-strands found for specific grade, checking all grades for subject...");
        const allSubjectCurriculum = await this.getCurriculumByGradeAndSubject("", subject, userId);
        
        allSubjectCurriculum.forEach((c) => {
          // Robust match for strand
          const searchStrand = strand.trim().toLowerCase();
          const searchStrandSlug = searchStrand.replace(/\s+/g, "-");
          
          const itemStrand = c.strand?.trim().toLowerCase() || "";
          const itemStrandSlug = itemStrand.replace(/\s+/g, "-");

          const strandMatch = itemStrand === searchStrand || 
                              itemStrandSlug === searchStrandSlug ||
                              itemStrand.includes(searchStrand) ||
                              searchStrand.includes(itemStrand);
                              
          if (strandMatch && c.sub_strand && c.sub_strand.trim() !== "") {
            subStrandsSet.add(c.sub_strand);
          }
        });
      }

      return Array.from(subStrandsSet).map(subStrand => ({
        value: subStrand.toLowerCase().replace(/\s+/g, "-"),
        label: subStrand
      }));
    } catch (error) {
      console.error("Error fetching sub-strands:", error);
      return [];
    }
  }

  // Get content standards for a subject, grade, strand, and sub-strand
  static async getContentStandardsBySubStrand(
    gradeLevel: string,
    subject: string,
    strand: string,
    subStrand: string,
    userId?: string
  ): Promise<Array<{ code: string; description: string; indicators: string[]; exemplars: string[]; mappings: Array<{ indicators: string[], exemplars: string[] }> }>> {
    try {
      // Use getCurriculumByGradeAndSubject to leverage the robust fallback logic
      const curriculum = await this.getCurriculumByGradeAndSubject(gradeLevel, subject, userId);
      
      const standards: Array<{ code: string; description: string; indicators: string[]; exemplars: string[]; mappings: Array<{ indicators: string[], exemplars: string[] }> }> = [];
      
      curriculum.forEach((c) => {
        // Filter by strand and sub-strand in memory
        const strandMatch = c.strand?.trim().toLowerCase() === strand.trim().toLowerCase() || 
                            c.strand?.trim().toLowerCase().includes(strand.trim().toLowerCase()) ||
                            strand.trim().toLowerCase().includes(c.strand?.trim().toLowerCase() || "");
                            
        const subStrandMatch = c.sub_strand?.trim().toLowerCase() === subStrand.trim().toLowerCase() ||
                               c.sub_strand?.trim().toLowerCase().includes(subStrand.trim().toLowerCase()) ||
                               subStrand.trim().toLowerCase().includes(c.sub_strand?.trim().toLowerCase() || "");

        if (strandMatch && subStrandMatch) {
          if (c.content_standards && Array.isArray(c.content_standards)) {
            c.content_standards.forEach((standard: string, index: number) => {
              // Generate a unique code using the item ID or a global counter
              // If the standard string itself contains a code (e.g. "B6.1.1.1: ..."), use that
              const codeMatch = standard.match(/^([A-Z0-9\.]+):?/);
              let code = codeMatch ? codeMatch[1] : `CS-${standards.length + 1}`;
              
              // Parse exemplars if they are stored as a string
              let exemplarsList: string[] = [];
              if (c.exemplars) {
                // Split by newline, bullet points, semicolons, or numbered lists (e.g. "1. ", "2. ")
                exemplarsList = c.exemplars
                  .split(/\n|•|;|\r|\d+\.\s/)
                  .map(e => e.trim())
                  .filter(e => e.length > 0);
              }
              
              // DEBUG LOG
              if (exemplarsList.length > 0) {
                 console.log(`Found exemplars for ${code}:`, exemplarsList);
              } else {
                 console.log(`No exemplars found for ${code}. Raw DB value:`, c.exemplars);
              }

              // Check if this standard already exists (merge if so)
              const existingIndex = standards.findIndex(s => s.code === code);
              if (existingIndex >= 0) {
                 const existing = standards[existingIndex];
                 // Merge indicators
                 const newIndicators = [...existing.indicators];
                 (c.learning_indicators || []).forEach((ind: string) => {
                    if (!newIndicators.includes(ind)) newIndicators.push(ind);
                 });
                 
                 // Merge exemplars
                 const newExemplars = [...existing.exemplars];
                 exemplarsList.forEach(ex => {
                    if (!newExemplars.includes(ex)) newExemplars.push(ex);
                 });

                 // Add new mapping
                 const newMappings = [...existing.mappings, {
                    indicators: c.learning_indicators || [],
                    exemplars: exemplarsList
                 }];
                 
                 standards[existingIndex] = {
                    ...existing,
                    indicators: newIndicators,
                    exemplars: newExemplars,
                    mappings: newMappings
                 };
              } else {
                 standards.push({
                    code,
                    description: standard,
                    indicators: c.learning_indicators || [],
                    exemplars: exemplarsList,
                    mappings: [{
                        indicators: c.learning_indicators || [],
                        exemplars: exemplarsList
                    }]
                 });
              }
            });
          }
        }
      });

      return standards;
    } catch (error) {
      console.error("Error fetching content standards:", error);
      return [];
    }
  }

  // Add curriculum
  static async addCurriculum(
    curriculum: Omit<CurriculumData, "id">,
    userId: string
  ): Promise<CurriculumData | null> {
    try {
      console.log('Adding curriculum:', { 
        grade_level: curriculum.grade_level, 
        subject: curriculum.subject, 
        strand: curriculum.strand 
      });
      
      const { data, error } = await supabase
        .from("curriculum")
        .insert({
          user_id: userId,
          curriculum_name: curriculum.curriculum_name,
          grade_level: curriculum.grade_level,
          subject: curriculum.subject,
          strand: curriculum.strand || null,
          sub_strand: curriculum.sub_strand || null,
          content_standards: curriculum.content_standards,
          learning_indicators: curriculum.learning_indicators,
          exemplars: curriculum.exemplars || null,
          is_public: curriculum.is_public || false,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
      }

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error("Error adding curriculum:", error);
      return null;
    }
  }

  // Bulk upload curriculum
  static async bulkUploadCurriculum(
    curriculumList: Omit<CurriculumData, "id">[],
    userId: string
  ): Promise<boolean> {
    try {
      const records = curriculumList.map((c) => ({
        user_id: userId,
        curriculum_name: c.curriculum_name,
        grade_level: c.grade_level,
        subject: c.subject,
        strand: c.strand || null,
        sub_strand: c.sub_strand || null,
        content_standards: c.content_standards,
        learning_indicators: c.learning_indicators,
        exemplars: c.exemplars || null,
        is_public: c.is_public || false,
      }));

      const { error } = await supabase.from("curriculum").insert(records);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error bulk uploading curriculum:", error);
      return false;
    }
  }

  // Update curriculum
  static async updateCurriculum(
    id: string,
    updates: Partial<CurriculumData>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("curriculum")
        .update(updates as any)
        .eq("id", id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error updating curriculum:", error);
      return false;
    }
  }

  // Delete curriculum
  static async deleteCurriculum(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("curriculum").delete().eq("id", id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error deleting curriculum:", error);
      return false;
    }
  }

  // Delete all curriculum for a user
  static async deleteAllUserCurriculum(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("curriculum")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error deleting all curriculum:", error);
      return false;
    }
  }

  // Get user's curriculum
  static async getUserCurriculum(userId: string): Promise<CurriculumData[]> {
    try {
      const { data, error } = await supabase
        .from("curriculum")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      return (data as any[]) || [];
    } catch (error) {
      console.error("Error fetching user curriculum:", error);
      return [];
    }
  }

  // Get all unique subjects
  static async getUniqueSubjects(userId?: string): Promise<string[]> {
    try {
      let query = supabase.from("curriculum").select("subject");

      if (userId) {
        query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
      } else {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const subjects = new Set<string>();
      data?.forEach((item: any) => {
        if (item.subject) subjects.add(item.subject);
      });

      return Array.from(subjects).sort();
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return [];
    }
  }

  // Get all unique grade levels
  static async getUniqueGradeLevels(userId?: string): Promise<string[]> {
    try {
      let query = supabase.from("curriculum").select("grade_level");

      if (userId) {
        query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
      } else {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const levels = new Set<string>();
      data?.forEach((item: any) => {
        if (item.grade_level) levels.add(item.grade_level);
      });

      // Sort levels naturally (Basic 1, Basic 2, ..., Basic 10)
      return Array.from(levels).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    } catch (error) {
      console.error("Error fetching grade levels:", error);
      return [];
    }
  }

  // Get subjects for a specific grade level
  static async getSubjectsByGradeLevel(gradeLevel: string, userId?: string): Promise<string[]> {
    try {
      // Optimized to avoid 1000 row limit:
      // Instead of fetching EVERYTHING and filtering in JS, we should try to filter in SQL.
      // However, the fuzzy matching logic is complex.
      // We will perform a sufficiently broad SQL search to narrow it down, 
      // primarily assuming "Basic X" or "Class X" patterns.
      
      const normalizedInput = gradeLevel.toLowerCase().replace(/\s+/g, "");
      const numInput = normalizedInput.match(/\d+/)?.[0];
      
      let query = supabase.from("curriculum").select("subject, grade_level, is_public, user_id");

      // Apply User/Public Filter
      if (userId) {
        query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
      } else {
        query = query.eq("is_public", true);
      }
      
      // Optimization: If we have a number, filter by that number in the text
      // This allows the DB to return only relevant rows (e.g. all Basic 4 rows), likely < 1000.
      if (numInput) {
         // This ILIKE '%4%' is broad but much better than nothing.
         query = query.ilike('grade_level', `%${numInput}%`);
      }

      // Fetch up to 1000 RELEVANT rows
      const { data, error } = await query;
      if (error) throw error;

      const subjects = new Set<string>();
      
      data?.forEach((item: any) => {
        if (!item.subject) return;
        
        const itemLevel = (item.grade_level || "").toLowerCase().replace(/\s+/g, "");
        const itemNum = itemLevel.match(/\d+/)?.[0];

        // Check if level matches (Client-side verification)
        const matches = (
             itemLevel === normalizedInput || 
             (numInput && itemNum === numInput) || 
             itemLevel.includes(normalizedInput) ||
             normalizedInput.includes(itemLevel)
        );

        if (matches) {
           subjects.add(item.subject);
        }
      });

      return Array.from(subjects).sort();
    } catch (error) {
      console.error("Error fetching subjects for grade:", error);
      return [];
    }
  }

  static async getGlobalStats(): Promise<{ totalItems: number; uniqueSubjects: number; uniqueGrades: number }> {
    try {
      // 1. Get accurate Total Count (bypassing 1000 limit)
      const { count, error: countError } = await supabase
        .from("curriculum")
        .select("*", { count: 'exact', head: true }) // head: true means don't return data, just count
        .eq("is_public", true);

      if (countError) throw countError;

      // 2. Fetch distinct Subjects and Grades
      // Since we can't easily do "DISTINCT" in one simple SDK call without data,
      // and we might have >1000 rows, we'll try to fetch just the columns needed.
      // We'll increment the limit to 10,000 to cover most use cases for now.
      const { data, error } = await supabase
        .from("curriculum")
        .select("subject, grade_level")
        .eq("is_public", true)
        .range(0, 9999); // Increase limit to 10k

      if (error) throw error;

      const subjects = new Set(data?.map(i => i.subject).filter(Boolean));
      const grades = new Set(data?.map(i => i.grade_level).filter(Boolean));

      return {
        totalItems: count || 0,
        uniqueSubjects: subjects.size,
        uniqueGrades: grades.size
      };
    } catch (error) {
      console.error("Error fetching global stats:", error);
      return { totalItems: 0, uniqueSubjects: 0, uniqueGrades: 0 };
    }
  }
}

