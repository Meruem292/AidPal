import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { AnalysisResult } from "./types";

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
 * Expanded list of multimodal models to maximize availability and bypass RPD/RPM limits.
 * We prioritize Flash models for speed and cost, then fallback to Pro for depth.
 */
const MODELS_TO_TRY = [
  'gemini-3-flash-preview',                        // Primary: Fastest Gemini 3
  'gemini-2.5-flash-native-audio-preview-12-2025', // Reliable Vision fallback
  'gemini-flash-lite-latest',                      // High-throughput fallback
  'gemini-3-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
                            // Final: Most powerful reasoning
];

/**
 * AidPal Analysis Service with Extended Model Fallback.
 * Attempts each model in order if the previous one fails due to rate limits or capacity.
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
      console.log(`AidPal: Calling health buddy "${modelName}"...`);
      
      const promptPart = {
        text: `You are AidPal, a friendly and expert health buddy. Analyze this medical image.
        
        KNOWLEDGE BASE:
        ${MEDICAL_PDF_KNOWLEDGE}
        
        USER CONTEXT: ${context || "None provided."}
        
        INSTRUCTIONS:
        1. Identify the condition clearly based on the image and user context. 
        2. Strictly follow the KNOWLEDGE BASE protocols for step-by-step first aid.
        3. Return ONLY a valid JSON object. 
        4. Do not include any text outside the JSON.
        5. Mention you are an AI health buddy, not a doctor.
        6. Disclaimer: "I'm a robot buddy, not a doc! This is not a professional diagnosis."

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
      if (!resultText) {
        throw new Error("Received an empty response from the AI buddy.");
      }

      // Sanitize output for potential markdown code blocks
      let cleanJson = resultText.trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }
      
      const parsedData = JSON.parse(cleanJson);
      const validatedResult = AnalysisResultSchema.parse(parsedData);
      
      console.log(`AidPal: Health buddy "${modelName}" successfully completed the report.`);
      return validatedResult as AnalysisResult;

    } catch (error: any) {
      lastError = error;
      const statusCode = error?.status || error?.code;
      
      console.warn(`AidPal: Health buddy "${modelName}" failed. Reason: ${error?.message || 'Unknown'}. Status: ${statusCode}`);
      
      // If we hit rate limits (429) or other temporary issues, try the next model.
      // If we hit a 404 (Not Found), it might be a configuration issue, so we skip to next too.
      if (statusCode === 429 || statusCode === 404 || statusCode === 503) {
        console.log(`AidPal: Switching to the next available buddy due to status ${statusCode}...`);
        continue;
      }
      
      // For other critical errors, we might still want to try the fallback just in case.
      continue;
    }
  }

  // All models failed
  console.error("AidPal Service Critical Failure: All AI health buddies failed to respond.", lastError);
  
  const status = lastError?.status || lastError?.code;
  if (status === 429) {
    throw new Error("I've been a bit too busy helping others! 🧘 Please take a deep breath and try again in a minute.");
  }
  
  if (status === 404) {
    throw new Error("My medical database is currently undergoing maintenance. 🩺 Please check back in a few minutes!");
  }

  throw new Error("All my health buddies are currently busy or unavailable. 🏥 Let's try one more snap in a bit!");
};
