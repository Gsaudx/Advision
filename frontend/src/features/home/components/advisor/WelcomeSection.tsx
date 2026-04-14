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
        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-adv-primary">
          Bem-vindo, <span className="text-adv-accent">{userName}</span>
        </h1>
        <p className="text-adv-text-2 mt-1 capitalize">{currentDate}</p>
      </div>
    </div>
  );
}
