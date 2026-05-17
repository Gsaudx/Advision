import { useState, useEffect } from 'react';
import { useNotificationSettings, useUpdateNotificationSettings } from '../api';

export function NotificationSettingsPage() {
  const { data: settings, isLoading } = useNotificationSettings();
  const { mutate: updateSettings, isPending } = useUpdateNotificationSettings();

  const [enabled, setEnabled] = useState(true);
  const [windowDays, setWindowDays] = useState(7);

  useEffect(() => {
    if (!settings) return;
    const t = setTimeout(() => {
      setEnabled(settings.notificationsEnabled);
      setWindowDays(settings.notificationWindowDays);
    }, 0);
    return () => clearTimeout(t);
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      notificationsEnabled: enabled,
      notificationWindowDays: windowDays,
    });
  };

  if (isLoading) {
    return <p className="text-slate-400 p-8">Carregando...</p>;
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">
        Configurações de Notificações
      </h1>

      {/* Toggle ativo/inativo */}
      <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
        <div>
          <p className="text-sm font-medium text-white">
            Notificações de vencimento
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Alertas quando opções estão próximas do vencimento
          </p>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          role="switch"
          aria-checked={enabled}
          aria-label="Ativar notificações de vencimento"
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? 'bg-blue-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Janela de antecedência */}
      <div
        className={`p-4 bg-slate-800 rounded-xl space-y-3 ${
          !enabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        <div>
          <p className="text-sm font-medium text-white">
            Janela de antecedência
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Alertar com quantos dias de antecedência (1–30 dias)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={30}
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              min={1}
              max={30}
              value={windowDays}
              onChange={(e) => {
                const v = Math.min(30, Math.max(1, Number(e.target.value)));
                if (!isNaN(v)) setWindowDays(v);
              }}
              className="w-14 text-center bg-slate-700 border border-slate-600 text-white text-sm font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400 text-sm">
              {windowDays === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        </div>
      </div>

      {/* Salvar */}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
      >
        {isPending ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  );
}
