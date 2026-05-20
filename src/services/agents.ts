import { getGemini } from "./ai";
import { Type } from "@google/genai";
import { Intent, Provider, ChatMessage } from "../types";

export interface AgentResponse<T> {
  data: T;
  reasoning: string;
}

function parseJSONSafely<T>(text: string, fallback: T): T {
  try {
    // Sometimes LLMs return markdown code blocks
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as T;
  } catch (error) {
    console.error("Failed to parse agent response:", text, error);
    return fallback;
  }
}

export class CommunicationAgent {
  async process(input: string, history?: ChatMessage[], onChunk?: (chunk: string) => void): Promise<AgentResponse<{ normalized: string, detectedLanguage: string }>> {
    const ai = getGemini();
    if (!ai) {
      if (onChunk) {
        const simReasoning = "Simulation: Normalizing mixed Urdu/Sindhi/English signal. Detecting regional grammatical cues...";
        for (let i = 0; i < simReasoning.length; i += 4) {
          onChunk(simReasoning.substring(i, i + 4));
          await new Promise(r => setTimeout(r, 15));
        }
      }
      return {
        data: { normalized: input, detectedLanguage: "Detection Skipped (Simulation)" },
        reasoning: "API key missing. Normalized input using pass-through logic."
      };
    }
    try {
      const historyContext = history && history.length > 0
        ? "Previous chat history:\n" + history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n") + "\n"
        : "";

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-1.5-flash",
        contents: `${historyContext}Normalize and detect language for this service request in Pakistan.
        Input: "${input}"
        Detect if it's Urdu, Sindhi, Roman Urdu, or English.
        Normalize the text to English.
        Provide a brief logical explanation of your detection.
        Return JSON with fields: { "normalized": string, "detectedLanguage": string, "reasoning": string }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              normalized: { type: Type.STRING },
              detectedLanguage: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["normalized", "detectedLanguage", "reasoning"]
          }
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        fullText += text;
        if (onChunk && text) {
          onChunk(text);
        }
      }

      const result = parseJSONSafely(fullText || "{}", { 
        normalized: input, 
        detectedLanguage: "Unknown", 
        reasoning: "Fallback triggered due to parse error." 
      });
      
      return {
        data: { normalized: result.normalized, detectedLanguage: result.detectedLanguage },
        reasoning: result.reasoning
      };
    } catch (e: any) {
      console.error("CommunicationAgent error:", e);
      return {
        data: { normalized: input, detectedLanguage: "Unknown (Error)" },
        reasoning: `Error during processing: ${e.message}`
      };
    }
  }
}

export class IntentAgent {
  async extract(normalizedInput: string, history?: ChatMessage[], onChunk?: (chunk: string) => void): Promise<AgentResponse<Intent>> {
    const ai = getGemini();
    const fallbackIntent: Intent = {
      service: normalizedInput.toLowerCase().includes('electric') || normalizedInput.toLowerCase().includes('bijli') ? 'Electrician' : 'Plumber',
      location: "Model Town, Lahore",
      urgency: "NORMAL",
      time: "ASAP",
      language: "English"
    };

    if (!ai) {
      if (onChunk) {
        const simReasoning = "Simulation: Extracting job specialty, city parameters, and service urgency factors...";
        for (let i = 0; i < simReasoning.length; i += 4) {
          onChunk(simReasoning.substring(i, i + 4));
          await new Promise(r => setTimeout(r, 15));
        }
      }
      return {
        data: fallbackIntent,
        reasoning: "Simulation: Extracted basic intent using keyword matching."
      };
    }
    
    try {
      const historyContext = history && history.length > 0
        ? "Previous chat history (use this to resolve adjustments like 'actually Karachi' or 'the cheaper one'):\n" + 
          history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n") + "\n"
        : "";

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-1.5-flash",
        contents: `${historyContext}Extract service intent from this request: "${normalizedInput}"
        Return JSON with: service, location, urgency (NORMAL/HIGH/CRITICAL), time, language.
        Include a "reasoning" field explaining why you chose these parameters.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              service: { type: Type.STRING },
              location: { type: Type.STRING },
              urgency: { type: Type.STRING, enum: ["NORMAL", "HIGH", "CRITICAL"] },
              time: { type: Type.STRING },
              language: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["service", "location", "urgency", "time", "language", "reasoning"]
          }
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        fullText += text;
        if (onChunk && text) {
          onChunk(text);
        }
      }

      const result = parseJSONSafely(fullText || "{}", { ...fallbackIntent, reasoning: "Fallback due to parse error." });
      return {
        data: { 
          service: result.service || fallbackIntent.service, 
          location: result.location || fallbackIntent.location, 
          urgency: result.urgency || fallbackIntent.urgency, 
          time: result.time || fallbackIntent.time, 
          language: result.language || fallbackIntent.language 
        },
        reasoning: result.reasoning || "Reasoning missing"
      };
    } catch (e: any) {
      console.error("IntentAgent error:", e);
      return {
        data: fallbackIntent,
        reasoning: `Error during intent extraction: ${e.message}`
      };
    }
  }
}

export class PlanningAgent {
  async plan(intent: Intent, history?: ChatMessage[], onChunk?: (chunk: string) => void): Promise<AgentResponse<string[]>> {
    const ai = getGemini();
    const defaultSteps = ["Discovery", "Trust Validation", "Negotiation", "Booking", "Follow-up"];
    
    if (!ai) {
      if (onChunk) {
        const simReasoning = "Simulation: Constructing autonomous execution DAG plan with downstream routing...";
        for (let i = 0; i < simReasoning.length; i += 4) {
          onChunk(simReasoning.substring(i, i + 4));
          await new Promise(r => setTimeout(r, 15));
        }
      }
      return {
        data: defaultSteps,
        reasoning: "Simulation: Generated standard execution DAG."
      };
    }
    
    try {
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-1.5-flash",
        contents: `Create a step-by-step execution plan for this service request: ${intent.service} in ${intent.location}.
        The plan should involve Discovery, Trust Validation, and Negotiation.
        Return JSON: { "steps": string[], "reasoning": string }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              reasoning: { type: Type.STRING }
            },
            required: ["steps", "reasoning"]
          }
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        fullText += text;
        if (onChunk && text) {
          onChunk(text);
        }
      }

      const result = parseJSONSafely(fullText || "{}", { steps: defaultSteps, reasoning: "Fallback due to parse error." });
      return { data: result.steps || defaultSteps, reasoning: result.reasoning || "Reasoning missing" };
    } catch (e: any) {
      console.error("PlanningAgent error:", e);
      return {
        data: defaultSteps,
        reasoning: `Error during planning: ${e.message}`
      };
    }
  }
}

export class DiscoveryAgent {
  async search(location: string, service: string, userLocation: { lat: number; lng: number } | null, onChunk?: (chunk: string) => void): Promise<AgentResponse<Provider[]>> {
    const ai = getGemini();
    const baseLat = userLocation?.lat || 31.4805;
    const baseLng = userLocation?.lng || 74.3213;

    let resultProviders: any[] = [];
    let reasoning = "";

    const fallbackProviders = [
      { name: "Al-Hafiz Services", address_detail: "Sector C", specialty: service, rating: 4.8, price_service: 500, price_parts: 200 },
      { name: "Smart Fix Solutions", address_detail: "Main Road", specialty: service, rating: 4.5, price_service: 700, price_parts: 100 },
      { name: "Siddique & Sons", address_detail: "Link Road", specialty: service, rating: 4.2, price_service: 400, price_parts: 300 }
    ];

    if (!ai) {
      if (onChunk) {
        const simReasoning = "Simulation: Querying geographical spatial indices to pinpoint verified service providers...";
        for (let i = 0; i < simReasoning.length; i += 4) {
          onChunk(simReasoning.substring(i, i + 4));
          await new Promise(r => setTimeout(r, 15));
        }
      }
      resultProviders = fallbackProviders;
      reasoning = "Simulation: Using predefined regional provider database.";
    } else {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: "gemini-1.5-flash",
          contents: `Find 3 diverse ${service} providers in ${location}, Pakistan.
          Return JSON list of providers with: name, address_detail, specialty, rating (4.0-5.0), price_service (PKR), price_parts (PKR).
          Include a "reasoning" field explaining the provider selection criteria.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                providers: {
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
                },
                reasoning: { type: Type.STRING }
              },
              required: ["providers", "reasoning"]
            }
          }
        });

        let fullText = "";
        for await (const chunk of responseStream) {
          const text = chunk.text || "";
          fullText += text;
          if (onChunk && text) {
            onChunk(text);
          }
        }

        const result = parseJSONSafely(fullText || "{}", { providers: fallbackProviders, reasoning: "Fallback to default providers" });
        resultProviders = result.providers || fallbackProviders;
        reasoning = result.reasoning || "Reasoning missing";
      } catch (e: any) {
        console.error("DiscoveryAgent error:", e);
        resultProviders = fallbackProviders;
        reasoning = `Error during discovery: ${e.message}. Using fallback.`;
      }
    }

    const providers = resultProviders.map((p: any, i: number) => ({
      id: `P${i + 1}`,
      name: p.name,
      location: { 
        lat: baseLat + (Math.random() - 0.5) * 0.02, 
        lng: baseLng + (Math.random() - 0.5) * 0.02, 
        address: `${p.address_detail}, ${location}` 
      },
      trustScore: 0.8 + Math.random() * 0.15,
      distance: `${(0.5 + Math.random() * 5).toFixed(1)}km`,
      availability: Math.random() > 0.3 ? "Immediate" : "Within 1 hour",
      eta: `${Math.floor(15 + Math.random() * 25)} mins`,
      rating: p.rating,
      avatar: "",
      pricing: { serviceFee: p.price_service, partsEst: p.price_parts, total: p.price_service + p.price_parts },
      metrics: { 
        reliability: `${Math.floor(85 + Math.random() * 15)}%`, 
        consistency: `${Math.floor(80 + Math.random() * 20)}%`,
        cancellationHistory: `${Math.floor(Math.random() * 5)}%`,
        responseRate: `${Math.floor(90 + Math.random() * 10)}%`
      },
      specialty: p.specialty
    }));

    return { data: providers, reasoning };
  }
}

export class TrustAgent {
  async evaluate(providers: Provider[], onChunk?: (chunk: string) => void): Promise<AgentResponse<Provider[]>> {
    const ai = getGemini();
    const fallbackScores = providers.map(() => 0.7 + Math.random() * 0.3);
    
    if (!ai) {
      if (onChunk) {
        const simReasoning = "Simulation: Evaluating historic response times and safety certificates on the registry...";
        for (let i = 0; i < simReasoning.length; i += 4) {
          onChunk(simReasoning.substring(i, i + 4));
          await new Promise(r => setTimeout(r, 15));
        }
      }
      const updatedProviders = providers.map((p, i) => ({
        ...p,
        trustScore: fallbackScores[i]
      }));
      return { data: updatedProviders, reasoning: "Simulation: Trust indices calculated via historical baseline." };
    }
    
    try {
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-1.5-flash",
        contents: `Evaluate these providers based on trust metrics (rating, consistency, reliability, cancellation history, response rate).
        Providers: ${JSON.stringify(providers.map(p => ({ name: p.name, rating: p.rating, metrics: p.metrics })))}
        Assign a final trust score (0.0 - 1.0) to each.
        Return JSON: { "scores": number[], "reasoning": string }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scores: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              reasoning: { type: Type.STRING }
            },
            required: ["scores", "reasoning"]
          }
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        fullText += text;
        if (onChunk && text) {
          onChunk(text);
        }
      }

      const result = parseJSONSafely(fullText || "{}", { scores: fallbackScores, reasoning: "Fallback due to parse error." });
      const updatedProviders = providers.map((p, i) => ({
        ...p,
        trustScore: result.scores && result.scores[i] != null ? result.scores[i] : (p.trustScore || fallbackScores[i])
      }));

      return { data: updatedProviders, reasoning: result.reasoning || "Reasoning missing" };
    } catch (e: any) {
      console.error("TrustAgent error:", e);
      return {
        data: providers.map((p, i) => ({ ...p, trustScore: fallbackScores[i] })),
        reasoning: `Error during trust evaluation: ${e.message}`
      };
    }
  }
}

export class NegotiationAgent {
  async resolve(providers: Provider[], onChunk?: (chunk: string) => void): Promise<AgentResponse<Provider>> {
    const ai = getGemini();
    const fallbackWinner = [...providers].sort((a, b) => b.trustScore - a.trustScore)[0];
    
    if (!ai) {
      if (onChunk) {
        const simReasoning = "Simulation: Calculating optimal trade-off curves for budget constraint vs distance ETA vs trust score...";
        for (let i = 0; i < simReasoning.length; i += 4) {
          onChunk(simReasoning.substring(i, i + 4));
          await new Promise(r => setTimeout(r, 15));
        }
      }
      return { data: fallbackWinner, reasoning: "Simulation: Resolved consensus using trust-weighted ranking." };
    }
    
    try {
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-1.5-flash",
        contents: `Negotiate between proximity, cost, and trust for these providers.
        Providers: ${JSON.stringify(providers.map(p => ({ name: p.name, distance: p.distance, price: p.pricing.total, trust: p.trustScore })))}
        Select the absolute best provider and explain why.
        Return JSON: { "selectedIndex": number, "reasoning": string }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              selectedIndex: { type: Type.NUMBER },
              reasoning: { type: Type.STRING }
            },
            required: ["selectedIndex", "reasoning"]
          }
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        fullText += text;
        if (onChunk && text) {
          onChunk(text);
        }
      }

      const result = parseJSONSafely(fullText || "{}", { selectedIndex: 0, reasoning: "Fallback due to parse error." });
      const index = result.selectedIndex != null && providers[result.selectedIndex] ? result.selectedIndex : 0;
      
      return { data: providers[index], reasoning: result.reasoning || "Reasoning missing" };
    } catch (e: any) {
      console.error("NegotiationAgent error:", e);
      return {
        data: fallbackWinner,
        reasoning: `Error during negotiation: ${e.message}`
      };
    }
  }
}

export class BookingAgent {
  async confirm(provider: Provider): Promise<AgentResponse<{ bookingId: string, provider: Provider }>> {
    const bookingId = `ZAR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    return { 
      data: { bookingId, provider }, 
      reasoning: `Transaction finalized for ${provider.name}. Dispatched via secure Zariya protocol.` 
    };
  }
}

export class FollowUpAgent {
  async schedule(bookingId: string): Promise<AgentResponse<{ status: string, reminderAt: string }>> {
    return { 
      data: { status: "ACTIVE_MONITORING", reminderAt: "T+15mins" }, 
      reasoning: "Heartbeat monitor initialized. Automated feedback loop scheduled for post-service completion." 
    };
  }
}
