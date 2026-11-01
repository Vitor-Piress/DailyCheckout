import type { UserReportSummary } from "../../api/types";
import { formatCurrency } from "../../lib/formatters";

function roleLabel(role: UserReportSummary["role"]): string {
  if (role === "admin") {
    return "Administrador";
  }
  if (role === "daily_operator") {
    return "Operador diário";
  }
  return "Não identificado";
}

export function UserReportGroups({
  users,
}: {
  users: UserReportSummary[];
}) {
  return (
    <section className="grid gap-3">
      <h2 className="m-0 text-base">Atendimentos por usuário</h2>
      {users.length === 0 ? (
        <p className="m-0 text-[#617067]">
          Nenhum atendimento encontrado para o período selecionado.
        </p>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {users.map((user) => (
            <article
              className="grid min-w-0 gap-3 rounded-xl border border-[#dce5dd] bg-white p-4"
              key={user.userId ?? "unknown-author"}
            >
              <div className="grid gap-1">
                <h3 className="m-0 text-base">{user.userName}</h3>
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#617067]">
                  {roleLabel(user.role)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f5f7f4] p-3">
                  <span className="block text-xs text-[#617067]">
                    Atendimentos
                  </span>
                  <strong className="text-lg text-[#2f6840]">
                    {user.serviceCount}
                  </strong>
                </div>
                <div className="min-w-0 rounded-lg bg-[#f5f7f4] p-3">
                  <span className="block text-xs text-[#617067]">
                    Receita bruta
                  </span>
                  <strong className="block min-w-0 break-words text-lg text-[#2f6840]">
                    {formatCurrency(user.grossRevenueCents)}
                  </strong>
                </div>
              </div>
              {user.services.length > 0 ? (
                <ul className="m-0 grid list-none gap-2 border-t border-[#e8eee9] pt-3">
                  {user.services.map((service) => (
                    <li
                      className="flex min-w-0 items-start justify-between gap-3"
                      key={service.serviceTypeId}
                    >
                      <span className="min-w-0">
                        <strong className="block break-words text-sm">
                          {service.serviceName}
                        </strong>
                        <small className="text-xs text-[#617067]">
                          {service.quantity}{" "}
                          {service.quantity === 1
                            ? "atendimento"
                            : "atendimentos"}
                        </small>
                      </span>
                      <b className="shrink-0 text-sm text-[#2f6840]">
                        {formatCurrency(service.totalCents)}
                      </b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 border-t border-[#e8eee9] pt-3 text-sm text-[#617067]">
                  Nenhum serviço registrado para este usuário.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
