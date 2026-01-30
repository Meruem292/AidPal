import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { AnalysisResult } from "./types.ts";

/**
 * Zod schema to strictly validate the model's output.
 */
const AnalysisResultSchema = z.object({
  woundType: z.string().min(1, "Wound type is required"),
  severity: z.enum(['Low', 'Medium', 'High']),
  description: z.string().min(1, "Description is required"),
  firstAidSteps: z.array(z.string()).min(1, "At least one first aid step is required"),
  recommendation: z.string().min(1, "Recommendation is required"),
});

/**
 * GenAI Response Schema configuration.
 */
const ANALYSIS_SCHEMA_GENAI = {
  type: Type.OBJECT,
  properties: {
    woundType: {
      type: Type.STRING,
      description: "The identified name of the wound or skin condition.",
    },
    severity: {
      type: Type.STRING,
      description: "Severity level: Low, Medium, or High.",
    },
    description: {
      type: Type.STRING,
      description: "A friendly and professional description of what the AI sees.",
    },
    firstAidSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step-by-step first aid actions to take immediately.",
    },
    recommendation: {
      type: Type.STRING,
      description: "Medical recommendation (e.g., visit a clinic, monitor at home, call emergency).",
    },
  },
  required: ["woundType", "severity", "description", "firstAidSteps", "recommendation"],
};

const MEDICAL_PDF_KNOWLEDGE = `
WOUNDS & SKIN INJURIES PROTOCOLS (102 Total):
1. Cut: Rinse with water. Press gently with clean cloth to stop bleeding. Apply antiseptic. Cover with bandage. Note: Consult professional if bleeding > 10m.
2. Scrape (Abrasion): Wash with soap/water. Remove dirt gently. Apply ointment. Cover lightly.
3. Bruise: Apply cold compress (10-15m). Rest. Repeat after hours.
4. Minor Burn: Cool under water (10m). Gently dry. Apply burn cream/aloe. Cover loosely.
5. Blister: Wash area. Do not pop. Cover with bandage. Keep clean/dry.
6. Splinter: Clean area. Remove with tweezers. Wash again. Cover if bleeding.
7. Insect Bite: Wash with soap/water. Cold compress. Anti-itch cream.
8. Insect Sting: Remove stinger gently. Wash. Cold compress. Watch for swelling.
9. Puncture Wound: Rinse. Let bleed slightly. Antiseptic. Cover.
10. Minor Skin Rash: Wash gently. Dry softly. Soothing cream. Avoid irritants.
... (Protocols 11-102)
102. Mild Callus: Soak in water. Smooth skin. Moisturizer.
`;

/**
 * Optimized list of available multimodal models.
 */
const MODELS_TO_TRY = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-flash-lite-latest',
  'gemini-3-pro-preview'
];

/**
 * AidPal Analysis Service with Extended Model Fallback.
 */
export const analyzeWound = async (base64Image: string, context: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`AidPal: Attempting ${modelName}...`);
      
      const promptPart = {
        text: `You are AidPal, a friendly health buddy. Analyze this medical image.
        
        KNOWLEDGE BASE:
        ${MEDICAL_PDF_KNOWLEDGE}
        
        USER CONTEXT: ${context || "None provided."}
        
        INSTRUCTIONS:
        1. Identify the condition clearly. 
        2. Follow the KNOWLEDGE BASE protocols for first aid.
        3. Return ONLY a valid JSON object.
        4. Disclaimer: "I'm a robot buddy, not a doc! This is not a professional diagnosis."

        REQUIRED JSON STRUCTURE:
        {
          "woundType": "string",
          "severity": "Low" | "Medium" | "High",
          "description": "string",
          "firstAidSteps": ["string"],
          "recommendation": "string"
        }`,
      };

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [imagePart, promptPart]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_SCHEMA_GENAI,
        },
      });

      const resultText = response.text;
      if (!resultText) throw new Error("Empty response");

      let cleanJson = resultText.trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanJson = jsonMatch[0];
      
      const parsedData = JSON.parse(cleanJson);
      return AnalysisResultSchema.parse(parsedData) as AnalysisResult;

    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.code;
      if (status === 429 || status === 404 || status === 503) continue;
      continue;
    }
  }

  throw new Error(lastError?.message || "All AI buddies are currently busy. Try again in a minute! 🏥");
};