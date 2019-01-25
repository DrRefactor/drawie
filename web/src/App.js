import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { Redirect } from 'react-router'

import SocketIO from 'socket.io-client'
import { IconButton } from './components/icon-button';

import { SliderPicker } from 'react-color'
import { PickerTooltip } from './components/picker-tooltip';
import { RoomList } from './components/room-list';

// move this to {env}.env
let host = 'http://localhost:5000'
if (process.env && process.env.NODE_ENV === 'production') {
  host = 'https://drawie.herokuapp.com'
}

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
    this.handleRedoClick = this.handleRedoClick.bind(this)
    this.handlePaletteClick = this.handlePaletteClick.bind(this)
    this.handleActivityDismiss = this.handleActivityDismiss.bind(this)
    this.onBrushColorSelect = this.onBrushColorSelect.bind(this)
    this.handleClickAway = this.handleClickAway.bind(this)
    this.onElementFill = this.onElementFill.bind(this)
    this.handlePaintClick = this.handlePaintClick.bind(this)
    this.relativeCoords = utils.getRelativeCoordinates.bind(utils)
    this.onFillElementColorSelect = this.onFillElementColorSelect.bind(this)
    this.onMiddlewareReady = this.onMiddlewareReady.bind(this)
    this.emitStrokeToMiddleware = this.emitStrokeToMiddleware.bind(this)
    this.queryAdmin = this.queryAdmin.bind(this)
    this.getNonEmptyRooms = this.getNonEmptyRooms.bind(this)

    const strokeStyle = utils.randomHex()
    const options = {
      fillStyle: 'solid',
      strokeStyle,
      lineWidth: 5,
      lineCap: 'round'
    }

    const room = this.queryRoom() || utils.guid()
    const query = this.buildQuery(room)

    this.socket = SocketIO(`${host}${query}`)

    this.state = {
      recentNotifyTimestamp: null,
      paths: [],
      currentStroke: [],
      loading: true,
      room,
      snapshots: [],
      activity: '',
      options,
      fillElementColor: strokeStyle
    }
    this.registeredCallbacks = {}
  }

  queryRoom() {
    return utils.getUrlByName('room', this.props.location.search)
  }

  queryAdmin() {
    return utils.getUrlByName('admin', this.props.location.search)
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
      const { stroke, options } = data
      this.drawStroke(stroke, options)
    })

    document.addEventListener('mousedown', this.handleClickAway);
  }

  componentWillUnmount() {
    if (this.touchMoveListener)
      this.touchMoveListener.remove()

    document.removeEventListener('mousedown', this.handleClickAway);

    if (this.middlewareTimeout) {
      clearTimeout(this.middlewareTimeout)
    }
  }

  render () {
    const { room } = this.state
    
    if (this.queryAdmin()) {
      return (
        <div className='app-container'>
          <RoomList getRooms={this.getNonEmptyRooms} />
        </div>
      )
    }
    
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
    const { loading, snapshots, activity, options, fillElementColor } = this.state

    if (loading) {
      return null
    }
    // TODO
    //// Propagate flag from server
    //// whether canvas is undoable or not
    return (
      <div className='toolbar'>
        <IconButton disabled={false} icon='undo.svg' onClick={this.handleUndoClick} />
        <IconButton disabled={false} icon='redo.svg' onClick={this.handleRedoClick} />
        <IconButton icon='palette.svg' onClick={this.handlePaletteClick}>
          { activity === 'selectBrushColor' ? 
            <PickerTooltip onAccept={this.onBrushColorSelect} onClickAway={this.onBrushColorSelect}
              onDismiss={this.handleActivityDismiss} initialColor={options.strokeStyle} /> :
            null 
          }
        </IconButton>
        <IconButton disabled={false} active={activity === 'selectFillElementColor'} icon='paint.svg' onClick={this.handlePaintClick}>
          { activity === 'selectFillElementColor' ? 
            <PickerTooltip onAccept={this.onFillElementColorSelect}
              onDismiss={this.handleActivityDismiss}
              onClickAway={this.handleActivityDismiss}
              initialColor={fillElementColor} /> :
            null 
          }
        </IconButton>
      </div>
    )
  }

  renderBody() {
    const { loading, activity } = this.state

    let roughDraftProps = {}
    let canvasProps = {}
    let roughDraftClasses = 'rough-draft'

    if (loading) {
      return <LoadingIndicator />
    }
    if (activity === 'fillElement') {
      roughDraftProps = {
        ...roughDraftProps,
        onClick: this.onElementFill,
        onTouchEnd: this.onElementFill
      }
      roughDraftClasses = roughDraftClasses + ' in-fill-element'
    }

    return [
      <canvas
        key='board'
        className='board'
        ref={this.onCanvasReady}
        {...canvasProps}
      />,
      <canvas
        key='middleware'
        className='middleware'
        ref={this.onMiddlewareReady}
      />,
      <canvas
        key='roughdraft'
        className={roughDraftClasses}
        onMouseMove={this.onDraw}
        onMouseDown={this.onDraw}
        onMouseUp={this.onDraw}
        onMouseLeave={this.onDraw}
        onMouseOut={this.onDraw}
        onTouchStart={this.onDraw}
        onTouchEnd={this.onDraw}
        onTouchCancel={this.onDraw}
        ref={this.onRoughDraftReady}
        {...roughDraftProps}
      />
    ]
  }

  getNonEmptyRooms() {
    return new Promise(resolve => {
      this.socket.emit('getNonEmpty')
      this.socket.on('getNonEmptyBC', data => {
        const { rooms = [] } = data
        resolve(rooms)
      })
    })
  }

  handleActivityDismiss() {
    this.setState({ activity: '' })
  }

  handleRedoClick() {
    this.socket.emit('redo')
  }

  handleUndoClick() {
    this.socket.emit('undo')
  }

  handlePaletteClick() {
    const activity = this.state.activity === 'selectBrushColor' ? '' : 'selectBrushColor'
    this.setState({ activity })
  }

  handlePaintClick() {
    const activity = this.state.activity === 'selectFillElementColor' ? '' : 'selectFillElementColor'
    this.setState({ activity })
  }

  handleClickAway() {
    console.log('board clickaway')
  }

  onBrushColorSelect(brushColor) {
    const options = Object.assign({}, this.state.options, { strokeStyle: brushColor })
    this.setState({ options, activity: '' })
  }

  onFillElementColorSelect(color) {
    this.setState({ fillElementColor: color, activity: 'fillElement' })
  }

  onElementFill(event) {
    const { x, y } = this.relativeCoords(event)
    const { fillElementColor } = this.state
    this.socket.emit('floodFill', { x, y, color: fillElementColor })
    this.setState({ activity: '' })
  }

  onRoughDraftReady(component) {
    this.roughDraftRef = component
    
    component.height = 500
    component.width = 500
    
    let ctx = component.getContext('2d')
    this.setup(ctx, this.state.options)

    this.touchMoveListener = utils.addEventListener(component, 'touchmove',
      this.onDraw.bind(this),
      { passive: false }
    )
  }

  onMiddlewareReady(component) {
    this.middlewareRef = component

    component.height = 500
    component.width = 500

    let ctx = component.getContext('2d')
    this.setup(ctx, this.state.options)
  }

  setup(ctx, options = {}) {
    Object.keys(options).forEach(key => {
      ctx[key] = options[key]
    })
  }

  onCanvasReady(component) {
    this.canvasRef = component
    component.height = 500
    component.width = 500

    let ctx = component.getContext('2d')
    this.setup(ctx, this.state.options)

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
      this.setup(ctx, this.state.options)
      ctx.beginPath()
      ctx.moveTo(x, y)
      this.setState({ drawing: true, currentStroke: [[x, y]] })
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

  drawStroke(points = [], options, context) {
    if (!points.length) {
      return
    }

    options = options || this.state.options
    const [firstX, firstY] = points[0]
    let current = { x: firstX, y: firstY }
    
    const ctx = context || this.canvasRef.getContext('2d')
    this.setup(ctx, options)
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

  emitStrokeToMiddleware(stroke = []) {
    if (!this.middlewareRef || !stroke.length) {
      return
    }
    const ctx = this.middlewareRef.getContext('2d')
    this.drawStroke(stroke, this.state.options, ctx)

    if (this.middlewareTimeout) {
      clearTimeout(this.middlewareTimeout)
    }
    this.middlewareTimeout = setTimeout(() => ctx.clearRect(0, 0, this.middlewareRef.width, this.middlewareRef.height), 3000)
  }

  emitStroke() {
    const { currentStroke = [], options } = this.state
    if (!currentStroke.length) {
      return
    }
    this.emitStrokeToMiddleware(currentStroke)
    
    this.socket.emit('stroke', { stroke: currentStroke, guid: utils.guid(), options })
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
  },
  randomHex: () => {
    return "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});
  }
}

export default withRouter(App)