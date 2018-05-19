import React from 'react'

function IconButton({ icon, onClick, disabled = false, className = '', children }) {
  const classes = 'icon-button' + (disabled ? ' disabled' : '') + ` ${className}`
  return (
    <span className='icon-button-wrapper'>
      <span className={classes} onClick={!disabled ? onClick : () => {}} disabled={disabled}>
        <img src={`../../assets/${icon}`} />
      </span>
      {children}
    </span>
  )
}

export { IconButton }