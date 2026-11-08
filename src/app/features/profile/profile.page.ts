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
  briefcaseOutline,
  cardOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  closeCircleOutline,
  constructOutline,
  locationOutline,
  logOutOutline,
  personOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  star,
  timeOutline
} from 'ionicons/icons';

import {
  TechnicianApplication
} from '../../core/models/technician-application.model';

import {
  TechnicianProfile
} from '../../core/models/technician-profile.model';

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
  TechnicianProfileService
} from '../../core/services/technician-profile.service';

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

  private readonly technicianProfileService =
    inject(
      TechnicianProfileService
    );

  private readonly cdr =
    inject(ChangeDetectorRef);

  readonly profile$ =
    this.profileService.profile$;

  technicianApplication:
    TechnicianApplication | null = null;

  technicianProfile:
    TechnicianProfile | null = null;

  detailsLoading = true;

  constructor() {

    addIcons({
      briefcaseOutline,
      cardOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      closeCircleOutline,
      constructOutline,
      locationOutline,
      logOutOutline,
      personOutline,
      settingsOutline,
      shieldCheckmarkOutline,
      star,
      timeOutline
    });
  }

  async ngOnInit():
    Promise<void> {

    await this.loadRelatedProfiles();
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

  professionalStatusLabel():
    string {

    if (
      this.technicianProfile?.status ===
      'inactive'
    ) {
      return 'Inactivo';
    }

    if (
      this.technicianProfile?.status ===
      'suspended'
    ) {
      return 'Suspendido';
    }

    return 'Activo';
  }

  async editProfile():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/profile/edit'
    );
  }

  async openAddresses():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/profile/edit'
    );
  }

  async openHistory():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/services'
    );
  }

  async openPayments():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/services'
    );
  }

  async openSecurity():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/security'
    );
  }

  async openSettings():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/settings'
    );
  }

  async logout():
    Promise<void> {

    await this.authService.logout();

    await this.router.navigateByUrl(
      '/login',
      {
        replaceUrl: true
      }
    );
  }

  private async loadRelatedProfiles():
    Promise<void> {

    const user =
      await this.authService
        .waitForAuthReady();

    if (
      !user
    ) {
      this.detailsLoading = false;
      this.cdr.detectChanges();
      return;
    }

    try {

      const [
        application,
        professionalProfile
      ] = await Promise.all([
        this.applicationService
          .getLatestApplication(
            user.uid
          ),
        this.technicianProfileService
          .getProfile(
            user.uid
          )
      ]);

      this.technicianApplication =
        application;

      this.technicianProfile =
        professionalProfile;

    } catch (error) {

      console.error(
        '[ServiGo] Error consultando información de perfil:',
        error
      );

    } finally {

      this.detailsLoading = false;
      this.cdr.detectChanges();
    }
  }
}
