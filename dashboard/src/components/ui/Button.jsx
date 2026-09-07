import './ui.css';

/**
 * Botón con estados completos: hover, active, focus de teclado, disabled y
 * carga. Mientras `loading` está activo el botón se deshabilita solo, para
 * que no se pueda disparar dos veces un pago o un guardado.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon = null,
  fullWidth = false,
  className = '',
  disabled = false,
  children,
  ...props
}) {
  const clases = [
    'fp-btn',
    `fp-btn--${variant}`,
    `fp-btn--${size}`,
    fullWidth ? 'fp-btn--full' : '',
    loading ? 'is-loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={clases} disabled={disabled || loading} {...props}>
      {loading ? <span className="fp-btn__spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
