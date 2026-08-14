import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App.jsx";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Error fatal en la app:", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"linear-gradient(180deg,#ffd21f,#fff7cf 40%,#f7f7f8)",fontFamily:"Arial,sans-serif"}}>
        <div style={{maxWidth:420,width:"100%",background:"#fff",borderRadius:22,padding:24,boxShadow:"0 12px 34px rgba(0,0,0,.12)",textAlign:"center"}}>
          <h1 style={{margin:"0 0 10px",fontSize:24}}>No se pudo abrir la app</h1>
          <p style={{color:"#666",lineHeight:1.5}}>Cierra y vuelve a abrir. Si continúa, borra los datos de la aplicación e inicia sesión nuevamente.</p>
          <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",fontSize:11,textAlign:"left",background:"#f6f6f7",padding:12,borderRadius:12,color:"#b00020"}}>{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => { localStorage.removeItem("inv_session"); location.reload(); }} style={{width:"100%",border:0,borderRadius:12,padding:13,background:"#d71920",color:"#fff",fontWeight:800}}>Reiniciar sesión</button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Oculta la pantalla de carga (huevo girando) una vez que React ya pintó la app
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const loader = document.getElementById("app-loading-screen");
    if (loader) {
      loader.style.transition = "opacity .25s ease";
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 260);
    }
  });
});
