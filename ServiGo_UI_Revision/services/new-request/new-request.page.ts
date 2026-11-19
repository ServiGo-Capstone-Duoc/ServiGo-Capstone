import {
  CommonModule
} from '@angular/common';

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
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
  searchOutline,
  flashOutline,
  waterOutline,
  hammerOutline,
  buildOutline,
  constructOutline
} from 'ionicons/icons';

import {
  httpsCallable
} from 'firebase/functions';

import * as L from 'leaflet';

import {
  firebaseFunctions
} from '../../../core/firebase/firebase';

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


interface GeocodeAddressResponse {

  ok: boolean;

  latitude: number;

  longitude: number;

  displayName: string;

  address: string;

  commune: string;
}


@Component({
  selector:
    'app-new-request',

  templateUrl:
    './new-request.page.html',

  styleUrls: [
    './new-request.page.scss'
  ],

  standalone:
    true,

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
  implements
    OnInit,
    AfterViewInit,
    OnDestroy {


  private readonly fb =
    inject(
      FormBuilder
    );


  private readonly router =
    inject(
      Router
    );


  private readonly route =
    inject(
      ActivatedRoute
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly profileService =
    inject(
      ProfileService
    );


  private readonly requestService =
    inject(
      ServiceRequestService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  loading =
    false;


  success =
    false;


  /*
   * Se mantiene por compatibilidad con cualquier
   * referencia antigua del template.
   */
  locating =
    false;


  geocoding =
    false;


  locationConfirmed =
    false;


  locationError =
    '';


  geocodedDisplayName =
    '';


  errorMessage =
    '';


  requestId =
    '';


  latitude:
    number | null =
      null;


  longitude:
    number | null =
      null;


  private map:
    L.Map | null =
      null;


  private locationMarker:
    L.Marker | null =
      null;


  private mapInitializationTimer:
    ReturnType<typeof setTimeout> | null =
      null;


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
          Validators.minLength(
            20
          )
        ]
      ],

      address: [
        '',
        [
          Validators.required,
          Validators.minLength(
            4
          )
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
      searchOutline,
      flashOutline,
      waterOutline,
      hammerOutline,
      buildOutline,
      constructOutline
    });
  }


  ngOnInit():
    void {


    const category =
      this.route.snapshot
        .queryParamMap
        .get(
          'category'
        );


    if (
      category
      &&
      this.categories.some(
        item =>
          item.name ===
          category
      )
    ) {

      this.form.controls
        .category
        .setValue(
          category
        );
    }


    /*
     * Si el cliente modifica la dirección o comuna
     * después de haber localizado el domicilio,
     * invalidamos la confirmación anterior.
     */

    this.form.controls
      .address
      .valueChanges
      .subscribe(
        () => {

          this.invalidateLocation();
        }
      );


    this.form.controls
      .commune
      .valueChanges
      .subscribe(
        () => {

          this.invalidateLocation();
        }
      );
  }


  ngAfterViewInit():
    void {

    /*
     * El mapa se crea únicamente después
     * de una búsqueda exitosa.
     */
  }


  ngOnDestroy():
    void {

    if (
      this.mapInitializationTimer
    ) {

      clearTimeout(
        this.mapInitializationTimer
      );

      this.mapInitializationTimer =
        null;
    }


    this.destroyMap();
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


    this.errorMessage =
      '';
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


  /*
   * =========================================
   * BUSCAR DIRECCIÓN
   * =========================================
   */

  async searchAddress():
    Promise<void> {


    if (
      this.geocoding
      ||
      this.loading
    ) {

      return;
    }


    this.errorMessage =
      '';


    this.locationError =
      '';


    const address =
      this.form.controls
        .address
        .value
        .trim();


    const commune =
      this.form.controls
        .commune
        .value
        .trim();


    this.form.controls
      .address
      .markAsTouched();


    this.form.controls
      .commune
      .markAsTouched();


    if (
      address.length < 4
    ) {

      this.locationError =
        'Ingresa una dirección válida antes de buscarla.';

      return;
    }


    if (
      commune.length < 2
    ) {

      this.locationError =
        'Ingresa la comuna antes de buscar la dirección.';

      return;
    }


    this.geocoding =
      true;


    this.locationConfirmed =
      false;


    this.latitude =
      null;


    this.longitude =
      null;


    this.geocodedDisplayName =
      '';


    this.destroyMap();


    this.cdr
      .detectChanges();


    try {


      const geocodeAddress =
        httpsCallable<
          {
            address: string;
            commune: string;
          },
          GeocodeAddressResponse
        >(
          firebaseFunctions,
          'geocodeAddress'
        );


      const response =
        await geocodeAddress({
          address,
          commune
        });


      const result =
        response.data;


      if (
        !result.ok
        ||
        !Number.isFinite(
          result.latitude
        )
        ||
        !Number.isFinite(
          result.longitude
        )
      ) {

        throw new Error(
          'invalid-geocode-response'
        );
      }


      this.latitude =
        result.latitude;


      this.longitude =
        result.longitude;


      this.geocodedDisplayName =
        result.displayName;


      this.locationConfirmed =
        false;


      this.cdr
        .detectChanges();


      this.scheduleMapInitialization();


      console.log(
        '[ServiGo] Dirección localizada.',
        {
          commune,
          latitude:
            result.latitude,
          longitude:
            result.longitude
        }
      );


    } catch (error: any) {


      console.error(
        '[ServiGo] Error buscando dirección:',
        error
      );


      const code =
        error?.code
        ?? '';


      if (
        code ===
        'functions/not-found'
      ) {

        this.locationError =
          'No encontramos esa dirección. Revisa la dirección y la comuna.';


      } else if (
        code ===
        'functions/invalid-argument'
      ) {

        this.locationError =
          error?.message
          ??
          'Revisa la dirección ingresada.';


      } else if (
        code ===
        'functions/unauthenticated'
      ) {

        this.locationError =
          'Tu sesión ya no está disponible.';


      } else if (
        code ===
        'functions/unavailable'
      ) {

        this.locationError =
          'El servicio de ubicación no está disponible temporalmente.';


      } else {

        this.locationError =
          'No pudimos localizar esa dirección. Intenta nuevamente.';
      }


      this.latitude =
        null;


      this.longitude =
        null;


      this.locationConfirmed =
        false;


      this.geocodedDisplayName =
        '';


      this.destroyMap();


    } finally {


      this.geocoding =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * CONFIRMAR UBICACIÓN
   * =========================================
   */

  confirmLocation():
    void {


    if (
      this.latitude ===
        null
      ||
      this.longitude ===
        null
    ) {

      this.locationError =
        'Primero busca la dirección del servicio.';

      return;
    }


    this.locationConfirmed =
      true;


    this.locationError =
      '';


    this.errorMessage =
      '';


    this.cdr
      .detectChanges();


    console.log(
      '[ServiGo] Domicilio confirmado para la solicitud.'
    );
  }


  /*
   * =========================================
   * COMPATIBILIDAD
   * =========================================
   *
   * Si algún HTML antiguo aún referencia
   * useCurrentLocation(), dirigimos al nuevo
   * flujo de búsqueda por domicilio.
   */

  async useCurrentLocation():
    Promise<void> {

    await this.searchAddress();
  }


  /*
   * =========================================
   * MAPA
   * =========================================
   */

  private scheduleMapInitialization():
    void {


    if (
      this.mapInitializationTimer
    ) {

      clearTimeout(
        this.mapInitializationTimer
      );
    }


    this.mapInitializationTimer =
      setTimeout(
        () => {

          this.mapInitializationTimer =
            null;

          this.initializeMap();
        },
        100
      );
  }


  private initializeMap():
    void {


    if (
      this.latitude ===
        null
      ||
      this.longitude ===
        null
    ) {

      return;
    }


    const container =
      document.getElementById(
        'request-location-map'
      );


    if (
      !container
    ) {

      console.warn(
        '[ServiGo] Contenedor del mapa de domicilio no disponible.'
      );

      return;
    }


    this.destroyMap();


    const latitude =
      this.latitude;


    const longitude =
      this.longitude;


    this.map =
      L.map(
        container,
        {
          zoomControl:
            true,

          attributionControl:
            true
        }
      )
        .setView(
          [
            latitude,
            longitude
          ],
          17
        );


    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom:
          19,

        attribution:
          '&copy; OpenStreetMap contributors'
      }
    )
      .addTo(
        this.map
      );


    /*
     * Usamos DivIcon para no depender de
     * los PNG por defecto de Leaflet.
     */

    const homeIcon =
      L.divIcon({
        className:
          'servigo-location-marker',

        html:
          '<div class="servigo-location-marker__pin">🏠</div>',

        iconSize:
          [
            42,
            42
          ],

        iconAnchor:
          [
            21,
            38
          ]
      });


    this.locationMarker =
      L.marker(
        [
          latitude,
          longitude
        ],
        {
          draggable:
            true,

          icon:
            homeIcon
        }
      )
        .addTo(
          this.map
        );


    this.locationMarker
      .bindPopup(
        'Domicilio del servicio'
      );


    /*
     * Si el cliente mueve el pin,
     * actualizamos coordenadas e invalidamos
     * cualquier confirmación anterior.
     */

    this.locationMarker
      .on(
        'dragend',
        event => {


          const marker =
            event.target as L.Marker;


          const position =
            marker.getLatLng();


          this.latitude =
            position.lat;


          this.longitude =
            position.lng;


          this.locationConfirmed =
            false;


          this.locationError =
            'Moviste el punto. Confirma nuevamente la ubicación del servicio.';


          this.cdr
            .detectChanges();
        }
      );


    /*
     * Permitimos también elegir el punto
     * haciendo clic en el mapa.
     */

    this.map
      .on(
        'click',
        event => {


          if (
            !this.locationMarker
          ) {

            return;
          }


          this.locationMarker
            .setLatLng(
              event.latlng
            );


          this.latitude =
            event.latlng.lat;


          this.longitude =
            event.latlng.lng;


          this.locationConfirmed =
            false;


          this.locationError =
            'Cambiaste el punto del servicio. Confirma nuevamente la ubicación.';


          this.cdr
            .detectChanges();
        }
      );


    setTimeout(
      () => {

        this.map
          ?.invalidateSize();
      },
      150
    );
  }


  private destroyMap():
    void {


    if (
      this.locationMarker
    ) {

      this.locationMarker
        .off();

      this.locationMarker =
        null;
    }


    if (
      this.map
    ) {

      this.map
        .off();

      this.map
        .remove();

      this.map =
        null;
    }
  }


  /*
   * =========================================
   * INVALIDAR UBICACIÓN
   * =========================================
   */

  private invalidateLocation():
    void {


    /*
     * Durante una búsqueda todavía no
     * queremos invalidar por efectos internos.
     */

    if (
      this.geocoding
    ) {

      return;
    }


    if (
      this.latitude ===
        null
      &&
      this.longitude ===
        null
      &&
      !this.locationConfirmed
      &&
      !this.geocodedDisplayName
    ) {

      return;
    }


    this.latitude =
      null;


    this.longitude =
      null;


    this.locationConfirmed =
      false;


    this.locationError =
      'La dirección cambió. Busca y confirma nuevamente la ubicación.';


    this.geocodedDisplayName =
      '';


    this.destroyMap();


    this.cdr
      .detectChanges();
  }


  /*
   * =========================================
   * PUBLICAR SOLICITUD
   * =========================================
   */

  async submit():
    Promise<void> {


    if (
      this.loading
    ) {

      return;
    }


    this.errorMessage =
      '';


    this.form
      .markAllAsTouched();


    if (
      this.form.invalid
    ) {

      this.errorMessage =
        this.getValidationMessage();

      return;
    }


    /*
     * El domicilio es obligatorio.
     * Ya no aceptamos latitude/longitude null.
     */

    if (
      !this.locationConfirmed
      ||
      this.latitude ===
        null
      ||
      this.longitude ===
        null
    ) {

      this.errorMessage =
        'Busca y confirma la ubicación del domicilio antes de publicar la solicitud.';

      return;
    }


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      this.errorMessage =
        'Tu sesión no está disponible.';

      return;
    }


    const profile =
      this.profileService
        .currentProfile;


    if (
      !profile
    ) {

      this.errorMessage =
        'No pudimos cargar tu perfil ServiGo.';

      return;
    }


    this.loading =
      true;


    this.cdr
      .detectChanges();


    try {


      const values =
        this.form
          .getRawValue();


      /*
       * Capturamos valores ya validados.
       * Esto además ayuda al tipado de TS.
       */

      const latitude =
        this.latitude;


      const longitude =
        this.longitude;


      if (
        latitude ===
          null
        ||
        longitude ===
          null
      ) {

        throw new Error(
          'location-not-confirmed'
        );
      }


      this.requestId =
        await this.requestService
          .createRequest(
            user.uid,
            profile.displayName,
            {

              ...values,

              latitude,

              longitude
            }
          );


      console.log(
        '[ServiGo] Solicitud publicada:',
        this.requestId
      );


      this.success =
        true;


      this.destroyMap();


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


      this.loading =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * VALIDACIONES
   * =========================================
   */

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


  /*
   * =========================================
   * NAVEGACIÓN
   * =========================================
   */

  async back():
    Promise<void> {


    this.destroyMap();


    await this.router
      .navigateByUrl(
        '/app/home'
      );
  }


  async goHome():
    Promise<void> {


    this.destroyMap();


    await this.router
      .navigateByUrl(
        '/app/home'
      );
  }


  /*
   * =========================================
   * FECHA ACTUAL
   * =========================================
   */

  private getTodayString():
    string {


    const today =
      new Date();


    const year =
      today
        .getFullYear();


    const month =
      String(
        today.getMonth() +
        1
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
