import React from 'react'

function IconButton({ icon, onClick, disabled = false, className = '' }) {
  const classes = 'icon-button' + (disabled ? ' disabled' : '') + ` ${className}`
  return (
    <button className={classes} onClick={!disabled ? onClick : () => {}} disabled={disabled}>
      <img src={`../../assets/${icon}`} />
    </button>
  )
}

export { IconButton }