import {
  CommonModule
} from '@angular/common';

import {
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  buildOutline,
  chevronForwardOutline,
  flashOutline,
  hammerOutline,
  locationOutline,
  notificationsOutline,
  searchOutline,
  waterOutline
} from 'ionicons/icons';

import {
  AppModeService
} from '../../core/services/app-mode.service';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  ServiceRequestService
} from '../../core/services/service-request.service';

import {
  ServiceRequest
} from '../../core/models/service-request.model';

import {
  NotificationService
} from '../../core/services/notification.service';

import {
  ProfileService
} from '../../core/services/profile.service';

import {
  ModeSwitcherComponent
} from '../../shared/components/mode-switcher/mode-switcher.component';


@Component({
  selector:
    'app-home',

  templateUrl:
    './home.page.html',

  styleUrls: [
    './home.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonToolbar,
    ModeSwitcherComponent
  ]
})
export class HomePage
  implements OnInit {


  private readonly router =
    inject(
      Router
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly serviceRequestService =
    inject(
      ServiceRequestService
    );


  private readonly profileService =
    inject(
      ProfileService
    );


  private readonly modeService =
    inject(
      AppModeService
    );


  private readonly notificationService =
    inject(
      NotificationService
    );


  readonly profile$ =
    this.profileService.profile$;


  readonly mode$ =
    this.modeService.mode$;


  readonly unreadCount$ =
    this.notificationService.unreadCount$;


  activeService:
    ServiceRequest | null =
      null;


  loadingActiveService =
    false;


  readonly categories = [
    {
      name:
        'Electricidad básica',
      label:
        'Electricidad',
      icon:
        'flash-outline'
    },
    {
      name:
        'Gasfitería y fugas de agua',
      label:
        'Gasfitería',
      icon:
        'water-outline'
    },
    {
      name:
        'Carpintería y reparaciones menores',
      label:
        'Carpintería',
      icon:
        'hammer-outline'
    },
    {
      name:
        'Lavadoras, secadoras y refrigeradores',
      label:
        'Línea blanca',
      icon:
        'build-outline'
    }
  ];


  constructor() {

    addIcons({
      buildOutline,
      chevronForwardOutline,
      flashOutline,
      hammerOutline,
      locationOutline,
      notificationsOutline,
      searchOutline,
      waterOutline
    });
  }


  ngOnInit(): void {

    /*
     * Si el usuario entra al Home cliente,
     * ServiGo cambia explícitamente
     * al contexto cliente.
     */
    this.modeService.setMode(
      'cliente'
    );
  }


  async ionViewWillEnter():
    Promise<void> {

    await this.loadActiveService();
  }


  private async loadActiveService():
    Promise<void> {

    this.loadingActiveService =
      true;

    try {
      const user =
        await this.authService
          .waitForAuthReady();

      if (!user) {
        this.activeService =
          null;
        return;
      }

      const requests =
        await this.serviceRequestService
          .getRequestsForClient(
            user.uid
          );

      this.activeService =
        requests.find(
          request =>
            request.status !== 'completed'
            && request.status !== 'cancelled'
        )
        ?? null;
    } catch (error) {
      console.error(
        '[ServiGo] Error cargando servicio activo del Home:',
        error
      );

      this.activeService =
        null;
    } finally {
      this.loadingActiveService =
        false;
    }
  }


  getActiveStatusLabel(
    request: ServiceRequest
  ): string {
    switch (request.status) {
      case 'published':
        return 'Buscando técnicos';
      case 'matched':
        return 'Técnicos encontrados';
      case 'quoted':
        return 'Presupuestos disponibles';
      case 'accepted':
        return 'Técnico confirmado';
      case 'en_route':
        return 'Técnico en camino';
      case 'arrived':
        return 'Técnico en el domicilio';
      case 'in_progress':
        return 'Trabajo en curso';
      default:
        return 'Servicio activo';
    }
  }


  async openActiveService():
    Promise<void> {
    if (!this.activeService) {
      await this.openServices();
      return;
    }

    await this.router.navigate(
      [
        '/app/services',
        this.activeService.id
      ]
    );
  }


  async openServices():
    Promise<void> {
    await this.router.navigateByUrl(
      '/app/services'
    );
  }


  async openNotifications():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/notifications'
    );
  }


  async requestService():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/services/new'
    );
  }


  async selectCategory(
    category: string
  ): Promise<void> {

    await this.router.navigate(
      [
        '/app/services/new'
      ],
      {
        queryParams: {
          category
        }
      }
    );
  }
}
