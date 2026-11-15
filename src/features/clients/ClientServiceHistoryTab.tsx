import {
  CalendarClock,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Scissors,
  UserCheck,
} from "lucide-react";
import type {
  ClientServiceRecordItem,
  ClientServiceRecordsFilterType,
  ClientServiceRecordsSummary,
} from "../../api/types";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import {
  formatCurrency,
  formatDateTimeSaoPaulo,
  paymentMethodLabel,
} from "../../lib/formatters";

function getEmptyMessage(filterType: ClientServiceRecordsFilterType): string {
  if (filterType === "standalone") {
    return "Nenhum serviço avulso registrado para este cliente.";
  }
  if (filterType === "pack") {
    return "Nenhum corte de pacote registrado para este cliente.";
  }
  return "Nenhum atendimento registrado para este cliente ainda.";
}

export function ClientServiceHistoryTab({
  summary,
  filterType,
  onFilterTypeChange,
  includeCanceled,
  onToggleIncludeCanceled,
  items,
  total,
  loading,
  loadingMore,
  error,
  loadMoreError,
  onRetry,
  onLoadMore,
  onDismissError,
  onDismissLoadMoreError,
  cancelingRecordId,
  disabledActions,
  onCancelRecord,
}: {
  summary: ClientServiceRecordsSummary | null;
  filterType: ClientServiceRecordsFilterType;
  onFilterTypeChange: (nextType: ClientServiceRecordsFilterType) => void;
  includeCanceled: boolean;
  onToggleIncludeCanceled: (checked: boolean) => void;
  items: ClientServiceRecordItem[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
  onDismissError: () => void;
  onDismissLoadMoreError: () => void;
  cancelingRecordId: string | null;
  disabledActions: boolean;
  onCancelRecord: (item: ClientServiceRecordItem) => void;
}) {
  const filterChips: Array<{
    value: ClientServiceRecordsFilterType;
    label: string;
    count: number | null;
  }> = [
    {
      value: "all",
      label: "Todos",
      count: summary ? summary.totalServicesCount : null,
    },
    {
      value: "standalone",
      label: "Avulsos",
      count: summary ? summary.standaloneServicesCount : null,
    },
    {
      value: "pack",
      label: "Pacote",
      count: summary ? summary.packServicesCount : null,
    },
  ];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          aria-label="Filtrar atendimentos por tipo"
          className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5 whitespace-nowrap sm:w-auto"
          role="group"
        >
          {filterChips.map((chip) => {
            const active = filterType === chip.value;
            return (
              <button
                aria-pressed={active}
                className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap transition ${
                  active
                    ? "border-[#2f6840] bg-[#2f6840] text-white"
                    : "border-[#dce5dd] bg-[#f5f7f4] text-[#34443a] hover:border-[#4a7957] hover:bg-[#e8f2ea]"
                }`}
                key={chip.value}
                onClick={() => onFilterTypeChange(chip.value)}
                type="button"
              >
                <span>{chip.label}</span>
                {chip.count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white text-[#2f6840]"
                    }`}
                  >
                    {chip.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#617067] select-none">
          <input
            checked={includeCanceled}
            className="h-3.5 w-3.5 accent-[#2f6840]"
            onChange={(event) => onToggleIncludeCanceled(event.target.checked)}
            type="checkbox"
          />
          <span>Mostrar cancelados</span>
        </label>
      </div>

      {loading ? (
        <LoadingMessage>Carregando atendimentos do cliente...</LoadingMessage>
      ) : error ? (
        <div className="grid gap-2.5">
          <FeedbackMessage
            message={error}
            onClose={onDismissError}
            variant="error"
          />
          <Button
            className="flex items-center justify-center gap-1.5"
            onClick={onRetry}
            type="button"
            variant="secondary"
          >
            <RefreshCw size={15} />
            <span>Tentar novamente</span>
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-5 text-center">
          <p className="m-0 text-sm text-[#617067]">
            {getEmptyMessage(filterType)}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          <ul className="m-0 grid list-none gap-2 p-0">
            {items.map((item) => {
              const isCanceled = Boolean(item.canceledAt);
              const isCanceling = cancelingRecordId === item.id;
              const tipCents = item.tipCents ?? 0;
              const tipMethodSuffix =
                tipCents > 0 &&
                item.tipPaymentMethod &&
                (item.isPackCut ||
                  item.tipPaymentMethod !== item.paymentMethod)
                  ? ` (${paymentMethodLabel(item.tipPaymentMethod)})`
                  : "";

              return (
                <li
                  className={`grid gap-1.5 rounded-xl border p-3 transition ${
                    isCanceled
                      ? "border-[#e7b0a7] bg-[#fff8f7] opacity-80"
                      : "border-[#dce5dd] bg-[#f5f7f4]"
                  }`}
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <strong
                        className={`text-sm leading-snug text-[#17211b] ${
                          isCanceled ? "line-through" : ""
                        }`}
                      >
                        {item.serviceName}
                      </strong>

                      {isCanceled && (
                        <span className="rounded-md border border-[#e7b0a7] bg-[#fbeaea] px-2 py-0.5 text-[11px] font-bold text-[#a83e3e]">
                          Cancelado
                        </span>
                      )}
                    </div>

                    {!isCanceled && (
                      <button
                        aria-label={
                          item.isPackCut
                            ? `Estornar corte ${item.serviceName}`
                            : `Cancelar atendimento ${item.serviceName}`
                        }
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#e7b0a7] bg-white px-2.5 text-[11px] font-bold whitespace-nowrap text-[#a83e3e] transition hover:bg-[#fbeaea] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={
                          disabledActions || Boolean(cancelingRecordId)
                        }
                        onClick={() => onCancelRecord(item)}
                        title={
                          item.isPackCut
                            ? "Estornar corte ao pacote"
                            : "Cancelar atendimento"
                        }
                        type="button"
                      >
                        <RotateCcw className="shrink-0" size={12} />
                        <span>
                          {isCanceling
                            ? item.isPackCut
                              ? "Estornando..."
                              : "Cancelando..."
                            : item.isPackCut
                              ? "Estornar"
                              : "Cancelar"}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {item.isPackCut ? (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#9fc2a7] bg-[#e8f2ea] px-2 py-0.5 text-[11px] font-bold text-[#2f6840]">
                        <PackageCheck className="shrink-0" size={12} />
                        <span className="truncate">
                          {item.packPlanName
                            ? `Pacote · ${item.packPlanName}`
                            : "Pacote"}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#dce5dd] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#617067]">
                        <Scissors className="shrink-0" size={11} />
                        <span>Avulso</span>
                      </span>
                    )}

                    {!item.isPackCut && (
                      <span className="font-bold text-[#23372a]">
                        {formatCurrency(item.priceCents)}
                        {item.paymentMethod
                          ? ` · ${paymentMethodLabel(item.paymentMethod)}`
                          : ""}
                      </span>
                    )}

                    {tipCents > 0 && (
                      <span className="rounded-md border border-[#9fc2a7] bg-white px-2 py-0.5 text-[11px] font-bold text-[#2f6840]">
                        + {formatCurrency(tipCents)} gorjeta
                        {tipMethodSuffix}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#617067]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="text-[#4a7957]" size={13} />
                      <span>{formatDateTimeSaoPaulo(item.occurredAt)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="text-[#4a7957]" size={13} />
                      <span>
                        {item.createdBy?.name ?? "Barbeiro não identificado"}
                      </span>
                    </span>
                  </div>

                  {item.notes && (
                    <small className="text-xs text-[#617067]">
                      Obs.: {item.notes}
                    </small>
                  )}

                  {isCanceled && item.cancellationReason && (
                    <small className="text-xs text-[#a83e3e]">
                      Motivo do cancelamento: {item.cancellationReason}
                    </small>
                  )}
                </li>
              );
            })}
          </ul>

          {loadMoreError && (
            <FeedbackMessage
              message={loadMoreError}
              onClose={onDismissLoadMoreError}
              variant="error"
            />
          )}

          {items.length < total && (
            <Button
              className="w-full"
              disabled={loadingMore}
              onClick={onLoadMore}
              type="button"
              variant="secondary"
            >
              {loadingMore
                ? "Carregando mais atendimentos..."
                : `Carregar mais (${items.length} de ${total})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
