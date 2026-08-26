import { useCallback, useEffect, useState } from "react";
import { authService } from "../services/auth";
import { collectionsRepository } from "../services/collections";
import type {
  Collection,
  CollectionItem,
  CreateCollectionInput,
  CreateCollectionItemInput,
  UpdateCollectionInput,
} from "../types/collections";

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await collectionsRepository.getCollections();
      setCollections(data);
    } catch (err) {
      console.error("[useCollections] Failed to load collections:", err);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCollections([]);
    setActiveCollectionId(null);

    collectionsRepository
      .getCollections()
      .then((data) => {
        if (!active) return;
        setCollections(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("[useCollections] Failed to load collections:", err);
        setCollections([]);
        setLoading(false);
      });

    const unsubscribe = authService.onAuthChange(() => {
      if (!active) return;
      setLoading(true);
      setCollections([]);
      setActiveCollectionId(null);

      collectionsRepository
        .getCollections()
        .then((data) => {
          if (!active) return;
          setCollections(data);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error("[useCollections] Failed to load collections on auth change:", err);
          setCollections([]);
          setLoading(false);
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const activeCollection = collections.find((c) => c.id === activeCollectionId) ?? null;

  const createCollection = useCallback(async (input: CreateCollectionInput) => {
    const created = await collectionsRepository.createCollection(input);
    setCollections((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateCollection = useCallback(
    async (id: string, input: UpdateCollectionInput) => {
      const updated = await collectionsRepository.updateCollection(id, input);
      setCollections((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [],
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      const success = await collectionsRepository.deleteCollection(id);
      if (success) {
        setCollections((prev) => prev.filter((c) => c.id !== id));
        if (activeCollectionId === id) {
          setActiveCollectionId(null);
        }
      }
      return success;
    },
    [activeCollectionId],
  );

  const addItem = useCallback(
    async (collectionId: string, item: CreateCollectionItemInput) => {
      const newItem = await collectionsRepository.addItem(collectionId, item);
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          const withoutDuplicate = col.items.filter((it) => it.id !== newItem.id && it.url !== newItem.url);
          return {
            ...col,
            updatedAt: new Date().toISOString(),
            items: [newItem, ...withoutDuplicate],
          };
        }),
      );
      return newItem;
    },
    [],
  );

  const updateItem = useCallback(
    async (
      collectionId: string,
      itemId: string,
      changes: Partial<CollectionItem>,
    ) => {
      const updatedItem = await collectionsRepository.updateItem(
        collectionId,
        itemId,
        changes,
      );
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          return {
            ...col,
            updatedAt: new Date().toISOString(),
            items: col.items.map((it) => (it.id === itemId ? updatedItem : it)),
          };
        }),
      );
      return updatedItem;
    },
    [],
  );

  const removeItem = useCallback(
    async (collectionId: string, itemId: string) => {
      const success = await collectionsRepository.removeItem(collectionId, itemId);
      if (success) {
        setCollections((prev) =>
          prev.map((col) => {
            if (col.id !== collectionId) return col;
            return {
              ...col,
              updatedAt: new Date().toISOString(),
              items: col.items.filter((it) => it.id !== itemId),
            };
          }),
        );
      }
      return success;
    },
    [],
  );

  const moveItem = useCallback(
    async (
      fromCollectionId: string,
      toCollectionId: string,
      itemId: string,
    ) => {
      const success = await collectionsRepository.moveItem(
        fromCollectionId,
        toCollectionId,
        itemId,
      );
      if (success) {
        await loadCollections();
      }
      return success;
    },
    [loadCollections],
  );

  return {
    collections,
    loading,
    activeCollectionId,
    activeCollection,
    setActiveCollectionId,
    createCollection,
    updateCollection,
    deleteCollection,
    addItem,
    updateItem,
    removeItem,
    moveItem,
    reload: loadCollections,
  };
}
