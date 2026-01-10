export default function OperationsCardContent() {
    return (
        <div className="flex flex-col">
            <p className="text-lg">
                Operações de clientes registradas no sistema.
            </p>
            <p className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent ">
                Abertas: 150
            </p>
            <p className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent ">
                Fechadas: 30
            </p>
        </div>
    );
}