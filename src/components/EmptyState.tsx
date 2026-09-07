interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon = "📭", title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:10, padding:"3rem 2rem", textAlign:"center" }}>
      <span aria-hidden="true" style={{ fontSize:40 }}>{icon}</span>
      <p style={{ margin:0, fontSize:15, fontWeight:500, color:"#333" }}>{title}</p>
      <p style={{ margin:0, fontSize:13, color:"#888", maxWidth:360 }}>{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} style={{ marginTop:10, background:"#534AB7", color:"#fff",
          border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:14 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
