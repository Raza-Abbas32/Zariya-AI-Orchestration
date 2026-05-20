import { 
  CommunicationAgent, 
  IntentAgent, 
  PlanningAgent,
  DiscoveryAgent, 
  TrustAgent, 
  NegotiationAgent, 
  BookingAgent, 
  FollowUpAgent 
} from "./agents";
import { OrchestrationState, AgentLog, Intent, Provider, ChatMessage } from "../types";
import { NotificationService } from "./notifications";

export class ZariyaOrchestrator {
  private state: OrchestrationState;
  private setState: (state: OrchestrationState) => void;

  private comms = new CommunicationAgent();
  private intentAgent = new IntentAgent();
  private planner = new PlanningAgent();
  private discovery = new DiscoveryAgent();
  private trust = new TrustAgent();
  private neg = new NegotiationAgent();
  private booking = new BookingAgent();
  private follow = new FollowUpAgent();
  private notifications = new NotificationService();

  constructor(initialState: OrchestrationState, setState: (state: OrchestrationState) => void) {
    this.state = initialState;
    this.setState = setState;
  }

  private updateState(patch: Partial<OrchestrationState>) {
    this.state = { ...this.state, ...patch };
    this.setState(this.state);
  }

  private addLog(agent: string, message: string, reasoning?: string, type: AgentLog['type'] = 'info') {
    const log: AgentLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      agent,
      message,
      reasoning,
      type
    };
    this.updateState({ logs: [...this.state.logs, log] });
  }

  private createPlaceholderLog(agent: string, message: string, type: AgentLog['type'] = 'info'): string {
    const id = Math.random().toString(36).substring(7);
    const log: AgentLog = {
      id,
      timestamp: new Date(),
      agent,
      message,
      reasoning: "",
      type
    };
    this.updateState({ logs: [...this.state.logs, log] });
    return id;
  }

  private appendLogReasoning(id: string, chunk: string) {
    const updatedLogs = this.state.logs.map(log => {
      if (log.id === id) {
        return { ...log, reasoning: (log.reasoning || "") + chunk };
      }
      return log;
    });
    this.updateState({ logs: updatedLogs });
  }

  private setFinalLog(id: string, message: string, reasoning: string, type: AgentLog['type'] = 'success') {
    const updatedLogs = this.state.logs.map(log => {
      if (log.id === id) {
        return { ...log, message, reasoning, type };
      }
      return log;
    });
    this.updateState({ logs: updatedLogs });
  }

  private async updateTimeline(agent: string, status: 'active' | 'completed' | 'error') {
    this.updateState({
      currentAgent: agent,
      timeline: { ...this.state.timeline, [agent]: status === 'active' ? 'processing' : 'completed' }
    });
    // Delay for UI progression visibility
    await new Promise(r => setTimeout(r, 600));
  }

  async run(input: string) {
    if (this.state.isProcessing) return;

    // 0. Update Conversation Memory State with User Message
    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    const updatedMessages = [...this.state.messages, userMsg];

    this.updateState({
      isProcessing: true,
      isAwaitingSelection: false,
      input,
      messages: updatedMessages,
      logs: [],
      timeline: {},
      intent: null,
      providers: [],
      selectedProvider: null,
      bookingId: null,
      bookingStage: 'discovery',
      userContact: '',
      planningSteps: [],
      history: [
        {
          id: `req_${Date.now()}`,
          timestamp: new Date(),
          service: 'Initializing...',
          location: 'Detecting Location...',
          status: 'Processing'
        },
        ...this.state.history
      ]
    });

    try {
      // 1. Communication
      await this.updateTimeline('Communication', 'active');
      const commsLogId = this.createPlaceholderLog('Communication', `Analyzing multi-modal signal...`);
      const commsResult = await this.comms.process(input, updatedMessages, (chunk) => {
        this.appendLogReasoning(commsLogId, chunk);
      });
      this.setFinalLog(commsLogId, `Language: ${commsResult.data.detectedLanguage}. Signal normalized.`, commsResult.reasoning, 'success');
      await this.updateTimeline('Communication', 'completed');

      // 2. Intent
      await this.updateTimeline('Intent', 'active');
      const intentLogId = this.createPlaceholderLog('Intent', "Extracting parameters via Gemini reasoning...");
      const intentResult = await this.intentAgent.extract(commsResult.data.normalized, updatedMessages, (chunk) => {
        this.appendLogReasoning(intentLogId, chunk);
      });
      const intent = intentResult.data;
      
      // Update history entry with actual intent details
      const updatedHistory = [...this.state.history];
      if (updatedHistory.length > 0) {
        updatedHistory[0] = { ...updatedHistory[0], service: intent.service, location: intent.location };
      }

      this.updateState({ intent, history: updatedHistory });
      this.setFinalLog(intentLogId, `Service: ${intent.service} | Location: ${intent.location} | Urgency: ${intent.urgency}`, intentResult.reasoning, 'success');
      await this.updateTimeline('Intent', 'completed');

      // 3. Planning
      await this.updateTimeline('Planning', 'active');
      const planLogId = this.createPlaceholderLog('Planning', "Generating autonomous execution DAG...");
      const planResult = await this.planner.plan(intent, updatedMessages, (chunk) => {
        this.appendLogReasoning(planLogId, chunk);
      });
      this.updateState({ planningSteps: planResult.data });
      this.setFinalLog(planLogId, `Plan generated: ${planResult.data.length} steps identified.`, planResult.reasoning, 'success');
      await this.updateTimeline('Planning', 'completed');

      // 4. Discovery
      await this.updateTimeline('Discovery', 'active');
      const discLogId = this.createPlaceholderLog('Discovery', `Scanning spatial grid near ${intent.location}...`);
      const discoveryResult = await this.discovery.search(intent.location, intent.service, this.state.userLocation, (chunk) => {
        this.appendLogReasoning(discLogId, chunk);
      });
      const providers = discoveryResult.data;
      
      if (providers.length > 0 && !this.state.userLocation) {
        // Fallback userLocation to first provider's general zone if user coordinates are not loaded
        this.updateState({ userLocation: { lat: providers[0].location.lat, lng: providers[0].location.lng } });
      }

      this.updateState({ providers });
      this.setFinalLog(discLogId, `Nodes discovered: ${providers.length} verified providers in sector.`, discoveryResult.reasoning, 'success');
      await this.updateTimeline('Discovery', 'completed');

      // 5. Trust
      await this.updateTimeline('Trust', 'active');
      const trustLogId = this.createPlaceholderLog('Trust', "Running Bayesian reliability analysis...");
      const trustResult = await this.trust.evaluate(providers, (chunk) => {
        this.appendLogReasoning(trustLogId, chunk);
      });
      this.updateState({ providers: trustResult.data });
      this.setFinalLog(trustLogId, "Trust analysis complete. Reliability indices updated.", trustResult.reasoning, 'success');
      await this.updateTimeline('Trust', 'completed');

      // 6. Negotiation
      await this.updateTimeline('Negotiation', 'active');
      const negLogId = this.createPlaceholderLog('Negotiation', "Collaborative reasoning: proximity vs trust vs cost...");
      const negotiationResult = await this.neg.resolve(trustResult.data, (chunk) => {
        this.appendLogReasoning(negLogId, chunk);
      });
      this.setFinalLog(negLogId, `AI Recommendation: ${negotiationResult.data.name}. Selection protocol engaged.`, negotiationResult.reasoning, 'success');
      await this.updateTimeline('Negotiation', 'completed');

      // 7. Update Conversation Memory with Assistant's Recommendation Response
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: `Resolved recommendation: ${negotiationResult.data.name} is recommended for ${intent.service} in ${intent.location}. ETA is ${negotiationResult.data.eta} and total cost is PKR ${negotiationResult.data.pricing.total}.`,
        timestamp: new Date()
      };

      this.updateState({ 
        selectedProvider: negotiationResult.data,
        isAwaitingSelection: true, 
        isProcessing: false, 
        bookingStage: 'selection',
        messages: [...updatedMessages, assistantMsg]
      });

      // Persist the conversation to the backend if sessionId is present
      this.syncSessionWithBackend([...updatedMessages, assistantMsg]);

    } catch (error: any) {
      this.addLog('Orchestrator', `Critical Failure: ${error.message}`, undefined, 'error');
      this.updateState({ isProcessing: false, bookingStage: 'idle' });
      console.error(error);
    }
  }

  proceedToForm(provider: Provider) {
    this.updateState({ selectedProvider: provider, bookingStage: 'form', isAwaitingSelection: false });
  }

  async confirmSelection(provider: Provider, contact: string) {
    if (this.state.isProcessing) return;
    
    const intent = this.state.intent;
    if (!intent) {
      this.addLog('Orchestrator', 'Error: Transaction context missing.', undefined, 'error');
      this.updateState({ bookingStage: 'idle' });
      return;
    }

    this.updateState({ isProcessing: true, userContact: contact });
    
    try {
      // 7. Booking
      await this.updateTimeline('Booking', 'active');
      this.addLog('Booking', `Dispatching to: ${intent.location}. Contact: ${contact}`);
      const bookingResult = await this.booking.confirm(provider);
      const booking = bookingResult.data;

      const updatedHistory = this.state.history.map(item => {
        if (item.status === 'Processing' && item.service === intent.service) {
          return {
            ...item,
            id: booking.bookingId,
            status: 'Completed' as const,
            providerName: provider.name,
            totalAmount: provider.pricing.total
          };
        }
        return item;
      });

      this.updateState({ 
        bookingId: booking.bookingId,
        bookingStage: 'success',
        history: updatedHistory
      });
      this.addLog('Booking', `Transaction ID: ${booking.bookingId}. Status: DISPATCHED.`, bookingResult.reasoning, 'success');

      // Trigger Notifications & Backend Persistence
      this.addLog('System', `Triggering multi-channel notifications...`);
      await this.notifications.sendEmail('user@example.com', booking.bookingId, provider, intent, contact);
      await this.notifications.sendWhatsApp(contact, booking.bookingId, provider);
      this.addLog('System', `Email & WhatsApp confirmations dispatched.`, undefined, 'success');

      await this.updateTimeline('Booking', 'completed');

      // 8. Follow-up
      await this.updateTimeline('Follow-Up', 'active');
      this.addLog('Follow-Up', "Initializing heartbeat monitoring...");
      const followUpResult = await this.follow.schedule(booking.bookingId);
      this.addLog('Follow-Up', "Automation loop active. Protocol standby.", followUpResult.reasoning, 'success');
      await this.updateTimeline('Follow-Up', 'completed');

    } catch (error: any) {
      this.addLog('Orchestrator', `Critical Failure: ${error.message}`, undefined, 'error');
      console.error(error);
    } finally {
      this.updateState({ isProcessing: false, currentAgent: null });
    }
  }

  private async syncSessionWithBackend(messages: ChatMessage[]) {
    try {
      const apiPrefix = this.notifications['getApiUrl']();
      await fetch(`${apiPrefix}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.state.sessionId,
          messages
        })
      });
    } catch (e) {
      console.warn("Failed to sync session conversation memory with backend:", e);
    }
  }
}
