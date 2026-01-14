type RoleToggleProps = {
  value: 'ADVISOR' | 'CLIENT';
  onChange: (value: 'ADVISOR' | 'CLIENT') => void;
  disabled?: boolean;
};

export default function RoleToggle({
  value,
  onChange,
  disabled,
}: RoleToggleProps) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <label className="text-white text-sm font-medium">Tipo de conta</label>
      <div className="flex bg-slate-800 border border-slate-600 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onChange('ADVISOR')}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            value === 'ADVISOR'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Assessor
        </button>
        <button
          type="button"
          onClick={() => onChange('CLIENT')}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            value === 'CLIENT'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Cliente
        </button>
      </div>
    </div>
  );
}
