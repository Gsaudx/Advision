export default function DueDatesCardContent() {
  return (
    <div className="flex flex-col">
      <p className="text-sm sm:text-base lg:text-lg">
        Total de acoes a vencer.
      </p>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 sm:mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        Vencidas: 45
      </p>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 sm:mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        A vencer: 120
      </p>
    </div>
  );
}
