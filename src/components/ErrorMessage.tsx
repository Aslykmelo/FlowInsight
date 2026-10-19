import { TriangleAlert, RotateCw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div role="alert" aria-live="assertive" style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:"var(--s-3)", background:"var(--c-bad-soft)",
      border:"1px solid var(--c-bad)", borderRadius:"var(--r-md)", padding:"var(--s-5)", textAlign:"center" }}>
      <TriangleAlert size={28} color="var(--c-bad)" aria-hidden="true" />
      <p style={{ margin:0, fontSize:14, color:"var(--c-bad)", fontWeight:600, maxWidth:400 }}>
        {message}
      </p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <RotateCw size={16} aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}
