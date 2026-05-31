import { generateLessonNoteDocx } from "../src/services/docxService";
import { generateGhanaLessonDocx } from "../src/services/ghanaLessonDocxService";
async function run() {
    const text = `Activity 1: Introduction\nThe teacher asks: What is 2 + 3?\nStudents respond.\n\nSolve the following: $\\frac{1}{2} + \\frac{1}{3} = $\n\nActivity 2: Practice\n- Write the answers.\n- Check work.`;
    const metadata = { subject: "Mathematics", level: "Basic 4", strand: "Numbers", templateName: "Test" };
    try {
        console.log("Generating lesson note docx...");
        await generateLessonNoteDocx(text, metadata, "test-lesson-note.docx");
        console.log("lesson note docx generation finished");
    }
    catch (err) {
        console.error("lesson note generation failed", err);
    }
    const jsonData = [{ subject: "Mathematics", class: "Basic 4", weekEnding: "Friday", day: "Monday", duration: "40 mins", strand: "Numbers", subStrand: "Fractions", lesson: "1 of 1", phases: { phase1_starter: { duration: "10 mins", content: "Starter" }, phase2_newLearning: { duration: "40 mins", content: "New Learning" }, phase3_reflection: { duration: "10 mins", content: "Reflection" } } }];
    try {
        console.log("Generating Ghana lesson docx...");
        await generateGhanaLessonDocx(jsonData, "test-ghana-lesson.docx", true, { subject: "Mathematics", level: "Basic 4", term: "Term 1", week: "Week 1", teacherName: "Teacher" });
        console.log("ghana lesson docx generation finished");
    }
    catch (err) {
        console.error("ghana lesson generation failed", err);
    }
}
run().catch(console.error);
