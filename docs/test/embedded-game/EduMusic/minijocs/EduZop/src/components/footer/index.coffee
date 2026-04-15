z = require 'zorium'

require './index.styl'

module.exports = class Footer
  constructor: ->
    null

  render: ({onBack}) =>
    backBtn = z 'button', {
      onclick: onBack
      type: 'button'
      className: 'zp-button'
    }, z 'div', {className: 'zp-button__content'}, 'volver'

    z '.z-footer', [
      z '.left', [
        backBtn
      ]
    ]
