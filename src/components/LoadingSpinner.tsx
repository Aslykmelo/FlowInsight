interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Cargando..." }: LoadingSpinnerProps) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:14, padding:"3rem", width:"100%" }}>
      <style>{`
        @keyframes flowinsight-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ width:36, height:36, borderRadius:"50%",
        border:"3px solid #EEEDFE", borderTopColor:"#534AB7",
        animation:"flowinsight-spin 0.7s linear infinite" }} />
      {message && (
        <p style={{ margin:0, fontSize:14, color:"#888" }}>{message}</p>
      )}
    </div>
  );
}
