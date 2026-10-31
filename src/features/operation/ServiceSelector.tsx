import type { ServiceType } from "../../api/types";
import { getServiceIcon } from "./serviceIcons";

export function ServiceSelector({
  services,
  onSelect,
}: {
  services: ServiceType[];
  onSelect: (service: ServiceType) => void;
}) {
  return (
    <div aria-label="Serviços disponíveis" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {services.map((service) => {
        const Icon = getServiceIcon(service.name);

        return (
          <button
            className="grid min-h-28 content-center justify-items-center gap-2 rounded-[0.9rem] border-2 border-[#dce5dd] bg-white px-3 py-4 text-center text-base font-bold text-[#23372a] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] focus-visible:outline-2 focus-visible:outline-[#2f6840] focus-visible:outline-offset-2 active:scale-[0.98]"
            key={service.id}
            onClick={() => onSelect(service)}
            type="button"
          >
            <Icon
              aria-hidden="true"
              className="text-[#4a7957]"
              size={30}
              strokeWidth={1.8}
            />
            <span>{service.name}</span>
            {service.description && (
              <small className="text-xs font-medium text-[#617067]">
                {service.description}
              </small>
            )}
          </button>
        );
      })}
    </div>
  );
}
