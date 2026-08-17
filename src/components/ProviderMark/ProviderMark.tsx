import { getProviderDomain } from "./providerRegistry";
import { SiteIcon } from "../SiteIcon/SiteIcon";

export interface ProviderMarkProps {
  model?: {
    providerId?: string;
    provider?: string;
    name?: string;
  };
  providerId?: string;
  provider?: string;
  modelName?: string;
  size?: number;
  className?: string;
}

export function ProviderMark({
  model,
  providerId: propProviderId,
  provider: propProvider,
  modelName: propModelName,
  size = 44,
  className,
}: ProviderMarkProps) {
  const pId = propProviderId || model?.providerId || "";
  const pName = propProvider || model?.provider || "";
  const mName = propModelName || model?.name || "";

  const domain = getProviderDomain(pId || pName);
  const fallbackText = (pName || mName || pId || "?").slice(0, 2).toUpperCase();

  return (
    <SiteIcon
      domain={domain ?? undefined}
      fallbackText={fallbackText}
      size={size}
      title={pName || pId || undefined}
      aria-label={pName || pId || undefined}
      className={className}
    />
  );
}

export { getProviderDomain, normalizeProviderId } from "./providerRegistry";
