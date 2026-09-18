// Checkbox animado — de Uiverse.io (PriyanshuGupta28), adaptado al naranja de
// FlashPago. El círculo relleno y el check se dibujan con stroke-dashoffset;
// como la geometría vive en el viewBox, escala sola al tamaño que le pases.
export default function CheckboxAnimado({ checked, onChange, size = 15, id, style }) {
  return (
    <span className="chk-anim" style={{ width: size, height: size, ...style }}>
      <input type="checkbox" id={id} checked={checked} onChange={onChange} />
      <svg viewBox="0 0 35 35">
        <circle className="chk-anim-bg" cx="17.5" cy="17.5" r="14.5" />
        <circle className="chk-anim-stroke" cx="17.5" cy="17.5" r="15.5" />
        <polyline className="chk-anim-check" points="10,18 15,23 26,10" />
      </svg>

      <style>{`
        .chk-anim { position: relative; display: inline-flex; flex-shrink: 0; vertical-align: middle; }
        .chk-anim svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
        .chk-anim-bg { fill: #fff; stroke: #F57C00; stroke-width: 2.5px; transition: fill 0.4s ease, stroke 0.4s ease; }
        .chk-anim-stroke {
          fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 3.5px;
          stroke-dashoffset: 100; stroke-dasharray: 100; transition: stroke-dashoffset 0.4s ease;
        }
        .chk-anim-check {
          fill: none; stroke: #fff; stroke-linecap: round; stroke-linejoin: round; stroke-width: 4px;
          stroke-dashoffset: 24; stroke-dasharray: 24; transition: stroke-dashoffset 0.4s ease;
        }
        .chk-anim:hover .chk-anim-check { stroke-dashoffset: 0; }
        .chk-anim input[type=checkbox] {
          position: absolute; inset: 0; width: 100%; height: 100%; margin: 0;
          opacity: 0; cursor: pointer; appearance: none; -webkit-appearance: none;
        }
        .chk-anim input[type=checkbox]:checked + svg .chk-anim-bg { fill: #E65100; stroke: #E65100; }
        .chk-anim input[type=checkbox]:checked + svg .chk-anim-stroke { stroke-dashoffset: 0; }
        .chk-anim input[type=checkbox]:checked + svg .chk-anim-check { stroke-dashoffset: 0; }
      `}</style>
    </span>
  );
}
