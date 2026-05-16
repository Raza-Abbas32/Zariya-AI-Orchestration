import { 
  CommunicationAgent, 
  IntentAgent, 
  DiscoveryAgent, 
  TrustAgent, 
  NegotiationAgent, 
  BookingAgent, 
  FollowUpAgent 
} from "./agents";
import { OrchestrationState, AgentLog, Intent, Provider } from "../types";

export class ZariyaOrchestrator {
  private state: OrchestrationState;
  private setState: (state: OrchestrationState) => void;

  private comms = new CommunicationAgent();
  private intentAgent = new IntentAgent();
  private discovery = new DiscoveryAgent();
  private trust = new TrustAgent();
  private neg = new NegotiationAgent();
  private booking = new BookingAgent();
  private follow = new FollowUpAgent();

  constructor(initialState: OrchestrationState, setState: (state: OrchestrationState) => void) {
    this.state = initialState;
    this.setState = setState;
  }

  private updateState(patch: Partial<OrchestrationState>) {
    this.state = { ...this.state, ...patch };
    this.setState(this.state);
  }

  private addLog(agent: string, message: string, type: AgentLog['type'] = 'info') {
    const log: AgentLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      agent,
      message,
      type
    };
    this.updateState({ logs: [...this.state.logs, log] });
  }

  private async updateTimeline(agent: string, status: 'active' | 'completed' | 'error') {
    this.updateState({
      currentAgent: agent,
      timeline: { ...this.state.timeline, [agent]: status === 'active' ? 'processing' : 'completed' }
    });
    await new Promise(r => setTimeout(r, 1000));
  }

  async run(input: string) {
    if (this.state.isProcessing) return;

    this.updateState({
      isProcessing: true,
      isAwaitingSelection: false,
      input,
      logs: [],
      timeline: {},
      intent: null,
      providers: [],
      selectedProvider: null,
      bookingId: null,
      bookingStage: 'discovery',
      userContact: '',
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
      this.addLog('Communication', `Processing multi-modal signal: "${input.substring(0, 40)}..."`);
      const { normalized, detectedLanguage } = await this.comms.process(input);
      this.addLog('Communication', `Language ID: ${detectedLanguage}. Signal normalized.`, 'success');
      await this.updateTimeline('Communication', 'completed');

      // 2. Intent
      await this.updateTimeline('Intent', 'active');
      this.addLog('Intent', "Extracting parameters via Gemini reasoning...");
      const intent = await this.intentAgent.extract(normalized);
      
      // Update history entry with actual intent
      const updatedHistory = [...this.state.history];
      if (updatedHistory.length > 0) {
        updatedHistory[0] = { ...updatedHistory[0], service: intent.service, location: intent.location };
      }

      this.updateState({ intent, history: updatedHistory });
      this.addLog('Intent', `Extracted: ${intent.service} in ${intent.location} (${intent.urgency})`, 'success');
      await this.updateTimeline('Intent', 'completed');

      // 3. Discovery
      await this.updateTimeline('Discovery', 'active');
      this.addLog('Discovery', `Executing spatial search on Google Maps near ${intent.location}...`);
      const providers = await this.discovery.search(intent.location, intent.service, this.state.userLocation);
      
      // Redirect perspective to target location if provided
      if (providers.length > 0) {
        this.updateState({ userLocation: { lat: providers[0].location.lat + 0.001, lng: providers[0].location.lng + 0.001 } });
      }

      this.updateState({ providers });
      this.addLog('Discovery', `Found ${providers.length} verified providers in range.`, 'success');
      await this.updateTimeline('Discovery', 'completed');

      // 4. Trust
      await this.updateTimeline('Trust', 'active');
      this.addLog('Trust', "Evaluating historical reliability indices...");
      const trustResults = await this.trust.evaluate(providers);
      this.updateState({ providers: trustResults });
      this.addLog('Trust', "Trust analysis complete. Bayesian scores updated.", 'success');
      await this.updateTimeline('Trust', 'completed');

      // 5. Negotiation (Pre-selection Recommendation)
      await this.updateTimeline('Negotiation', 'active');
      this.addLog('Negotiation', "Ranking providers by trust and spatial proximity...");
      const recommended = await this.neg.resolve(trustResults);
      this.addLog('Negotiation', `AI Recommended: ${recommended.name} (${recommended.trustScore.toFixed(2)} score). Awaiting user selection...`, 'success');
      await this.updateTimeline('Negotiation', 'completed');

      this.updateState({ isAwaitingSelection: true, isProcessing: false, bookingStage: 'selection' });
    } catch (error: any) {
      this.addLog('Orchestrator', `Critical Failure: ${error.message}`, 'error');
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
      this.addLog('Orchestrator', 'Error: Transaction context missing. Resetting...', 'error');
      this.updateState({ bookingStage: 'idle' });
      return;
    }

    this.updateState({ isProcessing: true, userContact: contact });
    
    try {
      // 6. Booking
      await this.updateTimeline('Booking', 'active');
      this.addLog('Booking', `Identity verified. Dispatched to: ${intent.location}. Contact: ${contact}`);
      const booking = await this.booking.confirm(provider);

      // Update the "Processing" history item to "Completed"
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
      this.addLog('Booking', `Transaction ID: ${booking.bookingId}. Status: DISPATCHED.`, 'success');
      await this.updateTimeline('Booking', 'completed');

      // 7. Follow-up
      await this.updateTimeline('Follow-Up', 'active');
      this.addLog('Follow-Up', "Initializing heartbeat monitoring and reminders...");
      await this.follow.schedule(booking.bookingId);
      this.addLog('Follow-Up', "Automation loop active. System standing by.", 'success');
      await this.updateTimeline('Follow-Up', 'completed');

    } catch (error: any) {
      this.addLog('Orchestrator', `Critical Failure: ${error.message}`, 'error');
      console.error(error);
    } finally {
      this.updateState({ isProcessing: false, currentAgent: null });
    }
  }
}
