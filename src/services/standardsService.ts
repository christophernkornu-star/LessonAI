import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StandardCoverage {
  id: string;
  user_id: string;
  subject: string;
  level: string;
  strand: string;
  sub_strand?: string;
  content_standard: string;
  lesson_note_id?: string;
  date_taught: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CoverageStats {
  totalStandards: number;
  coveredStandards: number;
  percentageCovered: number;
  bySubject: { [key: string]: { total: number; covered: number } };
  byStrand: { [key: string]: { total: number; covered: number } };
  recentlyCovered: StandardCoverage[];
}

export const standardsService = {
  /**
   * Record that a standard has been taught
   */
  async recordStandardCoverage(data: {
    subject: string;
    level: string;
    strand: string;
    sub_strand?: string;
    content_standard: string;
    lesson_note_id?: string;
    date_taught: string;
    notes?: string;
  }): Promise<StandardCoverage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: coverage, error } = await supabase
        .from('standards_coverage')
        .insert({
          user_id: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Standard coverage recorded!");
      return coverage;
    } catch (error) {
      console.error("Error recording standard coverage:", error);
      toast.error("Failed to record standard coverage");
      return null;
    }
  },

  /**
   * Get all covered standards for current user
   */
  async getCoveredStandards(filters?: {
    subject?: string;
    level?: string;
    strand?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StandardCoverage[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('standards_coverage')
        .select('*')
        .eq('user_id', user.id)
        .order('date_taught', { ascending: false });

      if (filters?.subject) {
        query = query.eq('subject', filters.subject);
      }
      if (filters?.level) {
        query = query.eq('level', filters.level);
      }
      if (filters?.strand) {
        query = query.eq('strand', filters.strand);
      }
      if (filters?.startDate) {
        query = query.gte('date_taught', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date_taught', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching covered standards:", error);
      return [];
    }
  },

  /**
   * Get coverage statistics
   */
  async getCoverageStats(subject?: string, level?: string): Promise<CoverageStats> {
    try {
      const covered = await this.getCoveredStandards({ subject, level });

      // Group by subject
      const bySubject: { [key: string]: { total: number; covered: number } } = {};
      covered.forEach(item => {
        if (!bySubject[item.subject]) {
          bySubject[item.subject] = { total: 0, covered: 0 };
        }
        bySubject[item.subject].covered++;
      });

      // Group by strand
      const byStrand: { [key: string]: { total: number; covered: number } } = {};
      covered.forEach(item => {
        if (!byStrand[item.strand]) {
          byStrand[item.strand] = { total: 0, covered: 0 };
        }
        byStrand[item.strand].covered++;
      });

      const recentlyCovered = covered.slice(0, 10);

      return {
        totalStandards: 0, // Would need curriculum database to calculate
        coveredStandards: covered.length,
        percentageCovered: 0,
        bySubject,
        byStrand,
        recentlyCovered,
      };
    } catch (error) {
      console.error("Error fetching coverage stats:", error);
      return {
        totalStandards: 0,
        coveredStandards: 0,
        percentageCovered: 0,
        bySubject: {},
        byStrand: {},
        recentlyCovered: [],
      };
    }
  },

  /**
   * Update standard coverage record
   */
  async updateStandardCoverage(
    id: string,
    updates: Partial<Pick<StandardCoverage, 'date_taught' | 'notes'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('standards_coverage')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success("Coverage updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating coverage:", error);
      toast.error("Failed to update coverage");
      return false;
    }
  },

  /**
   * Delete standard coverage record
   */
  async deleteStandardCoverage(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('standards_coverage')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Coverage record deleted!");
      return true;
    } catch (error) {
      console.error("Error deleting coverage:", error);
      toast.error("Failed to delete coverage");
      return false;
    }
  },

  /**
   * Check if a specific standard has been covered
   */
  async isStandardCovered(
    subject: string,
    level: string,
    contentStandard: string
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('standards_coverage')
        .select('id')
        .eq('user_id', user.id)
        .eq('subject', subject)
        .eq('level', level)
        .eq('content_standard', contentStandard)
        .limit(1);

      if (error) throw error;

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error("Error checking standard coverage:", error);
      return false;
    }
  },
};
