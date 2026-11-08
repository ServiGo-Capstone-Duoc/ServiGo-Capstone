import {
  Injectable
} from '@angular/core';

import {
  deleteObject,
  getBlob,
  getMetadata,
  listAll,
  ref,
  uploadBytesResumable
} from 'firebase/storage';

import {
  firebaseStorage
} from '../firebase/firebase';

import {
  TechnicianApplicationDocument,
  TechnicianApplicationDocumentCategory,
  TechnicianApplicationDocumentSummary
} from '../models/technician-application.model';

export interface TechnicianApplicationSelectedFiles {
  identity: File[];
  professional: File[];
  additional: File[];
}

export interface TechnicianDocumentUploadProgress {
  percent: number;
  fileName: string;
  currentFile: number;
  totalFiles: number;
}

interface FileToUpload {
  category: TechnicianApplicationDocumentCategory;
  file: File;
}

@Injectable({
  providedIn: 'root'
})
export class TechnicianDocumentService {

  readonly maxFileSizeBytes =
    8 * 1024 * 1024;

  readonly maxFilesByCategory:
    Readonly<Record<TechnicianApplicationDocumentCategory, number>> = {
      identity: 2,
      professional: 3,
      additional: 3
    };

  readonly acceptedFileTypes =
    '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

  private readonly allowedContentTypes =
    new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]);

  validateAndMergeFiles(
    category: TechnicianApplicationDocumentCategory,
    currentFiles: File[],
    selectedFiles: File[]
  ): File[] {

    const merged = [
      ...currentFiles
    ];

    for (
      const file
      of selectedFiles
    ) {

      this.validateFile(
        file
      );

      const duplicated =
        merged.some(
          current =>
            current.name === file.name
            && current.size === file.size
            && current.lastModified ===
              file.lastModified
        );

      if (
        !duplicated
      ) {
        merged.push(
          file
        );
      }
    }

    const categoryLimit =
      this.maxFilesByCategory[
        category
      ];

    if (
      merged.length >
      categoryLimit
    ) {
      throw new Error(
        `document-limit-${category}`
      );
    }

    return merged;
  }

  validateSelection(
    files: TechnicianApplicationSelectedFiles
  ): void {

    if (
      files.identity.length < 1
    ) {
      throw new Error(
        'identity-document-required'
      );
    }

    if (
      files.professional.length < 1
    ) {
      throw new Error(
        'professional-document-required'
      );
    }

    for (
      const category
      of this.categories()
    ) {

      const categoryFiles =
        files[category];

      if (
        categoryFiles.length >
        this.maxFilesByCategory[
          category
        ]
      ) {
        throw new Error(
          `document-limit-${category}`
        );
      }

      for (
        const file
        of categoryFiles
      ) {
        this.validateFile(
          file
        );
      }
    }

    const totalFiles =
      files.identity.length
      + files.professional.length
      + files.additional.length;

    if (
      totalFiles > 8
    ) {
      throw new Error(
        'document-total-limit'
      );
    }
  }

  async uploadDocuments(
    applicationId: string,
    userId: string,
    files: TechnicianApplicationSelectedFiles,
    onProgress?: (
      progress: TechnicianDocumentUploadProgress
    ) => void
  ): Promise<TechnicianApplicationDocumentSummary> {

    this.validateIdentifiers(
      applicationId,
      userId
    );

    this.validateSelection(
      files
    );

    const uploadQueue:
      FileToUpload[] = [
        ...files.identity.map(
          file => ({
            category:
              'identity' as const,
            file
          })
        ),
        ...files.professional.map(
          file => ({
            category:
              'professional' as const,
            file
          })
        ),
        ...files.additional.map(
          file => ({
            category:
              'additional' as const,
            file
          })
        )
      ];

    const totalBytes =
      uploadQueue.reduce(
        (
          total,
          item
        ) =>
          total + item.file.size,
        0
      );

    let completedBytes = 0;

    const uploadedPaths:
      string[] = [];

    try {

      for (
        let index = 0;
        index < uploadQueue.length;
        index += 1
      ) {

        const item =
          uploadQueue[index];

        if (
          !item
        ) {
          continue;
        }

        const storagePath =
          this.buildStoragePath(
            applicationId,
            userId,
            item.category,
            item.file
          );

        await this.uploadFile(
          storagePath,
          applicationId,
          userId,
          item.category,
          item.file,
          transferredBytes => {

            const overallBytes =
              completedBytes
              + transferredBytes;

            const percent =
              totalBytes > 0
                ? Math.min(
                    100,
                    Math.round(
                      (
                        overallBytes
                        / totalBytes
                      ) * 100
                    )
                  )
                : 100;

            onProgress?.({
              percent,
              fileName:
                item.file.name,
              currentFile:
                index + 1,
              totalFiles:
                uploadQueue.length
            });
          }
        );

        uploadedPaths.push(
          storagePath
        );

        completedBytes +=
          item.file.size;
      }

      onProgress?.({
        percent: 100,
        fileName: '',
        currentFile:
          uploadQueue.length,
        totalFiles:
          uploadQueue.length
      });

      return {
        identificationDocumentCount:
          files.identity.length,
        professionalDocumentCount:
          files.professional.length,
        additionalDocumentCount:
          files.additional.length
      };

    } catch (error) {

      await Promise.allSettled(
        uploadedPaths.map(
          storagePath =>
            deleteObject(
              ref(
                firebaseStorage,
                storagePath
              )
            )
        )
      );

      throw error;
    }
  }

  async listDocuments(
    applicationId: string,
    userId: string
  ): Promise<TechnicianApplicationDocument[]> {

    this.validateIdentifiers(
      applicationId,
      userId
    );

    const categoryResults =
      await Promise.all(
        this.categories()
          .map(
            async category => {

              const categoryReference =
                ref(
                  firebaseStorage,
                  this.categoryPath(
                    applicationId,
                    userId,
                    category
                  )
                );

              const result =
                await listAll(
                  categoryReference
                );

              return Promise.all(
                result.items.map(
                  async itemReference => {

                    const metadata =
                      await getMetadata(
                        itemReference
                      );

                    const originalName =
                      metadata.customMetadata?.[
                        'originalName'
                      ]
                      ?? itemReference.name;

                    return {
                      id:
                        itemReference.fullPath,
                      applicationId,
                      userId,
                      category,
                      originalName,
                      storagePath:
                        itemReference.fullPath,
                      contentType:
                        metadata.contentType
                        ?? 'application/octet-stream',
                      size:
                        metadata.size,
                      uploadedAt:
                        metadata.timeCreated
                          ? new Date(
                              metadata.timeCreated
                            )
                          : null
                    } satisfies TechnicianApplicationDocument;
                  }
                )
              );
            }
          )
      );

    return categoryResults
      .flat()
      .sort(
        (a, b) => {

          const categoryDifference =
            this.categoryOrder(
              a.category
            )
            - this.categoryOrder(
                b.category
              );

          if (
            categoryDifference !== 0
          ) {
            return categoryDifference;
          }

          return a.originalName
            .localeCompare(
              b.originalName,
              'es'
            );
        }
      );
  }

  async getDocumentBlob(
    document:
      TechnicianApplicationDocument
  ): Promise<Blob> {

    return getBlob(
      ref(
        firebaseStorage,
        document.storagePath
      ),
      this.maxFileSizeBytes + 1
    );
  }

  async deleteDraftDocuments(
    applicationId: string,
    userId: string
  ): Promise<void> {

    this.validateIdentifiers(
      applicationId,
      userId
    );

    const references =
      await Promise.all(
        this.categories()
          .map(
            category =>
              listAll(
                ref(
                  firebaseStorage,
                  this.categoryPath(
                    applicationId,
                    userId,
                    category
                  )
                )
              )
          )
      );

    await Promise.allSettled(
      references
        .flatMap(
          result =>
            result.items
        )
        .map(
          itemReference =>
            deleteObject(
              itemReference
            )
        )
    );
  }

  categoryLabel(
    category:
      TechnicianApplicationDocumentCategory
  ): string {

    switch (
      category
    ) {
      case 'identity':
        return 'Identificación';

      case 'professional':
        return 'Título o respaldo profesional';

      case 'additional':
        return 'Certificación adicional';
    }
  }

  formatFileSize(
    bytes: number
  ): string {

    if (
      bytes < 1024
    ) {
      return `${bytes} B`;
    }

    if (
      bytes < 1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes / (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  private validateFile(
    file: File
  ): void {

    if (
      file.size <= 0
    ) {
      throw new Error(
        'document-empty'
      );
    }

    if (
      file.size >
      this.maxFileSizeBytes
    ) {
      throw new Error(
        'document-too-large'
      );
    }

    const contentType =
      this.resolveContentType(
        file
      );

    if (
      !this.allowedContentTypes.has(
        contentType
      )
    ) {
      throw new Error(
        'document-invalid-type'
      );
    }
  }

  private uploadFile(
    storagePath: string,
    applicationId: string,
    userId: string,
    category:
      TechnicianApplicationDocumentCategory,
    file: File,
    onProgress: (
      transferredBytes: number
    ) => void
  ): Promise<void> {

    const fileReference =
      ref(
        firebaseStorage,
        storagePath
      );

    const uploadTask =
      uploadBytesResumable(
        fileReference,
        file,
        {
          contentType:
            this.resolveContentType(
              file
            ),
          customMetadata: {
            applicationId,
            userId,
            category,
            originalName:
              this.safeOriginalName(
                file.name
              )
          }
        }
      );

    return new Promise<void>(
      (
        resolve,
        reject
      ) => {

        uploadTask.on(
          'state_changed',
          snapshot => {
            onProgress(
              snapshot.bytesTransferred
            );
          },
          error => {
            reject(
              error
            );
          },
          () => {
            resolve();
          }
        );
      }
    );
  }

  private buildStoragePath(
    applicationId: string,
    userId: string,
    category:
      TechnicianApplicationDocumentCategory,
    file: File
  ): string {

    const extension =
      this.extensionForContentType(
        this.resolveContentType(
          file
        )
      );

    const documentId =
      this.randomId();

    return `${this.categoryPath(
      applicationId,
      userId,
      category
    )}/${documentId}.${extension}`;
  }

  private categoryPath(
    applicationId: string,
    userId: string,
    category:
      TechnicianApplicationDocumentCategory
  ): string {

    return [
      'technician-application-documents',
      applicationId,
      userId,
      category
    ].join('/');
  }

  private resolveContentType(
    file: File
  ): string {

    const normalizedType =
      file.type
        .trim()
        .toLowerCase();

    if (
      this.allowedContentTypes.has(
        normalizedType
      )
    ) {
      return normalizedType;
    }

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase()
        ?? '';

    switch (
      extension
    ) {
      case 'pdf':
        return 'application/pdf';

      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';

      case 'png':
        return 'image/png';

      case 'webp':
        return 'image/webp';

      default:
        return normalizedType;
    }
  }

  private extensionForContentType(
    contentType: string
  ): string {

    switch (
      contentType
    ) {
      case 'application/pdf':
        return 'pdf';

      case 'image/jpeg':
        return 'jpg';

      case 'image/png':
        return 'png';

      case 'image/webp':
        return 'webp';

      default:
        throw new Error(
          'document-invalid-type'
        );
    }
  }

  private safeOriginalName(
    fileName: string
  ): string {

    return fileName
      .replace(
        /[\u0000-\u001F\u007F]/g,
        ''
      )
      .trim()
      .slice(
        0,
        120
      )
      || 'documento';
  }

  private randomId(): string {

    if (
      typeof globalThis.crypto
        ?.randomUUID ===
      'function'
    ) {
      return globalThis.crypto
        .randomUUID()
        .replace(
          /-/g,
          ''
        );
    }

    return [
      Date.now()
        .toString(36),
      Math.random()
        .toString(36)
        .slice(2),
      Math.random()
        .toString(36)
        .slice(2)
    ].join('');
  }

  private validateIdentifiers(
    applicationId: string,
    userId: string
  ): void {

    const validIdentifier =
      /^[A-Za-z0-9_-]{8,128}$/;

    if (
      !validIdentifier.test(
        applicationId
      )
      || !validIdentifier.test(
        userId
      )
    ) {
      throw new Error(
        'document-invalid-path'
      );
    }
  }

  private categories():
    TechnicianApplicationDocumentCategory[] {

    return [
      'identity',
      'professional',
      'additional'
    ];
  }

  private categoryOrder(
    category:
      TechnicianApplicationDocumentCategory
  ): number {

    return this.categories()
      .indexOf(
        category
      );
  }
}
