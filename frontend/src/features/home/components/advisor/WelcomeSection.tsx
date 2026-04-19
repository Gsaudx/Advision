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
    <section>
      <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
        Bem-vindo, <span className="text-tertiary">{userName}</span>
      </h2>
      <p className="text-on-surface-variant mt-1 capitalize text-sm">
        {currentDate}
      </p>
    </section>
  );
}
