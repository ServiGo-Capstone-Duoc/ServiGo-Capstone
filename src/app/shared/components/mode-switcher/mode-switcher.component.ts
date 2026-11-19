import {
  Component,
  Input,
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  AppModeService,
  ServiGoMode
} from '../../../core/services/app-mode.service';


@Component({
  selector: 'app-mode-switcher',

  templateUrl:
    './mode-switcher.component.html',

  styleUrls: [
    './mode-switcher.component.scss'
  ],

  standalone: true
})
export class ModeSwitcherComponent {

  private readonly modeService =
    inject(AppModeService);

  private readonly router =
    inject(Router);


  @Input({
    required: true
  })
  activeMode:
    ServiGoMode = 'cliente';


  async changeMode(
    mode: ServiGoMode
  ): Promise<void> {

    if (
      mode === this.activeMode
    ) {
      return;
    }


    this.modeService.setMode(
      mode
    );


    if (
      mode === 'tecnico'
    ) {

      await this.router.navigateByUrl(
        '/app/technician/home'
      );

      return;
    }


    await this.router.navigateByUrl(
      '/app/home'
    );
  }
}