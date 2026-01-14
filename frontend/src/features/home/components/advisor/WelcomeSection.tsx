interface WelcomeSectionProps {
  userName: string;
}

export function WelcomeSection({ userName }: WelcomeSectionProps) {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Bem-vindo, <span className="text-blue-400">{userName}</span>
        </h1>
        <p className="text-slate-400 mt-1 capitalize">{currentDate}</p>
      </div>
    </div>
  );
}
