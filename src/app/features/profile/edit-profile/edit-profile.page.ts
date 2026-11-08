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
  IonItem,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  cameraOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  personOutline,
  trashOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  MediaStorageService
} from '../../../core/services/media-storage.service';

import {
  ProfileService
} from '../../../core/services/profile.service';

import {
  ClientProfileInput,
  PreferredContactChannel,
  ServiGoUser
} from '../../../core/models/user.model';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: [
    './edit-profile.page.scss'
  ],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTextarea
  ]
})
export class EditProfilePage
  implements OnInit, OnDestroy {

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  private readonly authService =
    inject(AuthService);

  private readonly profileService =
    inject(ProfileService);

  private readonly mediaStorageService =
    inject(MediaStorageService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  profile:
    ServiGoUser | null = null;

  loading = true;
  saving = false;
  deleting = false;
  removingPhoto = false;

  errorMessage = '';
  successMessage = '';

  selectedPhoto:
    File | null = null;

  photoPreview:
    string | null = null;

  showDeletePanel = false;

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
      phone: [
        '',
        [
          Validators.maxLength(24),
          Validators.pattern(
            /^(\+?56)?\s?9?\s?[0-9\s-]{8,12}$/
          )
        ]
      ],
      commune: [
        '',
        Validators.maxLength(80)
      ],
      address: [
        '',
        Validators.maxLength(160)
      ],
      preferredContact: [
        'chat' as PreferredContactChannel,
        Validators.required
      ]
    });

  readonly deleteForm =
    this.fb.nonNullable.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],
      confirmation: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^ELIMINAR$/
          )
        ]
      ]
    });

  constructor() {

    addIcons({
      arrowBackOutline,
      cameraOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      personOutline,
      trashOutline
    });
  }

  async ngOnInit():
    Promise<void> {

    const user =
      await this.authService.waitForAuthReady();

    if (
      !user
    ) {

      await this.router.navigateByUrl(
        '/login',
        {
          replaceUrl: true
        }
      );

      return;
    }

    try {

      this.profile =
        await this.profileService.getProfile(
          user.uid
        );

      if (
        !this.profile
      ) {
        throw new Error(
          'profile/not-found'
        );
      }

      this.form.patchValue({
        displayName:
          this.profile.displayName,
        phone:
          this.profile.phone ?? '',
        commune:
          this.profile.commune ?? '',
        address:
          this.profile.address ?? '',
        preferredContact:
          this.profile.preferredContact
      });

      this.deleteForm.patchValue({
        email:
          this.profile.email
      });

      this.photoPreview =
        this.profile.photoUrl;

    } catch (error) {

      console.error(
        '[ServiGo] Error cargando datos personales:',
        error
      );

      this.errorMessage =
        'No fue posible cargar tus datos.';

    } finally {

      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {

    if (
      this.photoPreview?.startsWith(
        'blob:'
      )
    ) {
      URL.revokeObjectURL(
        this.photoPreview
      );
    }
  }

  async goBack():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/profile'
    );
  }

  onPhotoSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ?? null;

    if (
      !file
    ) {
      return;
    }

    const validationError =
      this.mediaStorageService.validateImage(
        file
      );

    if (
      validationError
    ) {

      this.errorMessage =
        validationError;

      input.value = '';
      return;
    }

    if (
      this.photoPreview?.startsWith(
        'blob:'
      )
    ) {
      URL.revokeObjectURL(
        this.photoPreview
      );
    }

    this.selectedPhoto =
      file;

    this.photoPreview =
      URL.createObjectURL(
        file
      );

    this.errorMessage = '';
    this.successMessage = '';
  }

  async removePhoto():
    Promise<void> {

    if (
      !this.profile
      || this.removingPhoto
    ) {
      return;
    }

    this.removingPhoto = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {

      await this.profileService
        .updateOwnProfile(
          this.profile.uid,
          {
            ...this.currentFormValue(),
            photoUrl: null
          }
        );

      try {
        await this.mediaStorageService
          .deleteProfileAvatar(
            this.profile.uid
          );
      } catch (storageError) {
        console.warn(
          '[ServiGo] El perfil se actualizó, pero la imagen anterior no pudo limpiarse:',
          storageError
        );
      }

      if (
        this.photoPreview?.startsWith(
          'blob:'
        )
      ) {
        URL.revokeObjectURL(
          this.photoPreview
        );
      }

      this.selectedPhoto = null;
      this.photoPreview = null;
      this.profile.photoUrl = null;

      this.successMessage =
        'La foto de perfil fue eliminada.';

    } catch (error) {

      console.error(
        '[ServiGo] Error eliminando foto:',
        error
      );

      this.errorMessage =
        'No fue posible eliminar la foto.';

    } finally {

      this.removingPhoto = false;
      this.cdr.detectChanges();
    }
  }

  async save():
    Promise<void> {

    if (
      this.form.invalid
      || !this.profile
      || this.saving
    ) {

      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {

      let photoUrl =
        this.profile.photoUrl;

      if (
        this.selectedPhoto
      ) {

        photoUrl =
          await this.mediaStorageService
            .uploadProfileAvatar(
              this.profile.uid,
              this.selectedPhoto
            );
      }

      await this.profileService
        .updateOwnProfile(
          this.profile.uid,
          {
            ...this.currentFormValue(),
            photoUrl
          }
        );

      this.profile = {
        ...this.profile,
        ...this.currentFormValue(),
        photoUrl
      };

      if (
        this.photoPreview?.startsWith(
          'blob:'
        )
      ) {
        URL.revokeObjectURL(
          this.photoPreview
        );
      }

      this.selectedPhoto = null;
      this.photoPreview = photoUrl;

      this.successMessage =
        'Tus datos se guardaron correctamente.';

    } catch (error: unknown) {

      console.error(
        '[ServiGo] Error guardando perfil:',
        error
      );

      this.errorMessage =
        this.profileErrorMessage(
          error
        );

    } finally {

      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  toggleDeletePanel(): void {

    this.showDeletePanel =
      !this.showDeletePanel;

    this.errorMessage = '';
    this.successMessage = '';
  }

  async deleteAccount():
    Promise<void> {

    if (
      this.deleteForm.invalid
      || !this.profile
      || this.deleting
    ) {

      this.deleteForm.markAllAsTouched();
      return;
    }

    if (
      this.profile.roles.includes(
        'administrador'
      )
      || this.profile.roles.includes(
        'superadmin'
      )
    ) {

      this.errorMessage =
        'Las cuentas administrativas deben ser gestionadas por otro superadministrador.';

      return;
    }

    this.deleting = true;
    this.errorMessage = '';

    try {

      const value =
        this.deleteForm.getRawValue();

      await this.profileService
        .deleteOwnAccount(
          value.email,
          value.confirmation
        );

      try {
        await this.authService.logout();
      } catch {
        // La cuenta puede haber sido eliminada antes del logout local.
      }

      await this.router.navigateByUrl(
        '/login',
        {
          replaceUrl: true
        }
      );

    } catch (error: unknown) {

      console.error(
        '[ServiGo] Error eliminando cuenta:',
        error
      );

      this.errorMessage =
        this.deleteErrorMessage(
          error
        );

    } finally {

      this.deleting = false;
      this.cdr.detectChanges();
    }
  }

  private currentFormValue():
    ClientProfileInput {

    const value =
      this.form.getRawValue();

    return {
      displayName:
        value.displayName,
      phone:
        value.phone || null,
      photoUrl:
        this.profile?.photoUrl ?? null,
      commune:
        value.commune || null,
      address:
        value.address || null,
      preferredContact:
        value.preferredContact
    };
  }

  private profileErrorMessage(
    error: unknown
  ): string {

    const message =
      error instanceof Error
        ? error.message
        : '';

    if (
      message.includes(
        'storage/'
      )
    ) {
      return 'No fue posible subir la fotografía. Revisa el formato y vuelve a intentar.';
    }

    if (
      message === 'profile/invalid-display-name'
    ) {
      return 'El nombre debe tener entre 2 y 80 caracteres.';
    }

    return 'No fue posible guardar tus datos. Intenta nuevamente.';
  }

  private deleteErrorMessage(
    error: unknown
  ): string {

    const code =
      typeof error === 'object'
      && error !== null
      && 'code' in error
        ? String(
          error.code
        )
        : '';

    const message =
      error instanceof Error
        ? error.message
        : '';

    if (
      code.includes(
        'failed-precondition'
      )
    ) {

      if (
        message.toLowerCase().includes(
          'pago pendiente'
        )
      ) {
        return 'Existe un servicio completado con pago pendiente. Regularízalo antes de eliminar la cuenta.';
      }

      return 'No puedes eliminar la cuenta mientras tengas servicios activos.';
    }

    if (
      code.includes(
        'permission-denied'
      )
      || code.includes(
        'invalid-argument'
      )
    ) {
      return 'La confirmación no coincide con tu cuenta.';
    }

    return 'No fue posible eliminar la cuenta. Intenta nuevamente.';
  }
}
