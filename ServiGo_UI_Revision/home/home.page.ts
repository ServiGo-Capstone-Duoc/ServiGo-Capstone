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
  notificationsOutline,
  searchOutline,
  locationOutline,
  flashOutline,
  waterOutline,
  hammerOutline,
  buildOutline,
  chevronForwardOutline
} from 'ionicons/icons';

import {
  ProfileService
} from '../../core/services/profile.service';

import {
  AppModeService
} from '../../core/services/app-mode.service';

import {
  ModeSwitcherComponent
} from '../../shared/components/mode-switcher/mode-switcher.component';


@Component({
  selector: 'app-home',

  templateUrl:
    './home.page.html',

  styleUrls: [
    './home.page.scss'
  ],

  standalone: true,

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
    inject(Router);


  private readonly profileService =
    inject(ProfileService);


  private readonly modeService =
    inject(AppModeService);


  readonly profile$ =
    this.profileService.profile$;


  readonly mode$ =
    this.modeService.mode$;


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

      notificationsOutline,

      searchOutline,

      locationOutline,

      flashOutline,

      waterOutline,

      hammerOutline,

      buildOutline,

      chevronForwardOutline
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