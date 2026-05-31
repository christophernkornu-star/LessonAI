import { supabase } from "@/integrations/supabase/client";
export class ClassProfileService {
    static async getClassProfiles(userId) {
        try {
            const { data, error } = await supabase
                .from("class_cover_profiles")
                .select("*")
                .eq("user_id", userId)
                .order("class_level", { ascending: true });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error("Error fetching class profiles:", error);
            return [];
        }
    }
    static async upsertClassProfile(userId, classLevel, schoolName, teacherName, subjectTeachers = {}) {
        try {
            const { data, error } = await supabase
                .from("class_cover_profiles")
                .upsert([
                {
                    user_id: userId,
                    class_level: classLevel,
                    school_name: schoolName,
                    teacher_name: teacherName,
                    subject_teachers: subjectTeachers,
                },
            ], { onConflict: "user_id,class_level", returning: "representation" })
                .select();
            if (error)
                throw error;
            if (!data || data.length === 0) {
                return null;
            }
            return data[0];
        }
        catch (error) {
            console.error("Error upserting class profile:", error);
            return null;
        }
    }
    static async deleteClassProfile(userId, classLevel) {
        try {
            const { error } = await supabase
                .from("class_cover_profiles")
                .delete()
                .eq("user_id", userId)
                .eq("class_level", classLevel);
            if (error)
                throw error;
            return true;
        }
        catch (error) {
            console.error("Error deleting class profile:", error);
            return false;
        }
    }
}
