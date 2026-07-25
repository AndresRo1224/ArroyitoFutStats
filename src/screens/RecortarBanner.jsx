import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, Check, X } from "lucide-react";
import { C } from "../tema";
import { Boton, Rotulo } from "../components/ui";

const RATIO = 800 / 280;   // proporción del banner
const SALIDA_W = 800, SALIDA_H = 280;

// Recorta/encuadra una imagen para el banner: se arrastra para mover y hay una
// barra de zoom, como en WhatsApp. Devuelve el recorte final (data URL).
export default function RecortarBanner({ src, onListo, onCancelar }) {
  const vpRef = useRef(null);
  const imgRef = useRef(null);
  const arrastre = useRef(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Mide el viewport al montar.
  useEffect(() => {
    const el = vpRef.current;
    if (el) { const w = el.clientWidth; setVp({ w, h: Math.round(w / RATIO) }); }
  }, []);

  const base = nat.w && vp.w ? Math.max(vp.w / nat.w, vp.h / nat.h) : 1;
  const escala = base * zoom;

  const encajar = (p, s = escala) => {
    const dw = nat.w * s, dh = nat.h * s;
    return {
      x: Math.min(0, Math.max(vp.w - dw, p.x)),
      y: Math.min(0, Math.max(vp.h - dh, p.y)),
    };
  };

  // Centra la imagen cuando ya se conocen sus dimensiones y las del viewport.
  useEffect(() => {
    if (!nat.w || !vp.w) return;
    const s = base; // zoom 1
    setZoom(1);
    setPos(encajar({ x: (vp.w - nat.w * s) / 2, y: (vp.h - nat.h * s) / 2 }, s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat.w, nat.h, vp.w, vp.h]);

  const onImgLoad = (e) => setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight });

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
  };
  const onMove = (e) => {
    if (!arrastre.current) return;
    setPos(encajar({ x: arrastre.current.px + (e.clientX - arrastre.current.sx), y: arrastre.current.py + (e.clientY - arrastre.current.sy) }));
  };
  const onUp = () => { arrastre.current = null; };

  // Zoom manteniendo el centro del encuadre.
  const alZoom = (z1) => {
    const s0 = base * zoom, s1 = base * z1;
    const cx = vp.w / 2, cy = vp.h / 2;
    const ix = (cx - pos.x) / s0, iy = (cy - pos.y) / s0;
    setZoom(z1);
    setPos(encajar({ x: cx - ix * s1, y: cy - iy * s1 }, s1));
  };

  const aplicar = () => {
    const s = escala;
    const cv = document.createElement("canvas");
    cv.width = SALIDA_W; cv.height = SALIDA_H;
    const ctx = cv.getContext("2d");
    // Región visible del original: se mapea el viewport al recorte de salida.
    ctx.drawImage(imgRef.current, -pos.x / s, -pos.y / s, vp.w / s, vp.h / s, 0, 0, SALIDA_W, SALIDA_H);
    onListo(cv.toDataURL("image/jpeg", 0.75));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Rotulo>Encuadra tu banner</Rotulo>
        <button onClick={onCancelar} className="text-xs font-bold flex items-center gap-1" style={{ color: C.humo }}>
          <X size={13} /> Cancelar
        </button>
      </div>

      <div
        ref={vpRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="w-full rounded-2xl overflow-hidden relative select-none"
        style={{ aspectRatio: "800 / 280", background: C.tarjeta2, touchAction: "none", cursor: "grab", boxShadow: `inset 0 0 0 1px ${C.linea}` }}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={onImgLoad}
          draggable={false}
          style={{
            position: "absolute", left: 0, top: 0, width: nat.w, height: nat.h, maxWidth: "none",
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})`, transformOrigin: "top left",
          }}
        />
      </div>

      <div className="flex items-center gap-3 mt-3">
        <ZoomIn size={18} color={C.humo} />
        <input
          type="range" min="1" max="4" step="0.01" value={zoom}
          onChange={(e) => alZoom(parseFloat(e.target.value))}
          className="flex-1" style={{ accentColor: C.primario }}
        />
      </div>
      <div className="text-xs mt-1" style={{ color: C.humo }}>Arrastra para mover, usa la barra para acercar.</div>

      <div className="mt-3">
        <Boton ancho onClick={aplicar}><Check size={17} /> Usar este encuadre</Boton>
      </div>
    </div>
  );
}
