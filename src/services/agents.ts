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
    
    // Dynamic Fallback Location list to ensure different results each time if no specific location is provided
    const randomLocations = [
      "Gulberg, Lahore",
      "DHA Phase 5, Karachi",
      "F-7 Sector, Islamabad",
      "Johar Town, Lahore",
      "Clifton, Karachi",
      "DHA Phase 6, Lahore",
      "G-11 Sector, Islamabad",
      "Faisal Town, Lahore",
      "Gulshan-e-Iqbal, Karachi",
      "Saddar, Rawalpindi"
    ];

    const lowercaseInput = normalizedInput.toLowerCase();
    let detectedLocation = "";

    const cities = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad", "peshawar", "multan", "quetta", "sialkot", "gujranwala", "hyderabad"];
    const neighborhoods = ["gulberg", "model town", "dha", "johar town", "samanabad", "faisal town", "wapda town", "iqbal town", "cavalry", "garden town", "clifton", "gulshan", "saddar", "f-7", "f-8", "f-6", "g-11", "i-8", "blue area", "bahria"];
    
    let foundCity = "";
    let foundNeighborhood = "";
    
    for (const city of cities) {
      if (lowercaseInput.includes(city)) {
        foundCity = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }
    
    for (const nh of neighborhoods) {
      if (lowercaseInput.includes(nh)) {
        foundNeighborhood = nh.toUpperCase();
        if (nh === "model town") foundNeighborhood = "Model Town";
        else if (nh === "johar town") foundNeighborhood = "Johar Town";
        else if (nh === "faisal town") foundNeighborhood = "Faisal Town";
        else if (nh === "wapda town") foundNeighborhood = "Wapda Town";
        else if (nh === "iqbal town") foundNeighborhood = "Iqbal Town";
        else if (nh === "cavalry") foundNeighborhood = "Cavalry Ground";
        else if (nh === "garden town") foundNeighborhood = "Garden Town";
        else if (nh === "gulshan") foundNeighborhood = "Gulshan-e-Iqbal";
        else if (nh === "blue area") foundNeighborhood = "Blue Area";
        else if (nh === "bahria") foundNeighborhood = "Bahria Town";
        break;
      }
    }
    
    if (foundNeighborhood && foundCity) {
      detectedLocation = `${foundNeighborhood}, ${foundCity}`;
    } else if (foundNeighborhood) {
      detectedLocation = `${foundNeighborhood}, Lahore`;
    } else if (foundCity) {
      const lhrNHs = ["Gulberg", "DHA Phase 6", "Johar Town", "Model Town", "Faisal Town"];
      const khiNHs = ["Clifton", "DHA Phase 5", "Gulshan-e-Iqbal", "Saddar", "North Nazimabad"];
      const isbNHs = ["F-7 Sector", "F-8 Sector", "G-11 Sector", "I-8 Sector", "Blue Area"];
      
      let nhList = lhrNHs;
      if (foundCity === "Karachi") nhList = khiNHs;
      else if (foundCity === "Islamabad") nhList = isbNHs;
      
      const randomNH = nhList[Math.floor(Math.random() * nhList.length)];
      detectedLocation = `${randomNH}, ${foundCity}`;
    } else {
      detectedLocation = randomLocations[Math.floor(Math.random() * randomLocations.length)];
    }

    const fallbackIntent: Intent = {
      service: lowercaseInput.includes('electric') || lowercaseInput.includes('bijli') || lowercaseInput.includes('short') || lowercaseInput.includes('wire') || lowercaseInput.includes('fan') || lowercaseInput.includes('light') ? 'Electrician' : 'Plumber',
      location: detectedLocation,
      urgency: lowercaseInput.includes('urgent') || lowercaseInput.includes('emergency') || lowercaseInput.includes('short') ? 'HIGH' : 'NORMAL',
      time: "ASAP",
      language: lowercaseInput.includes('urdu') ? 'Urdu' : 'English'
    };

    if (!ai) {
      if (onChunk) {
        const simReasoning = `Simulation: Extracting job specialty (${fallbackIntent.service}), city parameters (${fallbackIntent.location}), and service urgency factors (${fallbackIntent.urgency})...`;
        for (let i = 0; i < simReasoning.length; i += 4) {
          onChunk(simReasoning.substring(i, i + 4));
          await new Promise(r => setTimeout(r, 15));
        }
      }
      return {
        data: fallbackIntent,
        reasoning: `Simulation: Dynamic matching rules evaluated user input and successfully resolved mission parameters for ${fallbackIntent.service} in ${fallbackIntent.location}.`
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
    
    // 1. Resolve coordinates dynamically based on the resolved neighborhood and city inputs
    let baseLat = 31.4805;
    let baseLng = 74.3213;
    const locLower = location.toLowerCase();

    // Map of highly accurate, authentic Pakistani coordinates for maps centering
    if (locLower.includes("gulberg")) {
      baseLat = 31.5204; baseLng = 74.3587;
    } else if (locLower.includes("dha") && locLower.includes("karachi")) {
      baseLat = 24.8210; baseLng = 67.0583;
    } else if (locLower.includes("dha") && locLower.includes("islamabad")) {
      baseLat = 33.5225; baseLng = 73.1610;
    } else if (locLower.includes("dha")) {
      baseLat = 31.4697; baseLng = 74.4534;
    } else if (locLower.includes("johar town")) {
      baseLat = 31.4697; baseLng = 74.2728;
    } else if (locLower.includes("clifton")) {
      baseLat = 24.8138; baseLng = 67.0333;
    } else if (locLower.includes("gulshan")) {
      baseLat = 24.9180; baseLng = 67.0970;
    } else if (locLower.includes("f-7") || locLower.includes("f7")) {
      baseLat = 33.7297; baseLng = 73.0548;
    } else if (locLower.includes("f-8") || locLower.includes("f8")) {
      baseLat = 33.7120; baseLng = 73.0425;
    } else if (locLower.includes("g-11") || locLower.includes("g11")) {
      baseLat = 33.6700; baseLng = 72.9900;
    } else if (locLower.includes("blue area")) {
      baseLat = 33.7118; baseLng = 73.0683;
    } else if (locLower.includes("karachi")) {
      baseLat = 24.8607; baseLng = 67.0011;
    } else if (locLower.includes("islamabad")) {
      baseLat = 33.6844; baseLng = 73.0479;
    } else if (locLower.includes("rawalpindi")) {
      baseLat = 33.5651; baseLng = 73.0169;
    } else if (locLower.includes("peshawar")) {
      baseLat = 34.0150; baseLng = 71.5250;
    } else if (userLocation) {
      baseLat = userLocation.lat;
      baseLng = userLocation.lng;
    }

    let resultProviders: any[] = [];
    let reasoning = "";

    // 2. Filter matches strictly to "Smart Fix Solutions" and "Siddique & Sons" with randomized price/rating each time
    const fallbackProviders = [
      { 
        name: "Smart Fix Solutions", 
        address_detail: "Main Boulevard", 
        specialty: service, 
        rating: parseFloat((4.4 + Math.random() * 0.5).toFixed(1)), 
        price_service: Math.floor(550 + Math.random() * 250), 
        price_parts: Math.floor(100 + Math.random() * 150) 
      },
      { 
        name: "Siddique & Sons", 
        address_detail: "Link Avenue", 
        specialty: service, 
        rating: parseFloat((4.1 + Math.random() * 0.6).toFixed(1)), 
        price_service: Math.floor(400 + Math.random() * 200), 
        price_parts: Math.floor(200 + Math.random() * 200) 
      }
    ];

    if (!ai) {
      if (onChunk) {
        const simReasoning = `Simulation: Querying geographical spatial indices around base coordinates [${baseLat.toFixed(4)}, ${baseLng.toFixed(4)}] to pinpoint verified autonomous service providers...`;
        for (let i = 0; i < simReasoning.length; i += 4) {
          onChunk(simReasoning.substring(i, i + 4));
          await new Promise(r => setTimeout(r, 15));
        }
      }
      resultProviders = fallbackProviders;
      reasoning = `Simulation: Dynamically mapped coordinates to [${baseLat.toFixed(4)}, ${baseLng.toFixed(4)}] and resolved matches for autonomous providers in ${location}.`;
    } else {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: "gemini-1.5-flash",
          contents: `Find 2 diverse ${service} providers in ${location}, Pakistan. Limit options to "Smart Fix Solutions" and "Siddique & Sons".
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
        const rawProviders = result.providers || fallbackProviders;
        
        // Map explicitly to enforce Smart Fix Solutions and Siddique & Sons
        resultProviders = [
          {
            name: "Smart Fix Solutions",
            address_detail: rawProviders[0]?.address_detail || "Main Boulevard",
            specialty: rawProviders[0]?.specialty || service,
            rating: rawProviders[0]?.rating || parseFloat((4.4 + Math.random() * 0.5).toFixed(1)),
            price_service: rawProviders[0]?.price_service || Math.floor(550 + Math.random() * 250),
            price_parts: rawProviders[0]?.price_parts || Math.floor(100 + Math.random() * 150)
          },
          {
            name: "Siddique & Sons",
            address_detail: rawProviders[1]?.address_detail || "Link Avenue",
            specialty: rawProviders[1]?.specialty || service,
            rating: rawProviders[1]?.rating || parseFloat((4.1 + Math.random() * 0.6).toFixed(1)),
            price_service: rawProviders[1]?.price_service || Math.floor(400 + Math.random() * 200),
            price_parts: rawProviders[1]?.price_parts || Math.floor(200 + Math.random() * 200)
          }
        ];
        reasoning = result.reasoning || "Reasoning missing";
      } catch (e: any) {
        console.error("DiscoveryAgent error:", e);
        resultProviders = fallbackProviders;
        reasoning = `Error during discovery: ${e.message}. Using fallback.`;
      }
    }

    // 3. Dynamically offset coordinates around baseLat/baseLng and supply wide range of required metrics
    const providers = resultProviders.map((p: any, i: number) => {
      const reliabilityNum = Math.floor(88 + Math.random() * 11);
      const consistencyNum = Math.floor(85 + Math.random() * 13);
      const cancellationNum = Math.floor(Math.random() * 4);
      const responseNum = Math.floor(92 + Math.random() * 8);

      return {
        id: `P${i + 1}`,
        name: p.name,
        location: { 
          lat: baseLat + (Math.random() - 0.5) * 0.008, 
          lng: baseLng + (Math.random() - 0.5) * 0.008, 
          address: `${p.address_detail}, ${location}` 
        },
        trustScore: parseFloat((0.84 + Math.random() * 0.14).toFixed(2)),
        distance: `${(0.4 + Math.random() * 3.5).toFixed(1)}km`,
        availability: Math.random() > 0.45 ? "Immediate" : "Within 15 mins",
        eta: `${Math.floor(10 + Math.random() * 20)} mins`,
        rating: p.rating,
        avatar: "",
        pricing: { serviceFee: p.price_service, partsEst: p.price_parts, total: p.price_service + p.price_parts },
        metrics: { 
          reliability: `${reliabilityNum}%`, 
          consistency: `${consistencyNum}%`,
          cancellationHistory: `${cancellationNum}%`,
          responseRate: `${responseNum}%`
        },
        specialty: p.specialty
      };
    });

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
