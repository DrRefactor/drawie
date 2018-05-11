import React from 'react'
import App from './App'
import { BrowserRouter as Router } from 'react-router-dom'

export default class Shell extends React.PureComponent {
  render() {
    return (
      <Router>
        <App />
      </Router>
    )
  }
}