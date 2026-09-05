interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:14, background:"#FAECE7",
      border:"0.5px solid #E24B4A", borderRadius:12, padding:"2rem", textAlign:"center" }}>
      <span style={{ fontSize:28 }}>⚠️</span>
      <p style={{ margin:0, fontSize:14, color:"#993C1D", fontWeight:500, maxWidth:360 }}>
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} style={{ background:"#534AB7", color:"#fff",
          border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:14 }}>
          Reintentar
        </button>
      )}
    </div>
  );
}
