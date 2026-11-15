import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  PackagePlus,
  Scissors,
  Search,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listClients } from "../../api/dailyCheckoutApi";
import type { Client, PaymentMethod } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { Panel } from "../../components/ui/Panel";
import { InlineMutationProgress } from "../../components/ui/ProgressBar";
import { formatCurrency, formatPhone } from "../../lib/formatters";
import { LoyaltyRedeemFields } from "../clients/LoyaltyRedeemFields";
import { LoyaltyStampGrid } from "../clients/LoyaltyStampGrid";
import {
  getClientLoyalty,
  getOptionalTipError,
} from "../clients/loyaltyUtils";
import { PaymentMethodSelector } from "./PaymentMethodSelector";

const MIN_TIP_CENTS = 1;
const MAX_TIP_CENTS = 50_000;

export function ClientQuickPicker({
  selectedClient,
  onSelectClient,
  onOpenNewClient,
  onOpenPurchasePack,
  onOpenHistory,
  onRedeemPackCut,
  submittingPackCut,
  onRedeemLoyaltyCut,
  submittingLoyaltyCut,
  hasSelectedStandaloneService,
}: {
  selectedClient: Client | null;
  onSelectClient: (client: Client | null) => void;
  onOpenNewClient: (initialName?: string) => void;
  onOpenPurchasePack: (client: Client) => void;
  onOpenHistory: (client: Client) => void;
  onRedeemPackCut: (options: {
    tipCents?: number;
    tipPaymentMethod?: PaymentMethod;
    notes?: string;
  }) => Promise<void>;
  submittingPackCut: boolean;
  onRedeemLoyaltyCut: (options: {
    tipCents?: number;
    tipPaymentMethod?: PaymentMethod;
    notes?: string;
  }) => Promise<void>;
  submittingLoyaltyCut: boolean;
  hasSelectedStandaloneService: boolean;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [includeTip, setIncludeTip] = useState(false);
  const [tipCents, setTipCents] = useState(0);
  const [tipTouched, setTipTouched] = useState(false);
  const [tipPaymentMethod, setTipPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState("");
  const tipInputRef = useRef<HTMLInputElement | null>(null);

  const [loyaltyIncludeTip, setLoyaltyIncludeTip] = useState(false);
  const [loyaltyTipCents, setLoyaltyTipCents] = useState(0);
  const [loyaltyTipTouched, setLoyaltyTipTouched] = useState(false);
  const [loyaltyTipPaymentMethod, setLoyaltyTipPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [loyaltyNotes, setLoyaltyNotes] = useState("");
  const loyaltyTipInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim();
      setSearching(true);
      setDebouncedQuery(nextQuery);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isDropdownOpen && !debouncedQuery) {
      return;
    }
    let active = true;
    void listClients({
      q: debouncedQuery || undefined,
      limit: debouncedQuery ? 8 : 5,
      offset: 0,
    })
      .then((res) => {
        if (active) {
          setResults(res.items);
        }
      })
      .catch(() => {
        if (active) {
          setResults([]);
        }
      })
      .finally(() => {
        if (active) {
          setSearching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, isDropdownOpen]);

  function resetPackCutInputs() {
    setIncludeTip(false);
    setTipCents(0);
    setTipTouched(false);
    setTipPaymentMethod("pix");
    setNotes("");
    setLoyaltyIncludeTip(false);
    setLoyaltyTipCents(0);
    setLoyaltyTipTouched(false);
    setLoyaltyTipPaymentMethod("pix");
    setLoyaltyNotes("");
  }

  function handleChooseClient(client: Client) {
    onSelectClient(client);
    setQuery("");
    setIsDropdownOpen(false);
    resetPackCutInputs();
  }

  function handleClearClient() {
    onSelectClient(null);
    resetPackCutInputs();
  }

  function handleTogglePackTip(checked: boolean) {
    setIncludeTip(checked);
    if (!checked) {
      setTipCents(0);
      setTipTouched(false);
      return;
    }
    window.requestAnimationFrame(() => {
      tipInputRef.current?.focus();
    });
  }

  function handleToggleLoyaltyTip(checked: boolean) {
    setLoyaltyIncludeTip(checked);
    setLoyaltyTipTouched(false);
    if (!checked) {
      setLoyaltyTipCents(0);
      return;
    }
    window.requestAnimationFrame(() => {
      loyaltyTipInputRef.current?.focus();
    });
  }

  const tipExceedsMax = includeTip && tipCents > MAX_TIP_CENTS;
  const tipBelowMin = includeTip && tipCents < MIN_TIP_CENTS;
  const isPackTipValid =
    !includeTip || (tipCents >= MIN_TIP_CENTS && tipCents <= MAX_TIP_CENTS);
  const isLoyaltyTipValid =
    getOptionalTipError(loyaltyIncludeTip, loyaltyTipCents) === null;

  async function handleConfirmPackCut() {
    if (!selectedClient || submittingPackCut || submittingLoyaltyCut) return;
    if (includeTip) {
      setTipTouched(true);
      if (!isPackTipValid) return;
    }
    await onRedeemPackCut({
      ...(includeTip && tipCents > 0
        ? { tipCents: Math.trunc(tipCents), tipPaymentMethod }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    resetPackCutInputs();
  }

  async function handleConfirmLoyaltyCut() {
    if (!selectedClient || submittingLoyaltyCut || submittingPackCut) return;
    if (loyaltyIncludeTip) {
      setLoyaltyTipTouched(true);
      if (!isLoyaltyTipValid) return;
    }
    await onRedeemLoyaltyCut({
      ...(loyaltyIncludeTip && loyaltyTipCents > 0
        ? {
            tipCents: Math.trunc(loyaltyTipCents),
            tipPaymentMethod: loyaltyTipPaymentMethod,
          }
        : {}),
      ...(loyaltyNotes.trim() ? { notes: loyaltyNotes.trim() } : {}),
    });
    resetPackCutInputs();
  }

  if (!selectedClient) {
    return (
      <Panel className="grid min-w-0 gap-3 !p-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
              Pacote Mensal ou Cliente
            </p>
            <h2 className="m-0 text-base leading-snug font-bold text-[#17211b]">
              Usar Pacote Mensal / Vincular Cliente
            </h2>
          </div>
          <Button
            aria-label="Novo Cliente"
            className="flex !min-h-9 h-9 w-9 shrink-0 items-center justify-center gap-1.5 !p-0 text-xs sm:w-auto sm:!px-3"
            onClick={() =>
              onOpenNewClient(
                query.trim() && !/\d/.test(query.trim()) ? query.trim() : "",
              )
            }
            title="Novo Cliente"
            type="button"
            variant="secondary"
          >
            <UserPlus className="shrink-0" size={17} />
            <span className="hidden sm:inline">Novo Cliente</span>
          </Button>
        </div>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#4a7957]"
            size={19}
          />
          <input
            aria-label="Buscar cliente para usar pacote ou vincular atendimento"
            className="min-h-12 w-full rounded-xl border border-[#c8d6ca] bg-[#f5f7f4] pr-10 pl-10 text-base text-[#17211b] placeholder:text-[#617067] focus:bg-white focus-visible:outline-2 focus-visible:outline-[#2f6840]"
            onChange={(event) => {
              setQuery(event.target.value);
              setSearching(true);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (!isDropdownOpen) {
                setSearching(true);
                setIsDropdownOpen(true);
              }
            }}
            placeholder="Nome, telefone ou CPF do cliente..."
            type="search"
            value={query}
          />
          {(query || isDropdownOpen) && (
            <button
              aria-label="Fechar busca de cliente"
              className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#617067] hover:bg-[#dce5dd]"
              onClick={() => {
                setQuery("");
                setIsDropdownOpen(false);
              }}
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {isDropdownOpen && (
          <div className="motion-content grid min-w-0 gap-2 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-2.5">
            {searching ? (
              <LoadingMessage variant="compact">
                Buscando clientes...
              </LoadingMessage>
            ) : results.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5">
                <span className="text-xs text-[#617067]">
                  Nenhum cliente encontrado.
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded-lg bg-[#2f6840] px-3 py-1.5 text-xs font-bold text-white"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenNewClient(
                      query.trim() && !/\d/.test(query.trim())
                        ? query.trim()
                        : "",
                    );
                  }}
                  type="button"
                >
                  <UserPlus size={14} />
                  <span>Cadastrar agora</span>
                </button>
              </div>
            ) : (
              <ul className="m-0 grid max-h-[21.5rem] list-none gap-2 overflow-y-auto overscroll-contain p-0 pr-0.5">
                {results.map((client) => {
                  const pack = client.activePack;
                  const loyalty = getClientLoyalty(client);
                  const isActive =
                    pack?.status === "active" && pack.remainingCuts > 0;
                  const isExhausted =
                    pack?.status === "exhausted" ||
                    pack?.needsRenewal === true ||
                    (pack !== null && pack.remainingCuts <= 0);

                  return (
                    <li className="min-w-0" key={client.id}>
                      <button
                        className="grid w-full min-w-0 gap-1.5 rounded-xl border border-[#dce5dd] bg-white px-2.5 py-2 text-left transition hover:border-[#2f6840] hover:bg-[#e8f2ea] active:scale-[0.99]"
                        onClick={() => handleChooseClient(client)}
                        type="button"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-sm leading-tight text-[#17211b]">
                              {client.name}
                            </strong>
                            <small className="block text-xs text-[#617067]">
                              {formatPhone(client.phone)}
                            </small>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                            {isActive && pack ? (
                              <span className="rounded-full border border-[#9fc2a7] bg-[#e8f2ea] px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-[#245c35]">
                                Pacote • {pack.remainingCuts}/{pack.totalCuts}
                              </span>
                            ) : isExhausted ? (
                              <span className="rounded-full border border-[#ead9a6] bg-[#fff4d6] px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-[#805d12]">
                                Renovar
                              </span>
                            ) : !loyalty.freeCutAvailable ? (
                              <span className="rounded-full border border-[#e2ebe3] bg-[#f5f7f4] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-[#617067]">
                                Avulso
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <LoyaltyStampGrid loyalty={loyalty} variant="micro" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Panel>
    );
  }

  const activePack = selectedClient.activePack;
  const loyalty = getClientLoyalty(selectedClient);
  const hasActivePack =
    activePack?.status === "active" && activePack.remainingCuts > 0;
  const isExhausted =
    activePack?.status === "exhausted" ||
    activePack?.needsRenewal === true ||
    (activePack !== null && activePack.remainingCuts <= 0);

  return (
    <Panel
      className={`motion-content grid min-w-0 gap-3.5 !p-4 ${
        hasActivePack
          ? "border-2 border-[#2f6840]"
          : isExhausted || loyalty.freeCutAvailable
            ? "border-2 border-[#c18b20]"
            : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
            <UserCheck size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold tracking-[0.06em] text-[#4a7957] uppercase">
              Cliente selecionado
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <strong className="truncate text-lg leading-tight text-[#17211b]">
                {selectedClient.name}
              </strong>
              <span className="text-xs font-medium text-[#617067]">
                {formatPhone(selectedClient.phone)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#dce5dd] bg-[#f5f7f4] px-2.5 py-1.5 text-xs font-bold text-[#2f6840] hover:bg-[#e8f2ea]"
            onClick={() => onOpenHistory(selectedClient)}
            type="button"
          >
            <ClipboardCheck size={14} />
            <span>Histórico</span>
          </button>
          <button
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#dce5dd] bg-white px-2.5 py-1.5 text-xs font-bold text-[#617067] hover:bg-[#f5f7f4]"
            onClick={handleClearClient}
            type="button"
          >
            <X size={15} />
            <span>Trocar</span>
          </button>
        </div>
      </div>

      <LoyaltyStampGrid loyalty={loyalty} variant="compact" />

      {loyalty.freeCutAvailable && !hasSelectedStandaloneService && (
        <div className="grid gap-3 rounded-xl border border-[#ead9a6] bg-[#fff9e8] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#805d12]">
              <Gift className="shrink-0" size={17} />
              <span>Corte Masculino Grátis (Fidelidade)</span>
            </span>
            <span className="rounded-full bg-[#805d12] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white">
              R$ 0,00 · {loyalty.currentCuts}/{loyalty.targetCuts}
            </span>
          </div>

          <p className="m-0 text-xs text-[#6e4f0e]">
            Cliente já atingiu {loyalty.targetCuts}/{loyalty.targetCuts} — cortes
            avulsos pagos não acumulam para o próximo prêmio até este resgate.
          </p>

          <LoyaltyRedeemFields
            compact
            disabled={submittingLoyaltyCut || submittingPackCut}
            includeTip={loyaltyIncludeTip}
            notes={loyaltyNotes}
            onChangeNotes={setLoyaltyNotes}
            onChangeTipCents={(cents) => {
              setLoyaltyTipCents(cents);
              setLoyaltyTipTouched(true);
            }}
            onChangeTipPaymentMethod={setLoyaltyTipPaymentMethod}
            onToggleIncludeTip={handleToggleLoyaltyTip}
            radioGroupName="quick-loyalty-tip-method"
            tipCents={loyaltyTipCents}
            tipInputRef={loyaltyTipInputRef}
            tipPaymentMethod={loyaltyTipPaymentMethod}
            tipTouched={loyaltyTipTouched}
          />

          <InlineMutationProgress
            active={submittingLoyaltyCut}
            label="Resgatando corte gratuito..."
          />

          <Button
            className="!min-h-12 flex w-full items-center justify-center gap-2 text-sm shadow-sm sm:text-base"
            disabled={
              submittingLoyaltyCut || submittingPackCut || !isLoyaltyTipValid
            }
            onClick={() => void handleConfirmLoyaltyCut()}
            type="button"
          >
            <Gift className="shrink-0" size={18} />
            <span>
              {submittingLoyaltyCut
                ? "Resgatando corte gratuito..."
                : "Resgatar Corte Grátis (Fidelidade)"}
            </span>
          </Button>
        </div>
      )}

      {hasActivePack && activePack && (
        <div className="grid gap-3 rounded-xl border border-[#9fc2a7] bg-[#e8f2ea] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#245c35]">
              <CheckCircle2 size={18} />
              <span>
                {activePack.planName} • Restam {activePack.remainingCuts} de{" "}
                {activePack.totalCuts} cortes
              </span>
            </span>
            <span className="rounded-full bg-[#2f6840] px-2.5 py-0.5 text-xs font-bold text-white">
              {activePack.usedCuts}/{activePack.totalCuts} utilizados
            </span>
          </div>

          {!hasSelectedStandaloneService && (
            <div className="grid gap-3 border-t border-[#bfe0c6] pt-3">
              <label
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[0.65rem] border p-2.5 text-sm font-bold text-[#34443a] transition ${
                  includeTip
                    ? "border-[#2f6840] bg-white"
                    : "border-[#9fc2a7] bg-white/80"
                }`}
              >
                <input
                  checked={includeTip}
                  className="h-4 w-4 accent-[#2f6840]"
                  onChange={(event) => handleTogglePackTip(event.target.checked)}
                  type="checkbox"
                />
                <span>Incluir gorjeta neste corte do pacote</span>
              </label>

              {includeTip && (
                <div className="motion-content grid gap-3 rounded-xl border border-[#c8d6ca] bg-white p-3">
                  <label className="grid gap-1 text-sm font-bold text-[#34443a]">
                    Valor da gorjeta
                    <CurrencyInput
                      aria-invalid={
                        tipExceedsMax || (tipTouched && tipBelowMin)
                      }
                      className="min-h-12 w-full rounded-[0.6rem] border border-[#c8d6ca] bg-white px-3.5 py-2 text-lg font-bold tracking-tight text-[#23372a]"
                      maxDigits={7}
                      onChangeCents={(nextCents) => {
                        setTipCents(nextCents);
                        setTipTouched(true);
                      }}
                      ref={tipInputRef}
                      valueCents={tipCents}
                    />
                    {tipExceedsMax ? (
                      <span className="text-xs font-medium text-[#a83e3e]">
                        O valor máximo permitido para gorjeta é R$ 500,00.
                      </span>
                    ) : tipTouched && tipBelowMin ? (
                      <span className="text-xs font-medium text-[#a83e3e]">
                        Informe pelo menos R$ 0,01 de gorjeta.
                      </span>
                    ) : (
                      <span className="text-xs font-normal text-[#617067]">
                        Gorjeta de {formatCurrency(tipCents)} (100% operador).
                      </span>
                    )}
                  </label>

                  <PaymentMethodSelector
                    legend="Forma de pagamento da gorjeta"
                    name="quick-pack-tip-method"
                    onChange={setTipPaymentMethod}
                    value={tipPaymentMethod}
                  />
                </div>
              )}

              <input
                className="min-h-11 w-full rounded-[0.6rem] border border-[#9fc2a7] bg-white px-3 py-2 text-sm text-[#23372a] placeholder:text-[#617067] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
                maxLength={250}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Observações do corte (opcional)..."
                type="text"
                value={notes}
              />

              <InlineMutationProgress
                active={submittingPackCut}
                label="Registrando corte do pacote..."
              />

              <Button
                className="flex min-h-13 w-full items-center justify-center gap-2 text-base shadow-md"
                disabled={submittingPackCut || !isPackTipValid}
                onClick={() => void handleConfirmPackCut()}
                type="button"
              >
                <Scissors size={20} />
                <span>
                  {submittingPackCut
                    ? "Registrando corte do pacote..."
                    : "Registrar Corte do Pacote"}
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {isExhausted && activePack && (
        <div className="grid gap-3 rounded-xl border border-[#ead9a6] bg-[#fff4d6] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#805d12]">
              <AlertTriangle size={18} />
              <span>Pacote esgotado (0 cortes restantes)</span>
            </span>
            <span className="rounded-full bg-[#805d12] px-2.5 py-0.5 text-xs font-bold text-white">
              {activePack.planName}
            </span>
          </div>
          <p className="m-0 text-xs text-[#6e4f0e]">
            Todos os {activePack.totalCuts} cortes do pacote anterior já foram
            utilizados. Renove em 1 passo ou lance um serviço avulso abaixo.
          </p>
          <Button
            className="flex w-full items-center justify-center gap-2"
            onClick={() => onOpenPurchasePack(selectedClient)}
            type="button"
          >
            <PackagePlus size={18} />
            <span>Renovar Pacote</span>
          </Button>
        </div>
      )}

      {!activePack && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3.5 py-2.5">
          <span className="text-xs text-[#617067]">
            Cliente sem pacote mensal ativo. Selecione um serviço abaixo ou
            venda um pacote.
          </span>
          <Button
            className="!min-h-9 flex items-center gap-1.5 px-3 py-1.5 text-xs"
            onClick={() => onOpenPurchasePack(selectedClient)}
            type="button"
            variant="secondary"
          >
            <PackagePlus size={15} />
            <span>Vender Pacote</span>
          </Button>
        </div>
      )}
    </Panel>
  );
}
