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
  Router
} from '@angular/router';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonToggle
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  constructOutline,
  createOutline,
  refreshOutline,
  searchOutline,
  syncOutline,
  trashOutline
} from 'ionicons/icons';

import {
  TechnicianProfile,
  TechnicianProfileInput,
  TechnicianProfileStatus
} from '../../../core/models/technician-profile.model';

import {
  AdminService
} from '../../../core/services/admin.service';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  TechnicianProfileService
} from '../../../core/services/technician-profile.service';

@Component({
  selector: 'app-admin-technicians',
  templateUrl:
    './admin-technicians.page.html',
  styleUrls: [
    './admin-technicians.page.scss'
  ],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTextarea,
    IonToggle
  ]
})
export class AdminTechniciansPage
  implements OnInit {

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  private readonly authService =
    inject(AuthService);

  private readonly adminService =
    inject(AdminService);

  private readonly technicianProfileService =
    inject(TechnicianProfileService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  profiles:
    TechnicianProfile[] = [];

  filteredProfiles:
    TechnicianProfile[] = [];

  selectedProfile:
    TechnicianProfile | null = null;

  searchTerm = '';
  statusFilter:
    'all' | TechnicianProfileStatus = 'all';

  loading = true;
  saving = false;
  deleting = false;
  synchronizing = false;
  showDeleteConfirmation = false;

  errorMessage = '';
  successMessage = '';

  readonly form =
    this.fb.nonNullable.group({
      displayName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(80)
        ]
      ],
      photoUrl: [
        '',
        Validators.maxLength(2048)
      ],
      specialtiesText: [
        '',
        Validators.required
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
        Validators.maxLength(1200)
      ],
      baseCommune: [
        '',
        [
          Validators.required,
          Validators.maxLength(80)
        ]
      ],
      serviceRadiusKm: [
        10,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(200)
        ]
      ],
      hasCertifications: [
        false
      ],
      publicDescription: [
        '',
        Validators.maxLength(800)
      ],
      status: [
        'active' as TechnicianProfileStatus,
        Validators.required
      ]
    });

  constructor() {

    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      constructOutline,
      createOutline,
      refreshOutline,
      searchOutline,
      syncOutline,
      trashOutline
    });
  }

  async ngOnInit():
    Promise<void> {

    await this.loadProfiles();
  }

  async goBack():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/admin'
    );
  }

  async loadProfiles():
    Promise<void> {

    this.loading = true;
    this.errorMessage = '';

    try {

      this.profiles =
        await this.technicianProfileService
          .listProfiles();

      this.applyFilters();

      if (
        this.selectedProfile
      ) {

        this.selectedProfile =
          this.profiles.find(
            profile =>
              profile.userId ===
                this.selectedProfile?.userId
          )
          ?? null;
      }

    } catch (error) {

      console.error(
        '[ServiGo] Error cargando perfiles técnicos:',
        error
      );

      this.errorMessage =
        'No fue posible cargar el catálogo de técnicos.';

    } finally {

      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onSearch(
    event: CustomEvent
  ): void {

    const detail =
      event.detail as {
        value?: string | null;
      };

    this.searchTerm =
      detail.value
        ?.trim()
        .toLowerCase()
      ?? '';

    this.applyFilters();
  }

  onStatusFilterChange(
    value: 'all' | TechnicianProfileStatus
  ): void {

    this.statusFilter =
      value;

    this.applyFilters();
  }

  selectProfile(
    profile: TechnicianProfile
  ): void {

    this.selectedProfile =
      profile;

    this.form.reset({
      displayName:
        profile.displayName,
      photoUrl:
        profile.photoUrl
        ?? '',
      specialtiesText:
        profile.specialties.join(
          ', '
        ),
      experienceYears:
        profile.experienceYears,
      experienceDescription:
        profile.experienceDescription,
      baseCommune:
        profile.baseCommune,
      serviceRadiusKm:
        profile.serviceRadiusKm,
      hasCertifications:
        profile.hasCertifications,
      publicDescription:
        profile.publicDescription,
      status:
        profile.status
    });

    this.showDeleteConfirmation =
      false;

    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditor(): void {

    this.selectedProfile =
      null;

    this.showDeleteConfirmation =
      false;

    this.form.reset();
    this.errorMessage = '';
    this.successMessage = '';
  }

  async save():
    Promise<void> {

    if (
      !this.selectedProfile
      || this.form.invalid
      || this.saving
    ) {

      this.form.markAllAsTouched();
      return;
    }

    const admin =
      this.authService.getCurrentUser();

    if (
      !admin
    ) {

      this.errorMessage =
        'La sesión administrativa ya no está disponible.';

      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {

      const raw =
        this.form.getRawValue();

      const input:
        TechnicianProfileInput = {
          displayName:
            raw.displayName,
          photoUrl:
            raw.photoUrl
            || null,
          specialties:
            raw.specialtiesText
              .split(',')
              .map(
                specialty =>
                  specialty.trim()
              )
              .filter(Boolean),
          experienceYears:
            Number(
              raw.experienceYears
            ),
          experienceDescription:
            raw.experienceDescription,
          baseCommune:
            raw.baseCommune,
          serviceRadiusKm:
            Number(
              raw.serviceRadiusKm
            ),
          hasCertifications:
            raw.hasCertifications,
          publicDescription:
            raw.publicDescription,
          status:
            raw.status
        };

      await this.technicianProfileService
        .updateProfile(
          this.selectedProfile.userId,
          input,
          admin.uid
        );

      this.successMessage =
        'El perfil profesional se actualizó correctamente.';

      await this.loadProfiles();

      const refreshed =
        this.profiles.find(
          profile =>
            profile.userId ===
              this.selectedProfile?.userId
        );

      if (
        refreshed
      ) {
        this.selectProfile(
          refreshed
        );
        this.successMessage =
          'El perfil profesional se actualizó correctamente.';
      }

    } catch (error) {

      console.error(
        '[ServiGo] Error actualizando perfil técnico:',
        error
      );

      this.errorMessage =
        'No fue posible guardar el perfil profesional. Revisa los datos e inténtalo nuevamente.';

    } finally {

      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  toggleDeleteConfirmation(): void {

    this.showDeleteConfirmation =
      !this.showDeleteConfirmation;
  }

  async deleteProfile():
    Promise<void> {

    if (
      !this.selectedProfile
      || this.deleting
    ) {
      return;
    }

    const userId =
      this.selectedProfile.userId;

    this.deleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {

      await this.technicianProfileService
        .deleteProfile(
          userId
        );

      this.selectedProfile =
        null;

      this.showDeleteConfirmation =
        false;

      this.successMessage =
        'El perfil profesional fue eliminado y el rol técnico fue retirado.';

      await this.loadProfiles();

    } catch (error) {

      console.error(
        '[ServiGo] Error eliminando perfil técnico:',
        error
      );

      this.errorMessage =
        'No fue posible eliminar el perfil. Verifica que el técnico no tenga servicios activos.';

    } finally {

      this.deleting = false;
      this.cdr.detectChanges();
    }
  }

  async synchronizeApproved():
    Promise<void> {

    if (
      this.synchronizing
    ) {
      return;
    }

    const admin =
      this.authService.getCurrentUser();

    if (
      !admin
    ) {
      this.errorMessage =
        'La sesión administrativa ya no está disponible.';
      return;
    }

    this.synchronizing = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {

      const created =
        await this.adminService
          .synchronizeApprovedTechnicianProfiles(
            admin.uid
          );

      this.successMessage =
        created === 0
          ? 'Todos los técnicos aprobados ya tienen un perfil profesional.'
          : `${created} perfil${created === 1 ? '' : 'es'} profesional${created === 1 ? '' : 'es'} creado${created === 1 ? '' : 's'}.`;

      await this.loadProfiles();

    } catch (error) {

      console.error(
        '[ServiGo] Error sincronizando técnicos:',
        error
      );

      this.errorMessage =
        'No fue posible sincronizar las postulaciones aprobadas.';

    } finally {

      this.synchronizing = false;
      this.cdr.detectChanges();
    }
  }

  statusLabel(
    status: TechnicianProfileStatus
  ): string {

    if (
      status === 'inactive'
    ) {
      return 'Inactivo';
    }

    if (
      status === 'suspended'
    ) {
      return 'Suspendido';
    }

    return 'Activo';
  }

  private applyFilters(): void {

    this.filteredProfiles =
      this.profiles.filter(
        profile => {

          const matchesStatus =
            this.statusFilter === 'all'
            || profile.status ===
              this.statusFilter;

          const haystack =
            [
              profile.displayName,
              profile.baseCommune,
              ...profile.specialties
            ]
              .join(' ')
              .toLowerCase();

          const matchesSearch =
            !this.searchTerm
            || haystack.includes(
              this.searchTerm
            );

          return matchesStatus
            && matchesSearch;
        }
      );
  }
}
