import {
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonProgressBar,
  IonSpinner,
  IonTextarea
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  checkmarkCircle,
  cloudUploadOutline,
  constructOutline,
  documentAttachOutline,
  documentTextOutline,
  locationOutline,
  shieldCheckmarkOutline,
  trashOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  ProfileService
} from '../../../core/services/profile.service';

import {
  TechnicianApplicationService
} from '../../../core/services/technician-application.service';

import {
  TechnicianApplicationSelectedFiles,
  TechnicianDocumentService
} from '../../../core/services/technician-document.service';

import {
  TechnicianApplicationDocumentCategory
} from '../../../core/models/technician-application.model';

@Component({
  selector: 'app-application',
  templateUrl:
    './application.page.html',
  styleUrls: [
    './application.page.scss'
  ],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonButton,
    IonCheckbox,
    IonContent,
    IonIcon,
    IonInput,
    IonProgressBar,
    IonSpinner,
    IonTextarea
  ]
})
export class ApplicationPage {

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  private readonly authService =
    inject(AuthService);

  private readonly profileService =
    inject(ProfileService);

  private readonly applicationService =
    inject(
      TechnicianApplicationService
    );

  private readonly documentService =
    inject(
      TechnicianDocumentService
    );

  private readonly cdr =
    inject(ChangeDetectorRef);

  loading = false;
  success = false;
  errorMessage = '';
  uploadProgress = 0;
  uploadingFileName = '';

  readonly acceptedFileTypes =
    this.documentService
      .acceptedFileTypes;

  readonly specialties = [
    'Electricidad',
    'Gasfitería',
    'Carpintería',
    'Mecánica',
    'Pintura',
    'Limpieza',
    'Jardinería',
    'Línea blanca'
  ];

  selectedSpecialties:
    string[] = [];

  documentFiles:
    TechnicianApplicationSelectedFiles = {
      identity: [],
      professional: [],
      additional: []
    };

  form =
    this.fb.nonNullable.group({
      fullName: [
        this.profileService
          .currentProfile
          ?.displayName
          ?? '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],
      rut: [
        '',
        [
          Validators.required
        ]
      ],
      phone: [
        this.profileService
          .currentProfile
          ?.phone
          ?? '',
        [
          Validators.required,
          Validators.minLength(8)
        ]
      ],
      experienceYears: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(60)
        ]
      ],
      experienceDescription: [
        '',
        [
          Validators.required,
          Validators.minLength(20)
        ]
      ],
      baseCommune: [
        this.profileService
          .currentProfile
          ?.commune
          ?? '',
        [
          Validators.required
        ]
      ],
      serviceRadiusKm: [
        10,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(100)
        ]
      ],
      termsAccepted: [
        false,
        Validators.requiredTrue
      ]
    });

  constructor() {

    addIcons({
      arrowBackOutline,
      checkmarkCircle,
      cloudUploadOutline,
      constructOutline,
      documentAttachOutline,
      documentTextOutline,
      locationOutline,
      shieldCheckmarkOutline,
      trashOutline
    });
  }

  toggleSpecialty(
    specialty: string
  ): void {

    this.errorMessage = '';

    if (
      this.selectedSpecialties
        .includes(
          specialty
        )
    ) {
      this.selectedSpecialties =
        this.selectedSpecialties
          .filter(
            item =>
              item !== specialty
          );

      return;
    }

    this.selectedSpecialties = [
      ...this.selectedSpecialties,
      specialty
    ];
  }

  isSelected(
    specialty: string
  ): boolean {

    return this.selectedSpecialties
      .includes(
        specialty
      );
  }

  onFilesSelected(
    event: Event,
    category:
      TechnicianApplicationDocumentCategory
  ): void {

    const input =
      event.target as HTMLInputElement;

    const selectedFiles =
      Array.from(
        input.files
        ?? []
      );

    input.value = '';

    if (
      selectedFiles.length === 0
    ) {
      return;
    }

    try {
      const mergedFiles =
        this.documentService
          .validateAndMergeFiles(
            category,
            this.documentFiles[
              category
            ],
            selectedFiles
          );

      this.documentFiles = {
        ...this.documentFiles,
        [category]:
          mergedFiles
      };

      this.errorMessage = '';

    } catch (error) {
      this.errorMessage =
        this.documentErrorMessage(
          error
        );
    }
  }

  removeFile(
    category:
      TechnicianApplicationDocumentCategory,
    index: number
  ): void {

    this.documentFiles = {
      ...this.documentFiles,
      [category]:
        this.documentFiles[
          category
        ].filter(
          (
            _file,
            fileIndex
          ) =>
            fileIndex !== index
        )
    };

    this.errorMessage = '';
  }

  formatFileSize(
    bytes: number
  ): string {

    return this.documentService
      .formatFileSize(
        bytes
      );
  }

  get totalDocumentCount():
    number {

    return this.documentFiles
      .identity.length
      + this.documentFiles
        .professional.length
      + this.documentFiles
        .additional.length;
  }

  get documentsReady():
    boolean {

    return this.documentFiles
      .identity.length > 0
      && this.documentFiles
        .professional.length > 0;
  }

  private getInvalidFields():
    string[] {

    const invalidFields:
      string[] = [];

    const controls =
      this.form.controls;

    if (
      controls.fullName.invalid
    ) {
      invalidFields.push(
        'Nombre completo'
      );
    }

    if (
      controls.rut.invalid
    ) {
      invalidFields.push(
        'RUT'
      );
    }

    if (
      controls.phone.invalid
    ) {
      invalidFields.push(
        'Teléfono'
      );
    }

    if (
      controls.experienceYears.invalid
    ) {
      invalidFields.push(
        'Años de experiencia'
      );
    }

    if (
      controls.experienceDescription.invalid
    ) {
      invalidFields.push(
        'Descripción de experiencia'
      );
    }

    if (
      controls.baseCommune.invalid
    ) {
      invalidFields.push(
        'Comuna base'
      );
    }

    if (
      controls.serviceRadiusKm.invalid
    ) {
      invalidFields.push(
        'Radio de atención'
      );
    }

    if (
      this.selectedSpecialties
        .length === 0
    ) {
      invalidFields.push(
        'Especialidad'
      );
    }

    if (
      this.documentFiles
        .identity.length === 0
    ) {
      invalidFields.push(
        'Documento de identidad'
      );
    }

    if (
      this.documentFiles
        .professional.length === 0
    ) {
      invalidFields.push(
        'Título o respaldo profesional'
      );
    }

    if (
      controls.termsAccepted.invalid
    ) {
      invalidFields.push(
        'Aceptación de términos'
      );
    }

    return invalidFields;
  }

  async submit():
    Promise<void> {

    if (
      this.loading
    ) {
      return;
    }

    this.errorMessage = '';
    this.form.markAllAsTouched();

    const invalidFields =
      this.getInvalidFields();

    if (
      invalidFields.length > 0
    ) {
      this.errorMessage =
        'Revisa los siguientes campos: '
        + invalidFields.join(', ')
        + '.';

      this.cdr.detectChanges();

      return;
    }

    const user =
      this.authService
        .getCurrentUser();

    if (
      !user
    ) {
      this.errorMessage =
        'Tu sesión no está disponible. Vuelve a iniciar sesión.';

      this.cdr.detectChanges();

      return;
    }

    this.loading = true;
    this.uploadProgress = 0;
    this.uploadingFileName = '';

    this.cdr.detectChanges();

    let applicationId:
      string | null = null;

    let documentsUploaded =
      false;

    let applicationCreated =
      false;

    try {
      this.documentService
        .validateSelection(
          this.documentFiles
        );

      applicationId =
        await this.applicationService
          .prepareApplication(
            user.uid
          );

      const documentSummary =
        await this.documentService
          .uploadDocuments(
            applicationId,
            user.uid,
            this.documentFiles,
            progress => {
              this.uploadProgress =
                progress.percent;

              this.uploadingFileName =
                progress.fileName;

              this.cdr.detectChanges();
            }
          );

      documentsUploaded = true;

      const values =
        this.form.getRawValue();

      await this.applicationService
        .createApplication(
          user.uid,
          applicationId,
          {
            ...values,
            specialties:
              this.selectedSpecialties
          },
          documentSummary
        );

      applicationCreated = true;
      this.success = true;
      this.errorMessage = '';

    } catch (error) {
      if (
        applicationId
        && documentsUploaded
        && !applicationCreated
      ) {
        await this.documentService
          .deleteDraftDocuments(
            applicationId,
            user.uid
          )
          .catch(
            cleanupError => {
              console.warn(
                '[ServiGo] No fue posible limpiar documentos temporales:',
                cleanupError
              );
            }
          );
      }

      console.error(
        '[ServiGo] Error postulación:',
        error
      );

      this.errorMessage =
        this.applicationErrorMessage(
          error
        );

    } finally {
      this.loading = false;
      this.uploadingFileName = '';
      this.cdr.detectChanges();
    }
  }

  async back():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/profile'
    );
  }

  private applicationErrorMessage(
    error: unknown
  ): string {

    const message =
      error instanceof Error
        ? error.message
        : '';

    const code =
      typeof error === 'object'
      && error !== null
      && 'code' in error
        ? String(
            (
              error as {
                code: unknown;
              }
            ).code
          )
        : '';

    if (
      message ===
      'application-already-pending'
    ) {
      return 'Ya tienes una solicitud pendiente de revisión.';
    }

    if (
      message ===
      'application-already-approved'
    ) {
      return 'Tu perfil técnico ya fue aprobado.';
    }

    if (
      message ===
      'specialties-required'
    ) {
      return 'Selecciona al menos una especialidad.';
    }

    if (
      message ===
      'terms-not-accepted'
    ) {
      return 'Debes aceptar los términos de ServiGo.';
    }

    if (
      message.startsWith(
        'document-'
      )
      || message.endsWith(
        '-document-required'
      )
    ) {
      return this.documentErrorMessage(
        error
      );
    }

    if (
      code.includes(
        'storage/unauthorized'
      )
      || code.includes(
        'permission-denied'
      )
    ) {
      return 'No tienes permisos para cargar o registrar esta documentación.';
    }

    if (
      code.includes(
        'storage/retry-limit-exceeded'
      )
      || code.includes(
        'unavailable'
      )
    ) {
      return 'La conexión se interrumpió durante la carga. Intenta nuevamente.';
    }

    return 'No pudimos enviar tu solicitud. Intenta nuevamente.';
  }

  private documentErrorMessage(
    error: unknown
  ): string {

    const message =
      error instanceof Error
        ? error.message
        : '';

    switch (
      message
    ) {
      case 'identity-document-required':
        return 'Adjunta al menos una imagen o PDF de tu identificación vigente.';

      case 'professional-document-required':
        return 'Adjunta tu título, certificado, licencia o un respaldo de experiencia profesional.';

      case 'document-too-large':
        return 'Cada documento puede pesar como máximo 8 MB.';

      case 'document-invalid-type':
        return 'Solo se permiten archivos PDF, JPG, PNG o WEBP.';

      case 'document-empty':
        return 'Uno de los archivos seleccionados está vacío.';

      case 'document-limit-identity':
        return 'Puedes adjuntar hasta 2 archivos de identificación.';

      case 'document-limit-professional':
        return 'Puedes adjuntar hasta 3 respaldos profesionales.';

      case 'document-limit-additional':
        return 'Puedes adjuntar hasta 3 certificaciones adicionales.';

      case 'document-total-limit':
      case 'document-limit-exceeded':
        return 'Puedes adjuntar un máximo de 8 documentos en total.';

      default:
        return 'No fue posible procesar uno de los documentos seleccionados.';
    }
  }
}
