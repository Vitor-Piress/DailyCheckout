import { Sparkles, type LucideIcon } from "lucide-react";
import beardTrimmingIcon from "../../assets/icons/beard-trimming--monoline(1).svg";
import childrensHaircutIcon from "../../assets/icons/childrens-haircut--monoline(1).svg";
import electricBeardTrimmerIcon from "../../assets/icons/electric-beard-trimmer--monoline.svg";
import eyebrowRazorIcon from "../../assets/icons/eyebrow-razor--monoline.svg";
import haircutAndBeardIcon from "../../assets/icons/haircut-and-beard--monoline(1).svg";
import mensHaircutIcon from "../../assets/icons/mens-haircut--monoline.svg";

export type ServiceIcon =
  | { kind: "asset"; source: string }
  | { kind: "lucide"; icon: LucideIcon };

const serviceIconEntries: Array<[string, ServiceIcon]> = [
  ["barba", { kind: "asset", source: beardTrimmingIcon }],
  ["cabelo e barba", { kind: "asset", source: haircutAndBeardIcon }],
  ["corte infantil", { kind: "asset", source: childrensHaircutIcon }],
  ["corte masculino", { kind: "asset", source: mensHaircutIcon }],
  ["maquina barba", { kind: "asset", source: electricBeardTrimmerIcon }],
  ["máquina barba", { kind: "asset", source: electricBeardTrimmerIcon }],
  ["sobrancelha navalhada", { kind: "asset", source: eyebrowRazorIcon }],
];

const serviceIcons = new Map(serviceIconEntries);

export function getServiceIcon(serviceName: string): ServiceIcon {
  return (
    serviceIcons.get(serviceName.trim().toLocaleLowerCase("pt-BR")) ?? {
      kind: "lucide",
      icon: Sparkles,
    }
  );
}
