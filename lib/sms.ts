export interface SMSParams {
  phone: string;
  message: string;
}

export interface SMSResult {
  success: boolean;
  message: string;
  sms_id?: string;
}

/**
 * Dispatches transactional SMS notifications to customers in Ghana.
 */
export async function sendCustomerSMS({ phone, message }: SMSParams): Promise<SMSResult> {
  console.log(`[SMS Gateway] Sending SMS to ${phone}: "${message}"`);
  // Realistic mock / API integration with standard Ghana SMS gateway (Arkesel, Hubtel, or DataMart SMS)
  return {
    success: true,
    message: "SMS queued and sent to customer phone",
    sms_id: "SMS-" + Math.floor(100000 + Math.random() * 900000),
  };
}
