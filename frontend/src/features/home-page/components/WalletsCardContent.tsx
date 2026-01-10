export default function WalletsCardContent () {
    return (
        <div className="flex flex-col">
            <p className="text-lg">
                Total de carteiras cadastradas no sistema.
            </p>
            <p className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent ">
                Ativas: 150
            </p>
            <p className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent ">
                Inativas: 30
            </p>
        </div>
    );
}