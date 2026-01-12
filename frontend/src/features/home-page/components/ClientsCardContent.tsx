export default function ClientsCardContent() {
  return (
    <div className="flex flex-col">
      <p className="text-sm sm:text-base lg:text-lg">
        Total de clientes cadastrados no sistema.
      </p>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 sm:mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        Ativos: 250
      </p>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 sm:mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        Inativos: 20
      </p>
    </div>
  );
}
