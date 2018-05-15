import React from 'react'

function IconButton({ icon, onClick, disabled = false }) {
  const className = 'icon-button' + (disabled ? ' disabled' : '')
  return (
    <button className={className} onClick={!disabled ? onClick : () => {}} disabled={disabled}>
      <img src={`../../assets/${icon}`} />
    </button>
  )
}

export { IconButton }