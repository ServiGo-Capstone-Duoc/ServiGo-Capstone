import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  IonContent,
  IonIcon
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  star,
  personOutline,
  locationOutline,
  timeOutline,
  cardOutline,
  shieldCheckmarkOutline,
  helpCircleOutline,
  constructOutline,
  chevronForwardOutline,
  logOutOutline,
  checkmarkCircleOutline,
  closeCircleOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  ProfileService
} from '../../core/services/profile.service';

import {
  TechnicianApplicationService
} from '../../core/services/technician-application.service';

import {
  TechnicianApplication
} from '../../core/models/technician-application.model';


@Component({
  selector: 'app-profile',

  templateUrl:
    './profile.page.html',

  styleUrls: [
    './profile.page.scss'
  ],

  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonIcon
  ]
})
export class ProfilePage
  implements OnInit {


  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly profileService =
    inject(ProfileService);

  private readonly applicationService =
    inject(
      TechnicianApplicationService
    );

  private readonly cdr =
    inject(ChangeDetectorRef);


  readonly profile$ =
    this.profileService.profile$;


  technicianApplication:
    TechnicianApplication | null = null;


  applicationLoading = true;


  constructor() {

    addIcons({
  star,
  personOutline,
  locationOutline,
  timeOutline,
  cardOutline,
  shieldCheckmarkOutline,
  helpCircleOutline,
  constructOutline,
  chevronForwardOutline,
  logOutOutline,
  checkmarkCircleOutline,
  closeCircleOutline
});
  }


  async ngOnInit(): Promise<void> {

    await this.loadTechnicianApplication();
  }


  private async loadTechnicianApplication():
    Promise<void> {

    const user =
      await this.authService
        .waitForAuthReady();


    if (!user) {

      this.applicationLoading = false;

      this.cdr.detectChanges();

      return;
    }


    try {

      this.technicianApplication =
        await this.applicationService
          .getLatestApplication(
            user.uid
          );

    } catch (error) {

      console.error(
        '[ServiGo] Error consultando postulación:',
        error
      );

    } finally {

      this.applicationLoading = false;

      this.cdr.detectChanges();
    }
  }


  getRoleLabel(
    roles: string[]
  ): string {

    if (
      roles.includes(
        'superadmin'
      )
    ) {
      return 'Superadministrador';
    }


    if (
      roles.includes(
        'administrador'
      )
    ) {
      return 'Administrador';
    }


    if (
      roles.includes(
        'tecnico'
      )
    ) {
      return 'Cliente · Técnico';
    }


    return 'Cliente';
  }


  getRating(
    rating: number | null
  ): string {

    if (
      rating === null
    ) {
      return 'Sin evaluaciones';
    }


    return rating.toFixed(1);
  }


  editProfile(): void {

    console.log(
      '[ServiGo] Editar perfil'
    );
  }


  openAddresses(): void {

    console.log(
      '[ServiGo] Direcciones'
    );
  }


  openHistory(): void {

    console.log(
      '[ServiGo] Historial'
    );
  }


  openPayments(): void {

    console.log(
      '[ServiGo] Métodos de pago'
    );
  }


  openSecurity(): void {

    console.log(
      '[ServiGo] Seguridad'
    );
  }


  openHelp(): void {

    console.log(
      '[ServiGo] Ayuda'
    );
  }


  async logout(): Promise<void> {

    await this.authService.logout();


    await this.router.navigateByUrl(
      '/login',
      {
        replaceUrl: true
      }
    );
  }
}