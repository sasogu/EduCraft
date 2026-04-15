z = require 'zorium'
_ = require 'lodash'

Game = require '../../components/game'

module.exports = class HomePage
  constructor: ->
    @state = z.state
      $game: new Game(mode: 'classic')

  render: =>
    {$game} = @state()
    z 'div',
      z $game
