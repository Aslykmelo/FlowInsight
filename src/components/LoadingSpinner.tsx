interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Cargando..." }: LoadingSpinnerProps) {
  return (
    <div role="status" aria-live="polite" style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:"var(--s-3)", padding:"var(--s-6)", width:"100%" }}>
      <style>{`
        @keyframes flowinsight-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .flowinsight-spinner { animation-duration: 2s !important; animation-iteration-count: infinite !important; }
        }
      `}</style>
      <div aria-hidden="true" className="flowinsight-spinner" style={{ width:36, height:36, borderRadius:"50%",
        border:"3px solid var(--c-primary-line)", borderTopColor:"var(--c-primary)",
        animation:"flowinsight-spin 0.8s linear infinite" }} />
      {message ? (
        <p style={{ margin:0, fontSize:14, color:"var(--c-muted)" }}>{message}</p>
      ) : (
        <span style={{ position:"absolute", width:1, height:1, overflow:"hidden", clip:"rect(0 0 0 0)" }}>Cargando</span>
      )}
    </div>
  );
}
