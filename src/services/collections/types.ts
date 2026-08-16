import type {
  Collection,
  CollectionItem,
  CreateCollectionInput,
  CreateCollectionItemInput,
  UpdateCollectionInput,
} from "../../types/collections";
import type { QuickAccessSite } from "../../types/hub";

export interface CollectionsRepository {
  getCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | null>;
  createCollection(input: CreateCollectionInput): Promise<Collection>;
  updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection>;
  deleteCollection(id: string): Promise<boolean>;
  addItem(collectionId: string, item: CreateCollectionItemInput): Promise<CollectionItem>;
  updateItem(
    collectionId: string,
    itemId: string,
    item: Partial<CollectionItem>,
  ): Promise<CollectionItem>;
  removeItem(collectionId: string, itemId: string): Promise<boolean>;
  moveItem(
    fromCollectionId: string,
    toCollectionId: string,
    itemId: string,
  ): Promise<boolean>;
}

export interface QuickAccessRepository {
  getSites(): Promise<QuickAccessSite[]>;
  addSite(site: Omit<QuickAccessSite, "id"> & { id?: string }): Promise<QuickAccessSite>;
  updateSite(id: string, site: Partial<QuickAccessSite>): Promise<QuickAccessSite>;
  removeSite(id: string): Promise<boolean>;
  reorderSites(sites: QuickAccessSite[]): Promise<QuickAccessSite[]>;
}
