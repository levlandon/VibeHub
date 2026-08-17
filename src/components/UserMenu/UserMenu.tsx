import { useEffect, useRef } from "react";
import type { UserProfile } from "../../types/profile";
import { profileService } from "../../services/profile";
import { IconLogout, IconSettings, IconUser } from "../icons";
import styles from "./UserMenu.module.css";

interface UserMenuProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

export function UserMenu({
  profile,
  isOpen,
  onClose,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials = profileService.getInitials(profile.displayName, profile.username);

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      role="menu"
      aria-label="Меню пользователя"
    >
      <div className={styles.header}>
        <div className={styles.avatar}>
          {profile.avatarUrl || profile.avatar ? (
            <img
              src={profile.avatarUrl || profile.avatar}
              alt={profile.displayName}
              className={styles.avatarImg}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className={styles.userMeta}>
          <strong className={styles.displayName}>{profile.displayName}</strong>
          <span className={styles.username}>@{profile.username}</span>
        </div>
      </div>

      <button
        type="button"
        className={styles.item}
        role="menuitem"
        onClick={() => {
          onClose();
          onOpenProfile();
        }}
      >
        <IconUser width={18} height={18} />
        <span>Профиль</span>
      </button>

      <button
        type="button"
        className={styles.item}
        role="menuitem"
        onClick={() => {
          onClose();
          onOpenSettings();
        }}
      >
        <IconSettings width={18} height={18} />
        <span>Настройки</span>
      </button>

      <div className={styles.divider} />

      <button
        type="button"
        className={`${styles.item} ${styles.danger}`}
        role="menuitem"
        onClick={() => {
          onClose();
          if (onLogout) {
            onLogout();
          }
        }}
      >
        <IconLogout width={18} height={18} />
        <span>Выйти</span>
      </button>
    </div>
  );
}
