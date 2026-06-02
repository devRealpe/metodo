import { Injectable } from '@angular/core';

/**
 * Servicio para generar y validar tokens seguros para códigos QR de asistencia.
 * Utiliza HMAC-SHA256 para firmar los datos del QR y prevenir manipulación.
 */
@Injectable({
  providedIn: 'root'
})
export class QrTokenService {
  
  private readonly SECRET_KEY = 'UNIMAR_LAB_QR_2024_SECRET_KEY';
  
  async generateToken(params: {
    labName: string;
    labCode: string;
    slot: string;
    exp: string;
    salt: string;
  }): Promise<string> {
    const payload = {
      ...params,
      iat: Date.now()
    };
    
    const payloadStr = JSON.stringify(payload);
    const signature = await this.sign(payloadStr);
    
    // Combinar payload y firma
    const token = btoa(JSON.stringify({
      payload: payloadStr,
      signature
    }));
    
    return token;
  }
  
  async validateToken(token: string): Promise<{
    labName: string;
    labCode: string;
    slot: string;
    exp: string;
    salt: string;
    iat: number;
  } | null> {
    try {
      const decoded = JSON.parse(atob(token));
      const { payload, signature } = decoded;
      
      // Verificar firma
      const expectedSignature = await this.sign(payload);
      if (signature !== expectedSignature) {
        
        return null;
      }
      
      const data = JSON.parse(payload);
      
      // Verificar expiración
      const expTime = new Date(data.exp).getTime();
      if (Date.now() > expTime) {
      
        return null;
      }
      
      return data;
    } catch (error) {
     
      return null;
    }
  }
  
  /**
   * Genera una firma HMAC-SHA256 del mensaje
   */
  private async sign(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.SECRET_KEY);
    const messageData = encoder.encode(message);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
  
  /**
   * Genera la URL completa del QR con el token incluido
   */
  async generateQrUrl(baseUrl: string, params: {
    labName: string;
    labCode: string;
    slot: string;
    exp: string;
    salt: string;
  }): Promise<string> {
    const token = await this.generateToken(params);
    return `${baseUrl}?qrToken=${encodeURIComponent(token)}`;
  }
}
