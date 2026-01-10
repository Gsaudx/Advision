export default function ClientsCardContent() {
    return (
        <div className="flex flex-col">
            <p className="text-lg">
                Total de clientes cadastrados no sistema.
            </p>
            <p className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent ">
               Ativos: 250
            </p>
            <p className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent ">
                Inativos: 20
            </p>
        </div>
    );
}