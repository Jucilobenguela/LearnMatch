import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  FolderCode,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type {
  AppView,
  GeneratedReportRecord,
  ImplementationStatus,
  ProjectDocumentationAudit,
} from '../types/learnmatch.ts';

interface ProjectDocumentationViewProps {
  authToken: string | null;
  onNavigate: (view: AppView) => void;
}

const STATUS_BADGE: Record<ImplementationStatus, string> = {
  Implementada: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Parcialmente implementada': 'bg-amber-50 text-amber-900 border-amber-200',
  Planeada: 'bg-blue-50 text-blue-800 border-blue-200',
  'Não implementada': 'bg-slate-100 text-slate-700 border-slate-300',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export const ProjectDocumentationView: React.FC<ProjectDocumentationViewProps> = ({
  authToken,
  onNavigate,
}) => {
  const [audit, setAudit] = useState<ProjectDocumentationAudit | null>(null);
  const [history, setHistory] = useState<GeneratedReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ImplementationStatus | 'Todas'>('Todas');
  const [activeReport, setActiveReport] = useState<GeneratedReportRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const buildHeaders = useCallback(
    (withJson = false): Record<string, string> => {
      const headers: Record<string, string> = {
        'X-Requested-With': 'LearnMatch',
      };
      if (withJson) {
        headers['Content-Type'] = 'application/json';
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      return headers;
    },
    [authToken],
  );

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokePreviewUrl();
    };
  }, [revokePreviewUrl]);

  const fetchPdfBlob = useCallback(
    async (report: GeneratedReportRecord, triggerDownload = false) => {
      setLoadingPreviewId(report.id);
      setError(null);
      try {
        const res = await fetch(
          `/api/docs/reports/${encodeURIComponent(report.id)}/pdf${triggerDownload ? '?download=1' : ''}`,
          {
            method: 'GET',
            headers: buildHeaders(false),
            credentials: 'include',
          },
        );
        if (!res.ok) {
          const errJson = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errJson.error || 'Não foi possível carregar o relatório PDF.');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (triggerDownload) {
          const link = document.createElement('a');
          link.href = url;
          link.download = report.filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          return;
        }

        revokePreviewUrl();
        previewUrlRef.current = url;
        setPreviewBlobUrl(url);
        setActiveReport(report);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao transferir o relatório PDF.');
      } finally {
        setLoadingPreviewId(null);
      }
    },
    [buildHeaders, revokePreviewUrl],
  );

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/docs/audit', {
        method: 'GET',
        headers: buildHeaders(false),
        credentials: 'include',
      });
      const data = (await res.json()) as {
        audit?: ProjectDocumentationAudit;
        history?: GeneratedReportRecord[];
        error?: string;
      };
      if (!res.ok || !data.audit) {
        throw new Error(data.error || 'Erro ao executar auditoria ao código do projeto.');
      }
      setAudit(data.audit);
      setHistory(data.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar auditoria do projeto.');
    } finally {
      setLoading(false);
    }
  }, [buildHeaders]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const handleGenerateFinalPdf = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/docs/generate', {
        method: 'POST',
        headers: buildHeaders(true),
        credentials: 'include',
      });
      const data = (await res.json()) as {
        report?: GeneratedReportRecord;
        audit?: ProjectDocumentationAudit;
        history?: GeneratedReportRecord[];
        error?: string;
      };
      if (!res.ok || !data.report || !data.audit) {
        throw new Error(data.error || 'Erro ao gerar o Relatório Final PDF.');
      }
      setAudit(data.audit);
      setHistory(data.history || []);
      await fetchPdfBlob(data.report, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar o Relatório Final PDF.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !audit) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-3 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" aria-hidden="true" />
        <span className="text-sm font-medium">A executar auditoria técnica ao projeto...</span>
      </main>
    );
  }

  const implementedCount =
    audit?.features.filter((f) => f.status === 'Implementada').length ?? 0;
  const partialCount =
    audit?.features.filter((f) => f.status === 'Parcialmente implementada').length ?? 0;
  const plannedCount =
    audit?.features.filter((f) => f.status === 'Planeada').length ?? 0;
  const notImplCount =
    audit?.features.filter((f) => f.status === 'Não implementada').length ?? 0;

  const filteredFeatures =
    audit?.features.filter((f) => statusFilter === 'Todas' || f.status === statusFilter) ?? [];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao Painel
          </button>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              DOCUMENTAÇÃO DO PROJETO
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-emerald-700">
              Geração local independente da API Gemini
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Auditoria Automática e Relatório Final PDF (15 Capítulos)
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Inspeciona em tempo real os ficheiros, arquitetura, esquema SQLite, catálogo visual,
            endpoints REST, regras de gamificação e suíte de testes do LearnMatch para gerar um
            documento académico e técnico completo, preservando versões anteriores sem sobrescrever.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleGenerateFinalPdf}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {generating ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="w-5 h-5" aria-hidden="true" />
            )}
            GERAR RELATÓRIO FINAL PDF
          </button>

          <button
            type="button"
            onClick={() => void loadAudit()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Reexecutar Auditoria ao Código
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Audit Metrics */}
      {audit && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <FolderCode className="w-4 h-4 text-blue-700" aria-hidden="true" />
              <span>Ficheiros auditados</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
              {audit.metrics.totalSourceFiles}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {audit.metrics.frontendComponentCount} UI · {audit.metrics.backendModuleCount} servidor
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Database className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>SQLite e Catálogo</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
              {audit.metrics.sqliteTables.length} tabelas
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {audit.metrics.catalogWordCount} palavras SVG · {audit.metrics.cachedWavV2Count} WAV v2
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span>Estado funcional real</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
              {implementedCount}/{audit.features.length}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {partialCount} parciais · {plannedCount} planeadas · {notImplCount} por fazer
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Cpu className="w-4 h-4 text-slate-700" aria-hidden="true" />
              <span>Validação e Testes</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
              {audit.metrics.automatedTestCount} testes
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {audit.endpoints.length} endpoints · v{audit.appVersion}
            </div>
          </div>
        </section>
      )}

      {/* Inline PDF Viewer for Active / Newly Generated Report */}
      {activeReport && previewBlobUrl && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Relatório Final PDF pronto para consulta e apresentação</span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900 font-mono-num">
                {activeReport.filename}
              </h2>
              <p className="text-xs text-slate-500">
                Gerado em {new Date(activeReport.generatedAt).toLocaleString('pt-PT')} ·{' '}
                {activeReport.pageCount} páginas · {formatBytes(activeReport.sizeBytes)}
              </p>
            </div>

            <a
              href={previewBlobUrl}
              download={activeReport.filename}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors shrink-0"
            >
              <FileDown className="w-4 h-4" aria-hidden="true" />
              Descarregar Relatório PDF
            </a>
          </div>

          <iframe
            src={previewBlobUrl}
            title={`Pré-visualização de ${activeReport.filename}`}
            className="w-full h-[640px] rounded-xl border border-slate-200 bg-slate-100"
          />
        </section>
      )}

      {/* Versioned Generated Reports History */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Histórico de Relatórios Gerados (Versões Preservadas)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Cada geração cria um novo ficheiro versionado em <span className="font-mono-num">data/reports/</span> sem apagar os relatórios anteriores.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono-num">
            {history.length} {history.length === 1 ? 'documento' : 'documentos'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-600">
            Ainda não gerou nenhum Relatório Final PDF nesta instância. Clique em{' '}
            <strong>GERAR RELATÓRIO FINAL PDF</strong> acima para criar a primeira versão.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {history.map((rep) => {
              const isViewing = activeReport?.id === rep.id;
              return (
                <div
                  key={rep.id}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isViewing ? 'bg-blue-50/60' : 'bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-bold text-slate-900 font-mono-num">
                        {rep.filename}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {new Date(rep.generatedAt).toLocaleString('pt-PT')}
                      </span>
                      <span>v{rep.appVersion}</span>
                      <span>{rep.pageCount} páginas</span>
                      <span>{formatBytes(rep.sizeBytes)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={loadingPreviewId === rep.id}
                      onClick={() => void fetchPdfBlob(rep, false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      {loadingPreviewId === rep.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {isViewing ? 'A visualizar' : 'Visualizar'}
                    </button>

                    <button
                      type="button"
                      disabled={loadingPreviewId === rep.id}
                      onClick={() => void fetchPdfBlob(rep, true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                      Descarregar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Honest Feature Audit Table */}
      {audit && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Auditoria Real das Funcionalidades ({filteredFeatures.length})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Distinção transparente entre funcionalidades implementadas, parciais, planeadas e não implementadas.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  'Todas',
                  'Implementada',
                  'Parcialmente implementada',
                  'Planeada',
                  'Não implementada',
                ] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Funcionalidade</th>
                  <th className="py-3 px-4">Estado Real</th>
                  <th className="py-3 px-4">Evidência no Código</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFeatures.map((feat) => (
                  <tr key={feat.id} className="align-top">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{feat.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{feat.notes}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                          STATUS_BADGE[feat.status]
                        }`}
                      >
                        {feat.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 font-mono-num">
                      {feat.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
};
