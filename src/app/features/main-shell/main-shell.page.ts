import {
  CommonModule
} from '@angular/common';

import {
  Component,
  inject
} from '@angular/core';

import {
  NavigationEnd,
  Router
} from '@angular/router';

import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  startWith
} from 'rxjs';

import {
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  chatbubbleEllipsesOutline,
  constructOutline,
  homeOutline,
  notificationsOutline,
  personOutline
} from 'ionicons/icons';

import {
  AppModeService,
  ServiGoMode
} from '../../core/services/app-mode.service';

import {
  NotificationService
} from '../../core/services/notification.service';

import {
  ProfileService
} from '../../core/services/profile.service';


@Component({
  selector:
    'app-main-shell',

  templateUrl:
    './main-shell.page.html',

  styleUrls: [
    './main-shell.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,

    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel
  ]
})
export class MainShellPage {


  private readonly router =
    inject(
      Router
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


  readonly unreadCount$ =
    this.notificationService.unreadCount$;


  readonly navigationMode$ =
    combineLatest([
      this.profileService.profile$,
      this.modeService.mode$
    ])
      .pipe(
        map(
          (
            [
              profile,
              requestedMode
            ]
          ): ServiGoMode => {


            const isTechnician =
              profile?.roles
                ?.includes(
                  'tecnico'
                )
              ?? false;


            if (
              requestedMode ===
                'tecnico'
              &&
              isTechnician
            ) {

              return 'tecnico';
            }


            return 'cliente';
          }
        )
      );


  /*
   * =========================================
   * CAMPANA GLOBAL
   * =========================================
   *
   * El Home cliente ya posee su propia
   * campana integrada al header, por lo que
   * allí no duplicamos el control.
   *
   * En el centro de notificaciones tampoco
   * se muestra porque el usuario ya está
   * dentro de ese módulo.
   *
   * En todas las demás rutas autenticadas
   * del MainShell se mantiene visible.
   */
  readonly showGlobalNotificationBell$ =
    this.router.events.pipe(
      filter(
        (
          event
        ): event is NavigationEnd =>
          event instanceof NavigationEnd
      ),
      map(
        event =>
          this.shouldShowGlobalNotificationBell(
            event.urlAfterRedirects
          )
      ),
      startWith(
        this.shouldShowGlobalNotificationBell(
          this.router.url
        )
      ),
      distinctUntilChanged()
    );


  constructor() {

    addIcons({

      homeOutline,

      constructOutline,

      chatbubbleEllipsesOutline,

      personOutline,

      notificationsOutline
    });
  }


  /*
   * =========================================
   * NOTIFICACIONES
   * =========================================
   */

  async openNotifications():
    Promise<void> {


    await this.router
      .navigateByUrl(
        '/app/notifications'
      );
  }


  /*
   * =========================================
   * INICIO
   * =========================================
   */

  async openHome(
    mode:
      ServiGoMode
  ): Promise<void> {


    if (
      mode ===
      'tecnico'
    ) {

      await this.router
        .navigateByUrl(
          '/app/technician/home'
        );


      return;
    }


    await this.router
      .navigateByUrl(
        '/app/home'
      );
  }


  /*
   * =========================================
   * SERVICIOS / TRABAJOS
   * =========================================
   */

  async openServices(
    mode:
      ServiGoMode
  ): Promise<void> {


    if (
      mode ===
      'tecnico'
    ) {

      await this.router
        .navigateByUrl(
          '/app/technician/jobs'
        );


      return;
    }


    await this.router
      .navigateByUrl(
        '/app/services'
      );
  }


  /*
   * =========================================
   * CHAT
   * =========================================
   */

  async openMessages():
    Promise<void> {


    await this.router
      .navigateByUrl(
        '/app/messages'
      );
  }


  /*
   * =========================================
   * PERFIL
   * =========================================
   */

  async openProfile():
    Promise<void> {


    await this.router
      .navigateByUrl(
        '/app/profile'
      );
  }


  private shouldShowGlobalNotificationBell(
    url: string
  ): boolean {


    const cleanUrl =
      url
        .split('?')[0]
        .split('#')[0];


    return cleanUrl !==
        '/app/home'
      &&
      cleanUrl !==
        '/app/notifications';
  }
}
