import { BasePage } from '@/components/layout/BasePage';
import HomeCard from '../components/HomeCard';
import { ChartSpline, Hourglass, UsersRound } from 'lucide-react';
import ClientsCardContent from '../components/ClientsCardContent';
import DueDatesCardContent from '../components/DueDatesCardContent';
import OperationsCardContent from '../components/OperationsCardContent';

export function HomePage() {
  return (
    <BasePage>
      <div className="h-full text-white flex flex-col p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="text-center mt-6 sm:mt-10 lg:mt-14 mb-6 sm:mb-8">
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Ola USUARIO, bem-vindo de volta!
          </p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mt-2 sm:mt-4">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Cards Grid - Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <HomeCard
            title="Clientes"
            icon={
              <UsersRound className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            }
            content={<ClientsCardContent />}
          />
          <HomeCard
            title="Operacoes"
            icon={
              <ChartSpline className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            }
            content={<OperationsCardContent />}
          />
          <HomeCard
            title="Vencimentos"
            icon={<Hourglass className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />}
            content={<DueDatesCardContent />}
          />
        </div>

        {/* Cards Grid - Secondary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
          <HomeCard title="Card 1" content={<p>Conteudo do Card 1</p>} />
          <HomeCard title="Card 2" content={<p>Conteudo do Card 2</p>} />
          <HomeCard title="Card 3" content={<p>Conteudo do Card 3</p>} />
        </div>
      </div>
    </BasePage>
  );
}
