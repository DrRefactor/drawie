import React, { Component } from 'react'

import SocketIO from 'socket.io-client'

export default class App extends Component {
  constructor() {
    super()
    this.onDraw = this.onDraw.bind(this)
    this.onCanvasReady = this.onCanvasReady.bind(this)
    this.socket = SocketIO('http://localhost:4000')
    this.state = {}
  }

  componentDidMount() {
    this.socket.on('draw', data => {
      console.log('draw', data)
      this.draw(data)
    })
  }

  render () {
    return (
      <div className='app-container'>
        <canvas 
          onMouseMove={this.onDraw}
          onMouseDown={this.onDraw}
          onMouseUp={this.onDraw}
          onMouseLeave={this.onDraw}
          onMouseOut={this.onDraw}
          ref={this.onCanvasReady}
          // draggable={true}
        />
      </div>
    )
  }

  onCanvasReady(component) {
    this.canvasRef = component
    component.height = 500
    component.width = 500

    let ctx = component.getContext('2d')
    ctx.fillStyle = 'solid'
    ctx.strokeStyle = '#AAAAAA'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    this.setState({ ctx })
  }

  onDraw(e) {
    console.log(e)
    if (e.pageX === 0 && e.pageY === 0) {
      console.log(Object.assign({}, e), 'd')
      return
    }
    // e.preventDefault()

    const { type } = e
    const { x, y } = this.getRelativeCoordinates(e)
    this.draw({ x, y, type })
    this.socket.emit('drawClick', { x, y, type })
  }

  getRelativeCoordinates(e) {
    let totalOffset = { x: 0, y: 0 }
    let canvasCoords = { x: 0, y: 0 }

    let element = e.target
    
    while (element != null) {
      totalOffset.x += element.offsetLeft - element.scrollLeft
      totalOffset.y += element.offsetTop - element.scrollTop

      element = element.offsetParent
    }

    canvasCoords.x = e.pageX - totalOffset.x
    canvasCoords.y = e.pageY - totalOffset.y

    return canvasCoords
  }

  draw({ x, y, type = '' } = {}) {
    const { ctx, drawing } = this.state
    if (!ctx) {
      return
    }

    type = type.toLowerCase()
    if (type === 'dragstart' || type === 'mousedown') {
      ctx.beginPath()
      ctx.moveTo(x, y)
      this.setState({ drawing: true })
    }
    else if (type === 'drag' || type === 'mousemove') {
      if (!drawing) {
        return
      }
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    else {
      ctx.closePath()
      this.setState({ drawing: false })
    }
  }
}