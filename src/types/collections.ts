export interface CollectionItem {
  id: string;
  url: string;
  title: string;
  domain: string;
  description?: string;
  favicon?: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  items: CollectionItem[];
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
}

export interface CreateCollectionItemInput {
  url: string;
  title?: string;
  domain?: string;
  description?: string;
  favicon?: string;
}
