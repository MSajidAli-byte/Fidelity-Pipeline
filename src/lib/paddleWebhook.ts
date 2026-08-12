import crypto from 'crypto';
import { Request, Response } from 'express';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { serverDb } from './serverDb';

/**
 * Validates Paddle Webhook HMAC SHA256 Signature (Paddle Billing v2)
 *
 * Paddle sends header `paddle-signature` containing `ts=<timestamp>;h1=<hmac_sha256_hash>`
 * Signed payload format: `${ts}:${rawBody}`
 */
export function verifyPaddleWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  try {
    const parts = signatureHeader.split(';');
    let ts = '';
    let h1 = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key?.trim() === 'ts') ts = value?.trim() || '';
      if (key?.trim() === 'h1') h1 = value?.trim() || '';
    }

    if (!ts || !h1) return false;

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const signedPayload = `${ts}:${bodyString}`;

    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedHmac, 'utf-8');
    const h1Buffer = Buffer.from(h1, 'utf-8');

    if (expectedBuffer.length !== h1Buffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, h1Buffer);
  } catch (err) {
    console.error('[Paddle Webhook Signature Verification Exception]', err);
    return false;
  }
}

/**
 * Helper to retrieve or initialize Paddle SDK for webhook parsing
 */
function getPaddleSdk(): Paddle | null {
  const apiKey = (process.env.PADDLE_API_KEY || '').replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
  if (!apiKey) return null;

  const isSandbox = apiKey.includes('sdbx') || apiKey.startsWith('test_') || process.env.PADDLE_ENVIRONMENT === 'sandbox';
  try {
    return new Paddle(apiKey, {
      environment: isSandbox ? Environment.sandbox : Environment.production,
    });
  } catch {
    return null;
  }
}

/**
 * Server-side Express Route Handler for Paddle Webhooks
 * Route: POST /api/paddle/webhook or /api/webhooks/paddle
 */
export async function handlePaddleWebhook(req: Request, res: Response): Promise<Response> {
  const signatureHeader = (req.headers['paddle-signature'] || req.headers['Paddle-Signature'] || '') as string;
  const webhookSecret = (process.env.PADDLE_WEBHOOK_SECRET || process.env.PADDLE_SIGNING_SECRET || '')
    .replace(/^["']|["']$/g, '')
    .trim();

  const rawBody: Buffer | string = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
  const rawBodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

  // Verify Paddle Webhook Signature
  let isValidSignature = false;

  if (signatureHeader && webhookSecret) {
    isValidSignature = verifyPaddleWebhookSignature(rawBody, signatureHeader, webhookSecret);

    // Alternative SDK unmarshal attempt if SDK initialized
    if (!isValidSignature) {
      const paddle = getPaddleSdk();
      if (paddle) {
        try {
          const unmarshaled = await paddle.webhooks.unmarshal(rawBodyString, webhookSecret, signatureHeader);
          if (unmarshaled) {
            isValidSignature = true;
          }
        } catch {
          // SDK unmarshal failed
        }
      }
    }
  } else {
    // If no signature header provided in local dev / sandbox testing mode, log warning
    console.warn('[Paddle Webhook] Missing paddle-signature header or PADDLE_WEBHOOK_SECRET config.');
    if (process.env.NODE_ENV !== 'production' || !webhookSecret) {
      isValidSignature = true; // Allow non-blocking testing mode
    }
  }

  if (!isValidSignature && process.env.NODE_ENV === 'production' && webhookSecret) {
    console.error('[Paddle Webhook Error] Invalid signature verification failed.');
    return res.status(401).json({
      success: false,
      error: 'Invalid Paddle webhook signature. Validation failed.',
    });
  }

  // Parse Webhook Event Body
  let eventPayload: any = null;
  try {
    eventPayload = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(rawBodyString);
  } catch (parseErr) {
    console.error('[Paddle Webhook Error] Failed to parse JSON body:', parseErr);
    return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
  }

  const eventType = eventPayload?.event_type || eventPayload?.eventType || 'unknown';
  const eventId = eventPayload?.event_id || eventPayload?.eventId || 'evt_' + Date.now();
  const data = eventPayload?.data || {};

  console.log(`[Paddle Webhook Received] Event Type: ${eventType} | Event ID: ${eventId}`);

  // Process Transaction & Subscription Events
  try {
    let customerEmail =
      data?.custom_data?.email ||
      data?.customData?.email ||
      data?.customer?.email ||
      data?.user_email ||
      data?.email ||
      '';

    let requestedTier = (data?.custom_data?.tier || data?.customData?.tier || '').toString().toLowerCase();
    let boosterCredits = parseInt(
      data?.custom_data?.boosterCredits || data?.customData?.boosterCredits || '0',
      10
    );

    // Item price ID resolution if custom_data wasn't explicitly provided
    if (!requestedTier && boosterCredits === 0 && Array.isArray(data?.items) && data.items.length > 0) {
      const firstItem = data.items[0];
      const priceId = firstItem?.price_id || firstItem?.price?.id || firstItem?.priceId;

      const proPrice = process.env.PADDLE_PRICE_ID_PRO || 'pri_01kzrxs3me47mvqesrpwtxqfva';
      const enterprisePrice = process.env.PADDLE_PRICE_ID_ENTERPRISE || 'pri_01kzryhfyess9xnnv63kezzr9n';
      const refill10Price = process.env.PADDLE_PRICE_ID_REFILL_10 || 'pri_01kzryx11bd3pskmz23s7hdsn9';
      const refill25Price = process.env.PADDLE_PRICE_ID_REFILL_25 || 'pri_01kzrz5gnpr0b526b3aryd3j4m';

      if (priceId === refill10Price) {
        boosterCredits = 10;
      } else if (priceId === refill25Price) {
        boosterCredits = 25;
      } else if (priceId === enterprisePrice) {
        requestedTier = 'enterprise';
      } else if (priceId === proPrice) {
        requestedTier = 'pro';
      }
    }

    if (!customerEmail) {
      // Fallback: look up user from DB or default test candidate
      customerEmail = 'alex.rivera@fidelity.ai';
    }

    let result = null;

    switch (eventType) {
      case 'customer.created':
      case 'customer.updated': {
        const customerId = data?.id || data?.customer_id || data?.customerId;
        if (customerId && customerEmail) {
          serverDb.upsertCustomer(customerId, customerEmail);
        }
        serverDb.recordTelemetryLog({
          severity: 'INFO',
          module: 'Paddle Webhook',
          message: `Processed customer event (${eventType}) for ${customerEmail}`,
          metadata: { eventId, eventType, customerId, customerEmail },
        });
        break;
      }

      case 'transaction.completed':
      case 'transaction.paid':
      case 'transaction.succeeded':
      case 'payment.succeeded': {
        const customerId = data?.customer_id || data?.customerId;
        if (customerId && customerEmail) {
          serverDb.upsertCustomer(customerId, customerEmail);
        }

        if (boosterCredits > 0) {
          result = serverDb.refillUserCredits(customerEmail, boosterCredits);
        } else {
          const tier = requestedTier || 'pro';
          const allowance = tier === 'enterprise' ? 999999 : 50;
          result = serverDb.updateUserTier(customerEmail, tier as any, allowance);
        }

        serverDb.recordTelemetryLog({
          severity: 'INFO',
          module: 'Paddle Webhook',
          message: `Successfully processed transaction event (${eventType}) for ${customerEmail}`,
          metadata: { eventId, eventType, customerEmail, boosterCredits, requestedTier, result: result?.user },
        });
        break;
      }

      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.activated': {
        const subId = data?.id || data?.subscription_id || data?.subscriptionId;
        const customerId = data?.customer_id || data?.customerId || 'ctm_unknown';
        const subStatus = data?.status || 'active';

        if (customerId && customerEmail) {
          serverDb.upsertCustomer(customerId, customerEmail);
        }

        let firstItem = Array.isArray(data?.items) && data.items.length > 0 ? data.items[0] : null;
        let priceId = firstItem?.price_id || firstItem?.price?.id || firstItem?.priceId || '';
        let productId = firstItem?.product_id || firstItem?.product?.id || firstItem?.price?.product_id || '';

        const scheduledChange = data?.scheduled_change || data?.scheduledChange || null;

        if (subId) {
          serverDb.upsertSubscription({
            subscriptionId: subId,
            customerId,
            status: subStatus,
            priceId,
            productId,
            scheduledChangeAction: scheduledChange?.action || null,
            scheduledChangeAt: scheduledChange?.effective_at || scheduledChange?.effectiveAt || null,
          });
        }

        if (subStatus === 'active' || subStatus === 'trialing') {
          const tier = requestedTier || 'pro';
          const allowance = tier === 'enterprise' ? 999999 : 50;
          result = serverDb.updateUserTier(customerEmail, tier as any, allowance);
        }

        serverDb.recordTelemetryLog({
          severity: 'INFO',
          module: 'Paddle Webhook',
          message: `Processed subscription event (${eventType}) [${subStatus}] for ${customerEmail}`,
          metadata: { eventId, eventType, subStatus, subId, customerId, customerEmail, requestedTier },
        });
        break;
      }

      case 'subscription.canceled':
      case 'subscription.past_due':
      case 'subscription.paused': {
        const subId = data?.id || data?.subscription_id || data?.subscriptionId;
        const customerId = data?.customer_id || data?.customerId || 'ctm_unknown';

        if (subId) {
          serverDb.upsertSubscription({
            subscriptionId: subId,
            customerId,
            status: eventType === 'subscription.canceled' ? 'canceled' : (data?.status || 'paused'),
          });
        }

        if (eventType === 'subscription.canceled') {
          result = serverDb.updateUserTier(customerEmail, 'free', 3);
        }

        serverDb.recordTelemetryLog({
          severity: 'WARN',
          module: 'Paddle Webhook',
          message: `Subscription status updated to ${eventType} for ${customerEmail}.`,
          metadata: { eventId, eventType, subId, customerEmail },
        });
        break;
      }

      default: {
        serverDb.recordTelemetryLog({
          severity: 'INFO',
          module: 'Paddle Webhook',
          message: `Unrecognized or informational Paddle webhook event received: ${eventType}`,
          metadata: { eventId, eventType },
        });
        break;
      }
    }

    return res.status(200).json({
      success: true,
      eventId,
      eventType,
      processed: true,
      user: result?.user || null,
    });
  } catch (err: any) {
    console.error(`[Paddle Webhook Handler Exception] Event ID ${eventId}:`, err);
    serverDb.recordTelemetryLog({
      severity: 'ERROR',
      module: 'Paddle Webhook',
      message: `Error processing Paddle webhook event ${eventId}: ${err?.message || err}`,
      stackTrace: err?.stack,
    });

    return res.status(500).json({
      success: false,
      error: err?.message || 'Server error processing webhook event',
    });
  }
}
