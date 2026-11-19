import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

import {
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
  chatbubbleEllipsesOutline,
  chevronForwardOutline,
  constructOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  ServiceRequestService
} from '../../core/services/service-request.service';

import {
  ServiceRequest
} from '../../core/models/service-request.model';


@Component({
  selector:
    'app-messages',

  templateUrl:
    './messages.page.html',

  styleUrls: [
    './messages.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class MessagesPage {


  private readonly router =
    inject(
      Router
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly requestService =
    inject(
      ServiceRequestService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  conversations:
    ServiceRequest[] = [];


  loading =
    true;


  errorMessage =
    '';


  constructor() {

    addIcons({

      chatbubbleEllipsesOutline,

      chevronForwardOutline,

      constructOutline
    });
  }


  async ionViewWillEnter():
    Promise<void> {

    await this.loadConversations();
  }


  async loadConversations():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
      '';


    this.conversations =
      [];


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      this.loading =
        false;


      this.errorMessage =
        'No pudimos validar tu sesión.';


      this.cdr
        .detectChanges();


      return;
    }


    try {

      /*
       * Buscamos primero como cliente.
       */

      const clientRequests =
        await this.requestService
          .getRequestsForClient(
            user.uid
          );


      /*
       * Buscamos también como técnico.
       *
       * Activos + historial.
       */

      const [
        technicianActive,
        technicianHistory
      ] =
        await Promise.all([

          this.requestService
            .getAssignedRequestsForTechnician(
              user.uid
            ),

          this.requestService
            .getHistoryForTechnician(
              user.uid
            )
        ]);


      const allRequests = [
        ...clientRequests,
        ...technicianActive,
        ...technicianHistory
      ];


      /*
       * Quitamos duplicados.
       */

      const uniqueRequests =
        Array.from(
          new Map(
            allRequests.map(
              request => [
                request.id,
                request
              ]
            )
          )
            .values()
        );


      /*
       * Chat solamente después de contratar.
       */

      this.conversations =
  uniqueRequests
    .filter(
      request =>
        request.status ===
          'accepted'
        ||
        request.status ===
          'en_route'
        ||
        request.status ===
          'arrived'
        ||
        request.status ===
          'in_progress'
        ||
        request.status ===
          'completed'
        ||
        request.status ===
          'cancelled'
    )
    .sort(
      (
        a,
        b
      ) => {

        const dateA =
          a.updatedAt
            ?.getTime()
          ?? 0;


        const dateB =
          b.updatedAt
            ?.getTime()
          ?? 0;


        return dateB - dateA;
      }
    );


      console.log(
        '[ServiGo Chat] Conversaciones:',
        this.conversations
      );


    } catch (error) {

      console.error(
        '[ServiGo Chat] Error cargando conversaciones:',
        error
      );


      this.errorMessage =
        'No pudimos cargar tus conversaciones.';


    } finally {

      this.loading =
        false;


      this.cdr
        .detectChanges();
    }
  }


  async openConversation(
    request:
      ServiceRequest
  ): Promise<void> {

    await this.router.navigate(
      [
        '/app/messages',
        request.id
      ]
    );
  }


  getStatusLabel(
    status: string
  ): string {


    switch (
      status
    ) {

      case 'accepted':
        return 'Contratado';

      case 'in_progress':
        return 'En curso';

      case 'completed':
        return 'Finalizado';
      
      case 'en_route':
  return 'En camino';

case 'arrived':
  return 'En el domicilio';

case 'cancelled':
  return 'Cancelado';

      default:
        return status;
    }
  }
}