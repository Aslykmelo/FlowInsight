import type { ReactNode } from "react";
import { Inbox, Search, Users, Bot, FileText } from "lucide-react";

interface EmptyStateProps {
  /** Elemento de ícono (p. ej. un ícono de lucide-react). Si se pasa un texto/emoji heredado se traduce a un ícono. */
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Compatibilidad: algunas pantallas aún pasan un emoji como texto; se muestra su ícono equivalente.
const ICONOS_HEREDADOS: Record<string, ReactNode> = {
  "🔍": <Search size={24} />,
  "👥": <Users size={24} />,
  "🤖": <Bot size={24} />,
  "📄": <FileText size={24} />,
};

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const iconoFinal =
    typeof icon === "string" ? (ICONOS_HEREDADOS[icon] ?? <Inbox size={24} />) : (icon ?? <Inbox size={24} />);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:"var(--s-2)", padding:"var(--s-6) var(--s-5)", textAlign:"center" }}>
      <span aria-hidden="true" style={{ width:56, height:56, borderRadius:"50%", background:"var(--c-primary-soft)",
        color:"var(--c-primary)", display:"inline-flex", alignItems:"center", justifyContent:"center",
        marginBottom:"var(--s-1)" }}>
        {iconoFinal}
      </span>
      <p style={{ margin:0, fontSize:16, fontWeight:700, color:"var(--c-ink)" }}>{title}</p>
      <p style={{ margin:0, fontSize:14, color:"var(--c-muted)", maxWidth:380 }}>{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction} style={{ marginTop:"var(--s-3)" }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
