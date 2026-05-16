import { getGemini } from "./ai";
import { Type } from "@google/genai";
import { Intent, Provider } from "../types";

export class CommunicationAgent {
  async process(input: string) {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Normalize and detect language for this service request in Pakistan.
      Input: "${input}"
      Detect if it's Urdu, Sindhi, Roman Urdu, or English.
      Normalize the text to English.
      Return JSON with fields: { normalized: string, detectedLanguage: string }
      Example: { "normalized": "I need an electrician in Lahore", "detectedLanguage": "Roman Urdu" }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            normalized: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING }
          },
          required: ["normalized", "detectedLanguage"]
        }
      }
    });

    return JSON.parse(response.text);
  }
}

export class IntentAgent {
  async extract(normalizedInput: string): Promise<Intent> {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract service intent from this request: "${normalizedInput}"
      Return JSON with: service, location, urgency (NORMAL/HIGH/CRITICAL), time, language.
      The "language" field should match the detected language (e.g. Urdu, English, Roman Urdu).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            service: { type: Type.STRING },
            location: { type: Type.STRING },
            urgency: { type: Type.STRING, enum: ["NORMAL", "HIGH", "CRITICAL"] },
            time: { type: Type.STRING },
            language: { type: Type.STRING }
          },
          required: ["service", "location", "urgency", "time", "language"]
        }
      }
    });

    return JSON.parse(response.text);
  }
}

export class DiscoveryAgent {
  async search(location: string, service: string, userLocation: { lat: number; lng: number } | null): Promise<Provider[]> {
    const ai = getGemini();
    
    const baseLat = userLocation?.lat || 31.4805;
    const baseLng = userLocation?.lng || 74.3213;

    // Using Gemini for grounding simulation
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a search agent. Find 3 diverse ${service} providers in ${location}, Pakistan.
      Return JSON list of providers with: name, address_detail, specialty (e.g. "Pipe Burst Expert", "Industrial Wiring"), rating (4.0-5.0), price_service (PKR), price_parts (PKR).
      Make names sound realistic for Pakistan (e.g. "Ahmed's Quick Fix", "Lahore Service Pros").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address_detail: { type: Type.STRING },
              specialty: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              price_service: { type: Type.NUMBER },
              price_parts: { type: Type.NUMBER }
            },
            required: ["name", "address_detail", "specialty", "rating", "price_service", "price_parts"]
          }
        }
      }
    });

    const rawProviders = JSON.parse(response.text);

    return rawProviders.map((p: any, i: number) => ({
      id: `P${i + 1}`,
      name: p.name,
      location: { 
        lat: baseLat + (Math.random() - 0.5) * 0.01, 
        lng: baseLng + (Math.random() - 0.5) * 0.01, 
        address: `${p.address_detail}, ${location}` 
      },
      trustScore: 0.85 + Math.random() * 0.1,
      distance: `${(0.5 + Math.random() * 3).toFixed(1)}km`,
      availability: Math.random() > 0.5 ? "Immediate" : "In 30 mins",
      eta: `${Math.floor(10 + Math.random() * 30)} mins`,
      rating: p.rating,
      avatar: "",
      pricing: { serviceFee: p.price_service, partsEst: p.price_parts, total: p.price_service + p.price_parts },
      metrics: { 
        reliability: `${Math.floor(80 + Math.random() * 20)}%`, 
        consistency: `${Math.floor(80 + Math.random() * 20)}%` 
      },
      specialty: p.specialty
    }));
  }
}

export class TrustAgent {
  async evaluate(providers: Provider[]): Promise<Provider[]> {
    // In a real app, this would query Firebase/DB for historical data
    return providers.map(p => ({
      ...p,
      trustScore: p.trustScore * (0.9 + Math.random() * 0.2)
    }));
  }
}

export class NegotiationAgent {
  async resolve(providers: Provider[]): Promise<Provider> {
    // Sorting by trust score for the best recommendation
    return providers.sort((a, b) => b.trustScore - a.trustScore)[0];
  }
}

export class BookingAgent {
  async confirm(provider: Provider) {
    const bookingId = `ZAR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    return { success: true, bookingId, provider };
  }
}

export class FollowUpAgent {
  async schedule(bookingId: string) {
    return { status: "SCHEDULED", reminderAt: "T+30mins" };
  }
}
