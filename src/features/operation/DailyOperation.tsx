import { AlertCircle, ArrowLeft, CalendarDays, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createServiceRecord,
  listServiceTypes,
} from "../../api/dailyCheckoutApi";
import type { PaymentMethod, ServiceType } from "../../api/types";
import { IconButton } from "../../components/ui/IconButton";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Panel } from "../../components/ui/Panel";
import { getApiErrorMessage } from "../../lib/errors";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { ServiceBadge } from "./ServiceBadge";
import { ServiceSelector } from "./ServiceSelector";

export function DailyOperation() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void listServiceTypes()
      .then(setServices)
      .catch((cause: unknown) => {
        console.error("Não foi possível carregar os serviços:", cause);
        setError(
          getApiErrorMessage(cause, "Não foi possível carregar os serviços."),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function chooseService(service: ServiceType) {
    setSelectedService(service);
    setPaymentMethod(null);
    setSuccess(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!selectedService || !paymentMethod || submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createServiceRecord({
        serviceTypeId: selectedService.id,
        paymentMethod,
      });
      setSuccess(`${selectedService.name} registrado com sucesso.`);
      setSelectedService(null);
      setPaymentMethod(null);
    } catch (cause: unknown) {
      console.error("Não foi possível registrar o atendimento:", cause);
      setError(
        getApiErrorMessage(cause, "Não foi possível registrar o atendimento."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
            DailyCheckout
          </p>
          <h1 className="mb-1.5 text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-[-0.04em]">
            Operação diária
          </h1>
          {/* <p className="m-0 max-w-[34rem] text-[#617067]">
            Registre os serviços realizados durante o expediente.
          </p> */}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#dce5dd] bg-white px-2.5 py-2 text-xs font-bold text-[#4a7957]">
          <CalendarDays size={18} />
          <span>Hoje</span>
        </div>
      </div>

      {loading && <EmptyState>Carregando serviços disponíveis...</EmptyState>}
      {!loading && error && (
        <EmptyState
          icon={<AlertCircle size={28} />}
          onClose={() => setError(null)}
          title="Não foi possível carregar os serviços"
        >
          {error}
        </EmptyState>
      )}
      {!loading && !error && services.length === 0 && (
        <EmptyState
          icon={<Scissors size={28} />}
          title="Nenhum serviço disponível"
        >
          Cadastre um serviço ativo para começar a registrar atendimentos.
        </EmptyState>
      )}
      {!loading && !error && services.length > 0 && (
        <div className="mx-auto w-full max-w-[42rem]">
          {!selectedService ? (
            <div className="motion-content">
              <ServiceSelector onSelect={chooseService} services={services} />
            </div>
          ) : (
            <Panel className="motion-content grid gap-5" key={selectedService.id}>
              <div className="grid gap-3.5">
                <div className="flex items-center gap-4">
                  <IconButton
                    aria-label="Voltar para serviços"
                    icon={<ArrowLeft size={18} />}
                    onClick={() => {
                      setSelectedService(null);
                      setPaymentMethod(null);
                      setError(null);
                    }}
                    title="Voltar para serviços"
                    type="button"
                  />
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                    Registrar atendimento
                  </p>
                </div>
                <ServiceBadge service={selectedService} />
              </div>
              <PaymentMethodSelector
                onChange={setPaymentMethod}
                value={paymentMethod}
              />
              <Button
                disabled={!paymentMethod || submitting}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitting ? "Registrando..." : "Confirmar atendimento"}
              </Button>
            </Panel>
          )}
        </div>
      )}
      {success && (
        <FeedbackMessage message={success} onClose={() => setSuccess(null)} />
      )}
    </section>
  );
}
