const TECH_STACK = [
  { name: 'React', hoverColor: 'hover:text-[#61DAFB]' },
  { name: 'NestJS', hoverColor: 'hover:text-[#E0234E]' },
  { name: 'PostgreSQL', hoverColor: 'hover:text-[#336791]' },
  { name: 'Docker', hoverColor: 'hover:text-[#2496ED]' },
  { name: 'AWS', hoverColor: 'hover:text-[#FF9900]' },
];

export function TechStackSection() {
  return (
    <div className="pt-8 border-t border-slate-800">
      <p className="text-sm text-slate-500 mb-4">Powered by</p>
      <div className="flex justify-center gap-6 text-slate-400">
        {TECH_STACK.map((tech) => (
          <span
            key={tech.name}
            className={`transition-colors duration-300 ${tech.hoverColor}`}
          >
            {tech.name}
          </span>
        ))}
      </div>
    </div>
  );
}
