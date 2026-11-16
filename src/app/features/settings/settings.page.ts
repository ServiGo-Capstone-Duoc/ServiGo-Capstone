import {
  CommonModule
} from '@angular/common';

import {
  Component,
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  IonContent,
  IonIcon
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  checkmarkCircle,
  colorPaletteOutline,
  contrastOutline,
  moonOutline,
  sunnyOutline
} from 'ionicons/icons';

import {
  ThemeOption,
  ThemePreference
} from '../../core/models/theme.model';

import {
  ThemeService
} from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: [
    './settings.page.scss'
  ],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ]
})
export class SettingsPage {

  private readonly router =
    inject(Router);

  readonly themeService =
    inject(ThemeService);

  readonly themeOptions:
    ThemeOption[] = [
      {
        value: 'system',
        label: 'Usar configuración del sistema',
        description: 'ServiGo cambia automáticamente junto con tu dispositivo.',
        icon: 'contrast-outline'
      },
      {
        value: 'light',
        label: 'Modo claro',
        description: 'Fondo luminoso y alto contraste para uso durante el día.',
        icon: 'sunny-outline'
      },
      {
        value: 'dark',
        label: 'Modo oscuro',
        description: 'Interfaz de baja luminosidad optimizada para ambientes oscuros.',
        icon: 'moon-outline'
      }
    ];

  constructor() {

    addIcons({
      arrowBackOutline,
      checkmarkCircle,
      colorPaletteOutline,
      contrastOutline,
      moonOutline,
      sunnyOutline
    });
  }

  selectTheme(
    preference: ThemePreference
  ): void {

    this.themeService.setPreference(
      preference
    );
  }

  async goBack():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/profile'
    );
  }
}
