import {
  CommonModule
} from '@angular/common';

import {
  Component,
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  briefcaseOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  constructOutline,
  documentTextOutline,
  notificationsOutline
} from 'ionicons/icons';

import {
  AppNotification
} from '../../core/models/app-notification.model';

import {
  NotificationService
} from '../../core/services/notification.service';


@Component({
  selector:
    'app-notifications',

  templateUrl:
    './notifications.page.html',

  styleUrls: [
    './notifications.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonTitle,
    IonToolbar
  ]
})
export class NotificationsPage {


  private readonly router =
    inject(
      Router
    );


  private readonly notificationService =
    inject(
      NotificationService
    );


  readonly notifications$ =
    this.notificationService.notifications$;


  readonly unreadCount$ =
    this.notificationService.unreadCount$;


  readonly loading$ =
    this.notificationService.loading$;


  readonly error$ =
    this.notificationService.error$;


  markingAll =
    false;


  constructor() {

    addIcons({
      briefcaseOutline,
      chatbubbleEllipsesOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      constructOutline,
      documentTextOutline,
      notificationsOutline
    });
  }


  async openNotification(
    notification: AppNotification
  ): Promise<void> {


    try {

      await this.notificationService
        .markAsRead(
          notification
        );


    } catch (error) {

      console.error(
        '[ServiGo Notifications] No fue posible marcar como leída:',
        error
      );
    }


    await this.router.navigate(
      this.notificationService
        .getNavigationCommands(
          notification
        )
    );
  }


  async markAllAsRead():
    Promise<void> {


    if (
      this.markingAll
    ) {

      return;
    }


    this.markingAll =
      true;


    try {

      await this.notificationService
        .markAllAsRead();


    } catch (error) {

      console.error(
        '[ServiGo Notifications] No fue posible marcar todas como leídas:',
        error
      );


    } finally {

      this.markingAll =
        false;
    }
  }


  getIcon(
    notification: AppNotification
  ): string {


    switch (
      notification.type
    ) {

      case 'client_new_message':

      case 'technician_new_message':
        return 'chatbubble-ellipses-outline';


      case 'technician_opportunity':
        return 'briefcase-outline';


      case 'client_new_quote':

      case 'technician_quote_accepted':
        return 'document-text-outline';


      case 'client_job_completed':
        return 'checkmark-circle-outline';


      case 'client_service_cancelled':

      case 'technician_service_cancelled':
        return 'close-circle-outline';


      case 'client_technician_en_route':

      case 'client_technician_arrived':

      case 'client_job_started':
        return 'construct-outline';


      default:
        return 'notifications-outline';
    }
  }


  formatDate(
    value: Date | null
  ): string {


    if (
      !value
    ) {

      return 'Ahora';
    }


    return new Intl.DateTimeFormat(
      'es-CL',
      {
        dateStyle:
          'short',

        timeStyle:
          'short'
      }
    ).format(
      value
    );
  }
}
