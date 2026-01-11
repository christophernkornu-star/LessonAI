// Enhanced curriculum data with content standards
// This structure allows dynamic selection of Strand -> Sub-Strand -> Content Standard

export interface ContentStandard {
  code: string;
  description: string;
  indicators?: string[];
}

export interface EnhancedSubStrand {
  value: string;
  label: string;
  contentStandards: ContentStandard[];
}

export interface EnhancedStrand {
  value: string;
  label: string;
  subStrands: EnhancedSubStrand[];
}

export interface EnhancedSubject {
  value: string;
  label: string;
  strands: EnhancedStrand[];
}

// Computing subject with full content standards
export const COMPUTING_STANDARDS: EnhancedSubject = {
  value: "computing",
  label: "Computing",
  strands: [
    {
      value: "computing-systems",
      label: "Computing Systems",
      subStrands: [
        {
          value: "networks",
          label: "Networks",
          contentStandards: [
            {
              code: "B7.1.1.1",
              description: "Demonstrate understanding of computer networks and their components",
              indicators: [
                "Explain what a computer network is",
                "Identify types of networks (LAN, WAN, MAN)",
                "Describe network components (router, switch, hub, modem)"
              ]
            },
            {
              code: "B7.1.1.2",
              description: "Understand network topologies and their applications",
              indicators: [
                "Identify different network topologies (star, bus, ring, mesh)",
                "Explain advantages and disadvantages of each topology",
                "Apply appropriate topology for given scenarios"
              ]
            },
            {
              code: "B7.1.1.3",
              description: "Demonstrate knowledge of internet connectivity",
              indicators: [
                "Explain how devices connect to the internet",
                "Describe the role of ISPs",
                "Understand IP addresses and domain names"
              ]
            }
          ]
        },
        {
          value: "hardware",
          label: "Hardware",
          contentStandards: [
            {
              code: "B7.1.2.1",
              description: "Identify and explain the functions of computer hardware components",
              indicators: [
                "Identify input devices and their functions",
                "Identify output devices and their functions",
                "Explain the role of processing and storage devices"
              ]
            },
            {
              code: "B7.1.2.2",
              description: "Demonstrate understanding of computer maintenance",
              indicators: [
                "Perform basic computer maintenance tasks",
                "Identify common hardware problems",
                "Apply safety procedures when handling hardware"
              ]
            }
          ]
        },
        {
          value: "software",
          label: "Software",
          contentStandards: [
            {
              code: "B7.1.3.1",
              description: "Differentiate between system and application software",
              indicators: [
                "Explain the purpose of system software",
                "Identify types of application software",
                "Demonstrate use of various software applications"
              ]
            },
            {
              code: "B7.1.3.2",
              description: "Understand software installation and management",
              indicators: [
                "Install and uninstall software properly",
                "Manage software updates",
                "Understand software licensing"
              ]
            }
          ]
        },
        {
          value: "internet-safety",
          label: "Internet Safety",
          contentStandards: [
            {
              code: "B7.1.4.1",
              description: "Demonstrate safe internet practices",
              indicators: [
                "Identify online threats and risks",
                "Apply safe browsing practices",
                "Protect personal information online"
              ]
            },
            {
              code: "B7.1.4.2",
              description: "Understand cyberbullying and digital ethics",
              indicators: [
                "Define cyberbullying and its effects",
                "Demonstrate responsible online behavior",
                "Report inappropriate online content"
              ]
            }
          ]
        }
      ]
    },
    {
      value: "computational-thinking",
      label: "Computational Thinking",
      subStrands: [
        {
          value: "algorithms",
          label: "Algorithms",
          contentStandards: [
            {
              code: "B7.2.1.1",
              description: "Understand and create algorithms to solve problems",
              indicators: [
                "Define what an algorithm is",
                "Create step-by-step solutions to problems",
                "Represent algorithms using flowcharts and pseudocode"
              ]
            },
            {
              code: "B7.2.1.2",
              description: "Analyze and improve algorithm efficiency",
              indicators: [
                "Identify efficient and inefficient algorithms",
                "Optimize existing algorithms",
                "Test algorithms with different inputs"
              ]
            }
          ]
        },
        {
          value: "programming-concepts",
          label: "Programming Concepts",
          contentStandards: [
            {
              code: "B7.2.2.1",
              description: "Apply basic programming concepts",
              indicators: [
                "Understand variables and data types",
                "Use conditional statements (if/else)",
                "Implement loops (for, while)"
              ]
            },
            {
              code: "B7.2.2.2",
              description: "Write and debug simple programs",
              indicators: [
                "Create programs using block-based coding",
                "Identify and fix errors in code",
                "Test programs with various inputs"
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Mathematics subject with content standards
export const MATHEMATICS_STANDARDS: EnhancedSubject = {
  value: "mathematics",
  label: "Mathematics",
  strands: [
    {
      value: "number",
      label: "Number",
      subStrands: [
        {
          value: "whole-numbers",
          label: "Whole Numbers",
          contentStandards: [
            {
              code: "B7.3.1.1",
              description: "Demonstrate understanding of place value up to millions",
              indicators: [
                "Read and write numbers up to millions",
                "Identify place value of digits in large numbers",
                "Compare and order large numbers"
              ]
            },
            {
              code: "B7.3.1.2",
              description: "Perform operations with whole numbers",
              indicators: [
                "Add and subtract whole numbers with regrouping",
                "Multiply multi-digit numbers",
                "Divide whole numbers with remainders"
              ]
            }
          ]
        },
        {
          value: "fractions",
          label: "Fractions",
          contentStandards: [
            {
              code: "B7.3.2.1",
              description: "Understand and represent fractions",
              indicators: [
                "Identify proper, improper, and mixed fractions",
                "Convert between different fraction forms",
                "Compare and order fractions"
              ]
            },
            {
              code: "B7.3.2.2",
              description: "Perform operations with fractions",
              indicators: [
                "Add and subtract fractions with like and unlike denominators",
                "Multiply and divide fractions",
                "Solve word problems involving fractions"
              ]
            }
          ]
        }
      ]
    },
    {
      value: "algebra",
      label: "Algebra",
      subStrands: [
        {
          value: "patterns",
          label: "Patterns",
          contentStandards: [
            {
              code: "B7.4.1.1",
              description: "Identify and extend numerical and geometric patterns",
              indicators: [
                "Recognize patterns in number sequences",
                "Extend patterns following given rules",
                "Create own patterns using different rules"
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Combined curriculum standards
export const ENHANCED_CURRICULUM: EnhancedSubject[] = [
  COMPUTING_STANDARDS,
  MATHEMATICS_STANDARDS,
  // Add more subjects as needed
];

/**
 * Get all strands for a subject
 */
export function getSubjectStrands(subjectValue: string): EnhancedStrand[] {
  const subject = ENHANCED_CURRICULUM.find(s => s.value === subjectValue);
  return subject?.strands || [];
}

/**
 * Get all sub-strands for a strand
 */
export function getStrandSubStrands(subjectValue: string, strandValue: string): EnhancedSubStrand[] {
  const subject = ENHANCED_CURRICULUM.find(s => s.value === subjectValue);
  const strand = subject?.strands.find(st => st.value === strandValue);
  return strand?.subStrands || [];
}

/**
 * Get all content standards for a sub-strand
 */
export function getSubStrandContentStandards(
  subjectValue: string,
  strandValue: string,
  subStrandValue: string
): ContentStandard[] {
  const subject = ENHANCED_CURRICULUM.find(s => s.value === subjectValue);
  const strand = subject?.strands.find(st => st.value === strandValue);
  const subStrand = strand?.subStrands.find(ss => ss.value === subStrandValue);
  return subStrand?.contentStandards || [];
}

/**
 * Get all indicators for a content standard
 */
export function getContentStandardIndicators(
  subjectValue: string,
  strandValue: string,
  subStrandValue: string,
  standardCode: string
): string[] {
  const standards = getSubStrandContentStandards(subjectValue, strandValue, subStrandValue);
  const standard = standards.find(s => s.code === standardCode);
  return standard?.indicators || [];
}
