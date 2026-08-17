import { useCallback, useState } from "react";
import type { ModelReactions, ReactionType } from "../../../types/reactions";
import { modelReactionsService } from "./reactionsService";

export function useModelReactions() {
  const [userReactionsMap, setUserReactionsMap] = useState<
    Record<string, ReactionType[]>
  >(() => modelReactionsService.getAllUserReactions());

  const getUserReactions = useCallback(
    (modelId: string): ReactionType[] => {
      return userReactionsMap[modelId] || [];
    },
    [userReactionsMap],
  );

  const getCounts = useCallback(
    (modelId: string): ModelReactions => {
      return modelReactionsService.getEffectiveCounts(
        modelId,
        userReactionsMap[modelId],
      );
    },
    [userReactionsMap],
  );

  const toggleReaction = useCallback((modelId: string, type: ReactionType) => {
    const { userReactions } = modelReactionsService.toggleUserReaction(
      modelId,
      type,
    );
    setUserReactionsMap((prev) => {
      if (userReactions.length === 0) {
        const next = { ...prev };
        delete next[modelId];
        return next;
      }
      return {
        ...prev,
        [modelId]: userReactions,
      };
    });
  }, []);

  return {
    userReactionsMap,
    getUserReactions,
    getCounts,
    toggleReaction,
  };
}
