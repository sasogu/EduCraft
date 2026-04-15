z = require 'zorium'

Score = require '../../models/score'

require './index.styl'

module.exports = class GameOver
  render: =>
    lastScore = Score.getLast()
    bestScore = Score.getBest()

    againBtn = z 'button', {
      type: 'button'
      className: 'zp-button'
      onclick: ->
        z.router.go '/'
    }, z 'div', {className: 'zp-button__content'}, 'jugar de nuevo'

    z '.z-game-over',
      z '.current-score', '' + lastScore
      z '.current-label', 'SCORE'
      z '.divider'
      z '.best-score', '' + bestScore
      z '.best-label', 'BEST'
      z '.buttons',
        againBtn
