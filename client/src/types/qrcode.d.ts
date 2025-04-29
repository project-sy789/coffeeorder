declare module 'qrcode' {
  export interface QRCodeOptions {
    type?: string;
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement | string,
    text: string,
    options?: QRCodeOptions
  ): Promise<HTMLCanvasElement>;

  export function toString(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;
}

declare module 'promptpay-qr' {
  export interface PromptPayOptions {
    amount?: number;
  }

  export default function generatePayload(
    id: string,
    options?: PromptPayOptions
  ): string;
}