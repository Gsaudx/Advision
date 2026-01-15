interface PageTitleProps {
  title: string;
}

export default function PageTitle({ title }: PageTitleProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-8 pb-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          <span className="text-white">{title}</span>
        </h1>
      </div>
    </div>
  );
}
