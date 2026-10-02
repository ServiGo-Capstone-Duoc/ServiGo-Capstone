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
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  IonButton,
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
  locationOutline,
  calendarOutline,
  timeOutline,
  cameraOutline,
  navigateOutline,
  flashOutline,
  waterOutline,
  hammerOutline,
  buildOutline,
  constructOutline,
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  ProfileService
} from '../../../core/services/profile.service';

import {
  ServiceRequestService
} from '../../../core/services/service-request.service';

import {
  ServiceUrgency
} from '../../../core/models/service-request.model';


@Component({
  selector: 'app-new-request',

  templateUrl:
    './new-request.page.html',

  styleUrls: [
    './new-request.page.scss'
  ],

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonSpinner,
    IonTextarea
  ]
})
export class NewRequestPage
  implements OnInit {


  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly authService =
    inject(AuthService);

  private readonly profileService =
    inject(ProfileService);

  private readonly requestService =
    inject(ServiceRequestService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  loading = false;

  success = false;

  locating = false;

  errorMessage = '';

  requestId = '';


  latitude:
    number | null = null;

  longitude:
    number | null = null;


  readonly today =
    this.getTodayString();


  readonly categories = [

    {
      name:
        'Electricidad',

      icon:
        'flash-outline'
    },

    {
      name:
        'Gasfitería',

      icon:
        'water-outline'
    },

    {
      name:
        'Carpintería',

      icon:
        'hammer-outline'
    },

    {
      name:
        'Mecánica',

      icon:
        'build-outline'
    },

    {
      name:
        'Pintura',

      icon:
        'hammer-outline'
    },

    {
      name:
        'Limpieza',

      icon:
        'construct-outline'
    },

    {
      name:
        'Jardinería',

      icon:
        'construct-outline'
    },

    {
      name:
        'Línea blanca',

      icon:
        'build-outline'
    }
  ];


  readonly timeSlots = [
    'Mañana',
    'Tarde',
    'Noche',
    'Flexible'
  ];


  readonly urgencyOptions:
    {
      value: ServiceUrgency;
      label: string;
      description: string;
    }[] = [

      {
        value:
          'normal',

        label:
          'Normal',

        description:
          'Puede coordinarse con tiempo'
      },

      {
        value:
          'soon',

        label:
          'Pronto',

        description:
          'Necesito resolverlo en pocos días'
      },

      {
        value:
          'urgent',

        label:
          'Urgente',

        description:
          'Necesito atención lo antes posible'
      }
    ];


  form =
    this.fb.nonNullable.group({

      category: [
        '',
        Validators.required
      ],

      description: [
        '',
        [
          Validators.required,
          Validators.minLength(20)
        ]
      ],

      address: [
        '',
        [
          Validators.required,
          Validators.minLength(4)
        ]
      ],

      commune: [
        '',
        Validators.required
      ],

      preferredDate: [
        '',
        Validators.required
      ],

      timeSlot: [
        '',
        Validators.required
      ],

      urgency: [
        'normal' as ServiceUrgency,
        Validators.required
      ]
    });


  constructor() {

    addIcons({
      arrowBackOutline,
      checkmarkCircle,
      locationOutline,
      calendarOutline,
      timeOutline,
      cameraOutline,
      navigateOutline,
      flashOutline,
      waterOutline,
      hammerOutline,
      buildOutline,
      constructOutline,
    });
  }


  ngOnInit(): void {

    const category =
      this.route.snapshot
        .queryParamMap
        .get(
          'category'
        );


    if (
      category &&
      this.categories.some(
        item =>
          item.name === category
      )
    ) {

      this.form.controls
        .category
        .setValue(
          category
        );
    }
  }


  selectCategory(
    category: string
  ): void {

    this.form.controls
      .category
      .setValue(
        category
      );

    this.form.controls
      .category
      .markAsTouched();

    this.errorMessage = '';
  }


  selectTimeSlot(
    timeSlot: string
  ): void {

    this.form.controls
      .timeSlot
      .setValue(
        timeSlot
      );

    this.form.controls
      .timeSlot
      .markAsTouched();
  }


  selectUrgency(
    urgency:
      ServiceUrgency
  ): void {

    this.form.controls
      .urgency
      .setValue(
        urgency
      );
  }


  async useCurrentLocation():
    Promise<void> {

    this.errorMessage = '';


    if (
      !navigator.geolocation
    ) {

      this.errorMessage =
        'Este dispositivo no permite obtener la ubicación.';

      return;
    }


    this.locating = true;

    this.cdr.detectChanges();


    navigator.geolocation
      .getCurrentPosition(

        position => {

          this.latitude =
            position.coords.latitude;

          this.longitude =
            position.coords.longitude;


          this.locating = false;

          this.cdr.detectChanges();
        },

        error => {

          console.warn(
            '[ServiGo] Error geolocalización:',
            error
          );


          this.locating = false;


          this.errorMessage =
            'No pudimos obtener tu ubicación. Puedes continuar ingresando la dirección manualmente.';


          this.cdr.detectChanges();
        },

        {
          enableHighAccuracy:
            true,

          timeout:
            10000,

          maximumAge:
            60000
        }
      );
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


    if (
      this.form.invalid
    ) {

      this.errorMessage =
        this.getValidationMessage();

      return;
    }


    const user =
      await this.authService
        .waitForAuthReady();


    if (!user) {

      this.errorMessage =
        'Tu sesión no está disponible.';

      return;
    }


    const profile =
      this.profileService
        .currentProfile;


    if (!profile) {

      this.errorMessage =
        'No pudimos cargar tu perfil ServiGo.';

      return;
    }


    this.loading = true;

    this.cdr.detectChanges();


    try {

      const values =
        this.form.getRawValue();


      this.requestId =
        await this.requestService
          .createRequest(
            user.uid,
            profile.displayName,
            {

              ...values,

              latitude:
                this.latitude,

              longitude:
                this.longitude
            }
          );


      console.log(
        '[ServiGo] Solicitud publicada:',
        this.requestId
      );


      this.success = true;


    } catch (error: any) {

      console.error(
        '[ServiGo] Error creando solicitud:',
        error
      );


      if (
        error?.code ===
        'permission-denied'
      ) {

        this.errorMessage =
          'Firestore rechazó la solicitud por permisos.';

      } else {

        this.errorMessage =
          'No pudimos publicar tu solicitud. Intenta nuevamente.';
      }


    } finally {

      this.loading = false;

      this.cdr.detectChanges();
    }
  }


  private getValidationMessage():
    string {

    const controls =
      this.form.controls;


    if (
      controls.category.invalid
    ) {

      return 'Selecciona el tipo de servicio que necesitas.';
    }


    if (
      controls.description.invalid
    ) {

      return 'Describe el problema con al menos 20 caracteres.';
    }


    if (
      controls.address.invalid
    ) {

      return 'Ingresa la dirección donde necesitas el servicio.';
    }


    if (
      controls.commune.invalid
    ) {

      return 'Ingresa la comuna del servicio.';
    }


    if (
      controls.preferredDate.invalid
    ) {

      return 'Selecciona una fecha para el servicio.';
    }


    if (
      controls.timeSlot.invalid
    ) {

      return 'Selecciona una franja horaria.';
    }


    return 'Revisa los datos de la solicitud.';
  }


  async back():
    Promise<void> {

    await this.router
      .navigateByUrl(
        '/app/home'
      );
  }


  async goHome():
    Promise<void> {

    await this.router
      .navigateByUrl(
        '/app/home'
      );
  }


  private getTodayString():
    string {

    const today =
      new Date();


    const year =
      today.getFullYear();


    const month =
      String(
        today.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        today.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return (
      `${year}-${month}-${day}`
    );
  }
}