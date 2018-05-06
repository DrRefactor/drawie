import React, { Component } from 'react'

import SocketIO from 'socket.io-client'

const host = 'localhost'

/// insert wifi ip for dev-wifi mode
/// dirty way to test app via local network
// const host = '192.168.24.106'

export default class App extends Component {
  constructor() {
    super()
    this.onDraw = this.onDraw.bind(this)
    this.onCanvasReady = this.onCanvasReady.bind(this)
    this.fullDump = this.fullDump.bind(this)
    this.fullReplace = this.fullReplace.bind(this)
    this.emitStroke = this.emitStroke.bind(this)
    this.onRoughDraftReady = this.onRoughDraftReady.bind(this)
    this.socket = SocketIO(`http://${host}:4000`)
    this.state = {
      recentNotifyTimestamp: null,
      strokes: [],
      currentStroke: []
    }
  }

  componentDidMount() {
    this.socket.on('draw', data => {
      console.log('draw', data)
      this.draw(data)
    })

    this.socket.on('dumpBC', data => {
      let { dump } = data
      dump = utils.string2ImageData(dump)
      this.fullReplace({ dump })
    })

    this.socket.on('strokeBC', data => {
      const { stroke } = data
      this.drawStroke(stroke)
    })
  }

  componentWillUnmount() {
    if (this.touchMoveListener)
      this.touchMoveListener.remove()
  }

  render () {
    return (
      <div className='app-container'>
        <canvas 
          // onMouseMove={this.onDraw}
          // onMouseDown={this.onDraw}
          // onMouseUp={this.onDraw}
          // onMouseLeave={this.onDraw}
          // onMouseOut={this.onDraw}
          className='board'
          ref={this.onCanvasReady}
        />
        <canvas
          className='rough-draft'
          onMouseMove={this.onDraw}
          onMouseDown={this.onDraw}
          onMouseUp={this.onDraw}
          onMouseLeave={this.onDraw}
          onMouseOut={this.onDraw}
          onTouchStart={this.onDraw}
          onTouchEnd={this.onDraw}
          onTouchCancel={this.onDraw}
          ref={this.onRoughDraftReady}
        />
      </div>
    )
  }

  onRoughDraftReady(component) {
    this.roughDraftRef = component
    
    component.height = 500
    component.width = 500
    
    let ctx = component.getContext('2d')
    ctx.fillStyle = 'solid'
    ctx.strokeStyle = '#AA5555'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'

    this.touchMoveListener = utils.addEventListener(component, 'touchmove',
      this.onDraw.bind(this),
      { passive: false }
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
  }

  onDraw(e) {
    /// Strange: 'blank' events are fired from time to time with (0,0) coords
    if (e.pageX === 0 && e.pageY === 0) {
      return
    }
    if (!this.canvasRef) {
      return
    }
    
    const { type } = e
    if (type === 'touchmove') {
      e.preventDefault()
    }

    const { currentStroke } = this.state
    if (type === 'touchend' && !currentStroke.length) {
      return
    }

    const relativeCoords = type !== 'touchend' ?
      utils.getRelativeCoordinates.bind(utils) :
      () => {
        const [lastX, lastY] = currentStroke[currentStroke.length - 1]
        return { x: lastX, y: lastY } 
      }

    const { x, y } = relativeCoords(e)
    this.draw({ x, y, type })
    // this.notify({ type })
  }

  // notify({ type }) {
  //   if (type !== 'mousemove' && type !== 'mouseup') {
  //     return
  //   }
  //   const { recentNotifyTimestamp } = this.state
  //   const now = Date.now()
  //   const timespan = recentNotifyTimestamp ? now - recentNotifyTimestamp : Number.MAX_SAFE_INTEGER
    
  //   if (type === 'mouseup') {
  //     this.fullDumpEmit()
  //     this.setState({ recentNotifyTimestamp: now })
  //     return
  //   }

  //   if (timespan < 2000) {
  //     return
  //   }
  //   this.fullDumpEmit()
  //   this.setState({ recentNotifyTimestamp: now })
  // }

  // fullDumpEmit() {
  //   this.socket.emit('dump', { dump: utils.imageData2String(this.fullDump()) })
  // }

  fullDump() {
    const ref = this.canvasRef
    const ctx = ref.getContext('2d')
    return ctx.getImageData(0, 0, ref.width, ref.height)
  }

  fullReplace({ dump }) {
    const ref = this.canvasRef
    const ctx = ref.getContext('2d')

    ctx.putImageData(dump, 0, 0)
  }

  draw({ x, y, type = '' } = {}) {
    const { drawing } = this.state
    const ctx = this.roughDraftRef && this.roughDraftRef.getContext('2d')
    if (!ctx) {
      return
    }

    type = type.toLowerCase()
    if (type === 'dragstart' || type === 'mousedown' || type === 'touchstart') {
      ctx.beginPath()
      ctx.moveTo(x, y)
      this.setState({ drawing: true, currentStroke: [] })
    }
    else if (type === 'drag' || type === 'mousemove' || type === 'touchmove') {
      if (!drawing) {
        return
      }

      let currentStroke = this.state.currentStroke.slice()
      currentStroke.push([x, y])

      ctx.lineTo(x, y)
      ctx.stroke()

      this.setState({ currentStroke })
    }
    else {
      ctx.closePath()
      this.emitStroke()

      const { currentStroke } = this.state
      this.drawStroke(currentStroke)
      ctx.clearRect(0, 0, this.roughDraftRef.width, this.roughDraftRef.height)
      this.setState({ drawing: false, currentStroke: [] })
    }
  }

  drawLine(fromX, fromY, toX, toY) {
    const ctx = this.canvasRef.getContext('2d')
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  }

  drawStroke(points = []) {
    if (!points.length) {
      return
    }

    const [firstX, firstY] = points[0]
    let current = { x: firstX, y: firstY }
    
    points
      .slice(1)
      .forEach(p => {
        const [x, y] = p
        this.drawLine(current.x, current.y, x, y)
        current = { x, y }
      })
  }

  emitStroke() {
    const { currentStroke } = this.state
    this.socket.emit('stroke', { stroke: currentStroke, guid: utils.guid() })
  }
}

const utils = {
  imageData2String: imageData => {
    const { data, width, height } = imageData

    return JSON.stringify({ data, width, height })
  },
  string2ImageData: str => {
    const parsed = JSON.parse(str)
    console.log(parsed)
    const { data, width, height } = parsed
    console.log(data)
    const byteArray = new Uint8ClampedArray(Object.values(data))

    return new ImageData(byteArray, width, height)
  },
  guid: function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  },
  addEventListener: function(node, event, handler, options) {
    node.addEventListener(event, handler, options)
    return {
      remove: function() {
        node.removeEventListener(event, handler, options)
      }
    }
  },
  getRelativeCoordinates(e) {
    let totalOffset = { x: 0, y: 0 }
    let canvasCoords = { x: 0, y: 0 }

    let element = e.target
    
    while (element != null) {
      totalOffset.x += element.offsetLeft - element.scrollLeft
      totalOffset.y += element.offsetTop - element.scrollTop

      element = element.offsetParent
    }

    const { pageX, pageY } = this.pageCoords(e)
    canvasCoords.x = pageX - totalOffset.x
    canvasCoords.y = pageY - totalOffset.y

    return canvasCoords
  },
  pageCoords: function(e) {
    const pageX = e.pageX || (e.touches && e.touches.length && e.touches[0].pageX)
    const pageY = e.pageY || (e.touches && e.touches.length && e.touches[0].pageY)

    /// e.g. touchend event
    if (pageX == null || pageY == null) {
      return { pageX: -1, pageY: -1 }
    }

    return { pageX, pageY }
  }
}