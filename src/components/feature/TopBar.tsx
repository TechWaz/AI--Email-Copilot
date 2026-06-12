interface TopBarProps {
  title: string;
  onRefresh?: () => void;
}

export function TopBar({ title, onRefresh }: TopBarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-background-200 bg-white shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground-950">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer relative">
          <i className="ri-notification-3-line text-lg"></i>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full"></span>
        </button>
        <button
          onClick={onRefresh}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
        >
          <i className="ri-refresh-line text-lg"></i>
        </button>
      </div>
    </header>
  );
}