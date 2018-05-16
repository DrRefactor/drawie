import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { Redirect } from 'react-router'

import SocketIO from 'socket.io-client'
import { IconButton } from './components/icon-button';
import { Room } from './controllers/room'
import { RoomEager } from './controllers/room-eager';

// const host = 'localhost'

/// insert wifi ip for dev-wifi mode
/// dirty way to test app via local network
const host = '172.18.18.189'

class App extends Component {
  constructor(props) {
    super(props)
    this.onDraw = this.onDraw.bind(this)
    this.onCanvasReady = this.onCanvasReady.bind(this)
    this.fullDump = this.fullDump.bind(this)
    this.replace = this.replace.bind(this)
    this.emitStroke = this.emitStroke.bind(this)
    this.onRoughDraftReady = this.onRoughDraftReady.bind(this)
    this.renderBody = this.renderBody.bind(this)
    this.suspend = this.suspend.bind(this)
    this.queryRoom = this.queryRoom.bind(this)
    this.renderToolbar = this.renderToolbar.bind(this)
    this.handleUndoClick = this.handleUndoClick.bind(this)
    
    const room = this.queryRoom() || utils.guid()
    const query = this.buildQuery(room)

    this.socket = SocketIO(`http://${host}:4000${query}`)

    this.state = {
      recentNotifyTimestamp: null,
      paths: [],
      currentStroke: [],
      loading: true,
      room,
      snapshots: []
    }
    this.registeredCallbacks = {}
  }

  queryRoom() {
    return utils.getUrlByName('room', this.props.location.search)
  }

  buildQuery(room) {
    return `?room=${room}`
  }

  callSuspended(blockingMethod) {
    const callbacks = this.registeredCallbacks[blockingMethod]
    if (callbacks) {
      callbacks.forEach(x => x())
    }
    this.registeredCallbacks[blockingMethod] = null
  }

  suspend(blockingMethod, callback) {
    this.registeredCallbacks[blockingMethod] = this.registeredCallbacks[blockingMethod] ?
    this.registeredCallbacks[blockingMethod].concat(callback) :
    [callback]
  }

  componentDidMount() {
    this.socket.on('draw', data => {
      this.draw(data)
    })

    this.socket.on('dumpBC', data => {
      let { snapshot } = data
      this.replace({ snapshot })
      this.setState({ loading: false, snapshot })
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
    const { room } = this.state
    // Redirect to new room from '/'
    if (this.queryRoom() !== room) {
      return <Redirect to={{
        search: this.buildQuery(room)
      }} />
    }

    const body = this.renderBody()
    const toolbar = this.renderToolbar()
    
    return (
      <div className='app-container'>
        <div className='workspace'>
          {toolbar}
          <div className='body'>
            {body}
          </div>
        </div>
      </div>
    )
  }

  renderToolbar() {
    const { loading, snapshots } = this.state

    if (loading) {
      return null
    }
    // TODO
    //// Propagate flag from server
    //// whether canvas is undoable or not
    return (
      <div className='toolbar'>
        <IconButton disabled={false} icon='undo.svg' onClick={this.handleUndoClick} />
      </div>
    )
  }

  renderBody() {
    const { loading } = this.state

    if (loading) {
      return <LoadingIndicator />
    }

    return [
      <canvas
        key='board'
        className='board'
        ref={this.onCanvasReady}
      />,
      <canvas
        key='roughdraft'
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
    ]
  }

  handleUndoClick() {
    this.socket.emit('undo')
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

    /// arguments proto methods:
    /// .calle and .caller
    /// fail in es5/es6/es7 strict mode,
    /// thus making it impossible to extract suspender and suspended methods' names
    this.callSuspended('onCanvasReady')
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
  }

  fullDump() {
    const ref = this.canvasRef
    const ctx = ref.getContext('2d')
    return ctx.getImageData(0, 0, ref.width, ref.height)
  }

  replace({ snapshot }) {
    const ref = this.canvasRef
    if (!ref) {
      const callback = () => this.replace({ snapshot })
      this.suspend('onCanvasReady', callback)
      return
    }
    const ctx = ref.getContext('2d')
    this.drawImage(snapshot)
  }

  drawImage(encodedImage = '') {
    const ref = this.canvasRef
    if (!ref) return;

    const ctx = ref.getContext('2d')
    if (!encodedImage) {
      ctx.clearRect(0, 0, ref.width, ref.height)
      return
    }

    let image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, ref.width, ref.height)
      ctx.drawImage(image, 0, 0)
      this.setState({ pendingCounter: this.state.pendingCounter - 1 })
    }
    this.setState({ pendingCounter: this.state.pendingCounter + 1 })
    image.src = encodedImage
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

      const { currentStroke = [] } = this.state
      if (currentStroke.length) {
        ctx.clearRect(0, 0, this.roughDraftRef.width, this.roughDraftRef.height)
      }
      
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
    
    const ctx = this.canvasRef.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(firstX, firstY)

    points
      .slice(1)
      .forEach(p => {
        const [x, y] = p
        ctx.lineTo(x, y)
        current = { x, y }
      })

    ctx.stroke()
    ctx.closePath()
  }

  emitStroke() {
    const { currentStroke = [] } = this.state
    if (!currentStroke.length) {
      return
    }
    this.socket.emit('stroke', { stroke: currentStroke, guid: utils.guid() })
  }
}

function LoadingIndicator({ width = 500, height = 500 } = {}) {
  return (
    <div className='loading-indicator' style={{ width, height }}>
      <span className='label'>Loading...</span>
    </div>
  )
}

const utils = {
  imageData2String: imageData => {
    const { data, width, height } = imageData

    return JSON.stringify({ data, width, height })
  },
  string2ImageData: function(str) {
    const parsed = JSON.parse(str)
    return this.obj2ImageData(parsed)
  },
  obj2ImageData: function(obj) {
    const { data, width, height } = obj
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
  },
  getUrlByName: function(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")

    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }
}

export default withRouter(App)