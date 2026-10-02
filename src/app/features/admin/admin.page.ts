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
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  IonTextarea
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  checkmarkCircleOutline,
  closeCircleOutline,
  constructOutline,
  documentTextOutline,
  locationOutline,
  refreshOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  AdminService
} from '../../core/services/admin.service';

import {
  TechnicianApplication
} from '../../core/models/technician-application.model';


@Component({
  selector: 'app-admin',

  templateUrl:
    './admin.page.html',

  styleUrls: [
    './admin.page.scss'
  ],

  standalone: true,

  imports: [
    CommonModule,

    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
    IonTextarea
  ]
})
export class AdminPage
  implements OnInit {


  private readonly adminService =
    inject(AdminService);

  private readonly authService =
    inject(AuthService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  applications:
    TechnicianApplication[] = [];


  selectedApplication:
    TechnicianApplication | null = null;


  loading = true;

  actionLoading = false;

  errorMessage = '';

  successMessage = '';

  rejectionReason = '';


  constructor() {

    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      constructOutline,
      documentTextOutline,
      locationOutline,
      refreshOutline
    });
  }


  async ngOnInit():
    Promise<void> {

    await this.loadApplications();
  }


  async loadApplications():
    Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    try {

      this.applications =
        await this.adminService
          .getPendingApplications();

    } catch (error) {

      console.error(
        '[ServiGo] Error cargando postulaciones:',
        error
      );

      this.errorMessage =
        'No fue posible cargar las postulaciones.';

    } finally {

      this.loading = false;

      this.cdr.detectChanges();
    }
  }


  openApplication(
    application:
      TechnicianApplication
  ): void {

    this.selectedApplication =
      application;

    this.rejectionReason = '';

    this.errorMessage = '';

    this.successMessage = '';
  }


  closeApplication():
    void {

    this.selectedApplication =
      null;

    this.rejectionReason = '';

    this.errorMessage = '';

    this.successMessage = '';
  }


  async approve():
    Promise<void> {

    if (
      !this.selectedApplication ||
      this.actionLoading
    ) {
      return;
    }


    const admin =
      this.authService
        .getCurrentUser();


    if (!admin) {

      this.errorMessage =
        'No existe una sesión administrativa válida.';

      return;
    }


    this.actionLoading = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      await this.adminService
        .approveApplication(
          this.selectedApplication,
          admin.uid
        );


      this.successMessage =
        'Técnico aprobado correctamente.';


      this.selectedApplication =
        null;


      await this.loadApplications();


    } catch (error) {

      console.error(
        '[ServiGo] Error aprobando:',
        error
      );

      this.errorMessage =
        'No fue posible aprobar la postulación.';

    } finally {

      this.actionLoading = false;

      this.cdr.detectChanges();
    }
  }


  async reject():
    Promise<void> {

    if (
      !this.selectedApplication ||
      this.actionLoading
    ) {
      return;
    }


    const reason =
      this.rejectionReason.trim();


    if (
      reason.length < 5
    ) {

      this.errorMessage =
        'Escribe el motivo del rechazo.';

      return;
    }


    const admin =
      this.authService
        .getCurrentUser();


    if (!admin) {

      this.errorMessage =
        'No existe una sesión administrativa válida.';

      return;
    }


    this.actionLoading = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      await this.adminService
        .rejectApplication(
          this.selectedApplication,
          admin.uid,
          reason
        );


      this.successMessage =
        'Postulación rechazada.';


      this.selectedApplication =
        null;


      await this.loadApplications();


    } catch (error) {

      console.error(
        '[ServiGo] Error rechazando:',
        error
      );

      this.errorMessage =
        'No fue posible rechazar la postulación.';

    } finally {

      this.actionLoading = false;

      this.cdr.detectChanges();
    }
  }
}