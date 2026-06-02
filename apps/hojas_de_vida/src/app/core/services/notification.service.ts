import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  UPDATE_REQUEST = 'UPDATE_REQUEST'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface NotificationRequest {
  userId: string;
  projectContext: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: { [key: string]: any };
  priority?: NotificationPriority;
  link?: string;
  icon?: string;
  sendEmail?: boolean;
  expiresAt?: string;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  projectContext: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: { [key: string]: any };
  priority: NotificationPriority;
  read: boolean;
  link?: string;
  icon?: string;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationUrl = `${environment.generalMongoDBApi}/notifications`;

  constructor(private http: HttpClient) {}

  createNotification(request: NotificationRequest): Observable<NotificationResponse> {
    return this.http.post<NotificationResponse>(this.notificationUrl, request);
  }

  getNotificationsByUser(userId: string): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(`${this.notificationUrl}/user/${userId}`);
  }

  getUnreadNotifications(userId: string): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(`${this.notificationUrl}/user/${userId}/unread`);
  }

  markAsRead(notificationId: string): Observable<NotificationResponse> {
    return this.http.put<NotificationResponse>(`${this.notificationUrl}/${notificationId}/read`, {});
  }
  
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.notificationUrl}/${notificationId}`);
  }
}
