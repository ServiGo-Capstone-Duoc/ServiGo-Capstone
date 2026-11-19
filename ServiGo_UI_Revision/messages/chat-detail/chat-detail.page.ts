import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  inject
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  sendOutline,
  constructOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  ChatService
} from '../../../core/services/chat.service';

import {
  ProfileService
} from '../../../core/services/profile.service';

import {
  ChatMessage
} from '../../../core/models/chat-message.model';

import {
  ServiceRequest
} from '../../../core/models/service-request.model';


@Component({
  selector:
    'app-chat-detail',

  templateUrl:
    './chat-detail.page.html',

  styleUrls: [
    './chat-detail.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class ChatDetailPage
  implements OnDestroy {


  private readonly router =
    inject(
      Router
    );


  private readonly route =
    inject(
      ActivatedRoute
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly chatService =
    inject(
      ChatService
    );


  private readonly profileService =
    inject(
      ProfileService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  request:
    ServiceRequest | null =
      null;


  messages:
    ChatMessage[] =
      [];


  currentUserId =
    '';


  currentUserName =
    '';


  messageText =
    '';


  loading =
    true;


  sending =
    false;


  errorMessage =
    '';


  private unsubscribeMessages:
    (() => void)
    | null =
      null;


  constructor() {

    addIcons({

      arrowBackOutline,

      sendOutline,

      constructOutline
    });
  }


  async ionViewWillEnter():
    Promise<void> {

    await this.loadChat();
  }


  ionViewWillLeave():
    void {

    this.stopListening();
  }


  ngOnDestroy():
    void {

    this.stopListening();
  }


  async loadChat():
    Promise<void> {


    this.stopListening();


    this.loading =
      true;


    this.errorMessage =
      '';


    this.messages =
      [];


    const requestId =
      this.route.snapshot
        .paramMap
        .get(
          'requestId'
        );


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !requestId
      ||
      !user
    ) {

      this.loading =
        false;


      this.errorMessage =
        'No pudimos abrir esta conversación.';


      this.cdr
        .detectChanges();


      return;
    }


    this.currentUserId =
      user.uid;


    this.currentUserName =
      user.displayName
      ??
      user.email
      ??
      'Usuario ServiGo';


    try {

      this.request =
        await this.chatService
          .getConversationRequest(
            requestId,
            user.uid
          );


      if (
        !this.request
      ) {

        this.errorMessage =
          'Esta conversación no está disponible.';


        return;
      }


      this.unsubscribeMessages =
        this.chatService
          .listenToMessages(

            requestId,

            messages => {

              this.messages =
                messages;


              this.cdr
                .detectChanges();
            },

            () => {

              this.errorMessage =
                'No pudimos actualizar los mensajes.';


              this.cdr
                .detectChanges();
            }
          );


    } catch (error) {

      console.error(
        '[ServiGo Chat] Error abriendo conversación:',
        error
      );


      this.errorMessage =
        'No pudimos abrir esta conversación.';


    } finally {

      this.loading =
        false;


      this.cdr
        .detectChanges();
    }
  }
/*
 * =========================================
 * CHAT SOLO LECTURA
 * =========================================
 *
 * Los mensajes de un servicio cancelado
 * se conservan como historial.
 *
 * La interfaz bloquea nuevos mensajes y
 * Firestore Rules aplica la misma restricción
 * de forma autoritativa.
 */

get isReadOnly():
  boolean {

  return (
    this.request?.status ===
      'cancelled'
  );
}

  async sendMessage():
    Promise<void> {


if (
  !this.request
  ||
  !this.currentUserId
  ||
  this.sending
  ||
  this.isReadOnly
) {

  return;
}


    const text =
      this.messageText
        .trim();


    if (
      !text
    ) {

      return;
    }


    this.sending =
      true;


    this.errorMessage =
      '';


    try {

      await this.chatService
        .sendMessage(

          this.request.id,

          this.currentUserId,

          this.currentUserName,

          text
        );


      this.messageText =
        '';


    } catch (error) {

      console.error(
        '[ServiGo Chat] Error enviando mensaje:',
        error
      );


      this.errorMessage =
        'No pudimos enviar el mensaje.';


    } finally {

      this.sending =
        false;


      this.cdr
        .detectChanges();
    }
  }


  isOwnMessage(
    message:
      ChatMessage
  ): boolean {

    return message.senderId ===
      this.currentUserId;
  }


  formatTime(
    date:
      Date | null
  ): string {


    if (
      !date
    ) {

      return '';
    }


    return date.toLocaleTimeString(
      'es-CL',
      {
        hour:
          '2-digit',

        minute:
          '2-digit'
      }
    );
  }


  async back():
    Promise<void> {

    await this.router
      .navigateByUrl(
        '/app/messages'
      );
  }


  private stopListening():
    void {


    if (
      this.unsubscribeMessages
    ) {

      this.unsubscribeMessages();

      this.unsubscribeMessages =
        null;
    }
  }
}