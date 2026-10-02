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
  AuthService
} from '../../../core/services/auth.service';

import {
  ProfileService
} from '../../../core/services/profile.service';

import {
  MatchingService,
  TechnicianOpportunity
} from '../../../core/services/matching.service';

import {
  QuoteService
} from '../../../core/services/quote.service';


@Component({
  selector: 'app-quote',

  templateUrl:
    './quote.page.html',

  styleUrls: [
    './quote.page.scss'
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
export class QuotePage
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

  private readonly matchingService =
    inject(MatchingService);

  private readonly quoteService =
    inject(QuoteService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  opportunity:
    TechnicianOpportunity | null = null;


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


  async ngOnInit():
    Promise<void> {

    const navigation =
      this.router
        .getCurrentNavigation();


    const stateOpportunity =
      navigation
        ?.extras
        ?.state
        ?.[
          'opportunity'
        ] as
          TechnicianOpportunity
          | undefined;


    if (
      stateOpportunity
    ) {

      this.opportunity =
        stateOpportunity;

      this.loading =
        false;

      return;
    }


    const requestId =
      this.route.snapshot
        .paramMap
        .get(
          'requestId'
        );


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !requestId
      ||
      !user
    ) {

      this.errorMessage =
        'No pudimos cargar la oportunidad.';

      this.loading =
        false;

      return;
    }


    try {

      const opportunities =
        await this.matchingService
          .getOpportunitiesForTechnician(
            user.uid
          );


      this.opportunity =
        opportunities.find(
          item =>
            item.request.id ===
            requestId
        )
        ?? null;


      if (
        !this.opportunity
      ) {

        this.errorMessage =
          'Esta oportunidad ya no está disponible.';
      }


    } finally {

      this.loading =
        false;

      this.cdr.detectChanges();
    }
  }


  get totalAmount():
    number {

    const values =
      this.form.getRawValue();


    return (
      Number(
        values.laborAmount
      )
      +
      Number(
        values.materialsAmount
      )
      +
      Number(
        values.otherAmount
      )
    );
  }


  async submit():
    Promise<void> {

    if (
      this.sending
      ||
      !this.opportunity
    ) {
      return;
    }


    this.errorMessage = '';

    this.form.markAllAsTouched();


    if (
      this.form.invalid
    ) {

      this.errorMessage =
        'Completa correctamente los datos del presupuesto.';

      return;
    }


    if (
      this.totalAmount <= 0
    ) {

      this.errorMessage =
        'El total del presupuesto debe ser mayor a $0.';

      return;
    }


    const user =
      await this.authService
        .waitForAuthReady();


    const profile =
      this.profileService
        .currentProfile;


    if (
      !user
      ||
      !profile
    ) {

      this.errorMessage =
        'No pudimos validar tu perfil técnico.';

      return;
    }


    this.sending =
      true;

    this.cdr.detectChanges();


    try {

      const values =
        this.form.getRawValue();


      this.quoteId =
        await this.quoteService
          .createQuote({

            requestId:
              this.opportunity.request.id,

            clientId:
              this.opportunity.request.clientId,

            technicianId:
              user.uid,

            technicianName:
              profile.displayName,

            laborAmount:
              values.laborAmount,

            materialsAmount:
              values.materialsAmount,

            otherAmount:
              values.otherAmount,

            availableDate:
              values.availableDate,

            comment:
              values.comment
          });


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


  async back():
    Promise<void> {

    if (
      this.opportunity
    ) {

      await this.router.navigate(
        [
          '/app/technician/opportunity',
          this.opportunity.request.id
        ],
        {
          state: {
            opportunity:
              this.opportunity
          }
        }
      );

      return;
    }


    await this.router.navigateByUrl(
      '/app/technician/home'
    );
  }


  async goHome():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/technician/home'
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


    return `${year}-${month}-${day}`;
  }
}