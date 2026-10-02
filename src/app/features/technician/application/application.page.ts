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
  IonSpinner,
  IonTextarea
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  checkmarkCircle,
  constructOutline,
  locationOutline,
  documentTextOutline
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

  private readonly cdr =
    inject(ChangeDetectorRef);


  loading = false;

  success = false;

  errorMessage = '';


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


  form =
    this.fb.nonNullable.group({

      fullName: [
        this.profileService
          .currentProfile
          ?.displayName ?? '',
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
        '',
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
        '',
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

      hasIdentification: [
        false
      ],

      hasCertifications: [
        false
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
      constructOutline,
      locationOutline,
      documentTextOutline
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

    return this
      .selectedSpecialties
      .includes(
        specialty
      );
  }


  private getInvalidFields(): string[] {

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
      controls.termsAccepted.invalid
    ) {
      invalidFields.push(
        'Aceptación de términos'
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


    return invalidFields;
  }


  async submit(): Promise<void> {

    console.log(
      '[ServiGo] CLICK ENVIAR SOLICITUD'
    );


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
        'Revisa los siguientes campos: ' +
        invalidFields.join(', ') +
        '.';


      console.warn(
        '[ServiGo] Campos inválidos:',
        invalidFields
      );


      this.cdr.detectChanges();

      return;
    }


    const user =
      this.authService
        .getCurrentUser();


    if (!user) {

      this.errorMessage =
        'Tu sesión no está disponible. Vuelve a iniciar sesión.';

      this.cdr.detectChanges();

      return;
    }


    this.loading = true;

    this.cdr.detectChanges();


    console.log(
      '[ServiGo] Enviando postulación...',
      user.uid
    );


    try {

      const values =
        this.form.getRawValue();


      const applicationId =
        await this.applicationService
          .createApplication(
            user.uid,
            {
              ...values,

              specialties:
                this.selectedSpecialties
            }
          );


      console.log(
        '[ServiGo] Postulación creada:',
        applicationId
      );


      this.success = true;

      this.errorMessage = '';


    } catch (error: any) {

      console.error(
        '[ServiGo] Error postulación:',
        error
      );


      if (
        error?.message ===
        'application-already-pending'
      ) {

        this.errorMessage =
          'Ya tienes una solicitud pendiente de revisión.';

      } else if (
        error?.message ===
        'specialties-required'
      ) {

        this.errorMessage =
          'Selecciona al menos una especialidad.';

      } else if (
        error?.message ===
        'terms-not-accepted'
      ) {

        this.errorMessage =
          'Debes aceptar los términos de ServiGo.';

      } else if (
        error?.code ===
        'permission-denied'
      ) {

        this.errorMessage =
          'Firebase rechazó la solicitud por permisos.';

      } else {

        this.errorMessage =
          'No pudimos enviar tu solicitud. Intenta nuevamente.';
      }


    } finally {

      this.loading = false;

      /*
       * Firebase puede finalizar fuera del ciclo
       * normal de detección de cambios de Angular.
       * Forzamos aquí la actualización de la interfaz.
       */
      this.cdr.detectChanges();
    }
  }


  async back(): Promise<void> {

    await this.router.navigateByUrl(
      '/app/profile'
    );
  }
}