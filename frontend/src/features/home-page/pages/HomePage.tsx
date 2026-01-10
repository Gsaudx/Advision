import { BasePage } from "@/components/layout/BasePage";
import HomeCard from "../components/HomeCard";
import { ChartSpline, Hourglass, UsersRound } from "lucide-react";
import ClientsCardContent from "../components/ClientsCardContent";
import DueDatesCardContent from "../components/DueDatesCardContent";
import OperationsCardContent from "../components/OperationsCardContent";

export function HomePage() {
    return (
        <BasePage>
            <div className="h-full text-white flex flex-col p-4">
                <div className="text-center mt-14">
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Olá USUÁRIO, bem-vindo de volta!
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mt-4">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className=' grid md:grid-cols-3'>
                    <HomeCard title="Clientes" icon={<UsersRound size={38} />} content={<ClientsCardContent />} />
                    <HomeCard title="Operações" icon={<ChartSpline size={38} />} content={<OperationsCardContent />} />
                    <HomeCard title="Vencimentos" icon={<Hourglass size={38} />}content={<DueDatesCardContent />} />
                </div>
                <div className='grid md:grid-cols-3'>
                    <HomeCard title="Card 1" content={<p>Conteúdo do Card 1</p>} />
                    <HomeCard title="Card 2" content={<p>Conteúdo do Card 2</p>} />
                    <HomeCard title="Card 3" content={<p>Conteúdo do Card 3</p>} />
                </div>
            </div>
        </BasePage>
    );
}
