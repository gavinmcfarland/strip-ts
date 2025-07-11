function Button(props) {
  const { children, href, target, style, onClick, variant = 'primary', disabled = false } = props;

  const buttonStyle = {
    display: 'block',
    borderRadius: '5px',
    border: '1px solid var(--figma-color-border)',
    padding: '0 7px',
    lineHeight: '22px',
    textDecoration: 'none',
    color: 'var(--figma-color-text)',
    backgroundColor: variant === 'primary' ? 'var(--figma-color-bg-brand)' : 'var(--figma-color-bg-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    ...style
  };

  const handleClick = (event) => {
    if (!disabled && onClick) {
      onClick(event);
    }
  };

  if (href) {
    return (
      <a
        href={href}
        target={target}
        style={buttonStyle}
        onClick={handleClick}
        className={`button button-${variant}`}>

				{children}
			</a>);

  }

  return (
    <button style={buttonStyle} onClick={handleClick} disabled={disabled} className={`button button-${variant}`}>
			{children}
		</button>);

}

export default Button;