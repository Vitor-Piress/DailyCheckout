import {
  Baby,
  Eye,
  Scissors,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

const serviceIconEntries: Array<[string, LucideIcon]> = [
  ["barba", Scissors],
  ["cabelo e barba", Scissors],
  ["corte infantil", Baby],
  ["corte masculino", UserRound],
  ["maquina barba", Scissors],
  ["máquina barba", Scissors],
  ["sobrancelha navalhada", Eye],
];

const serviceIcons = new Map(serviceIconEntries);

export function getServiceIcon(serviceName: string): LucideIcon {
  return serviceIcons.get(serviceName.trim().toLocaleLowerCase("pt-BR")) ?? Sparkles;
}
