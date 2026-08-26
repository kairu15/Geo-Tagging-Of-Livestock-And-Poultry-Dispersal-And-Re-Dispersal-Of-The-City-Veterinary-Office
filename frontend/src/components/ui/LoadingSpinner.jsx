import { Beef } from 'lucide-react';

export function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizes[size]} rounded-full border-[3px] border-slate-200 border-t-green-600 animate-spin`} />
      {text && <p className="text-sm text-slate-400 mt-3 font-medium">{text}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Beef,
  title = 'No data found',
  description,
  action,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-slate-300" />
      </div>
      <h3 className="text-base font-medium text-slate-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      )}
      {action && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm"
        >
          {actionLabel || action}
        </button>
      )}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="md" text="Loading..." />
    </div>
  );
}
