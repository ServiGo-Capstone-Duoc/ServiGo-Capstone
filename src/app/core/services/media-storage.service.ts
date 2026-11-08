import { Injectable } from '@angular/core';
import { deleteObject, getBlob, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseStorage } from '../firebase/firebase';

@Injectable({ providedIn: 'root' })
export class MediaStorageService {
  readonly maxFiles = 5;
  readonly maxFileSize = 5 * 1024 * 1024;
  readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  validateImage(file: File): string | null {
    if (!this.allowedTypes.includes(file.type)) {
      return 'Solo puedes adjuntar imágenes JPG, PNG o WEBP.';
    }
    if (file.size > this.maxFileSize) {
      return 'Cada imagen puede pesar como máximo 5 MB.';
    }
    return null;
  }

  async uploadRequestImages(requestId: string, clientId: string, files: File[]): Promise<string[]> {
    const paths: string[] = [];
    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const extension = this.extensionFor(file);
        const fileName = `${Date.now()}_${index}_${crypto.randomUUID()}.${extension}`;
        const path = `service-request-images/${requestId}/${clientId}/${fileName}`;
        await uploadBytes(ref(firebaseStorage, path), file, { contentType: file.type });
        paths.push(path);
      }
      return paths;
    } catch (error) {
      await this.deletePaths(paths);
      throw error;
    }
  }


  async uploadChatImage(
    requestId: string,
    senderId: string,
    messageId: string,
    file: File
  ): Promise<string> {
    const validationError = this.validateImage(file);
    if (validationError) throw new Error(validationError);

    const extension = this.extensionFor(file);
    const path = `chat-images/${requestId}/${senderId}/${messageId}/image.${extension}`;
    await uploadBytes(ref(firebaseStorage, path), file, { contentType: file.type });
    return path;
  }


  async uploadProfileAvatar(
    userId: string,
    file: File
  ): Promise<string> {
    const validationError = this.validateImage(file);
    if (validationError) throw new Error(validationError);

    const path = `profile-avatars/${userId}/avatar`;
    const avatarRef = ref(firebaseStorage, path);

    await uploadBytes(
      avatarRef,
      file,
      {
        contentType: file.type,
        cacheControl: 'public,max-age=3600'
      }
    );

    return getDownloadURL(avatarRef);
  }

  async deleteProfileAvatar(
    userId: string
  ): Promise<void> {
    const avatarRef = ref(
      firebaseStorage,
      `profile-avatars/${userId}/avatar`
    );

    try {
      await deleteObject(avatarRef);
    } catch (error: unknown) {
      const code =
        typeof error === 'object'
        && error !== null
        && 'code' in error
          ? String(error.code)
          : '';

      if (code !== 'storage/object-not-found') {
        throw error;
      }
    }
  }


  async loadImageObjectUrl(path: string): Promise<string> {
    const blob = await getBlob(ref(firebaseStorage, path));
    return URL.createObjectURL(blob);
  }

  revokeObjectUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  async deletePaths(paths: string[]): Promise<void> {
    await Promise.allSettled(paths.map(path => deleteObject(ref(firebaseStorage, path))));
  }

  private extensionFor(file: File): string {
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    return 'jpg';
  }
}
