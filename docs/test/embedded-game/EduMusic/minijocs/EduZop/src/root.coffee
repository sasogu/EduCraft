require './polyfill'

_ = require 'lodash'
z = require 'zorium'
log = require 'clay-loglevel'

config = require './config'
HomePage = require './pages/home'
ModeSelectPage = require './pages/mode_select'
ZenPage = require './pages/zen'
GameOverPage = require './pages/game_over'
ErrorReportService = require './services/error_report'

require './root.styl'

###########
# LOGGING #
###########

window.addEventListener 'error', ErrorReportService.report

if config.ENV isnt config.ENVS.PROD
  log.enableAll()
else
  log.setLevel 'error'
  log.on 'error', ErrorReportService.report
  log.on 'trace', ErrorReportService.report


#################
# ROUTING SETUP #
#################

root = document.getElementById('app')
z.router.setRoot root
z.router.add '/', ModeSelectPage
z.router.add '/play', HomePage
z.router.add '/relax', ZenPage
z.router.add '/game-over', GameOverPage

# Dispara el render inicial sin romper deep-links (/#/relax).
# En GitHub Pages (proyectos) `window.location.pathname` incluye el nombre del repo
# (p.ej. /EduZop/). El router de Zorium en modo `hash` puede tomar ese pathname
# como ruta inicial y no coincide con nuestras rutas ('/', '/play', ...).
# Para evitar un render en blanco, priorizamos el hash (/#/relax) y caemos a '/'.
initialPath = (window.location.hash or '').replace(/^#/, '')
z.router.go(initialPath or '/')
