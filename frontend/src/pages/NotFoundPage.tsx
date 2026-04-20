import { NotFoundState } from '../components/ui/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <NotFoundState
        onAction={() => { window.location.href = '/dashboard'; }}
      />
    </div>
  );
}
