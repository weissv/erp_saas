import { Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { NotFoundState } from '../components/ui/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <NotFoundState
        onAction={() => { window.location.href = '/dashboard'; }}
      />
    </div>
  );
}
