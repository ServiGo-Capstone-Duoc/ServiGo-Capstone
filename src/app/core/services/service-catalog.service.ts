import { Injectable } from '@angular/core';
import {
  collection,
  getDocs
} from 'firebase/firestore';

import { firestore } from '../firebase/firebase';
import { ServiceCatalogItem } from '../models/service-catalog.model';

export const DEFAULT_SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: 'gasfiteria-fugas', group: 'Hogar y Reparaciones Generales', name: 'Gasfitería y fugas de agua', visitFeeMin: 20000, visitFeeMax: 35000, active: true, sortOrder: 10 },
  { id: 'electricidad-basica', group: 'Hogar y Reparaciones Generales', name: 'Electricidad básica', visitFeeMin: 20000, visitFeeMax: 45000, active: true, sortOrder: 20 },
  { id: 'cerrajeria-accesos', group: 'Hogar y Reparaciones Generales', name: 'Cerrajería y accesos', visitFeeMin: 15000, visitFeeMax: 30000, active: true, sortOrder: 30 },
  { id: 'carpinteria-reparaciones', group: 'Hogar y Reparaciones Generales', name: 'Carpintería y reparaciones menores', visitFeeMin: 15000, visitFeeMax: 25000, active: true, sortOrder: 40 },
  { id: 'linea-blanca-mayor', group: 'Electrodomésticos y Línea Blanca', name: 'Lavadoras, secadoras y refrigeradores', visitFeeMin: 15000, visitFeeMax: 25000, active: true, sortOrder: 50 },
  { id: 'cocinas-hornos', group: 'Electrodomésticos y Línea Blanca', name: 'Cocinas, hornos y encimeras', visitFeeMin: 15000, visitFeeMax: 25000, active: true, sortOrder: 60 },
  { id: 'electrodomesticos-menores', group: 'Electrodomésticos y Línea Blanca', name: 'Electrodomésticos menores', visitFeeMin: 10000, visitFeeMax: 15000, active: true, sortOrder: 70 },
  { id: 'aire-acondicionado', group: 'Climatización y Calefacción', name: 'Aire acondicionado', visitFeeMin: 25000, visitFeeMax: 40000, active: true, sortOrder: 80 },
  { id: 'calefont-termos', group: 'Climatización y Calefacción', name: 'Calefont y termos eléctricos', visitFeeMin: 20000, visitFeeMax: 35000, active: true, sortOrder: 90 },
  { id: 'calderas-calefaccion', group: 'Climatización y Calefacción', name: 'Calderas y calefacción central', visitFeeMin: 30000, visitFeeMax: 50000, active: true, sortOrder: 100 },
  { id: 'soporte-computacional', group: 'Tecnología y Redes', name: 'Soporte computacional a domicilio', visitFeeMin: 20000, visitFeeMax: 35000, active: true, sortOrder: 110 },
  { id: 'redes-wifi', group: 'Tecnología y Redes', name: 'Redes Wi-Fi y cableado', visitFeeMin: 25000, visitFeeMax: 45000, active: true, sortOrder: 120 },
  { id: 'camaras-alarmas', group: 'Tecnología y Redes', name: 'Cámaras de seguridad y alarmas', visitFeeMin: 25000, visitFeeMax: 40000, active: true, sortOrder: 130 },
  { id: 'techumbres-impermeabilizacion', group: 'Construcción e Inspecciones Especializadas', name: 'Techumbres, canaletas e impermeabilización', visitFeeMin: 25000, visitFeeMax: 40000, active: true, sortOrder: 140 },
  { id: 'certificacion-electrica-te1', group: 'Construcción e Inspecciones Especializadas', name: 'Certificación eléctrica TE1 / SEC', visitFeeMin: 50000, visitFeeMax: 120000, active: true, sortOrder: 150 },
  { id: 'inspeccion-vivienda', group: 'Construcción e Inspecciones Especializadas', name: 'Inspección técnica de vivienda', visitFeeMin: 120000, visitFeeMax: 300000, active: true, sortOrder: 160 }
];

@Injectable({ providedIn: 'root' })
export class ServiceCatalogService {
  async getActiveCategories(): Promise<ServiceCatalogItem[]> {
    try {
      const result = await getDocs(
        collection(firestore, 'serviceCatalog')
      );

      if (!result.empty) {
        return result.docs
          .map(snapshot => snapshot.data() as ServiceCatalogItem)
          .filter(item => item.active)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }
    } catch (error) {
      console.warn('[ServiGo] No se pudo leer serviceCatalog; se usarán valores por defecto.', error);
    }

    return DEFAULT_SERVICE_CATALOG.map(item => ({ ...item }));
  }

  async getByName(name: string): Promise<ServiceCatalogItem | null> {
    const normalized =
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    const aliases: Record<string, string> = {
      'electricidad': 'electricidad basica',
      'gasfiteria': 'gasfiteria y fugas de agua',
      'carpinteria': 'carpinteria y reparaciones menores',
      'linea blanca': 'lavadoras, secadoras y refrigeradores'
    };

    const target =
      aliases[normalized]
      ?? normalized;

    const items =
      await this.getActiveCategories();

    return items.find(item =>
      item.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase() === target
    ) ?? null;
  }
}
