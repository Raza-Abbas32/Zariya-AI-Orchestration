import { Provider, Intent } from "../types";
import { isDemoMode, getDemoApiPrefix } from "../lib/demoApi";

export class NotificationService {
  private getApiUrl() {
    if (isDemoMode()) {
      return getDemoApiPrefix();
    }

    if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('your-backend-url')) {
      return import.meta.env.VITE_API_URL;
    }
    // Fallback for deployed environments
    if (import.meta.env.PROD) {
      return window.location.origin + '/api';
    }
    return 'http://localhost:3001/api';
  }

  private API_URL = this.getApiUrl();

  async sendEmail(to: string, bookingId: string, provider: Provider, intent: Intent, contact: string) {
    console.log(`[Notification] Dispatching email sequence for ${bookingId}...`);

    if (isDemoMode()) {
      return {
        success: true,
        channel: 'email',
        recipient: to,
        bookingId,
        providerName: provider.name,
        service: intent.service,
        status: 'sent',
        mode: 'demo'
      };
    }
    
    try {
      const response = await fetch(`${this.API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          provider,
          customerContact: contact,
          intent
        })
      });

      if (!response.ok) throw new Error('Failed to dispatch notification sequence');
      
      return await response.json();
    } catch (error) {
      console.error('Notification Error:', error);
      // Fallback for offline mode
      return { success: false, channel: 'email', recipient: to, status: 'deferred' };
    }
  }

  async sendWhatsApp(phone: string, bookingId: string, provider: Provider) {
    console.log(`[WhatsApp Simulation] Sending message to ${phone}...`);
    if (isDemoMode()) {
      return {
        success: true,
        channel: 'whatsapp',
        recipient: phone,
        bookingId,
        body: `Zariya Demo: Your booking ${bookingId} is active. ${provider.name} is on the way!`,
        mode: 'demo'
      };
    }
    // WhatsApp remains a simulation for now unless a Twilio key is provided
    await new Promise(r => setTimeout(r, 1000));
    return {
      success: true,
      channel: 'whatsapp',
      recipient: phone,
      body: `Zariya Notification: Your booking ${bookingId} is active. ${provider.name} is on the way!`
    };
  }
}
