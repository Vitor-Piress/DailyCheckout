import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  PackagePlus,
  Phone,
  RefreshCw,
  Scissors,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
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
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCpf,
  formatCurrency,
  formatPhone,
} from "../../lib/formatters";
import { ClientDetailsModal } from "./ClientDetailsModal";
import { ClientRegistrationModal } from "./ClientRegistrationModal";
import { PackPurchaseModal } from "./PackPurchaseModal";
import { PackRedeemModal } from "./PackRedeemModal";

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

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
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
          className="flex shrink-0 items-center gap-2"
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

      <Panel className="grid gap-3 !p-3.5 sm:!p-4">
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
        <LoadingMessage>Carregando clientes e pacotes...</LoadingMessage>
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
        <div className="grid gap-3">
          {clients.map((client) => {
            const pack = client.activePack;
            const hasActivePack =
              pack?.status === "active" && pack.remainingCuts > 0;
            const isExhausted =
              pack?.status === "exhausted" ||
              pack?.needsRenewal === true ||
              (pack !== null && pack.remainingCuts <= 0);

            return (
              <Panel
                className="grid gap-3.5 !p-4 transition hover:border-[#9fc2a7]"
                key={client.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="grid min-w-0 gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-lg leading-snug text-[#17211b]">
                        {client.name}
                      </strong>
                      <button
                        aria-label={`Editar dados de ${client.name}`}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-[#dce5dd] bg-[#f5f7f4] px-2 text-xs font-bold text-[#4a7957] transition hover:border-[#4a7957] hover:bg-[#e8f2ea]"
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

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#617067]">
                      <span className="inline-flex items-center gap-1 font-bold text-[#34443a]">
                        <Phone className="text-[#4a7957]" size={13} />
                        {formatPhone(client.phone)}
                      </span>
                      {client.cpf && <span>CPF: {formatCpf(client.cpf)}</span>}
                      {client.email && <span>{client.email}</span>}
                    </div>
                  </div>

                  {hasActivePack && pack && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#9fc2a7] bg-[#e8f2ea] px-3 py-1 text-xs font-extrabold text-[#245c35]">
                      <CheckCircle2 size={15} />
                      <span>
                        {pack.remainingCuts}/{pack.totalCuts} cortes restantes
                      </span>
                    </span>
                  )}

                  {isExhausted && pack && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ead9a6] bg-[#fff4d6] px-3 py-1 text-xs font-extrabold text-[#805d12]">
                      <AlertTriangle size={15} />
                      <span>Pacote esgotado • Renovar</span>
                    </span>
                  )}

                  {!pack && (
                    <span className="inline-flex items-center rounded-full border border-[#dce5dd] bg-[#f5f7f4] px-3 py-1 text-xs font-bold text-[#617067]">
                      Sem pacote ativo
                    </span>
                  )}
                </div>

                {pack && (
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                      hasActivePack
                        ? "border-[#c8d6ca] bg-[#f5f7f4] text-[#23372a]"
                        : "border-[#ead9a6] bg-[#fff9e8] text-[#805d12]"
                    }`}
                  >
                    <span>
                      Plano: <strong>{pack.planName}</strong> · Usados:{" "}
                      <strong>
                        {pack.usedCuts} de {pack.totalCuts}
                      </strong>
                    </span>
                    <span className="font-bold">
                      {hasActivePack
                        ? `Restam ${pack.remainingCuts} ${pack.remainingCuts === 1 ? "corte" : "cortes"}`
                        : "0 cortes restantes"}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {hasActivePack ? (
                    <>
                      <Button
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 px-4 py-2 text-sm"
                        onClick={() => setRedeemTargetClient(client)}
                        type="button"
                      >
                        <Scissors size={17} />
                        <span>Descontar 1 Corte</span>
                      </Button>
                      <Button
                        className="flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2 text-sm"
                        onClick={() => setHistoryTargetClient(client)}
                        type="button"
                        variant="secondary"
                      >
                        <ClipboardCheck size={17} />
                        <span>Histórico</span>
                      </Button>
                    </>
                  ) : isExhausted ? (
                    <>
                      <Button
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 px-4 py-2 text-sm"
                        onClick={() => setPurchaseTargetClient(client)}
                        type="button"
                      >
                        <PackagePlus size={17} />
                        <span>Renovar Pacote</span>
                      </Button>
                      <Button
                        className="flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2 text-sm"
                        onClick={() => setHistoryTargetClient(client)}
                        type="button"
                        variant="secondary"
                      >
                        <ClipboardCheck size={17} />
                        <span>Histórico</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 px-4 py-2 text-sm"
                        onClick={() => setPurchaseTargetClient(client)}
                        type="button"
                        variant="secondary"
                      >
                        <PackagePlus size={17} />
                        <span>Vender Pacote</span>
                      </Button>
                      <Button
                        className="flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2 text-sm"
                        onClick={() => setHistoryTargetClient(client)}
                        title="Ver detalhes e histórico do cliente"
                        type="button"
                        variant="ghost"
                      >
                        <ClipboardCheck size={17} />
                        <span>Histórico</span>
                      </Button>
                    </>
                  )}
                </div>
              </Panel>
            );
          })}

          {clients.length < total && (
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
          )}
        </div>
      )}

      {registrationModalOpen && (
        <ClientRegistrationModal
          editingClient={editingClient}
          initialName={
            !editingClient && debouncedQuery && !/\d/.test(debouncedQuery)
              ? debouncedQuery
              : ""
          }
          onClose={() => {
            setRegistrationModalOpen(false);
            setEditingClient(null);
          }}
          onSaved={handleClientSaved}
        />
      )}

      {purchaseTargetClient && (
        <PackPurchaseModal
          client={purchaseTargetClient}
          onClose={() => setPurchaseTargetClient(null)}
          onPurchased={handlePackPurchased}
        />
      )}

      {redeemTargetClient && (
        <PackRedeemModal
          client={redeemTargetClient}
          onClose={() => setRedeemTargetClient(null)}
          onRedeemed={handlePackRedeemed}
        />
      )}

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
    </section>
  );
}
