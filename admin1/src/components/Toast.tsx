import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const icons = {
  success: <CheckCircle size={16} className="text-green-500" />,
  error: <XCircle size={16} className="text-red-500" />,
  warning: <AlertCircle size={16} className="text-yellow-500" />,
  info: <Info size={16} className="text-blue-500" />,
};

function ToastMessage({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  return (
    <div className="toast">
      {icons[toast.type]}
      <span style={{ flex: 1, color: "#374151" }}>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
