import { Scissors } from "lucide-react";
import type { ServiceType } from "../../api/types";
import { Badge } from "../../components/ui/Badge";

export function ServiceBadge({ service }: { service: ServiceType }) {
  return (
    <Badge>
      <Scissors size={20} />
      <span>{service.name}</span>
    </Badge>
  );
}
