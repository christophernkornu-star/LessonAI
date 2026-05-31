import { supabase } from "@/integrations/supabase/client";
export class TimetableService {
    static async getTimetable(userId, classLevel, term = "First Term") {
        // 1. Try exact match using ilike for case-insensitivity on class_level
        // We also use ilike for term to be safe
        let { data, error } = await supabase
            .from("timetables")
            .select("*")
            .eq("user_id", userId)
            .ilike("class_level", classLevel)
            .ilike("term", term)
            .maybeSingle();
        // 2. If not found, try normalized variations (Basic 1 <-> basic1 <-> B1)
        if (!data && !error) {
            let normalizedLevel = classLevel;
            // Basic 1 -> basic1
            if (classLevel.match(/^Basic \d+$/i)) {
                normalizedLevel = classLevel.replace(" ", "").toLowerCase();
            }
            // basic1 -> Basic 1
            else if (classLevel.match(/^basic\d+$/i)) {
                normalizedLevel = classLevel.replace("basic", "Basic ");
                normalizedLevel = normalizedLevel.charAt(0).toUpperCase() + normalizedLevel.slice(1);
            }
            // B1 -> Basic 1
            else if (classLevel.match(/^B\d+$/i)) {
                normalizedLevel = classLevel.replace("B", "Basic ");
            }
            if (normalizedLevel !== classLevel) {
                const { data: retryData, error: retryError } = await supabase
                    .from("timetables")
                    .select("*")
                    .eq("user_id", userId)
                    .eq("class_level", normalizedLevel)
                    .eq("term", term)
                    .maybeSingle();
                if (retryData) {
                    data = retryData;
                    error = retryError;
                }
            }
        }
        if (error) {
            console.error("Error fetching timetable:", error);
            return null;
        }
        // Explicit cast to avoid type errors with Json types from Supabase
        return data ? {
            ...data,
            subject_config: data.subject_config,
            class_size: data.class_size ?? undefined
        } : null;
    }
    static async saveTimetable(timetable) {
        // Check if exists first to handle upsert correctly with unique constraints if needed, 
        // but standard upsert should work if we have the ID or match on unique columns.
        // Since we have a unique constraint on (user_id, class_level, term), upsert is perfect.
        const { data, error } = await supabase
            .from("timetables")
            .upsert({
            user_id: timetable.user_id,
            class_level: timetable.class_level,
            term: timetable.term,
            subject_config: timetable.subject_config, // Cast to any to satisfy Json type
            class_size: timetable.class_size
        }, { onConflict: 'user_id,class_level,term' })
            .select()
            .single();
        if (error) {
            console.error("Error saving timetable:", error);
            throw error;
        }
        return data ? {
            ...data,
            subject_config: data.subject_config,
            class_size: data.class_size ?? undefined
        } : null;
    }
    static async getAllTimetables(userId) {
        const { data, error } = await supabase
            .from("timetables")
            .select("*")
            .eq("user_id", userId);
        if (error) {
            console.error("Error fetching all timetables:", error);
            return [];
        }
        return (data || []).map(item => ({
            ...item,
            subject_config: item.subject_config,
            class_size: item.class_size ?? undefined
        }));
    }
    // Robust fuzzy finder for timetable
    static async findTimetable(userId, classLevel, term = "First Term") {
        console.log(`Searching for timetable: User=${userId}, Level='${classLevel}', Term='${term}'`);
        // 1. Fetch ALL timetables for this user (usually fewer than 20 records)
        const { data: allTimetables, error } = await supabase
            .from("timetables")
            .select("*")
            .eq("user_id", userId);
        if (error || !allTimetables) {
            console.error("Error fetching all timetables:", error);
            return null;
        }
        console.log(`Found ${allTimetables.length} total timetables for user.`);
        // 2. Perform fuzzy matching in memory
        // Normalize target level: "basic 2" -> "basic2"
        const target = classLevel.toLowerCase().replace(/\s+/g, "");
        const targetNum = target.match(/\d+/)?.[0];
        const matchedToken = allTimetables.find(t => {
            const dbLevel = t.class_level.toLowerCase().replace(/\s+/g, "");
            // Match exact (ignoring space/case)
            if (dbLevel === target)
                return true;
            // Match standard variations
            // if target is "basic2", match "b2", "class2", "year2"
            if (targetNum) {
                // Check if dbLevel contains the checks
                const dbNum = dbLevel.match(/\d+/)?.[0];
                if (dbNum === targetNum) {
                    // Number matches. Check if prefix is compatible.
                    // "basic" starts with b, "class" starts with c...
                    // Ideally, if user asks for "Basic 2", and we have "Class 2", we might accept it?
                    // Depending on school system. Let's assume yes if number is unique.
                    return true;
                }
            }
            return false;
        });
        if (matchedToken) {
            console.log(`Match found! '${classLevel}' -> '${matchedToken.class_level}'`);
            // Check term match if necessary (optional loose match)
            // If strict term match is required:
            if (term && matchedToken.term && matchedToken.term.toLowerCase() !== term.toLowerCase()) {
                console.warn(`Term mismatch: Requested '${term}', Found '${matchedToken.term}'. Proceeding anyway as fallback.`);
            }
            return {
                ...matchedToken,
                subject_config: matchedToken.subject_config,
                class_size: matchedToken.class_size ?? undefined
            };
        }
        console.log("No matching timetable found in memory.");
        return null;
    }
}
