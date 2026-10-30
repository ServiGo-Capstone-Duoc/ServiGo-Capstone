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
  documentTextOutline
} from 'ionicons/icons';

import {
  firstValueFrom,
  filter,
  take
} from 'rxjs';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  ProfileService
} from '../../../core/services/profile.service';

import {
  QuoteService
} from '../../../core/services/quote.service';

import {
  TechnicianOpportunityService,
  TechnicianOpportunityView
} from '../../../core/services/technician-opportunity.service';


@Component({
  selector:
    'app-quote',

  templateUrl:
    './quote.page.html',

  styleUrls: [
    './quote.page.scss'
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
export class QuotePage
  implements OnInit {


  /*
   * =========================================
   * SERVICIOS
   * =========================================
   */

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


  private readonly quoteService =
    inject(QuoteService);


  private readonly opportunityService =
    inject(
      TechnicianOpportunityService
    );


  private readonly cdr =
    inject(ChangeDetectorRef);


  /*
   * =========================================
   * ESTADO
   * =========================================
   */

  opportunity:
    TechnicianOpportunityView | null =
      null;


  requestId =
    '';


  loading =
    true;


  sending =
    false;


  success =
    false;


  errorMessage =
    '';


  quoteId =
    '';


  readonly today =
    this.getTodayString();


  /*
   * =========================================
   * FORMULARIO
   * =========================================
   */

  form =
    this.fb.nonNullable.group({

      laborAmount: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      materialsAmount: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      otherAmount: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      availableDate: [
        '',
        Validators.required
      ],

      comment: [
        '',
        [
          Validators.required,
          Validators.minLength(10)
        ]
      ]
    });


  constructor() {

    addIcons({

      arrowBackOutline,

      checkmarkCircle,

      documentTextOutline
    });
  }


  /*
   * =========================================
   * INIT
   * =========================================
   */

  async ngOnInit():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
      '';


    /*
     * =====================================
     * REQUEST ID DESDE URL
     * =====================================
     *
     * Ya no utilizamos router.state.
     *
     * Ejemplo:
     *
     * /app/technician/quote/ABC123
     */

    const requestId =
      this.route.snapshot
        .paramMap
        .get(
          'requestId'
        );


    if (
      !requestId
    ) {

      this.errorMessage =
        'No pudimos identificar la solicitud.';


      this.loading =
        false;


      this.cdr.detectChanges();

      return;
    }


    this.requestId =
      requestId;


    /*
     * =====================================
     * SESIÓN
     * =====================================
     */

    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      this.errorMessage =
        'No existe una sesión válida.';


      this.loading =
        false;


      this.cdr.detectChanges();

      return;
    }


    /*
     * =====================================
     * CARGAR OPORTUNIDAD
     * =====================================
     */

    try {

      const result =
        await this.opportunityService
          .getOpportunityByRequestId(
            user.uid,
            requestId
          );


      if (
        !result
      ) {

        this.errorMessage =
          'Esta oportunidad ya no está disponible.';

        return;
      }


      this.opportunity =
        result;


      console.log(
        '[ServiGo] Oportunidad cargada para cotización:',
        result
      );


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando oportunidad para cotizar:',
        error
      );


      this.errorMessage =
        'No pudimos cargar la oportunidad.';


    } finally {

      this.loading =
        false;


      this.cdr.detectChanges();
    }
  }


  /*
   * =========================================
   * TOTAL PRESUPUESTO
   * =========================================
   */

  get totalAmount():
    number {


    const values =
      this.form.getRawValue();


    const laborAmount =
      Number(
        values.laborAmount
      ) || 0;


    const materialsAmount =
      Number(
        values.materialsAmount
      ) || 0;


    const otherAmount =
      Number(
        values.otherAmount
      ) || 0;


    return (
      laborAmount
      +
      materialsAmount
      +
      otherAmount
    );
  }


  /*
   * =========================================
   * ENVIAR PRESUPUESTO
   * =========================================
   */

  async submit():
    Promise<void> {


    if (
      this.sending
      ||
      !this.opportunity
    ) {

      return;
    }


    this.errorMessage =
      '';


    this.form
      .markAllAsTouched();


    /*
     * =====================================
     * VALIDAR FORMULARIO
     * =====================================
     */

    if (
      this.form.invalid
    ) {

      this.errorMessage =
        'Completa correctamente los datos del presupuesto.';

      return;
    }


    /*
     * Al menos uno de los conceptos
     * debe contener un monto.
     */

    if (
      this.totalAmount <= 0
    ) {

      this.errorMessage =
        'El total del presupuesto debe ser mayor a $0.';

      return;
    }


    /*
     * =====================================
     * VALIDAR SESIÓN
     * =====================================
     */

    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      this.errorMessage =
        'No pudimos validar tu sesión.';

      return;
    }


    /*
     * =====================================
     * PERFIL DEL TÉCNICO
     * =====================================
     *
     * currentProfile puede todavía no
     * estar disponible si la pantalla fue
     * abierta directamente desde una URL.
     */

    let profile =
      this.profileService
        .currentProfile;


    if (
      !profile
    ) {

      try {

        profile =
          await firstValueFrom(

            this.profileService
              .profile$
              .pipe(

                filter(
                  value =>
                    value !== null
                ),

                take(1)
              )
          );


      } catch (error) {

        console.error(
          '[ServiGo] Error obteniendo perfil técnico:',
          error
        );
      }
    }


    if (
      !profile
    ) {

      this.errorMessage =
        'No pudimos validar tu perfil técnico.';

      return;
    }


    /*
     * Protección adicional.
     *
     * El técnico no puede cotizar
     * una solicitud propia.
     */

    if (
      this.opportunity
        .request
        .clientId ===
      user.uid
    ) {

      this.errorMessage =
        'No puedes cotizar tu propia solicitud.';

      return;
    }


    this.sending =
      true;


    this.cdr.detectChanges();


    /*
     * =====================================
     * CREAR QUOTE
     * =====================================
     */

    try {

      const values =
        this.form.getRawValue();


      this.quoteId =
        await this.quoteService
          .createQuote({

            requestId:
              this.opportunity
                .request
                .id,

            clientId:
              this.opportunity
                .request
                .clientId,

            technicianId:
              user.uid,

            technicianName:
              profile.displayName,

            laborAmount:
              Number(
                values.laborAmount
              ),

            materialsAmount:
              Number(
                values.materialsAmount
              ),

            otherAmount:
              Number(
                values.otherAmount
              ),

            availableDate:
              values.availableDate,

            comment:
              values.comment.trim()
          });


      console.log(
        '[ServiGo] Presupuesto creado:',
        this.quoteId
      );


      this.success =
        true;


    } catch (error: any) {

      console.error(
        '[ServiGo] Error enviando presupuesto:',
        error
      );


      if (
        error?.message ===
        'quote-already-exists'
      ) {

        this.errorMessage =
          'Ya enviaste un presupuesto para esta solicitud.';


      } else if (
        error?.message ===
        'cannot-quote-own-request'
      ) {

        this.errorMessage =
          'No puedes cotizar tu propia solicitud.';


      } else if (
        error?.code ===
        'permission-denied'
      ) {

        this.errorMessage =
          'Firestore rechazó el presupuesto por permisos.';


      } else {

        this.errorMessage =
          'No pudimos enviar el presupuesto.';
      }


    } finally {

      this.sending =
        false;


      this.cdr.detectChanges();
    }
  }


  /*
   * =========================================
   * VOLVER
   * =========================================
   */

  async back():
    Promise<void> {


    /*
     * Si conocemos requestId,
     * siempre volvemos al detalle
     * reconstruible desde Firestore.
     *
     * No usamos router.state.
     */

    if (
      this.requestId
    ) {

      await this.router.navigate(
        [
          '/app/technician/opportunity',
          this.requestId
        ]
      );

      return;
    }


    await this.router.navigateByUrl(
      '/app/technician/home'
    );
  }


  /*
   * =========================================
   * HOME TÉCNICO
   * =========================================
   */

  async goHome():
    Promise<void> {


    await this.router.navigateByUrl(
      '/app/technician/home'
    );
  }


  /*
   * =========================================
   * FECHA LOCAL YYYY-MM-DD
   * =========================================
   */

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