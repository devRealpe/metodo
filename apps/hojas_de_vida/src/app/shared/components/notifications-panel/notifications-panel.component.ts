import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Popover, PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ScrollerModule } from 'primeng/scroller';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationsService, Notification } from '@domain/auth';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [
    CommonModule,
    PopoverModule,
    ButtonModule,
    BadgeModule,
    ScrollerModule
  ],
  providers: [NotificationsService],
  templateUrl: './notifications-panel.component.html',
  styleUrl: './notifications-panel.component.scss'
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  @ViewChild('notificationsPopover') notificationsPopover!: Popover;

  notifications: Notification[] = [];
  unreadCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationsService: NotificationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.notificationsService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications: Notification[]) => {
        this.notifications = notifications;
      });

    this.notificationsService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe((count: number) => {
        this.unreadCount = count;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle(event: Event): void {
    this.notificationsPopover.toggle(event);
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationsService.markAsRead(notification.id);
    }

    if (notification.link) {
      this.router.navigate([notification.link]);
      this.notificationsPopover.hide();
    }
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  deleteNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    this.notificationsService.deleteNotification(notificationId);
  }

  getNotificationIcon(notification: Notification): string {
    if (notification.icon) {
      return notification.icon;
    }

    switch (notification.type) {
      case 'success':
        return 'pi pi-check-circle';
      case 'error':
        return 'pi pi-times-circle';
      case 'warning':
        return 'pi pi-exclamation-triangle';
      case 'info':
      default:
        return 'pi pi-info-circle';
    }
  }

  getNotificationColorClass(notification: Notification): string {
    switch (notification.type) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-orange-500';
      case 'info':
      default:
        return 'text-blue-500';
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days !== 1 ? 's' : ''}`;
    
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
