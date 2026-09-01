import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ProfileInterestChip, ProfileModelChip } from "../ProfileChips";
import { cleanModelName } from "../../services/entities";
import { profileService } from "../../services/profile";
import { useI18n } from "../../i18n";
import { useHub } from "../../state/HubContext";
import type { ChatAuthor } from "../../types/hub";
import type { UserProfile } from "../../types/profile";
import styles from "./ProfileHoverCard.module.css";

export interface ProfileHoverCardProps {
  identifier?: string;
  initialAuthor?: ChatAuthor;
  children: ReactNode;
  onOpenProfile?: () => void;
}

interface PositionCoords {
  top: number;
  left: number;
}

export function ProfileHoverCard({
  identifier,
  initialAuthor,
  children,
  onOpenProfile,
}: ProfileHoverCardProps) {
  const effectiveIdentifier = identifier || initialAuthor?.handle || initialAuthor?.id || "";
  const { t } = useI18n();
  const { models } = useHub();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PositionCoords | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (isOpen) return;

    openTimerRef.current = window.setTimeout(async () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const cardWidth = 290;
        const estimatedHeight = 220;

        // Vertical collision detection
        let top: number;
        if (rect.top < estimatedHeight + 20) {
          // Open below
          top = rect.bottom + 8;
        } else {
          // Open above
          top = Math.max(16, rect.top - estimatedHeight - 8);
        }

        // Horizontal collision detection
        let left = rect.left;
        if (left + cardWidth > window.innerWidth - 16) {
          left = Math.max(16, window.innerWidth - cardWidth - 16);
        }
        if (left < 16) {
          left = 16;
        }

        setPosition({ top, left });
      }

      setIsOpen(true);
      setLoading(true);
      try {
        const res = await profileService.getProfile(effectiveIdentifier);
        setProfile(res);
      } catch (err) {
        console.warn("Failed to load profile preview:", err);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (!isOpen) return;

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Close on Escape or outside scroll / resize
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        clearTimers();
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
      clearTimers();
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const displayName =
    profile?.displayName ||
    initialAuthor?.name ||
    effectiveIdentifier;

  const username =
    profile?.username ||
    initialAuthor?.handle ||
    effectiveIdentifier;

  const avatarUrl =
    profile?.avatarUrl ||
    profile?.avatar ||
    initialAuthor?.avatarUrl;

  const initials =
    initialAuthor?.initials ||
    profileService.getInitials(displayName, username);

  // Favorite model chips (max 3 displayed + counter)
  const allModelIds = profile?.modelIds || profile?.models || [];
  const favoriteModelIds = allModelIds.slice(0, 3);
  const extraModelsCount = allModelIds.length - favoriteModelIds.length;

  const favoriteModels = favoriteModelIds.map((id) => {
    const found = models.find((m) => m.id === id);
    if (found) {
      return {
        id,
        name: cleanModelName(found.name, found.provider),
        provider: found.provider,
        providerId: found.providerId,
        model: found,
      };
    }
    const parts = id.split("/");
    const provider = parts.length > 1 ? parts[0] : undefined;
    const raw = parts.length > 1 ? parts.slice(1).join("/") : id;
    return {
      id,
      name: cleanModelName(raw, provider),
      provider,
      providerId: provider,
      model: { providerId: provider, provider, name: cleanModelName(raw, provider) },
    };
  });

  // Interests (max 3 displayed + counter)
  const allInterests = profile?.interests || [];
  const previewInterests = allInterests.slice(0, 3);
  const extraInterestsCount = allInterests.length - previewInterests.length;

  const cardContent = isOpen && position ? (
    <div
      ref={cardRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className={styles.card}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="tooltip"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Head */}
      <div className={styles.head}>
        <div className={styles.avatar}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className={styles.avatarImg}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className={styles.nameMeta}>
          <span className={styles.displayName}>{displayName}</span>
          <span className={styles.handle}>@{username}</span>
        </div>
      </div>

      {/* Bio */}
      {loading && !profile?.bio ? (
        <div className={`${styles.skeletonLine} ${styles.skeletonLineFull}`} />
      ) : profile?.bio ? (
        <p className={styles.bio}>{profile.bio}</p>
      ) : null}

      {/* Interests Section */}
      {previewInterests.length > 0 ? (
        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>{t("profile.hoverInterests")}</span>
          <div className={styles.chipsRow}>
            {previewInterests.map((tag) => (
              <ProfileInterestChip
                key={tag}
                tag={tag}
                size="compact"
              />
            ))}
            {extraInterestsCount > 0 ? (
              <span className={styles.moreCount}>+{extraInterestsCount}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Models Section */}
      {favoriteModels.length > 0 ? (
        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>{t("profile.hoverModels")}</span>
          <div className={styles.chipsRow}>
            {favoriteModels.map((m) => (
              <ProfileModelChip
                key={m.id}
                name={m.name}
                provider={m.provider}
                model={m.model}
                size="compact"
              />
            ))}
            {extraModelsCount > 0 ? (
              <span className={styles.moreCount}>+{extraModelsCount}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div
      ref={triggerRef}
      className={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <div className={styles.trigger} onClick={onOpenProfile}>
        {children}
      </div>

      {typeof document !== "undefined" && cardContent
        ? createPortal(cardContent, document.body)
        : null}
    </div>
  );
}
