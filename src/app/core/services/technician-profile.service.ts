import {
  Injectable
} from '@angular/core';

import {
  DocumentData,
  Timestamp,
  arrayRemove,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  TechnicianProfile,
  TechnicianProfileInput,
  TechnicianProfileStatus
} from '../models/technician-profile.model';

@Injectable({
  providedIn: 'root'
})
export class TechnicianProfileService {

  async getProfile(
    userId: string
  ): Promise<TechnicianProfile | null> {

    const snapshot =
      await getDoc(
        doc(
          firestore,
          'technicianProfiles',
          userId
        )
      );

    if (
      !snapshot.exists()
    ) {
      return null;
    }

    return this.mapProfile(
      snapshot.data()
    );
  }

  async listProfiles():
    Promise<TechnicianProfile[]> {

    const snapshot =
      await getDocs(
        collection(
          firestore,
          'technicianProfiles'
        )
      );

    return snapshot.docs
      .map(
        documentSnapshot =>
          this.mapProfile(
            documentSnapshot.data()
          )
      )
      .sort(
        (a, b) =>
          a.displayName.localeCompare(
            b.displayName,
            'es'
          )
      );
  }

  async updateProfile(
    userId: string,
    input: TechnicianProfileInput,
    adminUid: string
  ): Promise<void> {

    const normalized =
      this.normalizeInput(
        input
      );

    const userSnapshot =
      await getDoc(
        doc(
          firestore,
          'users',
          userId
        )
      );

    if (
      !userSnapshot.exists()
    ) {
      throw new Error(
        'technician-profile/user-not-found'
      );
    }

    const userData =
      userSnapshot.data();

    const roles =
      Array.isArray(
        userData['roles']
      )
        ? userData['roles'] as string[]
        : [];

    if (
      !roles.includes(
        'tecnico'
      )
    ) {
      throw new Error(
        'technician-profile/role-missing'
      );
    }

    await updateDoc(
      doc(
        firestore,
        'technicianProfiles',
        userId
      ),
      {
        ...normalized,
        accountStatus:
          userData['status']
          ?? 'active',
        updatedBy:
          adminUid,
        updatedAt:
          serverTimestamp()
      }
    );
  }

  async deleteProfile(
    userId: string
  ): Promise<void> {

    const serviceSnapshot =
      await getDocs(
        query(
          collection(
            firestore,
            'serviceRequests'
          ),
          where(
            'assignedTechnicianId',
            '==',
            userId
          )
        )
      );

    const activeStatuses =
      new Set([
        'accepted',
        'en_route',
        'arrived',
        'in_progress'
      ]);

    const hasActiveServices =
      serviceSnapshot.docs.some(
        documentSnapshot => {
          const status =
            documentSnapshot.data()['status'];

          return typeof status === 'string'
            && activeStatuses.has(
              status
            );
        }
      );

    if (
      hasActiveServices
    ) {
      throw new Error(
        'technician-profile/active-services'
      );
    }

    const batch =
      writeBatch(
        firestore
      );

    batch.delete(
      doc(
        firestore,
        'technicianProfiles',
        userId
      )
    );

    batch.update(
      doc(
        firestore,
        'users',
        userId
      ),
      {
        roles:
          arrayRemove(
            'tecnico'
          ),
        updatedAt:
          serverTimestamp()
      }
    );

    await batch.commit();
  }

  normalizeInput(
    input: TechnicianProfileInput
  ): TechnicianProfileInput {

    const displayName =
      input.displayName
        .trim()
        .replace(
          /\s+/g,
          ' '
        );

    const specialties =
      Array.from(
        new Set(
          input.specialties
            .map(
              value =>
                value
                  .trim()
                  .replace(
                    /\s+/g,
                    ' '
                  )
            )
            .filter(Boolean)
        )
      )
        .slice(
          0,
          12
        );

    if (
      displayName.length < 2
      || specialties.length === 0
    ) {
      throw new Error(
        'technician-profile/invalid-data'
      );
    }

    return {
      displayName:
        displayName.slice(0, 80),
      photoUrl:
        input.photoUrl
          ?.trim()
          .slice(0, 2048)
        || null,
      specialties,
      experienceYears:
        Math.min(
          60,
          Math.max(
            0,
            Math.trunc(
              Number(
                input.experienceYears
              )
            )
          )
        ),
      experienceDescription:
        input.experienceDescription
          .trim()
          .slice(0, 1200),
      baseCommune:
        input.baseCommune
          .trim()
          .slice(0, 80),
      serviceRadiusKm:
        Math.min(
          200,
          Math.max(
            1,
            Math.trunc(
              Number(
                input.serviceRadiusKm
              )
            )
          )
        ),
      hasCertifications:
        Boolean(
          input.hasCertifications
        ),
      publicDescription:
        input.publicDescription
          .trim()
          .slice(0, 800),
      status:
        this.normalizeStatus(
          input.status
        )
    };
  }

  private mapProfile(
    data: DocumentData
  ): TechnicianProfile {

    return {
      userId:
        data['userId'] ?? '',
      displayName:
        data['displayName'] ?? '',
      photoUrl:
        data['photoUrl'] ?? null,
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
      hasCertifications:
        Boolean(
          data['hasCertifications']
        ),
      publicDescription:
        data['publicDescription'] ?? '',
      status:
        this.normalizeStatus(
          data['status']
        ),
      accountStatus:
        data['accountStatus'] ?? 'active',
      createdAt:
        this.toDate(
          data['createdAt']
        ),
      updatedAt:
        this.toDate(
          data['updatedAt']
        ),
      createdBy:
        data['createdBy'] ?? null,
      updatedBy:
        data['updatedBy'] ?? null,
      sourceApplicationId:
        data['sourceApplicationId'] ?? null
    };
  }

  private normalizeStatus(
    value: unknown
  ): TechnicianProfileStatus {

    if (
      value === 'inactive'
      || value === 'suspended'
    ) {
      return value;
    }

    return 'active';
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
