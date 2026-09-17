import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, CheckCircle2, Mic, Plug, Save, Webhook, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPut, apiPost } from "@/lib/api";
import type { AppSettings, IntegrationStatus, N8nWebhookResponse } from "@/lib/types";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<AppSettings>("/settings"),
  });
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => apiGet<IntegrationStatus>("/settings/integrations"),
  });

  const [thresholds, setThresholds] = useState(settings?.thresholds);
  const [webhookUrl, setWebhookUrl] = useState(settings?.n8n_webhook_url ?? "");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setThresholds(settings.thresholds);
      setWebhookUrl(settings.n8n_webhook_url);
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: (body: AppSettings) => apiPut<AppSettings>("/settings", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Settings saved.");
    },
    onError: () => toast.error("Could not save settings."),
  });

  const testWebhook = useMutation({
    mutationFn: () => apiPost<N8nWebhookResponse>("/webhooks/n8n/assessment", { data: { test: true } }),
    onSuccess: (res) => {
      setTestResult(`Received by workflow "${res.workflow}" - actions: ${res.actions.join(", ")}`);
      toast.success("Test event delivered.");
    },
    onError: () => toast.error("Test event failed."),
  });

  const vapiPublic = import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined;
  const vapiAssistant = import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined;
  const vapiConfigured = Boolean(vapiPublic && vapiAssistant);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-slate-500">
          AI thresholds and integration placeholders - everything below is demo-sandbox
          configuration.
        </p>
      </div>

      {/* AI engine */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Bot className="size-5" />
            </span>
            <div>
              <p className="font-heading text-base font-bold">AI Assessment Engine</p>
              <p className="text-xs text-slate-500">
                Hybrid: LLM conversation + deterministic explainable scoring (server-side key only).
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              integrations?.ai_available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
            data-testid="ai-engine-status"
          >
            {integrations?.ai_available ? (
              <>
                <CheckCircle2 className="size-3.5" /> Online ({integrations?.ai_provider}/{integrations?.ai_model})
              </>
            ) : (
              <>Rule-based fallback active</>
            )}
          </span>
        </div>

        <div className="mt-5">
          <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Configurable thresholds
          </Label>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {thresholds &&
              (
                [
                  ["medium_min", "Medium risk from"],
                  ["high_min", "High risk from"],
                  ["critical_min", "Critical risk from"],
                  ["confidence_review_threshold", "Confidence review below"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="rounded-lg bg-slate-50 p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={thresholds[key]}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, [key]: Number(e.target.value) })
                    }
                    className="mt-1.5 font-mono"
                    data-testid={`threshold-input-${key}`}
                  />
                </div>
              ))}
          </div>
          <Button
            className="mt-4"
            onClick={() => thresholds && saveSettings.mutate({ thresholds, n8n_webhook_url: webhookUrl })}
            disabled={!thresholds || saveSettings.isPending}
            data-testid="save-thresholds-button"
          >
            <Save className="size-4" />
            Save thresholds
          </Button>
        </div>
      </div>

      {/* n8n */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Webhook className="size-5" />
            </span>
            <div>
              <p className="font-heading text-base font-bold">n8n Webhook</p>
              <p className="text-xs text-slate-500">
                Optional workflow hook: MediSense &rarr; n8n &rarr; routing / notifications / audit.
                The app works without it.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              integrations?.n8n_connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
            data-testid="n8n-status"
          >
            {integrations?.n8n_connected ? (
              <>
                <CheckCircle2 className="size-3.5" /> Connected
              </>
            ) : (
              <>
                <XCircle className="size-3.5" /> Not Connected
              </>
            )}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Webhook URL
            </Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://n8n.example.com/webhook/medisense-assessment"
              className="mt-1.5 font-mono text-xs"
              data-testid="n8n-webhook-url-input"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Inbound endpoint: <span className="font-mono">POST {integrations?.n8n_endpoint ?? "/api/webhooks/n8n/assessment"}</span>
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => testWebhook.mutate()}
              disabled={testWebhook.isPending}
              data-testid="n8n-test-button"
            >
              <Plug className="size-4" />
              Send test event
            </Button>
            <Button
              onClick={() => thresholds && saveSettings.mutate({ thresholds, n8n_webhook_url: webhookUrl })}
              disabled={saveSettings.isPending}
              data-testid="save-n8n-button"
            >
              <Save className="size-4" />
              Save
            </Button>
          </div>
        </div>
        {testResult && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800" data-testid="n8n-test-result">
            {testResult}
          </p>
        )}
      </div>

      {/* Vapi voice */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Mic className="size-5" />
            </span>
            <div>
              <p className="font-heading text-base font-bold">Vapi Voice Integration</p>
              <p className="text-xs text-slate-500">
                Voice flow placeholder: patient speaks &rarr; Vapi &rarr; MediSense conversation
                &rarr; assessment &rarr; spoken/text reply. Text chat always works.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              vapiConfigured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
            data-testid="vapi-status"
          >
            {vapiConfigured ? (
              <>
                <CheckCircle2 className="size-3.5" /> Configured
              </>
            ) : (
              <>
                <XCircle className="size-3.5" /> Not configured
              </>
            )}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Vapi Public Key
            </Label>
            <Input
              value={vapiPublic ?? ""}
              placeholder="Set VITE_VAPI_PUBLIC_KEY in frontend/.env"
              readOnly
              className="mt-1.5 bg-slate-50 font-mono text-xs"
              data-testid="vapi-public-key-field"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Vapi Assistant ID
            </Label>
            <Input
              value={vapiAssistant ?? ""}
              placeholder="Set VITE_VAPI_ASSISTANT_ID in frontend/.env"
              readOnly
              className="mt-1.5 bg-slate-50 font-mono text-xs"
              data-testid="vapi-assistant-id-field"
            />
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          Configuration placeholder - keys are read from environment variables only and are never
          hard-coded in source. Private keys must stay server-side; only Vapi public identifiers
          belong in the frontend environment.
        </p>
      </div>
    </div>
  );
}
