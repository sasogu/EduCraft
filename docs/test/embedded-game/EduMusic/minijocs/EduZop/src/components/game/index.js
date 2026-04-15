var Game, styles, z;

z = require('zorium');

config = require('../../config')

Score = require('../../models/score')
Footer = require('../footer')

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            return window.setTimeout(callback, 1000 / 60);
          };
})();

window.cancelAnimFrame = (function(){
  return  window.cancelAnimationFrame       ||
          window.webkitCancelAnimationFrame ||
          window.mozCancelAnimationFrame    ||
          function(id) {
            clearTimeout(id)
          }
})();

module.exports = Game = (function() {
  var state = z.state({
    $footer: new Footer(),
    timeInterval: null,
    renderInterval: null
  })

  function normalizeMode(mode) {
    if (!mode) return ''
    return mode.toString().toLowerCase().trim()
  }

  function inferModeFromLocation() {
    try {
      var currentPath = (z.router && z.router.getCurrentPath && z.router.getCurrentPath()) || ''
      var hash = (typeof window !== 'undefined' && window.location && window.location.hash) ? window.location.hash : ''
      var pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : ''
      var combined = (currentPath + ' ' + hash + ' ' + pathname).toLowerCase()

      if (combined.indexOf('/relax') !== -1) return 'relax'
      if (combined.indexOf('/play') !== -1) return 'classic'
    } catch (e) {}
    return null
  }

  function Game(options) {
    options = options || {}
    this.mode = normalizeMode(options.mode) || inferModeFromLocation() || 'classic'
    this.timeInterval = null
    this._restart = null
    this._rafId = null
    this._mounted = false
    this._destroyed = false
    this._canvasEl = null
    this._touchstart = null
    this._touchend = null
    this._onmove = null
    this._prevOnResize = null
    this._hasPrevOnResize = false
  }

  Game.prototype.onBeforeUnmount = function () {
    this._destroyed = true
    this._mounted = false

    if (this.timeInterval) {
      clearInterval(this.timeInterval)
      this.timeInterval = null
    }

    if (this._rafId) {
      try { window.cancelAnimFrame(this._rafId) } catch (e) {}
      this._rafId = null
    }

    if (this._canvasEl) {
      try {
        if (this._touchstart) {
          this._canvasEl.removeEventListener('mousedown', this._touchstart)
          this._canvasEl.removeEventListener('touchstart', this._touchstart)
        }
        if (this._touchend) {
          this._canvasEl.removeEventListener('mouseup', this._touchend)
          this._canvasEl.removeEventListener('touchend', this._touchend)
        }
        if (this._onmove) {
          this._canvasEl.removeEventListener('mousemove', this._onmove)
          this._canvasEl.removeEventListener('touchmove', this._onmove)
        }
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      try {
        if (this._hasPrevOnResize) {
          window.onresize = this._prevOnResize
          this._prevOnResize = null
          this._hasPrevOnResize = false
        }
      } catch (e) {}
    }

    if (config && config.ENV !== config.ENVS.PROD && typeof console !== 'undefined' && console.debug) {
      console.debug('[Game] onBeforeUnmount: cleaned up')
    }
  }

  Game.prototype.onMount = function ($$el) {
    this._destroyed = false
    this._mounted = true

    var RATIO = window.devicePixelRatio || 1
    // Importante: al navegar, el reconciliador puede reutilizar la misma instancia
    // del componente. Preferimos la ruta actual si podemos inferirla.
    var inferredMode = inferModeFromLocation()
    var currentMode = normalizeMode(this.mode)
    var mode = inferredMode || currentMode || 'classic'
    this.mode = mode
    var isZen = mode === 'relax'
    var isTimed = !isZen

    var gameInstance = this
    var hasGameOver = false

    // Estado por instancia (evita que clásico/relax se pisen al navegar)
    var score = 0
    var time = isTimed ? 60 : null
    var selected = []
    var isSelecting = false
    var mouseX = 0
    var mouseY = 0
    var squareColor = null
    var lastPhysicsTime = 0

    var a = $$el.children[0]
    this._canvasEl = a
    var b = document.body
    a.width = window.innerWidth * RATIO
    a.height = window.innerHeight * RATIO
    this._hasPrevOnResize = true
    this._prevOnResize = window.onresize
    window.onresize = function () {
      window.location.reload()
    }

    var c = a.getContext('2d')

    var ctx = c
    var W = a.width
    var H = a.height
    var gridCount = 6
    var dotSize = Math.min(W, H) / 6.6
    var xs = W / 2 - dotSize * 3 + dotSize / 2
    var ys = H / 2 - dotSize * 3 + dotSize / 2

    if (W > H) {
      dotSize *= 0.68
      xs = W / 2 - dotSize * 3 + dotSize / 2
      ys = H / 2 - dotSize * 3
    }
    var tileSize = dotSize * 0.72
    var tileRadius = tileSize * 0.24
    var tileGlowSize = tileSize * 1.08
    var noteSize = tileSize * 0.72

    choice = function(arr) {
      return arr[Math.floor(Math.random()*arr.length)]
    }

    drawRoundedRect = function (x, y, w, h, r) {
      var rr = Math.min(r, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + rr, y)
      ctx.arcTo(x + w, y, x + w, y + h, rr)
      ctx.arcTo(x + w, y + h, x, y + h, rr)
      ctx.arcTo(x, y + h, x, y, rr)
      ctx.arcTo(x, y, x + w, y, rr)
      ctx.closePath()
    }

    drawTile = function (x, y, size, color, alpha) {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      drawRoundedRect(x, y, size, size, tileRadius)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Paleta base para la lógica del juego.
    // Si en algún momento modificas `colors` (p.ej. la vacías al llegar a cierto score),
    // esto evita que el juego se rompa por arrays vacíos/undefined.
    var baseColors = ['#F44336', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800']
    var colors = baseColors
    makeNoteSvgs = function (noteColor) {
      return [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="26" cy="42" rx="10" ry="7" fill="' + noteColor + '"/><rect x="34" y="12" width="4" height="30" fill="' + noteColor + '"/><path d="M38 12 Q52 18 44 30" stroke="' + noteColor + '" stroke-width="4" fill="none"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="26" cy="42" rx="10" ry="7" fill="none" stroke="' + noteColor + '" stroke-width="4"/><rect x="34" y="12" width="4" height="30" fill="' + noteColor + '"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="26" cy="42" rx="10" ry="7" fill="' + noteColor + '"/><rect x="34" y="12" width="4" height="30" fill="' + noteColor + '"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="26" cy="42" rx="10" ry="7" fill="none" stroke="' + noteColor + '" stroke-width="4"/></svg>'
      ]
    }
    noteSvgsLight = makeNoteSvgs('#ffffff')
    noteSvgsDark = makeNoteSvgs('#111827')
    noteImagesLight = baseColors.reduce(function (acc, color, i) {
      var img = new Image()
      var svg = noteSvgsLight[i % noteSvgsLight.length]
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
      acc[color] = img
      return acc
    }, {})
    noteImagesDark = baseColors.reduce(function (acc, color, i) {
      var img = new Image()
      var svg = noteSvgsDark[i % noteSvgsDark.length]
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
      acc[color] = img
      return acc
    }, {})

    symbolIndexForDot = function (dot) {
      // En modo "solo figuras" (Relax), el criterio de igualdad debe ser la figura.
      // Actualmente la figura está determinada por el índice del color en baseColors.
      // Como hay 5 colores y 4 figuras, algunas figuras se repiten con colores distintos.
      var colorIndex = baseColors.indexOf(dot.color)
      if (colorIndex < 0) colorIndex = 0
      return colorIndex % noteSvgsLight.length
    }

    var dots = []
    for (var x = 0; x < gridCount; x++) {
      for (var y = 0; y < gridCount; y++) {
        color = choice(baseColors)
        dots.push({
          color: color,
          ty: ys + y * dotSize,
          x: xs + x * dotSize,
          y: ys + y * dotSize,
          r: y,
          c: x
        })
      }
    }

    gameInstance._restart = function () {
      isSelecting = false
      selected = []
      isSelecting = false
      mouseX = 0
      mouseY = 0
      squareColor = null

      score = 0
      time = isTimed ? 60 : null
      lastPhysicsTime = 0

      for (var x = 0; x < gridCount; x++) {
        for (var y = 0; y < gridCount; y++) {
          color = choice(baseColors)
          dots[x + y * gridCount] = {
            color: color,
            ty: ys + y * dotSize,
            x: xs + x * dotSize,
            y: ys + y * dotSize - (dotSize * x * 2),
            r: y,
            c: x,
            tt: dotSize / 15
          }
        }
      }
    }

    gameInstance._restart()

    isSymbolOnlyMode = function () {
      return isZen || (isTimed && score >= 20)
    }

    if (isTimed) {
      // Limpia intervalos anteriores (por si hubo navegación rápida)
      if (this.timeInterval) {
        clearInterval(this.timeInterval)
        this.timeInterval = null
      }
      this.timeInterval = setInterval(function () {
          time -= 1
          time = Math.max(time, 0)
          if (time == 0 && !hasGameOver) {
            hasGameOver = true
            selected = []
            isSelecting = false
            squareColor = null
            Score.save(score)
            try {
              if (typeof window !== 'undefined' && window.ScoreService && typeof window.ScoreService.showSave === 'function') {
                window.ScoreService.showSave('eduzop', score)
              }
            } catch (e) {}
            if (gameInstance.timeInterval) {
              clearInterval(gameInstance.timeInterval)
              gameInstance.timeInterval = null
            }
            z.router.go('/game-over')
          }
        }, 1000)
    } else {
      if (this.timeInterval) {
        clearInterval(this.timeInterval)
        this.timeInterval = null
      }
    }

    render = function() {
      if (gameInstance._destroyed) {
        return
      }
      var physicsScale = 1
      var delta = 1
      if (lastPhysicsTime) {
        var now = Date.now()
        delta = now - lastPhysicsTime
        // we want 60fps
        physicsScale = delta / 16
        // clamp
        physicsScale = Math.min(physicsScale, 5)
        lastPhysicsTime = now
      } else {
        lastPhysicsTime = Date.now()
      }

      if (isTimed && time === 0) {
        return
      }
      ctx.clearRect(0, 0, W, H)

      ctx.fillStyle = '#f8fbff'
      ctx.fillRect(0, 0, W, H)

      var isSymbolOnly = isSymbolOnlyMode()
      if (squareColor && !isSymbolOnly) {
        ctx.globalAlpha = 0.08
        ctx.fillStyle = squareColor
        ctx.fillRect(0, 0, W, H)
        ctx.globalAlpha = 1
      } else if (squareColor) {
        ctx.globalAlpha = 0.06
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, W, H)
        ctx.globalAlpha = 1
      }

      if (isTimed) {
        ctx.font = '600 ' + dotSize / 2 + 'px "Space Grotesk"'
        function fillText(s, x, y) {
          ctx.fillText(s, x|0, y|0)
        }
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
        fillText(score, xs + dotSize * 2.5, ys - dotSize * 0.95)
        fillText(time, xs + dotSize, ys - dotSize * 0.95)
        fillText(Score.getBest(), xs + dotSize * 4, ys - dotSize * 0.95)

        ctx.textAlign = 'center'
        ctx.font = '500 ' + dotSize / 5 + 'px "Space Grotesk"'
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)'
        fillText('SCORE', xs + dotSize * 2.5, ys - dotSize + dotSize / 3.2)
        fillText('TIME', xs + dotSize, ys - dotSize + dotSize / 3.2)
        fillText('BEST', xs + dotSize * 4, ys - dotSize + dotSize / 3.2)
      }


      for (var i = dots.length - 1; i >= 0 ; i--) {
        var a = dots[i]
        var hasBelow = false
        for (var j = 0; j < dots.length; j++) {
          var b = dots[j]
          if (isBelow(a, b)) {
            hasBelow = true
            break
          }
        }
        if (!hasBelow && a.r != gridCount - 1) {
          a.r += 1
          a.ty = ys + a.r * dotSize
        }

        if (a.y != a.ty) {
          dir = a.y > a.ty ? -1 : 1
          a.y += a.tt * dir * physicsScale
          a.tt *= a.bdown && !a.bup ? 0.7 : 1.3

          if (dir == 1 && a.y >= a.ty) {
            a.y = a.ty
          } else if (dir == -1 && a.y <= a.ty) {
            a.y = a.ty
            if (a.bdown) {
              a.bdown = true
            }
          }

          if (!a.bdown && !a.bup && a.y == a.ty) {
            a.bdown = true
            a.ty -= dotSize / 3 * 1.3
            a.tt = dotSize / 5
          } else if (a.bdown && !a.bup && a.y == a.ty) {
            a.bup = true
            a.tt = dotSize / 25
            a.ty += dotSize / 3 * 1.3
          }

        } else {
          a.tt = dotSize / 15
          a.bdown = false
          a.bup = false
        }
      }


      for (var i = 0; i < dots.length; i++) {
        dot = dots[i]
        if (contains(selected, dot) || dot.color == squareColor) {
          var glowX = Math.floor(dot.x - tileGlowSize / 2)
          var glowY = Math.floor(dot.y - tileGlowSize / 2)
          ctx.shadowColor = 'rgba(0, 0, 0, 0)'
          var glowColor = isSymbolOnly ? '#0f172a' : dot.color
          drawTile(glowX, glowY, tileGlowSize, glowColor, 0.2)
        }
        var tileX = Math.floor(dot.x - tileSize / 2)
        var tileY = Math.floor(dot.y - tileSize / 2)
        ctx.shadowColor = 'rgba(15, 23, 42, 0.25)'
        ctx.shadowBlur = tileSize * 0.18
        ctx.shadowOffsetY = tileSize * 0.08
        ctx.fillStyle = isSymbolOnly ? '#ffffff' : dot.color
        drawRoundedRect(tileX, tileY, tileSize, tileSize, tileRadius)
        ctx.fill()
        ctx.shadowColor = 'rgba(0, 0, 0, 0)'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
        ctx.strokeStyle = isSymbolOnly ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.35)'
        ctx.lineWidth = 1
        ctx.stroke()
        var noteImg = (isSymbolOnly ? noteImagesDark : noteImagesLight)[dot.color]
        if (noteImg && noteImg.complete) {
          var size = noteSize
          ctx.drawImage(
            noteImg,
            Math.floor(dot.x - size / 2),
            Math.floor(dot.y - size / 2),
            Math.floor(size),
            Math.floor(size)
          )
        }
      }

      if (selected.length && isSelecting) {
        ctx.strokeStyle = isSymbolOnly ? '#0f172a' : selected[0].color
        ctx.lineJoin = 'round'
        ctx.lineWidth = dotSize / 7
        ctx.beginPath()
        ctx.moveTo(mouseX, mouseY)
        for (var i = 0; i < selected.length; i++) {
          var dot = selected[i]
          ctx.lineTo(dot.x, dot.y)
        }
        ctx.stroke()
      }

      gameInstance._rafId = window.requestAnimFrame(render)
    }

    isBelow = function (a, b) {
      return a.r + 1 == b.r && a.c == b.c
    }

    collideDot = function (x, y, dot) {
      return x > dot.x - dotSize / 2 &&
             x < dot.x + dotSize / 2 &&
             y > dot.y - dotSize / 2 &&
             y < dot.y + dotSize / 2
    }

    contains = function (arr, x) {
      return arr.indexOf(x) != -1
    }

    isNeighbor = function (a, b) {
      return a.r + 1 == b.r && a.c == b.c ||
             a.r - 1 == b.r && a.c == b.c ||
             a.c + 1 == b.c && a.r == b.r ||
             a.c - 1 == b.c && a.r == b.r
    }

    function touchstart(e) {
      e.preventDefault()
      if (isTimed && time == 0) return
      isSelecting = true

      var x, y
      if (e.pageX) {
        x = e.pageX
        y = e.pageY
      } else {
        var t = e.changedTouches
        x = t[0].pageX
        y = t[0].pageY
      }

      onmove({
        pageX: x,
        pageY: y
      })
    }

    this._touchstart = touchstart
    a.addEventListener('mousedown', touchstart)
    a.addEventListener('touchstart', touchstart)

    function touchend(e) {
      e.preventDefault()
      isSelecting = false
      if (selected.length < 2) {
        return selected = []
      }

      if (squareColor && !isSymbolOnlyMode()) {
        for (var i = 0; i < dots.length; i++) {
          var dot = dots[i]
          if (dot.color == squareColor) {
            selected.push(dot)
          }
        }
      }

      var highestRow = 0
      for (var i = 0; i < selected.length; i++) {
        var dot = selected[i]
        highestRow = Math.max(dot.r, highestRow)
      }

      for (var i = 0; i < selected.length; i++) {
        var dot = selected[i]
        do {
          var color = choice(baseColors)
        } while (color == squareColor)
        if (dot.r >= 0) {
          if (isTimed) {
            score += 1
          }
          dot.r -= highestRow + 1
          dot.y = ys + dot.r * dotSize
          dot.ty = ys + dot.r * dotSize
          dot.color = color
        }
      }

      squareColor = null
      selected = []
    }

    this._touchend = touchend
    a.addEventListener('mouseup', touchend)
    a.addEventListener('touchend', touchend)

    function onmove (e) {
      if (e.preventDefault)
        e.preventDefault()

      if (e.pageX) {
        mouseX = e.pageX * RATIO
        mouseY = e.pageY * RATIO
      } else {
        var t = e.changedTouches
        mouseX = t[0].pageX * RATIO
        mouseY = t[0].pageY * RATIO
        isSelecting = true
      }

      if (isSelecting && (!isTimed || time != 0)) {
        for (var i = 0; i < dots.length; i++) {
          var dot = dots[i]
          var isSymbolOnly = isSymbolOnlyMode()
          var isntSame = false

          if (selected.length) {
            if (isSymbolOnly) {
              isntSame = symbolIndexForDot(selected[0]) != symbolIndexForDot(dot)
            } else {
              isntSame = selected[0].color != dot.color
            }
          }

          if (isntSame || (selected.length && !isNeighbor(dot, selected[0])))
            continue
          if (collideDot(mouseX, mouseY, dot)) {
            if (!contains(selected, dot)) {
              selected.unshift(dot)
            } else if (selected[1] == dot) {
              selected.shift()
            } else {
              selected.unshift(dot)
              if (!isSymbolOnlyMode()) {
                squareColor = dot.color
              }
            }
          }
        }
      }
    }

    this._onmove = onmove
    a.addEventListener('mousemove', onmove)
    a.addEventListener('touchmove', onmove)

    if (config && config.ENV !== config.ENVS.PROD && typeof console !== 'undefined' && console.debug) {
      var cp = (z.router && z.router.getCurrentPath && z.router.getCurrentPath()) || ''
      var h = (typeof window !== 'undefined' && window.location && window.location.hash) ? window.location.hash : ''
      var pn = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : ''
      console.debug('[Game] onMount: mode=' + mode + ' inferred=' + (inferredMode || '') + ' current=' + (currentMode || '') + ' path=' + cp + ' hash=' + h + ' pathname=' + pn)
    }

    render()
  }

  Game.prototype.restart = function () {
    if (this._restart)
      this._restart()
  }

  Game.prototype.render = function() {
    var self = this
    $footer = state.$footer

    return z('z-game',
      {style: {
        width: '100%',
        height: '100%'
      }},
      z('canvas#canvas', {
        style: {
          display: 'block',
          width: '100%',
          height: '100%'
        }
      }),
      z($footer, {
        onBack: function () {
          z.router.go('/')
        }
      })
    )
  };

  return Game;
})();
