import {
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  IonApp,
  IonRouterOutlet
} from '@ionic/angular';

import {
  SessionService
} from './core/services/session.service';

import {
  ThemeService
} from './core/services/theme.service';

@Component({
  selector:
    'app-root',

  templateUrl:
    'app.component.html',

  standalone:
    true,

  imports: [
    IonApp,
    IonRouterOutlet
  ]
})
export class AppComponent
  implements OnInit {

  private readonly sessionService =
    inject(SessionService);


  private readonly themeService =
    inject(ThemeService);


  constructor() {

    this.themeService.initialize();
  }

  async ngOnInit(): Promise<void> {

    await this.sessionService
      .initialize();
  }
}