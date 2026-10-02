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
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  TechnicianApplication
} from '../models/technician-application.model';


@Injectable({
  providedIn: 'root'
})
export class AdminService {


  async getPendingApplications():
    Promise<TechnicianApplication[]> {

    const q =
      query(
        collection(
          firestore,
          'technicianApplications'
        ),

        where(
          'status',
          '==',
          'pending'
        )
      );


    const result =
      await getDocs(q);


    return result.docs
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

          return dateA - dateB;
        }
      );
  }


  async approveApplication(
    application:
      TechnicianApplication,

    adminUid: string
  ): Promise<void> {

    /*
     * 1. Marcamos postulación aprobada.
     */
    await updateDoc(
      doc(
        firestore,
        'technicianApplications',
        application.id
      ),
      {
        status:
          'approved',

        rejectionReason:
          null,

        reviewedBy:
          adminUid,

        reviewedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );


    /*
     * 2. Agregamos rol técnico.
     *
     * Las reglas Firestore impedirán
     * que un usuario normal haga esto.
     */
    await updateDoc(
      doc(
        firestore,
        'users',
        application.userId
      ),
      {
        roles: [
          'cliente',
          'tecnico'
        ],

        updatedAt:
          serverTimestamp()
      }
    );
  }


  async rejectApplication(
    application:
      TechnicianApplication,

    adminUid: string,

    rejectionReason: string
  ): Promise<void> {

    const reason =
      rejectionReason.trim();


    if (
      reason.length < 5
    ) {

      throw new Error(
        'rejection-reason-required'
      );
    }


    await updateDoc(
      doc(
        firestore,
        'technicianApplications',
        application.id
      ),
      {
        status:
          'rejected',

        rejectionReason:
          reason,

        reviewedBy:
          adminUid,

        reviewedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );
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