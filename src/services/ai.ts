import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

export function getGemini() {
  // Check both process.env and a potential fallback for local development
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "" || apiKey === "your_api_key_here" || apiKey === "your_gemini_api_key_here") {
    console.warn("GEMINI_API_KEY is not set. AI orchestration will run in simulation mode.");
    return null;
  }

  if (!genAI) {
    try {
      genAI = new GoogleGenAI({ apiKey });
    } catch (error) {
      console.error("Failed to initialize GoogleGenAI:", error);
      return null;
    }
  }
  return genAI;
}

