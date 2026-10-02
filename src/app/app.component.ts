import {
  Component,
  OnInit
} from '@angular/core';

import {
  IonApp,
  IonRouterOutlet
} from '@ionic/angular';

import {
  SessionService
} from './core/services/session.service';

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

  constructor(
    private readonly sessionService:
      SessionService
  ) {}

  async ngOnInit(): Promise<void> {

    await this.sessionService
      .initialize();
  }
}