import {
  CommonModule
} from '@angular/common';

import {
  Component,
  inject
} from '@angular/core';

import {
  combineLatest,
  map
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
  homeOutline,
  constructOutline,
  chatbubbleEllipsesOutline,
  personOutline
} from 'ionicons/icons';

import {
  AppModeService,
  ServiGoMode
} from '../../core/services/app-mode.service';

import {
  ProfileService
} from '../../core/services/profile.service';


@Component({
  selector: 'app-main-shell',

  templateUrl:
    './main-shell.page.html',

  styleUrls: [
    './main-shell.page.scss'
  ],

  standalone: true,

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

  private readonly profileService =
    inject(ProfileService);

  private readonly modeService =
    inject(AppModeService);


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
                ) ?? false;


            if (
              requestedMode === 'tecnico'
              &&
              isTechnician
            ) {
              return 'tecnico';
            }


            return 'cliente';
          }
        )
      );


  constructor() {

    addIcons({
      homeOutline,
      constructOutline,
      chatbubbleEllipsesOutline,
      personOutline
    });
  }
}