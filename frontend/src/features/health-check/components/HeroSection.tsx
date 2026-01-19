import fullLogo from '@/assets/logos/full_logo.png';

export function HeroSection() {
  return (
    <div className="space-y-4">
      <h1 className="flex">
        <img src={fullLogo} alt="Advision" className="h-12 w-auto" />
      </h1>
      <p className="text-xl text-slate-400">
        Sistema de Gerenciamento e Gestao de Carteiras
      </p>
      <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-medium border border-yellow-500/20">
        Em Construcao
      </div>
    </div>
  );
}
