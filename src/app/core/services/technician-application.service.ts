import {
  Injectable
} from '@angular/core';

import {
  collection,
  doc,
  DocumentData,
  getDocs,
  limit,
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

  hasIdentification: boolean;
  hasCertifications: boolean;

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


    if (result.empty) {
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
              a.createdAt?.getTime() ?? 0;

            const dateB =
              b.createdAt?.getTime() ?? 0;

            return dateB - dateA;
          }
        );


    return applications[0] ?? null;
  }


  async hasPendingApplication(
    userId: string
  ): Promise<boolean> {

    const application =
      await this.getLatestApplication(
        userId
      );

    return (
      application?.status ===
      'pending'
    );
  }


  async createApplication(
    userId: string,
    data: CreateTechnicianApplication
  ): Promise<string> {

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


    const applicationRef =
      doc(
        collection(
          firestore,
          'technicianApplications'
        )
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
          data.hasIdentification,

        hasCertifications:
          data.hasCertifications,

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


  private mapApplication(
    data: DocumentData
  ): TechnicianApplication {

    return {

      id:
        data['id'] ?? '',

      userId:
        data['userId'] ?? '',

      fullName:
        data['fullName'] ?? '',

      rut:
        data['rut'] ?? '',

      phone:
        data['phone'] ?? '',

      specialties:
        Array.isArray(
          data['specialties']
        )
          ? data['specialties']
          : [],

      experienceYears:
        Number(
          data['experienceYears'] ?? 0
        ),

      experienceDescription:
        data['experienceDescription'] ?? '',

      baseCommune:
        data['baseCommune'] ?? '',

      serviceRadiusKm:
        Number(
          data['serviceRadiusKm'] ?? 0
        ),

      hasIdentification:
        Boolean(
          data['hasIdentification']
        ),

      hasCertifications:
        Boolean(
          data['hasCertifications']
        ),

      termsAccepted:
        Boolean(
          data['termsAccepted']
        ),

      status:
        data['status'] ?? 'pending',

      rejectionReason:
        data['rejectionReason'] ?? null,

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
        data['reviewedBy'] ?? null
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