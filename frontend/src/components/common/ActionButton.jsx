export default function ActionButton({ variant, icon: Icon, children, className = '', ...props }) {
  const mergedClassName = ['action-button', `action-button--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={mergedClassName} {...props}>
      {Icon && <Icon size={14} strokeWidth={2.2} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
