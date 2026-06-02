import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface EmailResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private smtpUrl = `${environment.smtpApi}/email`;

  constructor(private http: HttpClient) {}

  sendEmail(request: EmailRequest): Observable<EmailResponse> {
    return this.http.post<EmailResponse>(`${this.smtpUrl}/send-email`, request);
  }

  sendSimpleEmail(to: string, subject: string, body: string): Observable<EmailResponse> {
    return this.http.post<EmailResponse>(`${this.smtpUrl}/send`, null, {
      params: { to, subject, body }
    });
  }
}
