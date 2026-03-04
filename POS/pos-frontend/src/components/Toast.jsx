import { useToast } from '../hooks/useToast';

export default function Toast() {
  const { toast } = useToast();

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
    </div>
  );
}
