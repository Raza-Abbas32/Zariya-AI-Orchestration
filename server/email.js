import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates dynamic transporter configuration based on environment setup.
 */
function createTransporter() {
  const provider = (process.env.EMAIL_PROVIDER || 'ethereal').toLowerCase();
  
  console.log(`[Email Service] Initializing with provider: ${provider.toUpperCase()}`);

  switch (provider) {
    case 'sendgrid':
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('[Email Service] SENDGRID_API_KEY missing. Falling back to Ethereal.');
        return createEtherealTransporter();
      }
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });

    case 'mailgun':
      if (!process.env.MAILGUN_USER || !process.env.MAILGUN_PASS) {
        console.warn('[Email Service] MAILGUN credentials missing. Falling back to Ethereal.');
        return createEtherealTransporter();
      }
      return nodemailer.createTransport({
        host: process.env.MAILGUN_HOST || 'smtp.mailgun.org',
        port: Number(process.env.MAILGUN_PORT) || 587,
        secure: process.env.MAILGUN_SECURE === 'true',
        auth: {
          user: process.env.MAILGUN_USER,
          pass: process.env.MAILGUN_PASS
        }
      });

    case 'gmail':
      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        console.warn('[Email Service] GMAIL credentials missing. Falling back to Ethereal.');
        return createEtherealTransporter();
      }
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

    case 'smtp':
      if (!process.env.SMTP_HOST) {
        console.warn('[Email Service] SMTP_HOST missing. Falling back to Ethereal.');
        return createEtherealTransporter();
      }
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

    case 'ethereal':
    default:
      return createEtherealTransporter();
  }
}

function createEtherealTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'placeholder@example.com',
      pass: process.env.SMTP_PASS || 'placeholder'
    }
  });
}

const transporter = createTransporter();
const emailFrom = process.env.SMTP_FROM || '"Zariya" <no-reply@zariya.pk>';

export async function sendCustomerConfirmation(booking) {
  const customerMailOptions = {
    from: emailFrom,
    to: booking.customerContact,
    subject: `Zariya Booking Confirmed - Reference: ${booking.id}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Zariya Booking Confirmed</h2>
        <p style="color: #475569; font-size: 15px;">Your booking reference <b>${booking.id}</b> has been placed successfully.</p>
        <div style="background: #f8fafc; padding: 18px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
          <p style="margin: 4px 0;"><b>Service Category:</b> ${booking.provider.specialty}</p>
          <p style="margin: 4px 0;"><b>Assigned Expert:</b> ${booking.provider.name}</p>
          <p style="margin: 4px 0;"><b>ETA Arrival:</b> ${booking.provider.eta}</p>
          <p style="margin: 4px 0;"><b>Est. Service Fee:</b> PKR ${booking.provider.pricing?.total}</p>
        </div>
        <p style="color: #475569; font-size: 15px;">The provider is currently routed to <b>${booking.intent.location}</b>.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">This is an automated dispatch message. Support: info@zariya.pk</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(customerMailOptions);
    const provider = (process.env.EMAIL_PROVIDER || 'ethereal').toLowerCase();
    if (provider === 'ethereal') {
      console.log('Customer Email Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Service] Failed to send customer confirmation:', error.message);
    throw error;
  }
}

export async function sendAdminAlert(booking) {
  const adminMailOptions = {
    from: emailFrom,
    to: 'admin@zariya.pk',
    subject: `New Booking Alert - ID: ${booking.id}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h3 style="color: #0f172a;">New Dispatch Notification</h3>
        <p><b>Booking ID:</b> ${booking.id}</p>
        <p><b>Contact Info:</b> ${booking.customerContact}</p>
        <p><b>Address:</b> ${booking.intent.location}</p>
        <p><b>Category:</b> ${booking.intent.service}</p>
        <p><b>Provider:</b> ${booking.provider.name}</p>
        <p><b>PKR Value:</b> ${booking.provider.pricing?.total}</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(adminMailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Service] Failed to send admin alert:', error.message);
    throw error;
  }
}
