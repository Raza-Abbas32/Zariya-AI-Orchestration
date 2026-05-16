# Zariya AI Orchestration Node

## Architecture Overview
Zariya is built as a **Multi-Agent Orchestration System** powered by Google Antigravity reasoning patterns.

### 1. Agents
- **CommunicationAgent**: Normalizes mixed-language signals (Urdu/Sindhi/English) into actionable commands.
- **IntentAgent**: Uses LLM reasoning to extract service parameters (Location, Urgency, Service Type).
- **PlanningAgent**: (Implicit) Generates the execution DAG for the request.
- **DiscoveryAgent**: Utilizes **Google Maps Grounding** to locate verified service providers.
- **TrustAgent**: Evaluates historical reliability indices stored in **Firebase**.
- **NegotiationAgent**: Resolves consensus between proximity and trust scores.
- **BookingAgent**: Executes the transactional dispatch logic.
- **FollowUpAgent**: Maintains the automation loop for post-service tracking.

### 2. Tech Stack
- **Dashboard**: React 18 + Vite (Mission Control UI).
- **Reasoning**: Gemini 1.5 Flash (Low-latency tier).
- **State/Backend**: Firebase Firestore (pending setup).
- **Mapping**: Leaflet + CartoDB (Light Grayscale Theme with Purple Accents).
- **Aesthetic**: White background with sophisticated purple/blue gradients and clean shadows.
- **Voice**: Web Speech API for multimodal input.

### 3. Workflow
1. User provides input (Text or Voice).
2. Pipeline initializes.
3. Every agent reports their "reasoning" in real-time to the **Antigravity Stream**.
4. The map flys to the target location.
5. Trust metrics are calculated.
6. A booking is generated and dispatched.
