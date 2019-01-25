import React from 'react'
import { Link } from 'react-router-dom'

export class RoomList extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      rooms: []
    }
  }
  componentDidMount() {
    const { getRooms = (() => {}) } = this.props
    getRooms().then(rooms => this.setState({ rooms }))
  }
  render() {
    const { rooms } = this.state
    const r = rooms.map(room => (
        <div key={room.id} style={{ background: 'white', border: '1px dashed black' }}>
            <a href={`/?room=${room.id}`} >
              {/* {room.id} */}
              <img src={room.snapshot} height='450' width='450'></img>
            </a>
        </div>
      )
    )
    return (
      <div>
        {r}
      </div>
    )
  }
}