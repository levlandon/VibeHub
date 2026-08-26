import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { FeedSkeletonList, PostCardSkeleton } from "./FeedSkeleton";
import { CollectionCardSkeleton, CollectionsGridSkeleton, CollectionDetailSkeleton } from "./CollectionSkeleton";

describe("Skeleton Components", () => {
  describe("Skeleton base component", () => {
    it("renders single element with default text variant and shimmer animation", () => {
      const element = Skeleton({});
      expect(element).toBeDefined();
      expect(element.props["aria-hidden"]).toBe("true");
    });

    it("renders circular variant with custom dimensions", () => {
      const element = Skeleton({
        variant: "circular",
        width: 48,
        height: 48,
      });
      expect(element.props.style?.width).toBe("48px");
      expect(element.props.style?.height).toBe("48px");
    });

    it("renders multiple elements when count > 1", () => {
      const fragment = Skeleton({ count: 4, width: "100%", height: 20 });
      expect(fragment).toBeDefined();
      expect(fragment.props.children).toHaveLength(4);
    });

    it("supports animation='none'", () => {
      const element = Skeleton({ animation: "none" });
      expect(element.props.className).not.toContain("shimmer");
    });
  });

  describe("Preset Skeletons", () => {
    it("renders ProfileSkeleton without errors", () => {
      const tree = ProfileSkeleton();
      expect(tree).toBeDefined();
      expect(tree.props["aria-busy"]).toBe("true");
      expect(tree.props["aria-label"]).toBe("Загрузка профиля");
    });

    it("renders PostCardSkeleton and FeedSkeletonList without errors", () => {
      const single = PostCardSkeleton();
      expect(single).toBeDefined();
      expect(single.props["aria-hidden"]).toBe("true");

      const list = FeedSkeletonList({ count: 3 });
      expect(list).toBeDefined();
      expect(list.props["aria-busy"]).toBe("true");
      expect(list.props.children).toHaveLength(3);
    });

    it("renders CollectionCardSkeleton, CollectionsGridSkeleton, and CollectionDetailSkeleton", () => {
      const card = CollectionCardSkeleton();
      expect(card).toBeDefined();

      const grid = CollectionsGridSkeleton({ count: 3 });
      expect(grid).toBeDefined();
      expect(grid.props["aria-busy"]).toBe("true");
      expect(grid.props.children).toHaveLength(3);

      const detail = CollectionDetailSkeleton({ count: 2 });
      expect(detail).toBeDefined();
      expect(detail.props["aria-busy"]).toBe("true");
    });
  });
});
