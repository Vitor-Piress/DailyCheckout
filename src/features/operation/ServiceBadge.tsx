import type { ServiceType } from "../../api/types";
import { Badge } from "../../components/ui/Badge";
import { getServiceIcon } from "./serviceIcons";

export function ServiceBadge({ service }: { service: ServiceType }) {
  const icon = getServiceIcon(service.name);
  const FallbackIcon = icon.kind === "lucide" ? icon.icon : null;

  return (
    <Badge>
      {icon.kind === "asset" ? (
        <img alt="" className="h-6 w-6" src={icon.source} />
      ) : (
        FallbackIcon && <FallbackIcon aria-hidden="true" size={24} strokeWidth={1.8} />
      )}
      <span>{service.name}</span>
    </Badge>
  );
}
