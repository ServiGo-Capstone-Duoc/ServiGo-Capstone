import {
  Injectable
} from '@angular/core';

import {
  collection,
  doc,
  DocumentData,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  TechnicianApplication,
  TechnicianApplicationDocumentSummary,
  TechnicianApplicationStatus
} from '../models/technician-application.model';

export interface CreateTechnicianApplication {
  fullName: string;
  rut: string;
  phone: string;
  specialties: string[];
  experienceYears: number;
  experienceDescription: string;
  baseCommune: string;
  serviceRadiusKm: number;
  termsAccepted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TechnicianApplicationService {

  async getLatestApplication(
    userId: string
  ): Promise<TechnicianApplication | null> {

    const applicationQuery =
      query(
        collection(
          firestore,
          'technicianApplications'
        ),
        where(
          'userId',
          '==',
          userId
        )
      );

    const result =
      await getDocs(
        applicationQuery
      );

    if (
      result.empty
    ) {
      return null;
    }

    const applications =
      result.docs
        .map(
          snapshot =>
            this.mapApplication(
              snapshot.data()
            )
        )
        .sort(
          (a, b) => {
            const dateA =
              a.createdAt?.getTime()
              ?? 0;

            const dateB =
              b.createdAt?.getTime()
              ?? 0;

            return dateB - dateA;
          }
        );

    return applications[0]
      ?? null;
  }

  async hasPendingApplication(
    userId: string
  ): Promise<boolean> {

    const application =
      await this.getLatestApplication(
        userId
      );

    return application?.status ===
      'pending';
  }

  async prepareApplication(
    userId: string
  ): Promise<string> {

    await this.assertCanSubmit(
      userId
    );

    return doc(
      collection(
        firestore,
        'technicianApplications'
      )
    ).id;
  }

  async createApplication(
    userId: string,
    applicationId: string,
    data: CreateTechnicianApplication,
    documentSummary:
      TechnicianApplicationDocumentSummary
  ): Promise<string> {

    this.validateApplicationData(
      data,
      documentSummary
    );

    if (
      !/^[A-Za-z0-9_-]{8,128}$/
        .test(
          applicationId
        )
    ) {
      throw new Error(
        'application-invalid-id'
      );
    }

    await this.assertCanSubmit(
      userId
    );

    const applicationRef =
      doc(
        firestore,
        'technicianApplications',
        applicationId
      );

    const status:
      TechnicianApplicationStatus =
        'pending';

    await setDoc(
      applicationRef,
      {
        id:
          applicationRef.id,
        userId,
        fullName:
          data.fullName.trim(),
        rut:
          data.rut.trim(),
        phone:
          data.phone.trim(),
        specialties:
          data.specialties,
        experienceYears:
          data.experienceYears,
        experienceDescription:
          data.experienceDescription.trim(),
        baseCommune:
          data.baseCommune.trim(),
        serviceRadiusKm:
          data.serviceRadiusKm,

        hasIdentification:
          true,
        hasCertifications:
          documentSummary
            .professionalDocumentCount > 0,

        documentsSubmitted:
          true,
        documentsSubmittedAt:
          serverTimestamp(),
        documentVersion:
          1,
        identificationDocumentCount:
          documentSummary
            .identificationDocumentCount,
        professionalDocumentCount:
          documentSummary
            .professionalDocumentCount,
        additionalDocumentCount:
          documentSummary
            .additionalDocumentCount,

        termsAccepted:
          true,
        status,
        rejectionReason:
          null,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
        reviewedAt:
          null,
        reviewedBy:
          null
      }
    );

    return applicationRef.id;
  }

  private async assertCanSubmit(
    userId: string
  ): Promise<void> {

    const latestApplication =
      await this.getLatestApplication(
        userId
      );

    if (
      latestApplication?.status ===
      'pending'
    ) {
      throw new Error(
        'application-already-pending'
      );
    }

    if (
      latestApplication?.status ===
      'approved'
    ) {
      throw new Error(
        'application-already-approved'
      );
    }
  }

  private validateApplicationData(
    data: CreateTechnicianApplication,
    documentSummary:
      TechnicianApplicationDocumentSummary
  ): void {

    if (
      !data.termsAccepted
    ) {
      throw new Error(
        'terms-not-accepted'
      );
    }

    if (
      data.specialties.length === 0
    ) {
      throw new Error(
        'specialties-required'
      );
    }

    if (
      documentSummary
        .identificationDocumentCount < 1
    ) {
      throw new Error(
        'identity-document-required'
      );
    }

    if (
      documentSummary
        .professionalDocumentCount < 1
    ) {
      throw new Error(
        'professional-document-required'
      );
    }

    const totalDocuments =
      documentSummary
        .identificationDocumentCount
      + documentSummary
        .professionalDocumentCount
      + documentSummary
        .additionalDocumentCount;

    if (
      documentSummary
        .identificationDocumentCount > 2
      || documentSummary
        .professionalDocumentCount > 3
      || documentSummary
        .additionalDocumentCount > 3
      || totalDocuments > 8
    ) {
      throw new Error(
        'document-limit-exceeded'
      );
    }
  }

  private mapApplication(
    data: DocumentData
  ): TechnicianApplication {

    return {
      id:
        data['id']
        ?? '',
      userId:
        data['userId']
        ?? '',
      fullName:
        data['fullName']
        ?? '',
      rut:
        data['rut']
        ?? '',
      phone:
        data['phone']
        ?? '',
      specialties:
        Array.isArray(
          data['specialties']
        )
          ? data['specialties']
          : [],
      experienceYears:
        Number(
          data['experienceYears']
          ?? 0
        ),
      experienceDescription:
        data['experienceDescription']
        ?? '',
      baseCommune:
        data['baseCommune']
        ?? '',
      serviceRadiusKm:
        Number(
          data['serviceRadiusKm']
          ?? 0
        ),
      hasIdentification:
        Boolean(
          data['hasIdentification']
        ),
      hasCertifications:
        Boolean(
          data['hasCertifications']
        ),
      documentsSubmitted:
        Boolean(
          data['documentsSubmitted']
        ),
      documentsSubmittedAt:
        this.toDate(
          data['documentsSubmittedAt']
        ),
      documentVersion:
        Number(
          data['documentVersion']
          ?? 0
        ),
      identificationDocumentCount:
        Number(
          data[
            'identificationDocumentCount'
          ]
          ?? 0
        ),
      professionalDocumentCount:
        Number(
          data[
            'professionalDocumentCount'
          ]
          ?? 0
        ),
      additionalDocumentCount:
        Number(
          data[
            'additionalDocumentCount'
          ]
          ?? 0
        ),
      termsAccepted:
        Boolean(
          data['termsAccepted']
        ),
      status:
        data['status']
        ?? 'pending',
      rejectionReason:
        data['rejectionReason']
        ?? null,
      createdAt:
        this.toDate(
          data['createdAt']
        ),
      updatedAt:
        this.toDate(
          data['updatedAt']
        ),
      reviewedAt:
        this.toDate(
          data['reviewedAt']
        ),
      reviewedBy:
        data['reviewedBy']
        ?? null
    };
  }

  private toDate(
    value: unknown
  ): Date | null {

    if (
      value instanceof Timestamp
    ) {
      return value.toDate();
    }

    if (
      value instanceof Date
    ) {
      return value;
    }

    return null;
  }
}
