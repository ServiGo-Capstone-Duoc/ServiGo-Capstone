import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

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
  downloadOutline,
  eyeOutline,
  locationOutline,
  peopleOutline,
  refreshOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  AdminService
} from '../../core/services/admin.service';

import {
  TechnicianDocumentService
} from '../../core/services/technician-document.service';

import {
  TechnicianApplication,
  TechnicianApplicationDocument,
  TechnicianApplicationDocumentCategory
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
  implements OnInit, OnDestroy {

  private readonly adminService =
    inject(AdminService);

  private readonly authService =
    inject(AuthService);

  private readonly documentService =
    inject(
      TechnicianDocumentService
    );

  private readonly router =
    inject(Router);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private documentLoadSequence = 0;

  applications:
    TechnicianApplication[] = [];

  selectedApplication:
    TechnicianApplication | null = null;

  applicationDocuments:
    TechnicianApplicationDocument[] = [];

  loading = true;
  documentsLoading = false;
  actionLoading = false;
  openingDocumentPath = '';

  errorMessage = '';
  documentErrorMessage = '';
  successMessage = '';
  rejectionReason = '';

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      constructOutline,
      documentTextOutline,
      downloadOutline,
      eyeOutline,
      locationOutline,
      peopleOutline,
      refreshOutline,
      shieldCheckmarkOutline
    });
  }

  async ngOnInit():
    Promise<void> {

    await this.loadApplications();
  }

  ngOnDestroy():
    void {

    this.documentLoadSequence += 1;
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

  async openApplication(
    application:
      TechnicianApplication
  ): Promise<void> {

    this.selectedApplication =
      application;

    this.applicationDocuments = [];
    this.rejectionReason = '';
    this.errorMessage = '';
    this.documentErrorMessage = '';
    this.successMessage = '';

    await this.loadApplicationDocuments(
      application
    );
  }

  closeApplication():
    void {

    this.documentLoadSequence += 1;
    this.selectedApplication = null;
    this.applicationDocuments = [];
    this.rejectionReason = '';
    this.errorMessage = '';
    this.documentErrorMessage = '';
    this.successMessage = '';
    this.openingDocumentPath = '';
  }

  async manageTechnicians():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/admin/technicians'
    );
  }

  get documentsReady():
    boolean {

    const hasIdentity =
      this.applicationDocuments
        .some(
          document =>
            document.category ===
            'identity'
        );

    const hasProfessionalEvidence =
      this.applicationDocuments
        .some(
          document =>
            document.category ===
            'professional'
        );

    return hasIdentity
      && hasProfessionalEvidence;
  }

  documentsForCategory(
    category:
      TechnicianApplicationDocumentCategory
  ): TechnicianApplicationDocument[] {

    return this.applicationDocuments
      .filter(
        document =>
          document.category ===
          category
      );
  }

  categoryLabel(
    category:
      TechnicianApplicationDocumentCategory
  ): string {

    return this.documentService
      .categoryLabel(
        category
      );
  }

  formatFileSize(
    bytes: number
  ): string {

    return this.documentService
      .formatFileSize(
        bytes
      );
  }

  async openDocument(
    fileDocument:
      TechnicianApplicationDocument,
    download = false
  ): Promise<void> {

    if (
      this.openingDocumentPath
    ) {
      return;
    }

    this.openingDocumentPath =
      fileDocument.storagePath;

    this.documentErrorMessage = '';

    try {
      const blob =
        await this.documentService
          .getDocumentBlob(
            fileDocument
          );

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const anchor =
        globalThis.document
          .createElement(
            'a'
          );

      anchor.href =
        objectUrl;

      anchor.rel =
        'noopener noreferrer';

      if (
        download
      ) {
        anchor.download =
          fileDocument.originalName;
      } else {
        anchor.target =
          '_blank';
      }

      globalThis.document.body
        .appendChild(
          anchor
        );

      anchor.click();
      anchor.remove();

      globalThis.setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        60_000
      );

    } catch (error) {
      console.error(
        '[ServiGo] Error abriendo documento:',
        error
      );

      this.documentErrorMessage =
        'No fue posible abrir el documento. Verifica tus permisos e intenta nuevamente.';

    } finally {
      this.openingDocumentPath = '';
      this.cdr.detectChanges();
    }
  }

  async approve():
    Promise<void> {

    if (
      !this.selectedApplication
      || this.actionLoading
    ) {
      return;
    }

    if (
      this.documentsLoading
      || !this.documentsReady
    ) {
      this.errorMessage =
        'Debes revisar una identificación y al menos un respaldo profesional antes de aprobar.';

      return;
    }

    const admin =
      this.authService
        .getCurrentUser();

    if (
      !admin
    ) {
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

      this.selectedApplication = null;
      this.applicationDocuments = [];

      await this.loadApplications();

    } catch (error) {
      console.error(
        '[ServiGo] Error aprobando:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : '';

      this.errorMessage =
        message ===
          'admin/application-documents-incomplete'
          ? 'La postulación no contiene la documentación mínima exigida.'
          : 'No fue posible aprobar la postulación.';

    } finally {
      this.actionLoading = false;
      this.cdr.detectChanges();
    }
  }

  async reject():
    Promise<void> {

    if (
      !this.selectedApplication
      || this.actionLoading
    ) {
      return;
    }

    const reason =
      this.rejectionReason
        .trim();

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

    if (
      !admin
    ) {
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

      this.selectedApplication = null;
      this.applicationDocuments = [];

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

  private async loadApplicationDocuments(
    application:
      TechnicianApplication
  ): Promise<void> {

    const sequence =
      ++this.documentLoadSequence;

    this.documentsLoading = true;
    this.documentErrorMessage = '';

    try {
      const documents =
        await this.documentService
          .listDocuments(
            application.id,
            application.userId
          );

      if (
        sequence !==
        this.documentLoadSequence
      ) {
        return;
      }

      this.applicationDocuments =
        documents;

      if (
        documents.length === 0
      ) {
        this.documentErrorMessage =
          'La postulación no contiene archivos adjuntos. No debe aprobarse.';
      }

    } catch (error) {
      if (
        sequence !==
        this.documentLoadSequence
      ) {
        return;
      }

      console.error(
        '[ServiGo] Error cargando documentos:',
        error
      );

      this.applicationDocuments = [];
      this.documentErrorMessage =
        'No fue posible recuperar la documentación. No apruebes la postulación hasta resolver el acceso.';

    } finally {
      if (
        sequence ===
        this.documentLoadSequence
      ) {
        this.documentsLoading = false;
        this.cdr.detectChanges();
      }
    }
  }
}
