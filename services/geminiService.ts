
import { GoogleGenAI, Type } from "@google/genai";

export const generateQuestions = async (topic: string, count: number = 5) => {
  // Use a new instance with the required named parameter for the API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} multiple-choice questions about ${topic}. Ensure they vary in difficulty.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The question text" },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array of exactly 4 options"
            },
            correctAnswer: { 
              type: Type.INTEGER, 
              description: "Index of the correct answer (0-3)" 
            }
          },
          required: ["text", "options", "correctAnswer"]
        }
      }
    }
  });

  // Solely use the .text property (not a method) to extract the generated string.
  const jsonStr = response.text?.trim() || "[]";
  return JSON.parse(jsonStr);
};
