import React from 'react'
import { SliderPicker, BlockPicker } from 'react-color'
import { IconButton } from './icon-button';

class PickerTooltip extends React.Component {
  constructor(props) {
    super(props)
    this.handleChangeComplete = this.handleChangeComplete.bind(this)
    this.handleClickAway = this.handleClickAway.bind(this)
    this.onAccept = this.onAccept.bind(this)
    this.onDismiss = this.onDismiss.bind(this)
    this.state = {
      color: props.initialColor || '#fff'
    }
  }
  handleChangeComplete({ hex: color }) {
    this.setState({ color })
  }
  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickAway);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickAway);
  }
  render() {
    const { color } = this.state
    return (
      <span className='tooltip-bottom tooltip-picker' ref={c => this.containerRef = c}>
        <BlockPicker onChangeComplete={this.handleChangeComplete} color={color} triangle='hide' />
        <div className='tooltip-toolbar'>
          <IconButton icon='accept.svg' onClick={this.onAccept} />
          <IconButton icon='cancel.svg' onClick={this.onDismiss} />
        </div>
      </span>
    )
  }
  handleClickAway(event) {
    const ref = this.containerRef
    if (!ref || ref.contains(event.target)) {
      return
    }
    
    if (this.props.onClickAway) {
      this.props.onClickAway(this.state.color)
    }
  }
  onDismiss() {
    if (this.props.onDismiss) {
      this.props.onDismiss()
    }
  }
  onAccept() {
    if (this.props.onAccept) {
      this.props.onAccept(this.state.color)
    }
  }
}

export { PickerTooltip }