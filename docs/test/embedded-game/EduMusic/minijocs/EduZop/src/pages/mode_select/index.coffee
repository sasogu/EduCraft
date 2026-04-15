z = require 'zorium'

config = require '../../config'

require './index.styl'

module.exports = class ModeSelectPage
  constructor: ->
    null

  render: =>
    goAndReload = (path) ->
      z.router.go path
      # Forzamos recarga para reinicializar el juego (canvas/estado) al entrar en un modo.
      # El deploy usa hash routing y 404.html redirige rutas SPA, así que el reload no rompe Pages.
      setTimeout((-> window.location.reload()), 20)

    classicBtn = z 'button', {
      onclick: -> goAndReload '/play'
      type: 'button'
      className: 'zp-button'
    }, z 'div', {className: 'zp-button__content'}, 'Jugar'

    zenBtn = z 'button', {
      onclick: -> goAndReload '/relax'
      type: 'button'
      className: 'zp-button'
    }, z 'div', {className: 'zp-button__content'}, 'Jugar'

    z '.z-mode-select', [
      z '.title', 'EduZop'
      z '.subtitle', 'Selecciona un modo'
      z '.cards', [
        z '.card', [
          z '.card-title', 'Clásico'
          z '.card-desc', 'Tiempo y puntuación. A los 20 puntos se ocultan los colores.'
          classicBtn
        ]
        z '.card', [
          z '.card-title', 'Relax'
          z '.card-desc', 'Sin tiempo ni puntuación. Solo conecta figuras.'
          zenBtn
        ]
      ]
    ]
