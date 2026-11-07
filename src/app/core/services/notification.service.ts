import {
  Injectable
} from '@angular/core';

import {
  BehaviorSubject,
  Observable,
  distinctUntilChanged,
  map
} from 'rxjs';

import {
  DocumentData,
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  AppNotification,
  AppNotificationType
} from '../models/app-notification.model';


@Injectable({
  providedIn:
    'root'
})
export class NotificationService {


  private readonly notificationsSubject =
    new BehaviorSubject<AppNotification[]>(
      []
    );


  readonly notifications$: Observable<AppNotification[]> =
    this.notificationsSubject.asObservable();


  readonly unreadCount$: Observable<number> =
    this.notifications$.pipe(
      map(
        notifications =>
          notifications.filter(
            notification =>
              !notification.read
          ).length
      ),
      distinctUntilChanged()
    );


  private readonly loadingSubject =
    new BehaviorSubject<boolean>(
      false
    );


  readonly loading$: Observable<boolean> =
    this.loadingSubject.asObservable();


  private readonly errorSubject =
    new BehaviorSubject<string>(
      ''
    );


  readonly error$: Observable<string> =
    this.errorSubject.asObservable();


  private currentUserId:
    string | null =
      null;


  private unsubscribeNotifications:
    (() => void) | null =
      null;


  /*
   * =========================================
   * ESCUCHAR NOTIFICACIONES
   * =========================================
   */

  watchNotifications(
    userId: string
  ): void {


    const cleanUserId =
      userId.trim();


    if (
      !cleanUserId
    ) {

      this.clearNotifications();

      return;
    }


    if (
      this.currentUserId ===
        cleanUserId
      &&
      this.unsubscribeNotifications
    ) {

      return;
    }


    this.stopWatching();


    this.currentUserId =
      cleanUserId;


    this.loadingSubject.next(
      true
    );


    this.errorSubject.next(
      ''
    );


    const notificationsQuery =
      query(
        collection(
          firestore,
          'users',
          cleanUserId,
          'notifications'
        ),
        orderBy(
          'createdAt',
          'desc'
        ),
        limit(
          100
        )
      );


    this.unsubscribeNotifications =
      onSnapshot(
        notificationsQuery,
        snapshot => {


          const notifications =
            snapshot.docs.map(
              notificationSnapshot =>
                this.mapNotification(
                  notificationSnapshot.id,
                  notificationSnapshot.data()
                )
            );


          this.notificationsSubject.next(
            notifications
          );


          this.loadingSubject.next(
            false
          );


          this.errorSubject.next(
            ''
          );
        },
        error => {


          console.error(
            '[ServiGo Notifications] Error escuchando notificaciones:',
            error
          );


          this.notificationsSubject.next(
            []
          );


          this.loadingSubject.next(
            false
          );


          this.errorSubject.next(
            'No pudimos cargar tus notificaciones.'
          );
        }
      );
  }


  /*
   * =========================================
   * LIMPIAR SESIÓN
   * =========================================
   */

  clearNotifications(): void {


    this.stopWatching();


    this.currentUserId =
      null;


    this.notificationsSubject.next(
      []
    );


    this.loadingSubject.next(
      false
    );


    this.errorSubject.next(
      ''
    );
  }


  /*
   * =========================================
   * MARCAR UNA COMO LEÍDA
   * =========================================
   */

  async markAsRead(
    notification: AppNotification
  ): Promise<void> {


    if (
      notification.read
    ) {

      return;
    }


    await this.markAsReadById(
      notification.id,
      notification.userId
    );
  }


  async markAsReadById(
    notificationId: string,
    userId?: string
  ): Promise<void> {


    const targetUserId =
      userId?.trim()
      ||
      this.currentUserId;


    const cleanNotificationId =
      notificationId.trim();


    if (
      !targetUserId
      ||
      !cleanNotificationId
    ) {

      return;
    }


    await updateDoc(
      doc(
        firestore,
        'users',
        targetUserId,
        'notifications',
        cleanNotificationId
      ),
      {
        read:
          true,

        readAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );
  }


  /*
   * =========================================
   * MARCAR AVISOS DE UN CHAT COMO LEÍDOS
   * =========================================
   *
   * También se utiliza cuando el usuario abre
   * la conversación desde la pestaña Chat,
   * sin pasar antes por la campana.
   */

  async markChatNotificationsAsRead(
    requestId: string
  ): Promise<void> {


    if (
      !this.currentUserId
      ||
      !requestId
    ) {

      return;
    }


    const chatNotifications =
      this.notificationsSubject.value.filter(
        notification =>
          !notification.read
          &&
          notification.requestId ===
            requestId
          &&
          (
            notification.type ===
              'client_new_message'
            ||
            notification.type ===
              'technician_new_message'
          )
      );


    if (
      chatNotifications.length ===
        0
    ) {

      return;
    }


    const batch =
      writeBatch(
        firestore
      );


    for (
      const notification
      of chatNotifications
    ) {

      batch.update(
        doc(
          firestore,
          'users',
          this.currentUserId,
          'notifications',
          notification.id
        ),
        {
          read:
            true,

          readAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );
    }


    await batch.commit();
  }


  /*
   * =========================================
   * MARCAR TODAS COMO LEÍDAS
   * =========================================
   */

  async markAllAsRead():
    Promise<void> {


    if (
      !this.currentUserId
    ) {

      return;
    }


    const unreadNotifications =
      this.notificationsSubject.value.filter(
        notification =>
          !notification.read
      );


    if (
      unreadNotifications.length ===
        0
    ) {

      return;
    }


    const batch =
      writeBatch(
        firestore
      );


    for (
      const notification
      of unreadNotifications
    ) {

      batch.update(
        doc(
          firestore,
          'users',
          this.currentUserId,
          'notifications',
          notification.id
        ),
        {
          read:
            true,

          readAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );
    }


    await batch.commit();
  }


  /*
   * =========================================
   * DESTINO DE NAVEGACIÓN
   * =========================================
   */

  getNavigationCommands(
    notification: AppNotification
  ): string[] {


    if (
      !notification.requestId
    ) {

      return [
        '/app/home'
      ];
    }


    switch (
      notification.type
    ) {

      case 'technician_opportunity':
        return [
          '/app/technician/opportunity',
          notification.requestId
        ];


      case 'technician_quote_accepted':

      case 'technician_service_cancelled':
        return [
          '/app/technician/jobs',
          notification.requestId
        ];


      case 'client_new_message':

      case 'technician_new_message':
        return [
          '/app/messages',
          notification.requestId
        ];


      case 'client_new_quote':

      case 'client_technician_en_route':

      case 'client_technician_arrived':

      case 'client_job_started':

      case 'client_job_completed':

      case 'client_service_cancelled':
        return [
          '/app/services',
          notification.requestId
        ];


      default:
        return [
          '/app/home'
        ];
    }
  }


  /*
   * =========================================
   * DETENER LISTENER
   * =========================================
   */

  private stopWatching(): void {


    if (
      this.unsubscribeNotifications
    ) {

      this.unsubscribeNotifications();


      this.unsubscribeNotifications =
        null;
    }
  }


  /*
   * =========================================
   * MAPEO
   * =========================================
   */

  private mapNotification(
    id: string,
    data: DocumentData
  ): AppNotification {


    return {
      id,

      userId:
        typeof data['userId'] ===
          'string'
          ? data['userId']
          : this.currentUserId
            ?? '',

      type:
        this.mapType(
          data['type']
        ),

      title:
        typeof data['title'] ===
          'string'
          ? data['title']
          : 'Notificación ServiGo',

      body:
        typeof data['body'] ===
          'string'
          ? data['body']
          : '',

      requestId:
        typeof data['requestId'] ===
          'string'
          ? data['requestId']
          : '',

      messageId:
        this.optionalString(
          data['messageId']
        ),

      opportunityId:
        this.optionalString(
          data['opportunityId']
        ),

      quoteId:
        this.optionalString(
          data['quoteId']
        ),

      category:
        this.optionalString(
          data['category']
        ),

      commune:
        this.optionalString(
          data['commune']
        ),

      matchScore:
        this.optionalString(
          data['matchScore']
        ),

      read:
        data['read'] ===
          true,

      createdAt:
        this.toDate(
          data['createdAt']
        ),

      updatedAt:
        this.toDate(
          data['updatedAt']
        ),

      readAt:
        this.toDate(
          data['readAt']
        )
    };
  }


  private mapType(
    value: unknown
  ): AppNotificationType {


    switch (
      value
    ) {

      case 'technician_opportunity':

      case 'client_new_quote':

      case 'technician_quote_accepted':

      case 'client_technician_en_route':

      case 'client_technician_arrived':

      case 'client_job_started':

      case 'client_job_completed':

      case 'client_service_cancelled':

      case 'technician_service_cancelled':

      case 'client_new_message':

      case 'technician_new_message':
        return value;


      default:
        return 'unknown';
    }
  }


  private optionalString(
    value: unknown
  ): string | null {


    return typeof value ===
      'string'
      &&
      value.length >
        0
      ? value
      : null;
  }


  private toDate(
    value: unknown
  ): Date | null {


    if (
      value instanceof Timestamp
    ) {

      return value.toDate();
    }


    if (
      value instanceof Date
    ) {

      return value;
    }


    return null;
  }
}
