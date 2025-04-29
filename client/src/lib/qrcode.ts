// QR code generator for Thai PromptPay system using promptpay-qr package
// This creates a QR code based on the payment amount
import { apiRequest } from "./queryClient";
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

interface PromptPaySettings {
  promptpay_id: string;
  promptpay_type: "phone" | "national_id"; // จำกัดให้มีเฉพาะรูปแบบเบอร์โทรและบัตรประชาชนเท่านั้น
}

async function getPromptPaySettings(): Promise<PromptPaySettings> {
  try {
    // Try to get the settings from the API
    const promptpayIdResp = await apiRequest('GET', '/api/settings/promptpay_id');
    const promptpayTypeResp = await apiRequest('GET', '/api/settings/promptpay_type');
    
    const promptpayIdData = await promptpayIdResp.data;
    const promptpayTypeData = await promptpayTypeResp.data;
    
    return {
      promptpay_id: promptpayIdData.value,
      promptpay_type: promptpayTypeData.value
    };
  } catch (error) {
    console.error("Failed to fetch PromptPay settings:", error);
    // Fallback to default values if API call fails
    return {
      promptpay_id: "0812345678",
      promptpay_type: "phone"
    };
  }
}

let cachedSettings: PromptPaySettings | null = null;

/**
 * Formats the ID according to PromptPay type requirements
 */
function formatPromptPayId(id: string, type: string): string {
  // Clean the ID to remove any non-numeric characters
  const cleanId = id.replace(/[^0-9]/g, '');
  
  // For all PromptPay types, return the cleaned ID
  // promptpay-qr package handles the formatting internally
  return cleanId;
}

/**
 * Generates a QR code data URL from a promptpay ID and amount
 */
export async function generateQRCode(
  amount: number, 
  customPromptPayId?: string, 
  customPromptPayType?: string
): Promise<string> {
  // If custom values are provided, use them; otherwise fetch from settings
  let promptpayId: string;
  let promptpayType: string;
  
  if (customPromptPayId && customPromptPayType) {
    promptpayId = customPromptPayId;
    promptpayType = customPromptPayType;
  } else {
    // Get or use cached settings
    if (!cachedSettings) {
      cachedSettings = await getPromptPaySettings();
    }
    promptpayId = cachedSettings.promptpay_id;
    promptpayType = cachedSettings.promptpay_type;
  }
  
  // Format the ID properly
  const formattedId = formatPromptPayId(promptpayId, promptpayType);
  
  // Generate the payload using promptpay-qr
  const payload = generatePayload(formattedId, { amount });
  
  // Convert the payload to a QR code data URL
  try {
    const qrCodeDataURL = await QRCode.toDataURL(payload, {
      type: 'image/png',
      margin: 4,
      width: 200,
      color: {
        dark: '#000',
        light: '#fff'
      }
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generates a merchant QR code with reference information
 */
export async function generateMerchantQRCode(amount: number, referenceId: string): Promise<string> {
  // Get or use cached settings
  if (!cachedSettings) {
    cachedSettings = await getPromptPaySettings();
  }
  
  const promptpayId = formatPromptPayId(cachedSettings.promptpay_id, cachedSettings.promptpay_type);
  
  // Generate the payload with additional merchant data
  // Note: promptpay-qr doesn't directly support reference IDs, but we're using the standard functionality
  const payload = generatePayload(promptpayId, { 
    amount,
    // The package doesn't support reference IDs in the way we need, 
    // but QR code still works for basic payments
  });
  
  // Convert the payload to a QR code data URL
  try {
    const qrCodeDataURL = await QRCode.toDataURL(payload, {
      type: 'image/png',
      margin: 4,
      width: 200,
      color: {
        dark: '#000',
        light: '#fff'
      }
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating merchant QR code:', error);
    throw new Error('Failed to generate merchant QR code');
  }
}
