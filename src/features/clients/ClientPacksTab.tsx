import {
  Ban,
  CalendarClock,
  RefreshCw,
  RotateCcw,
  Scissors,
  UserCheck,
} from "lucide-react";
import type { ClientPackDetail } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import {
  formatCurrency,
  formatDateTimeSaoPaulo,
  paymentMethodLabel,
} from "../../lib/formatters";

function packStatusMeta(status: ClientPackDetail["status"]): {
  label: string;
  className: string;
} {
  if (status === "active") {
    return {
      label: "Ativo",
      className: "border-[#9fc2a7] bg-[#e8f2ea] text-[#2f6840]",
    };
  }
  if (status === "exhausted") {
    return {
      label: "Esgotado",
      className: "border-[#ead9a6] bg-[#fff4d6] text-[#805d12]",
    };
  }
  return {
    label: "Cancelado",
    className: "border-[#e7b0a7] bg-[#fbeaea] text-[#a83e3e]",
  };
}

export function ClientPacksTab({
  packs,
  selectedPackId,
  selectedPackDetail,
  loading,
  loadingDetail,
  error,
  detailError,
  cancelingCutId,
  cancelingPack,
  disabledActions,
  onRetry,
  onDismissError,
  onDismissDetailError,
  onSelectPack,
  onCancelConsumption,
  onCancelPack,
  onRequestNewPack,
}: {
  packs: ClientPackDetail[];
  selectedPackId: string;
  selectedPackDetail: ClientPackDetail | null;
  loading: boolean;
  loadingDetail: boolean;
  error: string | null;
  detailError: string | null;
  cancelingCutId: string | null;
  cancelingPack: boolean;
  disabledActions: boolean;
  onRetry: () => void;
  onDismissError: () => void;
  onDismissDetailError: () => void;
  onSelectPack: (packId: string) => void;
  onCancelConsumption: (consumptionId: string) => void;
  onCancelPack: (pack: ClientPackDetail) => void;
  onRequestNewPack?: () => void;
}) {
  if (loading) {
    return <LoadingMessage>Carregando histórico de pacotes...</LoadingMessage>;
  }

  if (error) {
    return (
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
    );
  }

  if (packs.length === 0) {
    return (
      <div className="grid gap-3 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-5 text-center">
        <p className="m-0 text-sm text-[#617067]">
          Este cliente ainda não possui nenhum pacote mensal registrado.
        </p>
        {onRequestNewPack && (
          <Button onClick={onRequestNewPack} type="button">
            Vender Primeiro Pacote
          </Button>
        )}
      </div>
    );
  }

  const activePack = selectedPackDetail;
  const consumptions = activePack?.consumptions ?? [];
  const progressPercent =
    activePack && activePack.totalCuts > 0
      ? Math.min(
          100,
          Math.round((activePack.usedCuts / activePack.totalCuts) * 100),
        )
      : 0;
  const hasAnyActivePack = packs.some((item) => item.status === "active");
  const isCanceledPack =
    activePack?.status === "cancelled" || activePack?.status === "canceled";

  return (
    <div className="grid gap-3.5">
      {packs.length > 1 && (
        <label className="grid gap-1 text-xs font-bold text-[#34443a]">
          Selecionar pacote contratado ({packs.length})
          <select
            className="min-h-11 w-full rounded-[0.6rem] border border-[#c8d6ca] bg-[#f5f7f4] px-3 py-2 text-sm font-bold text-[#23372a]"
            onChange={(event) => onSelectPack(event.target.value)}
            value={selectedPackId}
          >
            {packs.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.planName} ({packStatusMeta(pack.status).label}) —{" "}
                {formatDateTimeSaoPaulo(pack.purchasedAt)} ({pack.usedCuts}/
                {pack.totalCuts} usados)
              </option>
            ))}
          </select>
        </label>
      )}

      {detailError && (
        <FeedbackMessage
          message={detailError}
          onClose={onDismissDetailError}
          variant="error"
        />
      )}

      {loadingDetail && (
        <LoadingMessage>Atualizando cortes do pacote...</LoadingMessage>
      )}

      {!loadingDetail && activePack && (
        <>
          <div className="grid gap-3 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <strong className="text-base text-[#17211b]">
                  {activePack.planName}
                </strong>
                <p className="m-0 text-xs text-[#617067]">
                  Adquirido em{" "}
                  {formatDateTimeSaoPaulo(activePack.purchasedAt)}
                  {activePack.paymentMethod
                    ? ` · ${paymentMethodLabel(activePack.paymentMethod)}`
                    : ""}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  packStatusMeta(activePack.status).className
                }`}
              >
                {packStatusMeta(activePack.status).label}
              </span>
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#34443a]">
                  Utilizados: {activePack.usedCuts} de {activePack.totalCuts}{" "}
                  cortes
                </span>
                <span className="text-[#2f6840]">
                  Restam {activePack.remainingCuts}{" "}
                  {activePack.remainingCuts === 1 ? "corte" : "cortes"}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#dce5dd]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCanceledPack
                      ? "bg-[#a83e3e]"
                      : activePack.remainingCuts === 0
                        ? "bg-[#c18b20]"
                        : "bg-[#2f6840]"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dce5dd] pt-2.5 text-xs text-[#617067]">
              <span>
                Valor do pacote:{" "}
                <strong className="text-[#23372a]">
                  {formatCurrency(activePack.priceCents)}
                </strong>
              </span>
              <span>
                Valor por corte (divisão 50/50):{" "}
                <strong className="text-[#2f6840]">
                  {formatCurrency(activePack.unitCutPriceCents)}
                </strong>
              </span>
            </div>

            {activePack.notes && (
              <p className="m-0 border-t border-[#dce5dd] pt-2 text-xs text-[#617067]">
                Obs.: {activePack.notes}
              </p>
            )}
          </div>

          <div className="grid gap-2.5">
            <h3 className="m-0 text-sm font-bold text-[#34443a]">
              Carimbos / Cortes do pacote ({consumptions.length})
            </h3>

            {consumptions.length === 0 ? (
              <p className="m-0 rounded-xl border border-[#dce5dd] bg-white p-4 text-sm text-[#617067]">
                Nenhum corte foi descontado deste pacote até o momento.
              </p>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {consumptions.map((cut, index) => {
                  const isCanceling = cancelingCutId === cut.id;
                  return (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3"
                      key={cut.id}
                    >
                      <div className="grid min-w-0 gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#2f6840] px-2 py-0.5 text-xs font-bold text-white">
                            <Scissors size={12} />
                            Corte #{index + 1}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#23372a]">
                            <CalendarClock
                              className="text-[#4a7957]"
                              size={14}
                            />
                            {formatDateTimeSaoPaulo(cut.occurredAt)}
                          </span>
                          {cut.tipCents > 0 && (
                            <span className="rounded-md border border-[#9fc2a7] bg-[#e8f2ea] px-2 py-0.5 text-xs font-bold text-[#2f6840]">
                              + {formatCurrency(cut.tipCents)} gorjeta
                            </span>
                          )}
                        </div>

                        <span className="flex items-center gap-1.5 text-xs text-[#34443a]">
                          <UserCheck className="text-[#4a7957]" size={14} />
                          Barbeiro:{" "}
                          <strong>
                            {cut.createdBy?.name ?? "Não identificado"}
                          </strong>{" "}
                          · Ref.: {formatCurrency(cut.priceCents)}
                        </span>

                        {cut.notes && (
                          <small className="text-xs text-[#617067]">
                            Obs.: {cut.notes}
                          </small>
                        )}
                      </div>

                      {!isCanceledPack && (
                        <Button
                          className="!min-h-9 flex items-center gap-1.5 px-3 py-1.5 text-xs"
                          disabled={
                            disabledActions ||
                            Boolean(cancelingCutId) ||
                            cancelingPack
                          }
                          onClick={() => onCancelConsumption(cut.id)}
                          title="Cancelar corte e estornar 1 crédito ao pacote"
                          type="button"
                          variant="danger"
                        >
                          <RotateCcw size={14} />
                          <span>
                            {isCanceling ? "Estornando..." : "Estornar corte"}
                          </span>
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {(activePack.status === "active" ||
            (!hasAnyActivePack && onRequestNewPack)) && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8eee9] pt-2">
              {activePack.status === "active" ? (
                <button
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#e7b0a7] bg-[#fbeaea] px-3 py-1.5 text-xs font-bold text-[#a83e3e] transition hover:bg-[#f5d5d5] disabled:opacity-50"
                  disabled={
                    disabledActions ||
                    cancelingPack ||
                    Boolean(cancelingCutId)
                  }
                  onClick={() => onCancelPack(activePack)}
                  type="button"
                >
                  <Ban size={14} />
                  <span>
                    {cancelingPack
                      ? "Cancelando pacote..."
                      : "Cancelar pacote ativo"}
                  </span>
                </button>
              ) : (
                onRequestNewPack && (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={onRequestNewPack}
                    type="button"
                  >
                    {activePack.status === "exhausted"
                      ? "Renovar Pacote Agora"
                      : "Vender Novo Pacote"}
                  </Button>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
