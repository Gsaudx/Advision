import { useState, useEffect } from 'react';
import { Database, Server, CheckCircle2, XCircle } from 'lucide-react';

function App() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'offline'>(
    'loading',
  );
  const [dbStatus, setDbStatus] = useState<
    'loading' | 'connected' | 'disconnected'
  >('loading');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Em produção, a URL será relativa ou configurada via env
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/health`);
        const data = await response.json();

        if (data.status === 'ok') {
          setApiStatus('online');
          setDbStatus('connected');
        } else {
          setApiStatus('online');
          setDbStatus('disconnected');
        }
      } catch (error) {
        setApiStatus('offline');
        setDbStatus('disconnected');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Recheck every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            TCC Investimentos
          </h1>
          <p className="text-xl text-slate-400">
            Sistema de Gerenciamento e Gestão de Carteiras
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-medium border border-yellow-500/20">
            🚧 Em Construção
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
          {/* Backend Status */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Server size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Backend API</h3>
                <p className="text-xs text-slate-500">NestJS Server</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {apiStatus === 'loading' && (
                <span className="animate-pulse text-slate-500">
                  Verificando...
                </span>
              )}
              {apiStatus === 'online' && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 size={16} /> Online
                </span>
              )}
              {apiStatus === 'offline' && (
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle size={16} /> Offline
                </span>
              )}
            </div>
          </div>

          {/* Database Status */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Database size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Database</h3>
                <p className="text-xs text-slate-500">PostgreSQL (RDS)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dbStatus === 'loading' && (
                <span className="animate-pulse text-slate-500">
                  Verificando...
                </span>
              )}
              {dbStatus === 'connected' && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 size={16} /> Conectado
                </span>
              )}
              {dbStatus === 'disconnected' && (
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle size={16} /> Erro
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500 mb-4">Powered by</p>
          <div className="flex justify-center gap-6 text-slate-400 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="hover:text-[#61DAFB]">React</span>
            <span className="hover:text-[#E0234E]">NestJS</span>
            <span className="hover:text-[#336791]">PostgreSQL</span>
            <span className="hover:text-[#2496ED]">Docker</span>
            <span className="hover:text-[#FF9900]">AWS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
