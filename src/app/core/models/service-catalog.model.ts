export interface ServiceCatalogItem {
  id: string;
  group: string;
  name: string;
  visitFeeMin: number;
  visitFeeMax: number;
  active: boolean;
  sortOrder: number;
}
