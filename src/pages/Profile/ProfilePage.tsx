import { Button } from "../../components/Button/Button";
import { IconEdit, IconModels, IconSparkles } from "../../components/icons";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { profileService } from "../../services/profile";
import { useHub } from "../../state/HubContext";
import type { Model } from "../../types/models";
import styles from "./ProfilePage.module.css";

function getModelDisplay(id: string, availableModels: Model[]) {
  const found = availableModels.find((m) => m.id === id);
  if (found) {
    return { name: found.name, provider: found.provider };
  }
  const parts = id.split("/");
  return {
    name: parts.length > 1 ? parts.slice(1).join("/") : id,
    provider: parts.length > 1 ? parts[0] : undefined,
  };
}

export function ProfilePage() {
  const { userProfile, setSettingsOpen, models } = useHub();

  const handleEditClick = () => {
    setSettingsOpen(true);
  };

  const initials = profileService.getInitials(userProfile.displayName, userProfile.username);

  return (
    <div className={styles.page}>
      <PageHeader title="Профиль">
        <div />
      </PageHeader>

      {/* Main Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.heroRow}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {userProfile.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.displayName}
                  className={styles.avatarImg}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className={styles.names}>
              <h2 className={styles.displayName}>{userProfile.displayName}</h2>
              <span className={styles.username}>@{userProfile.username}</span>
            </div>
          </div>
          <Button variant="ghost" onClick={handleEditClick}>
            <IconEdit width={16} height={16} />
            <span>Редактировать профиль</span>
          </Button>
        </div>

        {userProfile.bio ? <p className={styles.bio}>{userProfile.bio}</p> : null}
      </div>

      {/* Used Models Section */}
      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>
          <IconModels width={18} height={18} />
          <span>Использую модели</span>
        </h3>
        {(!userProfile.models || userProfile.models.length === 0) ? (
          <p className={styles.emptyNote}>Модели не выбраны</p>
        ) : (
          <div className={styles.chipGrid}>
            {userProfile.models.map((id) => {
              const info = getModelDisplay(id, models);
              return (
                <div key={id} className={styles.modelChip}>
                  <span className={styles.modelName}>{info.name}</span>
                  {info.provider ? (
                    <span className={styles.modelProvider}>{info.provider}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interests / Work Tags Section */}
      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>
          <IconSparkles width={18} height={18} />
          <span>Занимаюсь</span>
        </h3>
        {(!userProfile.interests || userProfile.interests.length === 0) ? (
          <p className={styles.emptyNote}>Интересы не указаны</p>
        ) : (
          <div className={styles.chipGrid}>
            {userProfile.interests.map((tag) => (
              <div key={tag} className={styles.interestChip}>
                <span>{tag}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
