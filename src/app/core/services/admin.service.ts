import {
  Injectable
} from '@angular/core';

import {
  DocumentData,
  Timestamp,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
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

    return this.getApplicationsByStatus(
      'pending'
    );
  }

  async getApprovedApplications():
    Promise<TechnicianApplication[]> {

    return this.getApplicationsByStatus(
      'approved'
    );
  }

  async approveApplication(
    application: TechnicianApplication,
    adminUid: string
  ): Promise<void> {

    const applicationRef =
      doc(
        firestore,
        'technicianApplications',
        application.id
      );

    const userRef =
      doc(
        firestore,
        'users',
        application.userId
      );

    const profileRef =
      doc(
        firestore,
        'technicianProfiles',
        application.userId
      );

    await runTransaction(
      firestore,
      async transaction => {

        const [
          applicationSnapshot,
          userSnapshot,
          profileSnapshot
        ] = await Promise.all([
          transaction.get(
            applicationRef
          ),
          transaction.get(
            userRef
          ),
          transaction.get(
            profileRef
          )
        ]);

        if (
          !applicationSnapshot.exists()
        ) {
          throw new Error(
            'admin/application-not-found'
          );
        }

        if (
          !userSnapshot.exists()
        ) {
          throw new Error(
            'admin/user-not-found'
          );
        }

        const currentApplication =
          this.mapApplication(
            applicationSnapshot.data()
          );

        if (
          currentApplication.status !==
          'pending'
        ) {
          throw new Error(
            'admin/application-already-reviewed'
          );
        }

        if (
          currentApplication.userId !==
          application.userId
        ) {
          throw new Error(
            'admin/application-mismatch'
          );
        }

        if (
          !currentApplication
            .documentsSubmitted
          || currentApplication
            .identificationDocumentCount < 1
          || currentApplication
            .professionalDocumentCount < 1
        ) {
          throw new Error(
            'admin/application-documents-incomplete'
          );
        }

        const userData =
          userSnapshot.data();

        if (
          userData['status'] !== 'active'
        ) {
          throw new Error(
            'admin/user-not-active'
          );
        }

        transaction.update(
          applicationRef,
          {
            status: 'approved',
            rejectionReason: null,
            reviewedBy: adminUid,
            reviewedAt:
              serverTimestamp(),
            updatedAt:
              serverTimestamp()
          }
        );

        transaction.update(
          userRef,
          {
            roles:
              arrayUnion(
                'tecnico'
              ),
            updatedAt:
              serverTimestamp()
          }
        );

        if (
          profileSnapshot.exists()
        ) {

          transaction.update(
            profileRef,
            {
              accountStatus:
                userData['status']
                ?? 'active',
              updatedBy:
                adminUid,
              updatedAt:
                serverTimestamp()
            }
          );

          return;
        }

        transaction.set(
          profileRef,
          this.buildTechnicianProfile(
            currentApplication,
            adminUid,
            userData
          )
        );
      }
    );
  }

  async rejectApplication(
    application: TechnicianApplication,
    adminUid: string,
    rejectionReason: string
  ): Promise<void> {

    const reason =
      rejectionReason
        .trim()
        .slice(
          0,
          500
        );

    if (
      reason.length < 5
    ) {
      throw new Error(
        'rejection-reason-required'
      );
    }

    await runTransaction(
      firestore,
      async transaction => {

        const applicationRef =
          doc(
            firestore,
            'technicianApplications',
            application.id
          );

        const snapshot =
          await transaction.get(
            applicationRef
          );

        if (
          !snapshot.exists()
        ) {
          throw new Error(
            'admin/application-not-found'
          );
        }

        const currentApplication =
          this.mapApplication(
            snapshot.data()
          );

        if (
          currentApplication.status !==
          'pending'
        ) {
          throw new Error(
            'admin/application-already-reviewed'
          );
        }

        if (
          currentApplication.userId !==
          application.userId
        ) {
          throw new Error(
            'admin/application-mismatch'
          );
        }

        transaction.update(
          applicationRef,
          {
            status: 'rejected',
            rejectionReason: reason,
            reviewedBy: adminUid,
            reviewedAt:
              serverTimestamp(),
            updatedAt:
              serverTimestamp()
          }
        );
      }
    );
  }

  /**
   * Migra postulaciones aprobadas de versiones anteriores al catálogo
   * administrativo de perfiles profesionales. No sobrescribe perfiles que
   * ya fueron revisados o editados por un administrador.
   */
  async synchronizeApprovedTechnicianProfiles(
    adminUid: string
  ): Promise<number> {

    const applications =
      await this.getApprovedApplications();

    let created = 0;

    for (
      const application
      of applications
    ) {

      const profileRef =
        doc(
          firestore,
          'technicianProfiles',
          application.userId
        );

      const profileSnapshot =
        await getDoc(
          profileRef
        );

      if (
        profileSnapshot.exists()
      ) {
        continue;
      }

      const userRef =
        doc(
          firestore,
          'users',
          application.userId
        );

      const userSnapshot =
        await getDoc(
          userRef
        );

      if (
        !userSnapshot.exists()
      ) {
        continue;
      }

      const userData =
        userSnapshot.data();

      const roles =
        Array.isArray(
          userData['roles']
        )
          ? userData['roles'] as string[]
          : [];

      /*
       * Si un administrador eliminó deliberadamente el perfil y retiró
       * el rol técnico, no debemos recrearlo durante una migración.
       */
      if (
        !roles.includes(
          'tecnico'
        )
        || userData['status'] !== 'active'
      ) {
        continue;
      }

      await runTransaction(
        firestore,
        async transaction => {

          const [
            currentProfile,
            currentUser
          ] = await Promise.all([
            transaction.get(
              profileRef
            ),
            transaction.get(
              userRef
            )
          ]);

          if (
            currentProfile.exists()
          ) {
            return;
          }

          if (
            !currentUser.exists()
          ) {
            return;
          }

          const currentUserData =
            currentUser.data();

          const currentRoles =
            Array.isArray(
              currentUserData['roles']
            )
              ? currentUserData['roles'] as string[]
              : [];

          if (
            !currentRoles.includes(
              'tecnico'
            )
            || currentUserData['status'] !== 'active'
          ) {
            return;
          }

          transaction.set(
            profileRef,
            this.buildTechnicianProfile(
              application,
              adminUid,
              currentUserData
            )
          );

          transaction.update(
            userRef,
            {
              roles:
                arrayUnion(
                  'tecnico'
                ),
              updatedAt:
                serverTimestamp()
            }
          );
        }
      );

      created += 1;
    }

    return created;
  }

  private async getApplicationsByStatus(
    status: 'pending' | 'approved'
  ): Promise<TechnicianApplication[]> {

    const result =
      await getDocs(
        query(
          collection(
            firestore,
            'technicianApplications'
          ),
          where(
            'status',
            '==',
            status
          )
        )
      );

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
            a.createdAt?.getTime()
            ?? 0;

          const dateB =
            b.createdAt?.getTime()
            ?? 0;

          return dateA - dateB;
        }
      );
  }

  private buildTechnicianProfile(
    application: TechnicianApplication,
    adminUid: string,
    userData: DocumentData
  ): DocumentData {

    return {
      userId:
        application.userId,
      displayName:
        application.fullName,
      photoUrl:
        userData['photoUrl']
        ?? null,
      specialties:
        application.specialties,
      experienceYears:
        application.experienceYears,
      experienceDescription:
        application.experienceDescription,
      baseCommune:
        application.baseCommune,
      serviceRadiusKm:
        application.serviceRadiusKm,
      hasCertifications:
        application
          .professionalDocumentCount > 0,
      publicDescription:
        application.experienceDescription,
      status:
        'active',
      accountStatus:
        userData['status']
        ?? 'active',
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
      createdBy:
        adminUid,
      updatedBy:
        adminUid,
      sourceApplicationId:
        application.id
    };
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
