import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Gift,
  IdCard,
  Mail,
  PackagePlus,
  Phone,
  RefreshCw,
  Scissors,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { subscribeClientInvalidation } from "../../api/clientInvalidation";
import { getClient, listClients } from "../../api/dailyCheckoutApi";
import type { Client, ClientPackDetail, ServiceRecord } from "../../api/types";
import { useAuth } from "../../auth/authContext";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { Panel } from "../../components/ui/Panel";
import { InlineMutationProgress } from "../../components/ui/ProgressBar";
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCpf,
  formatCurrency,
  formatPhone,
} from "../../lib/formatters";
import { ClientDetailsModal } from "./ClientDetailsModal";
import { ClientRegistrationModal } from "./ClientRegistrationModal";
import { LoyaltyRedeemModal } from "./LoyaltyRedeemModal";
import { LoyaltyStampGrid } from "./LoyaltyStampGrid";
import { PackPurchaseModal } from "./PackPurchaseModal";
import { PackRedeemModal } from "./PackRedeemModal";
import { getClientLoyalty } from "./loyaltyUtils";

const PAGE_LIMIT = 20;

export function ClientsAndPacks() {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [purchaseTargetClient, setPurchaseTargetClient] =
    useState<Client | null>(null);
  const [redeemTargetClient, setRedeemTargetClient] = useState<Client | null>(
    null,
  );
  const [redeemLoyaltyTargetClient, setRedeemLoyaltyTargetClient] =
    useState<Client | null>(null);
  const [historyTargetClient, setHistoryTargetClient] =
    useState<Client | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = searchQuery.trim();
      setDebouncedQuery((prev) => {
        if (prev !== nextQuery) {
          setLoading(true);
          setError(null);
        }
        return nextQuery;
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    void listClients({
      q: debouncedQuery || undefined,
      limit: PAGE_LIMIT,
      offset: 0,
    })
      .then((response) => {
        if (active) {
          setClients(response.items);
          setTotal(response.total);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            getApiErrorMessage(
              cause,
              "Não foi possível carregar a lista de clientes.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  async function fetchClients(offset = 0, append = false) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await listClients({
        q: debouncedQuery || undefined,
        limit: PAGE_LIMIT,
        offset,
      });
      setClients((current) =>
        append ? [...current, ...response.items] : response.items,
      );
      setTotal(response.total);
    } catch (cause: unknown) {
      setError(
        getApiErrorMessage(
          cause,
          "Não foi possível carregar a lista de clientes.",
        ),
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function upsertClientInList(updated: Client) {
    setClients((current) => {
      const exists = current.some((item) => item.id === updated.id);
      if (exists) {
        return current.map((item) => (item.id === updated.id ? updated : item));
      }
      return [updated, ...current];
    });
    setHistoryTargetClient((current) =>
      current && current.id === updated.id ? updated : current,
    );
  }

  useEffect(() => {
    return subscribeClientInvalidation((invalidatedClientId) => {
      void getClient(invalidatedClientId)
        .then((freshClient) => {
          setClients((current) => {
            if (!current.some((item) => item.id === freshClient.id)) {
              return current;
            }
            return current.map((item) =>
              item.id === freshClient.id ? freshClient : item,
            );
          });
          setHistoryTargetClient((current) =>
            current && current.id === freshClient.id ? freshClient : current,
          );
        })
        .catch(() => {
          // Keep current list item if background refresh fails
        });
    });
  }, []);

  function handleClientSaved(savedClient: Client) {
    const wasEditing = Boolean(editingClient);
    setRegistrationModalOpen(false);
    setEditingClient(null);
    upsertClientInList(savedClient);
    if (!wasEditing) {
      setTotal((prev) => prev + 1);
    }
    setFeedback(
      wasEditing
        ? `Cadastro de ${savedClient.name} atualizado.`
        : `Cliente ${savedClient.name} cadastrado com sucesso!`,
    );
  }

  function handlePackPurchased(
    updatedClient: Client,
    createdPack: ClientPackDetail,
  ) {
    setPurchaseTargetClient(null);
    upsertClientInList(updatedClient);
    setFeedback(
      createdPack.usedCuts > 0
        ? `Pacote "${createdPack.planName}" ativado e 1º corte registrado para ${updatedClient.name}! (${createdPack.remainingCuts} cortes restantes).`
        : `Pacote "${createdPack.planName}" ativado para ${updatedClient.name} (${createdPack.remainingCuts} cortes disponíveis).`,
    );
  }

  function handlePackRedeemed(record: ServiceRecord, updatedClient: Client) {
    setRedeemTargetClient(null);
    upsertClientInList(updatedClient);
    const summary = record.packSummary ?? updatedClient.activePack;
    const shareText =
      role === "daily_operator"
        ? ` · Minha parte: ${formatCurrency(record.operatorShareCents)}`
        : "";

    if (summary?.needsRenewal || summary?.remainingCuts === 0) {
      setFeedback(
        `Último corte do pacote utilizado para ${updatedClient.name}! Cliente precisa renovar.${shareText}`,
      );
    } else if (summary) {
      setFeedback(
        `Corte registrado para ${updatedClient.name}! Restam ${summary.remainingCuts} de ${summary.totalCuts} cortes no pacote.${shareText}`,
      );
    } else {
      setFeedback(
        `Corte do pacote registrado para ${updatedClient.name}!${shareText}`,
      );
    }
  }

  function handleLoyaltyRedeemed(record: ServiceRecord, updatedClient: Client) {
    setRedeemLoyaltyTargetClient(null);
    upsertClientInList(updatedClient);
    const shareText =
      role === "daily_operator"
        ? ` · Minha parte: ${formatCurrency(record.operatorShareCents)}`
        : "";
    setFeedback(
      `Corte gratuito de fidelidade resgatado para ${updatedClient.name}! Fidelidade reiniciada para 0/10.${shareText}`,
    );
  }

  return (
    <section className="grid min-w-0 gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
            Fidelização & Assinaturas
          </p>
          <h1 className="mb-1 text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-[-0.04em]">
            Clientes & Pacotes
          </h1>
          <p className="m-0 text-sm text-[#617067]">
            Busque por nome, telefone ou CPF para descontar cortes ou vender
            pacotes mensais.
          </p>
        </div>

        <Button
          className="!min-h-11 h-11 flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm whitespace-nowrap"
          onClick={() => {
            setEditingClient(null);
            setRegistrationModalOpen(true);
          }}
          type="button"
        >
          <UserPlus size={18} />
          <span>Novo Cliente</span>
        </Button>
      </div>

      <Panel className="grid min-w-0 gap-3 !p-3.5 sm:!p-4">
        <div className="relative flex items-center">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 text-[#4a7957]"
            size={20}
          />
          <input
            aria-label="Buscar cliente por nome, telefone ou CPF"
            className="min-h-12 w-full rounded-xl border border-[#c8d6ca] bg-[#f5f7f4] pr-10 pl-10 text-base text-[#17211b] placeholder:text-[#617067] focus:bg-white focus-visible:outline-2 focus-visible:outline-[#2f6840]"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar nome, telefone ou CPF..."
            type="search"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              aria-label="Limpar busca"
              className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-[#617067] hover:bg-[#dce5dd]"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-[#617067]">
          <span>
            {loading
              ? "Buscando clientes..."
              : `${total} ${total === 1 ? "cliente encontrado" : "clientes encontrados"}`}
          </span>
          <button
            className="inline-flex items-center gap-1 font-bold text-[#2f6840] hover:underline"
            disabled={loading}
            onClick={() => void fetchClients(0, false)}
            type="button"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={13} />
            <span>Atualizar lista</span>
          </button>
        </div>
      </Panel>

      {feedback && (
        <FeedbackMessage
          message={feedback}
          onClose={() => setFeedback(null)}
        />
      )}

      {error && (
        <FeedbackMessage
          message={error}
          onClose={() => setError(null)}
          variant="error"
        />
      )}

      {loading ? (
        <LoadingMessage variant="cards">
          Carregando clientes e pacotes...
        </LoadingMessage>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title={
            debouncedQuery
              ? "Nenhum cliente encontrado para esta busca"
              : "Nenhum cliente cadastrado ainda"
          }
        >
          <div className="grid justify-items-center gap-3">
            <span>
              {debouncedQuery
                ? `Não encontramos resultados para "${debouncedQuery}".`
                : "Cadastre clientes rapidamente apenas com nome e telefone."}
            </span>
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                setEditingClient(null);
                setRegistrationModalOpen(true);
              }}
              type="button"
            >
              <UserPlus size={18} />
              <span>
                {debouncedQuery && !/\d/.test(debouncedQuery)
                  ? `Cadastrar "${debouncedQuery}"`
                  : "Cadastrar Novo Cliente"}
              </span>
            </Button>
          </div>
        </EmptyState>
      ) : (
        <div className="grid min-w-0 gap-3">
          {clients.map((client) => {
            const pack = client.activePack;
            const loyalty = getClientLoyalty(client);
            const hasActivePack =
              pack?.status === "active" && pack.remainingCuts > 0;
            const isExhausted =
              pack?.status === "exhausted" ||
              pack?.needsRenewal === true ||
              (pack !== null && pack.remainingCuts <= 0);
            const packProgressPercent =
              pack && pack.totalCuts > 0
                ? Math.min(
                    100,
                    Math.round((pack.usedCuts / pack.totalCuts) * 100),
                  )
                : 0;

            return (
              <Panel
                className="grid min-w-0 gap-3 overflow-hidden !p-3.5 transition hover:border-[#9fc2a7] sm:!p-4"
                key={client.id}
              >
                <div className="grid min-w-0 gap-2.5">
                  <div className="flex min-w-0 items-start justify-between gap-2.5">
                    <div className="grid min-w-0 flex-1 justify-items-start gap-1">
                      <strong className="w-full truncate text-base leading-snug text-[#17211b] sm:text-lg">
                        {client.name}
                      </strong>

                      {hasActivePack && pack && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#9fc2a7] bg-[#e8f2ea] px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-[#245c35]">
                          <CheckCircle2 size={12} />
                          <span>Pacote ativo</span>
                        </span>
                      )}

                      {isExhausted && pack && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#ead9a6] bg-[#fff4d6] px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-[#805d12]">
                          <AlertTriangle size={12} />
                          <span>Pacote esgotado</span>
                        </span>
                      )}

                      {!pack && (
                        <span className="inline-flex items-center rounded-full border border-[#dce5dd] bg-[#f5f7f4] px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-[#617067]">
                          Sem pacote ativo
                        </span>
                      )}
                    </div>

                    <button
                      aria-label={`Editar dados de ${client.name}`}
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#dce5dd] bg-[#f5f7f4] px-2 text-xs font-bold whitespace-nowrap text-[#4a7957] transition hover:border-[#4a7957] hover:bg-[#e8f2ea]"
                      onClick={() => {
                        setEditingClient(client);
                        setRegistrationModalOpen(true);
                      }}
                      title="Editar cadastro"
                      type="button"
                    >
                      <Edit3 size={12} />
                      <span>Editar</span>
                    </button>
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-1.5 border-t border-[#eef3ef] pt-2 text-xs min-[360px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
                    <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-[#23372a] tabular-nums">
                      <Phone className="shrink-0 text-[#4a7957]" size={13} />
                      <span className="truncate">{formatPhone(client.phone)}</span>
                    </span>

                    {client.cpf && (
                      <span
                        className="inline-flex min-w-0 items-center gap-1.5 font-medium text-[#4b5a50] tabular-nums"
                        title="CPF do cliente"
                      >
                        <IdCard className="shrink-0 text-[#4a7957]" size={13} />
                        <span className="truncate">{formatCpf(client.cpf)}</span>
                      </span>
                    )}

                    {client.email && (
                      <span
                        className="inline-flex min-w-0 items-center gap-1.5 font-medium text-[#4b5a50] min-[360px]:col-span-2 sm:min-w-0"
                        title={client.email}
                      >
                        <Mail className="shrink-0 text-[#4a7957]" size={13} />
                        <span className="truncate">{client.email}</span>
                      </span>
                    )}
                  </div>
                </div>

                {pack && (
                  <div
                    className={`grid min-w-0 gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                      hasActivePack
                        ? "border-[#c8d6ca] bg-[#f5f7f4] text-[#23372a]"
                        : "border-[#ead9a6] bg-[#fff9e8] text-[#805d12]"
                    }`}
                  >
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5">
                      <span className="min-w-0 truncate font-bold">
                        {pack.planName}
                      </span>
                      <span className="font-bold">
                        {hasActivePack
                          ? `${pack.usedCuts}/${pack.totalCuts} usados · Restam ${pack.remainingCuts} ${pack.remainingCuts === 1 ? "corte" : "cortes"}`
                          : `${pack.usedCuts}/${pack.totalCuts} usados · Renovar`}
                      </span>
                    </div>
                    <div
                      className={`h-1.5 w-full overflow-hidden rounded-full ${
                        hasActivePack ? "bg-[#dce5dd]" : "bg-[#f0e0b2]"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          hasActivePack ? "bg-[#2f6840]" : "bg-[#c18b20]"
                        }`}
                        style={{ width: `${packProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid min-w-0 gap-2">
                  <LoyaltyStampGrid
                    loyalty={loyalty}
                    showRedeemedCount
                    variant="compact"
                  />

                  {loyalty.freeCutAvailable && (
                    <Button
                      className="!min-h-10 h-10 flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap sm:w-auto sm:justify-self-start"
                      onClick={() => setRedeemLoyaltyTargetClient(client)}
                      type="button"
                    >
                      <Gift size={14} />
                      <span>Resgatar Corte Grátis</span>
                    </Button>
                  )}
                </div>

                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 pt-0.5">
                  {hasActivePack ? (
                    <Button
                      className="!min-h-11 h-11 flex min-w-0 items-center justify-center gap-1.5 px-2.5 py-2 text-xs whitespace-nowrap min-[380px]:px-3.5 min-[380px]:text-sm"
                      onClick={() => setRedeemTargetClient(client)}
                      type="button"
                    >
                      <Scissors className="shrink-0" size={15} />
                      <span>Descontar 1 Corte</span>
                    </Button>
                  ) : isExhausted ? (
                    <Button
                      className="!min-h-11 h-11 flex min-w-0 items-center justify-center gap-1.5 px-2.5 py-2 text-xs whitespace-nowrap min-[380px]:px-3.5 min-[380px]:text-sm"
                      onClick={() => setPurchaseTargetClient(client)}
                      type="button"
                    >
                      <PackagePlus className="shrink-0" size={15} />
                      <span>Renovar Pacote</span>
                    </Button>
                  ) : (
                    <Button
                      className="!min-h-11 h-11 flex min-w-0 items-center justify-center gap-1.5 px-2.5 py-2 text-xs whitespace-nowrap min-[380px]:px-3.5 min-[380px]:text-sm"
                      onClick={() => setPurchaseTargetClient(client)}
                      type="button"
                      variant="secondary"
                    >
                      <PackagePlus className="shrink-0" size={15} />
                      <span>Vender Pacote</span>
                    </Button>
                  )}

                  <Button
                    className="!min-h-11 h-11 flex shrink-0 items-center justify-center gap-1.5 px-2.5 py-2 text-xs whitespace-nowrap min-[380px]:px-3.5 min-[380px]:text-sm"
                    onClick={() => setHistoryTargetClient(client)}
                    title="Ver detalhes e histórico do cliente"
                    type="button"
                    variant="secondary"
                  >
                    <ClipboardCheck className="shrink-0" size={15} />
                    <span>Histórico</span>
                  </Button>
                </div>
              </Panel>
            );
          })}

          {clients.length < total && (
            <div className="w-full space-y-2.5">
              <InlineMutationProgress
                active={loadingMore}
                label="Carregando mais clientes..."
              />
              <Button
                className="w-full"
                disabled={loadingMore}
                onClick={() => void fetchClients(clients.length, true)}
                type="button"
                variant="secondary"
              >
                {loadingMore
                  ? "Carregando mais clientes..."
                  : `Carregar mais (${clients.length} de ${total})`}
              </Button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {registrationModalOpen && (
          <ClientRegistrationModal
            editingClient={editingClient}
            initialName={
              !editingClient && debouncedQuery && !/\d/.test(debouncedQuery)
                ? debouncedQuery
                : ""
            }
            key="client-registration-modal"
            onClose={() => {
              setRegistrationModalOpen(false);
              setEditingClient(null);
            }}
            onSaved={handleClientSaved}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {redeemTargetClient && (
          <PackRedeemModal
            client={redeemTargetClient}
            key={redeemTargetClient.id}
            onClose={() => setRedeemTargetClient(null)}
            onRedeemed={handlePackRedeemed}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyTargetClient && (
          <ClientDetailsModal
            client={historyTargetClient}
            key={historyTargetClient.id}
            onClientUpdated={upsertClientInList}
            onClose={() => setHistoryTargetClient(null)}
            onRequestRenew={(targetClient) =>
              setPurchaseTargetClient(targetClient)
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {purchaseTargetClient && (
          <PackPurchaseModal
            client={purchaseTargetClient}
            key={purchaseTargetClient.id}
            onClose={() => setPurchaseTargetClient(null)}
            onPurchased={handlePackPurchased}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {redeemLoyaltyTargetClient && (
          <LoyaltyRedeemModal
            client={redeemLoyaltyTargetClient}
            key={`loyalty-${redeemLoyaltyTargetClient.id}`}
            onClose={() => setRedeemLoyaltyTargetClient(null)}
            onRedeemed={handleLoyaltyRedeemed}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
