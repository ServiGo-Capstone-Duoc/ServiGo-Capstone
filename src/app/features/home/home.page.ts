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


  readonly categories = [
    {
      name:
        'Electricidad',

      icon:
        'flash-outline'
    },
    {
      name:
        'Gasfitería',

      icon:
        'water-outline'
    },
    {
      name:
        'Carpintería',

      icon:
        'hammer-outline'
    },
    {
      name:
        'Mecánica',

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
