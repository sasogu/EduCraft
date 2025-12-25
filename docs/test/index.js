/* globals BABYLON */

'use strict';

var cameraFov = 0.8
var defaultFov = 0.8
var highlightScale = 1.0
var lastValidPos = null
var islandAnimal = null
var playerNameCurrent = null
var localPlayerNametag = null
var playerPanelMinimized = false


/**
 * Classic-inspired testbed.
 */

var noaEngine = require('../..')
var createRegistry = require('./registry')
var storage = require('./storage')

var opts = {
	debug: true,
	showFPS: true,
	inverseY: true,
	chunkSize: 32,
	chunkAddDistance: 2,
	chunkRemoveDistance: 3,
	blockTestDistance: 6,
	texturePath: 'textures/',
	playerStart: [0.5, 6, 0.5],
	playerHeight: 1.6,
	playerWidth: 0.6,
	playerAutoStep: false,
	useAO: false,
	dragCameraOutsidePointerLock: false,
}


// create engine

var noa = noaEngine(opts)
noa.inputs.bind('fov-adjust', 'F')
var scene = noa.rendering.getScene()
if (scene && scene.activeCamera) {
	defaultFov = scene.activeCamera.fov
	cameraFov = defaultFov
}
setupInputFocus(noa)
configureMovement(noa)

var multiplayer = setupMultiplayer(noa, scene)

scene.clearColor = new BABYLON.Color4(0.62, 0.82, 1.0, 1.0)
scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR
scene.fogColor = new BABYLON.Color3(0.62, 0.82, 1.0)
scene.fogStart = 24
scene.fogEnd = 80

var light = new BABYLON.HemisphericLight('sun', new BABYLON.Vector3(0.3, 1, 0.4), scene)
light.intensity = 0.9

noa.inputs.unbind('alt-fire')
noa.inputs.bind('alt-fire', '<mouse 3>')

createWebScreen(scene)


//		World generation


// block registry
var registry = createRegistry(noa, scene)
var blockCatalog = registry.blockCatalog
var musicBlocks = registry.musicBlocks
var defaultLockState = blockCatalog.map(function (block) { return !!block.locked })
var grassID = registry.ids.grassID
var dirtID = registry.ids.dirtID
var stoneID = registry.ids.stoneID
var brickID = registry.ids.brickID
var woodID = registry.ids.woodID
var plankID = registry.ids.plankID
var sandID = registry.ids.sandID
var gravelID = registry.ids.gravelID
var leavesID = registry.ids.leavesID
var glassID = registry.ids.glassID
var waterID = registry.ids.waterID
var clefID = registry.ids.clefID
var fenceID = registry.ids.fenceID
var bridgeID = registry.ids.bridgeID
var dandelionID = registry.ids.dandelionID
var poppyID = registry.ids.poppyID
var snowID = null

noa.blockTargetIdCheck = function (id) {
	if (!id) return false
	if (id === dandelionID || id === poppyID) return true
	return noa.registry.getBlockSolidity(id)
}

function setupMultiplayer(noa, scene) {
	var params = new URLSearchParams(window.location.search)
	var serverUrl = params.get('server')
	var playerName = getPlayerName()
	var proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
	if (!serverUrl) serverUrl = proto + '://' + window.location.host + '/ws'

	var socket = null
	var clientId = null
	var remotePlayers = {}
	var reconnectTimer = null
	var pingTimer = null
	var sendCooldown = 0
	var snapshotDelay = 120

	function send(msg) {
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(msg))
		}
	}

	function scheduleReconnect() {
		if (reconnectTimer) return
		reconnectTimer = setTimeout(function () {
			reconnectTimer = null
			connect()
		}, 2000)
	}

	function connect() {
		if (socket && socket.readyState === WebSocket.OPEN) return
		socket = new WebSocket(serverUrl)

		socket.addEventListener('open', function () {
			send({ type: 'hello', v: 1, name: playerName || 'Player' })
			if (pingTimer) clearInterval(pingTimer)
			pingTimer = setInterval(function () {
				send({ type: 'ping', v: 1, t: Date.now() })
			}, 5000)
		})

		socket.addEventListener('message', function (event) {
			var msg = {}
			try {
				msg = JSON.parse(event.data)
			} catch (err) {
				return
			}
			if (!msg || msg.v !== 1 || typeof msg.type !== 'string') return

			if (msg.type === 'welcome') {
				clientId = msg.id
				return
			}

			if (msg.type === 'snapshot' && Array.isArray(msg.players)) {
				var seen = {}
				msg.players.forEach(function (player) {
					if (!player || player.id === clientId) return
					seen[player.id] = true
					upsertRemotePlayer(player)
				})
				Object.keys(remotePlayers).forEach(function (id) {
					if (!seen[id]) removeRemotePlayer(id)
				})
				return
			}

			if (msg.type === 'delta' && Array.isArray(msg.players)) {
				msg.players.forEach(function (player) {
					if (!player || player.id === clientId) return
					upsertRemotePlayer(player)
				})
				return
			}

			if (msg.type === 'playerLeft' && msg.id) {
				removeRemotePlayer(msg.id)
			}
		})

		socket.addEventListener('close', function () {
			if (pingTimer) {
				clearInterval(pingTimer)
				pingTimer = null
			}
			scheduleReconnect()
		})

		socket.addEventListener('error', function () {
			scheduleReconnect()
		})
	}

	function setName(name) {
		playerName = sanitizePlayerName(name)
		if (!playerName) return
		if (socket && socket.readyState === WebSocket.OPEN) {
			send({ type: 'hello', v: 1, name: playerName })
		}
	}

	function upsertRemotePlayer(player) {
		var entry = remotePlayers[player.id]
		if (!entry) {
			var size = noa.entities.getPositionData(noa.playerEntity)
			var mesh = createRemoteMesh(player.id, scene)
			var eid = noa.entities.add([player.x, player.y, player.z], size.width, size.height, mesh, [0, size.height / 2, 0], false, false)
			entry = {
				eid: eid,
				mesh: mesh,
				nametag: createNametag(mesh, player.name || 'Player', size.height, scene),
				name: player.name || 'Player',
				last: { x: player.x, y: player.y, z: player.z },
				target: { x: player.x, y: player.y, z: player.z },
				lastUpdate: Date.now(),
			}
			remotePlayers[player.id] = entry
		}
		if (player.name && entry.name !== player.name) {
			entry.name = player.name
			updateNametag(entry.nametag, player.name)
		}
		entry.last = { x: entry.target.x, y: entry.target.y, z: entry.target.z }
		entry.target = { x: player.x, y: player.y, z: player.z }
		entry.lastUpdate = Date.now()
	}

	function removeRemotePlayer(id) {
		var entry = remotePlayers[id]
		if (!entry) return
		if (entry.nametag) entry.nametag.dispose()
		noa.entities.deleteEntity(entry.eid, true)
		delete remotePlayers[id]
	}

	function createRemoteMesh(id, scene) {
		var mesh = BABYLON.Mesh.CreateBox('remote-' + id, 1, scene)
		mesh.isPickable = false
		var mat = new BABYLON.StandardMaterial('remote-mat-' + id, scene)
		var color = colorFromId(id)
		mat.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b)
		mesh.material = mat
		return mesh
	}

	function colorFromId(id) {
		var hash = 0
		for (var i = 0; i < id.length; i++) {
			hash = (hash << 5) - hash + id.charCodeAt(i)
			hash |= 0
		}
		return {
			r: ((hash >> 16) & 255) / 255,
			g: ((hash >> 8) & 255) / 255,
			b: (hash & 255) / 255,
		}
	}

	function tick(dt) {
		sendCooldown -= dt
		if (sendCooldown > 0) return
		sendCooldown = 60

		if (!socket || socket.readyState !== WebSocket.OPEN) return
		var pos = noa.entities.getPositionData(noa.playerEntity).position
		send({ type: 'move', v: 1, x: pos[0], y: pos[1], z: pos[2] })
	}

	function lerp(a, b, t) {
		return a + (b - a) * t
	}

	function updateRemotes() {
		var now = Date.now()
		Object.keys(remotePlayers).forEach(function (id) {
			var entry = remotePlayers[id]
			var elapsed = now - entry.lastUpdate
			var t = Math.min(1, Math.max(0, (elapsed + snapshotDelay) / snapshotDelay))
			var x = lerp(entry.last.x, entry.target.x, t)
			var y = lerp(entry.last.y, entry.target.y, t)
			var z = lerp(entry.last.z, entry.target.z, t)
			noa.entities.setPosition(entry.eid, x, y, z)
		})
	}

	connect()

	return { tick: tick, updateRemotes: updateRemotes, setName: setName }
}

function getPlayerName() {
	var fromParams = getPlayerNameFromParams()
	if (fromParams) {
		playerNameCurrent = fromParams
		localStorage.setItem('educraft-player-name', fromParams)
		return fromParams
	}
	var stored = sanitizePlayerName(localStorage.getItem('educraft-player-name') || '')
	if (stored) {
		playerNameCurrent = stored
		return stored
	}
	var fallback = 'P' + Math.floor(Math.random() * 900 + 100)
	playerNameCurrent = fallback
	localStorage.setItem('educraft-player-name', fallback)
	return fallback
}

function getPlayerNameFromParams() {
	var params = new URLSearchParams(window.location.search)
	return sanitizePlayerName(params.get('name') || params.get('player') || '')
}

function sanitizePlayerName(name) {
	if (!name) return ''
	var cleaned = name.trim().replace(/\s+/g, '')
	cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3)
	return cleaned.toUpperCase()
}

function createNametag(parent, name, height, scene) {
	var fontSize = 64
	var font = "bold " + fontSize + "px 'Silkscreen'"
	var planeHeight = 0.28
	var temp = new BABYLON.DynamicTexture('nametag-tmp', 64, scene, false)
	var ctx = temp.getContext()
	ctx.font = font
	var textWidth = ctx.measureText(name).width + 12
	temp.dispose()

	var planeWidth = (planeHeight / (1.5 * fontSize)) * textWidth
	var texture = new BABYLON.DynamicTexture('nametag', { width: textWidth, height: fontSize * 1.5 }, scene, false)
	var mat = noa.rendering.makeStandardMaterial('nametag-mat-' + name)
	mat.diffuseTexture = texture
	mat.emissiveTexture = mat.diffuseTexture
	mat.opacityTexture = mat.diffuseTexture
	mat.diffuseTexture.hasAlpha = true
	mat.specularColor = new BABYLON.Color3(0, 0, 0)
	texture.drawText(name, null, null, font, '#ffffff', '#00000088', true)

	var plane = BABYLON.MeshBuilder.CreatePlane('nametag-plane', { width: planeWidth, height: planeHeight }, scene)
	plane.material = mat
	plane.isPickable = false
	plane.setParent(parent)
	plane.position.y = height + 0.2
	return plane
}

function updateNametag(plane, name) {
	if (!plane || !plane.material || !plane.material.diffuseTexture) return
	var texture = plane.material.diffuseTexture
	texture.clear()
	var fontSize = texture.getSize().height / 1.5
	var font = "bold " + fontSize + "px 'Silkscreen'"
	texture.drawText(name, null, null, font, '#ffffff', '#00000088', true)
}

function setPlayerName(name) {
	var cleaned = sanitizePlayerName(name)
	if (!cleaned) return false
	playerNameCurrent = cleaned
	localStorage.setItem('educraft-player-name', cleaned)
	updatePlayerPanel()
	if (localPlayerNametag) updateNametag(localPlayerNametag, cleaned)
	if (multiplayer && multiplayer.setName) multiplayer.setName(cleaned)
	return true
}

function setupPlayerPanel() {
	if (!ui.playerNameInput) return
	ui.playerNameInput.value = playerNameCurrent || ''
	updatePlayerPanel()
	if (playerNameCurrent) {
		setPlayerPanelMinimized(true)
	}
	if (ui.playerNameSave) {
		ui.playerNameSave.addEventListener('click', function () {
			var next = ui.playerNameInput.value || ''
			if (!setPlayerName(next)) return
			setPlayerPanelMinimized(true)
		})
	}
	ui.playerNameInput.addEventListener('keydown', function (event) {
		if (event.key === 'Enter') {
			if (setPlayerName(ui.playerNameInput.value || '')) {
				setPlayerPanelMinimized(true)
			}
		}
	})
	if (ui.playerPanel) {
		ui.playerPanel.addEventListener('click', function () {
			if (!playerPanelMinimized) return
			setPlayerPanelMinimized(false)
			if (ui.playerNameInput && ui.playerNameInput.focus) {
				ui.playerNameInput.focus()
			}
		})
	}
}

function updatePlayerPanel() {
	if (ui.playerNameInput) {
		ui.playerNameInput.value = playerNameCurrent || ''
	}
	if (ui.playerNameCurrent) {
		ui.playerNameCurrent.textContent = playerNameCurrent || '--'
	}
	if (ui.playerPanel) {
		ui.playerPanel.classList.toggle('minimized', playerPanelMinimized)
	}
}

function setPlayerPanelMinimized(minimized) {
	playerPanelMinimized = !!minimized
	if (ui.playerPanel) {
		ui.playerPanel.classList.toggle('minimized', playerPanelMinimized)
	}
}

function setupInputFocus(noa) {
	var el = noa.container && noa.container.element
	if (!el || !el.focus) return
	el.focus()
	document.addEventListener('click', function () {
		el.focus()
		if (el.requestPointerLock) el.requestPointerLock()
	})
}

function configureMovement(noa) {
	var movement = noa.entities.getMovement(noa.playerEntity)
	if (!movement) return
	movement.maxSpeed = 6
	movement.moveForce = 20
	movement.responsiveness = 10
	movement.runningFriction = 1
	movement.standingFriction = 8
	movement.airJumps = 0
	movement.jumpImpulse = 6
	movement.jumpForce = 8
	movement.jumpTime = 260
}

function setupWebOverlay() {
	if (!ui.webPanel || !ui.webIframe) return
	if (ui.webClose) {
		ui.webClose.addEventListener('click', function () {
			hideWebPanel()
		})
	}
	ui.webPanel.addEventListener('click', function (event) {
		if (event.target === ui.webPanel) hideWebPanel()
	})
	setupEmbeddedGameBridge()
}

function showWebPanel() {
	if (!ui.webPanel || !ui.webIframe) return
	ui.webIframe.src = webPanelUrl
	ui.webPanel.classList.add('active')
	if (document.exitPointerLock) document.exitPointerLock()
}

function hideWebPanel() {
	if (!ui.webPanel || !ui.webIframe) return
	ui.webPanel.classList.remove('active')
	ui.webIframe.src = ''
}

function setupEmbeddedGameBridge() {
	if (webMessageListenerAttached) return
	webMessageListenerAttached = true

	window.EduCraft = window.EduCraft || {}
	window.EduCraft.completeEmbeddedGame = function (payload) {
		handleEmbeddedGameCompletion(payload || {})
	}
	window.EduCraft.hasUnlockedBlock = function (name) {
		if (!name) return false
		var block = getBlockByName(name)
		return !!(block && !block.locked)
	}

	window.addEventListener('message', function (event) {
		if (!isEmbeddedGameEvent(event)) return
		if (event.data === 'educraft:challenge-complete') {
			handleEmbeddedGameCompletion({})
			return
		}
		if (!event.data || typeof event.data !== 'object') return
		if (event.data.type !== 'educraft:challenge-complete') return
		handleEmbeddedGameCompletion(event.data.payload || event.data)
	})
}

function isEmbeddedGameEvent(event) {
	if (!event) return false
	if (event.origin && event.origin !== window.location.origin) return false
	if (ui.webIframe && ui.webIframe.contentWindow && event.source !== ui.webIframe.contentWindow) return false
	return true
}

function handleEmbeddedGameCompletion(payload) {
	var data = payload || {}
	var title = (typeof data.title === 'string' && data.title.trim()) ? data.title.trim() : 'Reto completado'
	var message = (typeof data.message === 'string' && data.message.trim()) ? data.message.trim() : 'Has completado el minijuego.'
	var rewardName = (typeof data.reward === 'string') ? data.reward.trim() : ''

	if (rewardName) {
		var unlocked = unlockBlockByName(rewardName)
		if (unlocked) {
			message += ' Recompensa desbloqueada: ' + rewardName + '.'
		} else {
			message += ' Recompensa: ' + rewardName + '.'
		}
		if (rewardName === 'Valla' && data.placeFenceReward && !rewardPlaced) {
			placeFenceRewardNearPlayer()
			rewardPlaced = true
		}
	}

	showChallengeBanner(title, message)
	if (data.closePanel) hideWebPanel()
}

function createWebScreen(scene) {
	if (!scene) return
	var post = BABYLON.MeshBuilder.CreateBox('web-post', { width: 0.35, height: 3.2, depth: 0.35 }, scene)
post.position = new BABYLON.Vector3(4, 5.6, -6.15)
	post.isPickable = false

	var signBoard = BABYLON.MeshBuilder.CreateBox('web-sign-board', { width: 2.6, height: 1.2, depth: 0.2 }, scene)
signBoard.position = new BABYLON.Vector3(4, 6.3, -6)
	signBoard.isPickable = false

	var signFace = BABYLON.MeshBuilder.CreatePlane('web-sign-face', { width: 2.8, height: 1.2 }, scene)
signFace.position = new BABYLON.Vector3(4, 6.3, -6.22)
signFace.rotation.y = Math.PI
	signFace.isPickable = true

	var woodMat = new BABYLON.StandardMaterial('web-sign-wood-mat', scene)
	woodMat.diffuseColor = new BABYLON.Color3(0.46, 0.3, 0.18)
	woodMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1)
	post.material = woodMat

	var signMat = new BABYLON.StandardMaterial('web-sign-mat', scene)
	signMat.diffuseColor = new BABYLON.Color3(0.5, 0.35, 0.2)
	signMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1)

	var tex = new BABYLON.DynamicTexture('web-sign-text', { width: 512, height: 256 }, scene, false)
	var ctx = tex.getContext()
	ctx.fillStyle = '#5b3a1f'
	ctx.fillRect(0, 0, 512, 256)
	ctx.strokeStyle = '#2b1607'
	ctx.lineWidth = 12
	ctx.strokeRect(10, 10, 492, 236)
	ctx.fillStyle = '#f5e7c5'
	ctx.font = "bold 34px 'Silkscreen'"
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.font = "bold 44px 'Silkscreen'"
	ctx.fillText('EDUBEATRIX', 256, 96)
	ctx.font = "bold 20px 'Silkscreen'"
	ctx.fillText('Pulsa V para abrir', 256, 150)
	tex.update()
	signMat.diffuseTexture = tex
	signMat.diffuseTexture.vScale = -1
	signMat.diffuseTexture.vOffset = 1
	signMat.diffuseTexture.uScale = -1
	signMat.diffuseTexture.uOffset = 1
	signMat.emissiveColor = new BABYLON.Color3(0.15, 0.1, 0.05)
	signMat.backFaceCulling = false
	signBoard.material = signMat
	signFace.material = signMat

	webSignMesh = signFace
}



var defaultHotbarLabels = [
	'Clave de sol',
	'Do4 Negra',
	'Re4 Negra',
	'Mi4 Negra',
	'Fa4 Negra',
	'Sol4 Negra',
	'La4 Negra',
	'Si4 Negra',
	'Silencio Negra',
	'Do5 Negra',
]


// add a listener for when the engine requests a new world chunk
// `data` is an ndarray - see https://github.com/scijs/ndarray
noa.world.on('worldDataNeeded', function (id, data, x, y, z) {
	// populate ndarray with world data (block IDs or 0 for air)
	for (var i = 0; i < data.shape[0]; ++i) {
		for (var k = 0; k < data.shape[2]; ++k) {
			var worldX = x + i
			var worldZ = z + k
			for (var j = 0; j < data.shape[1]; ++j) {
				var worldY = y + j
				var block = decideBlock(worldX, worldY, worldZ)
				if (block) data.set(i, j, k, block)
			}
		}
	}
	// pass the finished data back to the game engine
	noa.world.setChunkData(id, data)
})

var baseHeight = 4
var waterLevel = baseHeight - 1
var treeCellSize = 7
var treeDensity = 0.12
var shrubDensity = 0.02
var rockDensity = 0.01
var flowerDensity = 0.03

function getEditKey(x, y, z) {
	return x + '|' + y + '|' + z
}

function getEditBlock(x, y, z) {
	var key = getEditKey(x, y, z)
	if (Object.prototype.hasOwnProperty.call(worldEdits, key)) {
		return worldEdits[key]
	}
	return null
}

function decideBlock(x, y, z) {
	var edit = getEditBlock(x, y, z)
	if (edit !== null) return edit

	var surface = getHeight(x, z)

	if (y < surface) {
		if (y === surface - 1) {
			if (surface <= waterLevel + 1) return sandID
			return grassID
		}
		if (y >= surface - 3) return dirtID
		return stoneID
	}

	if (y <= waterLevel) return waterID

	var tree = getTreeAt(x, z)
	if (tree) {
		var trunkBase = tree.base
		var trunkTop = trunkBase + tree.height
		if (x === tree.x && z === tree.z && y >= trunkBase && y < trunkTop) return woodID

		if (y >= trunkTop - 2 && y <= trunkTop + tree.radius) {
			var dx = x - tree.x
			var dz = z - tree.z
			var dist = Math.sqrt(dx * dx + dz * dz)
			var leafRadius = tree.radius - Math.max(0, y - trunkTop) * 0.6
			if (dist <= leafRadius) return leavesID
		}
	}

	if (y === surface && surface > waterLevel + 1) {
		var flowerChance = hash2D(x, z, 41)
		if (flowerChance < flowerDensity) {
			return (hash2D(x, z, 42) < 0.5) ? dandelionID : poppyID
		}
		var shrubChance = hash2D(x, z, 55)
		if (shrubChance < shrubDensity) return leavesID
		if (hash2D(x, z, 77) < rockDensity) return stoneID
	}

	return 0
}

function getHeight(x, z) {
	var h = baseHeight
	h += Math.floor(Math.sin(x / 12) * 2 + Math.cos(z / 14) * 2)
	h += Math.floor(Math.sin((x + z) / 18) * 1.5)
	return Math.max(2, h)
}

function getTreeAt(x, z) {
	var cellX = Math.floor(x / treeCellSize)
	var cellZ = Math.floor(z / treeCellSize)
	var best = null

	for (var dx = -1; dx <= 1; dx++) {
		for (var dz = -1; dz <= 1; dz++) {
			var tree = getTreeForCell(cellX + dx, cellZ + dz)
			if (!tree) continue
			var reach = tree.radius + 1
			if (Math.abs(x - tree.x) > reach || Math.abs(z - tree.z) > reach) continue
			if (!best || tree.radius > best.radius) best = tree
		}
	}

	return best
}

function getTreeForCell(cellX, cellZ) {
	var chance = hash2D(cellX, cellZ, 21)
	if (chance > treeDensity) return null

	var offsetX = Math.floor(hash2D(cellX, cellZ, 22) * treeCellSize)
	var offsetZ = Math.floor(hash2D(cellX, cellZ, 23) * treeCellSize)
	var trunkX = cellX * treeCellSize + offsetX
	var trunkZ = cellZ * treeCellSize + offsetZ
	var base = getHeight(trunkX, trunkZ)
	if (base <= waterLevel + 1) return null

	var height = 4 + Math.floor(hash2D(cellX, cellZ, 24) * 4)
	var radius = 2 + Math.floor(hash2D(cellX, cellZ, 25) * 2)

	return {
		x: trunkX,
		z: trunkZ,
		base: base,
		height: height,
		radius: radius
	}
}

function hash2D(x, z, seed) {
	var n = x * 374761393 + z * 668265263 + seed * 1442695041
	n = (n ^ (n >> 13)) * 1274126177
	return ((n ^ (n >> 16)) >>> 0) / 4294967295
}


// 		add a mesh to represent the player


// get the player entity's ID and other info (aabb, size)
var eid = noa.playerEntity
var dat = noa.entities.getPositionData(eid)
var w = dat.width
var h = dat.height

// make a Babylon.js mesh and scale it, etc.
var playerMesh = BABYLON.Mesh.CreateBox('player', 1, scene)
playerMesh.scaling.x = playerMesh.scaling.z = w
playerMesh.scaling.y = h

// offset of mesh relative to the entity's "position" (center of its feet)
var offset = [0, h / 2, 0]

localPlayerNametag = createNametag(playerMesh, getPlayerName(), h, scene)

// a "mesh" component to the player entity
noa.entities.addComponent(eid, noa.entities.names.mesh, {
	mesh: playerMesh,
	offset: offset
})

spawnIslandAnimal()

function spawnIslandAnimal() {
	var roamCenterX = opts.playerStart[0]
	var roamCenterZ = opts.playerStart[2]
	var roamRadius = opts.chunkSize * (opts.chunkRemoveDistance - 0.5)
	var avoidRadius = 18
	var spawnMinDist = 8
	var spawnMaxDist = 14
	var spawn = findSheepSpot(roamCenterX, roamCenterZ, spawnMinDist, spawnMaxDist)
	var baseX = Math.floor(spawn.x)
	var baseZ = Math.floor(spawn.z)
	var baseY = getHeight(baseX, baseZ)
	var size = { width: 1.0, height: 1.0 }

	var root = new BABYLON.Mesh('island-sheep-root', scene)
	var woolMat = new BABYLON.StandardMaterial('island-sheep-wool', scene)
	woolMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95)
	woolMat.specularColor = new BABYLON.Color3(0, 0, 0)

	var headMat = new BABYLON.StandardMaterial('island-sheep-head', scene)
	headMat.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.75)
	headMat.specularColor = new BABYLON.Color3(0, 0, 0)

	var legMat = new BABYLON.StandardMaterial('island-sheep-leg', scene)
	legMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2)
	legMat.specularColor = new BABYLON.Color3(0, 0, 0)

	var body = BABYLON.MeshBuilder.CreateBox('island-sheep-body', { width: 1.2, height: 0.7, depth: 0.8 }, scene)
	body.material = woolMat
	body.parent = root
	body.position.y = 0.6

	var head = BABYLON.MeshBuilder.CreateBox('island-sheep-head', { width: 0.4, height: 0.4, depth: 0.5 }, scene)
	head.material = headMat
	head.parent = root
	head.position.y = 0.7
	head.position.z = 0.65

	var legs = []
	var legOffsets = [
		[-0.4, 0.2, -0.25],
		[0.4, 0.2, -0.25],
		[-0.4, 0.2, 0.25],
		[0.4, 0.2, 0.25],
	]
	for (var i = 0; i < legOffsets.length; i++) {
		var leg = BABYLON.MeshBuilder.CreateBox('island-sheep-leg-' + i, { width: 0.18, height: 0.4, depth: 0.18 }, scene)
		leg.material = legMat
		leg.parent = root
		leg.position.x = legOffsets[i][0]
		leg.position.y = legOffsets[i][1]
		leg.position.z = legOffsets[i][2]
		legs.push(leg)
	}

	var eid = noa.entities.add(
		[baseX + 0.5, baseY, baseZ + 0.5],
		size.width,
		size.height,
		root,
		[0, 0, 0],
		false,
		false
	)

	islandAnimal = {
		eid: eid,
		root: root,
		legs: legs,
		homeX: baseX + 0.5,
		homeZ: baseZ + 0.5,
		roamCenterX: roamCenterX,
		roamCenterZ: roamCenterZ,
		roamRadius: roamRadius,
		avoidX: roamCenterX,
		avoidZ: roamCenterZ,
		avoidRadius: avoidRadius,
		time: 0,
		speed: 0.00015,
		gravity: -0.00012,
		velY: 0,
		grounded: true,
		radius: 2.5,
		targetX: null,
		targetZ: null,
		nextTargetTime: 0,
	}
}



// 		Interactivity:

function applyBlockEdit(blockId, position) {
	if (blockId !== 0) {
		var block = getBlockById(blockId)
		if (block && block.locked) {
			showLockedNotice('Bloque aun no desbloqueado.')
			return
		}
		var targetBlock = noa.getBlock(position[0], position[1], position[2])
		if (targetBlock === waterID && blockId !== bridgeID) {
			return
		}
	}
	var key = getEditKey(position[0], position[1], position[2])
	worldEdits[key] = blockId
	scheduleSaveWorld()
	if (blockId === 0) {
		noa.setBlock(0, position)
	} else {
		noa.addBlock(blockId, position)
	}
}

function playBreakSound() {
	var sound = breakSoundPool[breakSoundIndex]
	if (!sound) {
		sound = new Audio('audio/random/break.ogg')
		sound.volume = 0.4
		breakSoundPool[breakSoundIndex] = sound
	}
	breakSoundIndex = (breakSoundIndex + 1) % 4
	try {
		sound.currentTime = 0
		sound.play()
	} catch (err) {
		// ignore playback errors
	}
}

function registerStepSoundSet(name, files) {
	stepSoundSets[name] = {
		files: files,
		pool: [],
		index: 0,
	}
}

function playStepSoundFor(blockId) {
	var setName = getStepSoundName(blockId)
	if (!setName) return
	var set = stepSoundSets[setName]
	if (!set) return
	var file = set.files[set.index % set.files.length]
	var sound = set.pool[set.index % set.files.length]
	if (!sound) {
		sound = new Audio(file)
		sound.volume = 0.28
		set.pool[set.index % set.files.length] = sound
	}
	set.index = (set.index + 1) % set.files.length
	try {
		sound.currentTime = 0
		sound.play()
	} catch (err) {
		// ignore playback errors
	}
}

function getStepSoundName(blockId) {
	if (!blockId) return null
	if (blockId === sandID) return 'sand'
	if (blockId === gravelID) return 'gravel'
	if (blockId === snowID) return 'snow'
	if (blockId === leavesID) return 'leaves'
	if (blockId === woodID || blockId === plankID || blockId === fenceID || blockId === bridgeID) return 'wood'
	if (blockId === stoneID || blockId === brickID) return 'stone'
	if (blockId === grassID || blockId === dirtID) return 'grass'
	return 'stone'
}


// on left mouse, set targeted block to be air
noa.inputs.down.on('fire', function () {
	if (noa.targetedBlock) {
		playMusicBlock(noa.targetedBlock.blockID, 'action', noa.targetedBlock.position)
		if (noa.targetedBlock.blockID) playBreakSound()
		applyBlockEdit(0, noa.targetedBlock.position)
	}
})

// place block on alt-fire (RMB)
noa.inputs.down.on('alt-fire', function () {
	if (noa.targetedBlock) {
		applyBlockEdit(pickedID, noa.targetedBlock.adjacent)
		playMusicBlock(pickedID, 'place', noa.targetedBlock.adjacent)
	}
})

// pick block on middle fire (MMB)
noa.inputs.down.on('mid-fire', function () {
	if (noa.targetedBlock) setSelectedById(noa.targetedBlock.blockID)
})

noa.inputs.bind('play-note', 'R')
noa.inputs.down.on('play-note', function () {
	if (!noa.targetedBlock) return
	if (noa.targetedBlock.blockID === clefID) {
		playClefSequence(
			noa.targetedBlock.position[0],
			noa.targetedBlock.position[1],
			noa.targetedBlock.position[2]
		)
		return
	}
	playMusicBlock(noa.targetedBlock.blockID, 'action', noa.targetedBlock.position)
})

noa.inputs.bind('open-web', 'V')
noa.inputs.down.on('open-web', function () {
	showWebPanel()
})


// classic-ish UI + inventory
var ui = {
	hotbar: document.getElementById('hotbar'),
	inventory: document.getElementById('inventory'),
	inventoryGrid: document.getElementById('inventory-grid'),
	blockName: document.getElementById('block-name'),
	playerPos: document.getElementById('player-pos'),
	modeStatus: document.getElementById('mode-status'),
	musicStatus: document.getElementById('music-status'),
	musicFeedback: document.getElementById('music-feedback'),
	musicPulse: document.getElementById('music-pulse'),
	audioHint: document.getElementById('audio-hint'),
	lockHint: document.getElementById('lock-hint'),
	worldCurrentName: document.getElementById('world-current-name'),
	worldOpen: document.getElementById('world-open'),
	playerNameInput: document.getElementById('player-name-input'),
	playerNameSave: document.getElementById('player-name-save'),
	playerNameCurrent: document.getElementById('player-name-current'),
	playerPanel: document.getElementById('player-panel'),
	webPanel: document.getElementById('web-panel'),
	webIframe: document.getElementById('web-iframe'),
	webClose: document.getElementById('web-close'),
	worlds: document.getElementById('worlds'),
	worldsList: document.getElementById('worlds-list'),
	worldsError: document.getElementById('worlds-error'),
	worldsClose: document.getElementById('worlds-close'),
	worldCreate: document.getElementById('world-create'),
	worldNameInput: document.getElementById('world-name-input'),
	classroom: document.getElementById('classroom'),
	classroomLevel: document.getElementById('classroom-level'),
	classroomScore: document.getElementById('classroom-score'),
	classroomProgress: document.getElementById('classroom-progress'),
	classroomSeq: document.getElementById('classroom-seq'),
	classroomStatus: document.getElementById('classroom-status'),
	classroomStart: document.getElementById('classroom-start'),
	classroomPlay: document.getElementById('classroom-play'),
	classroomReset: document.getElementById('classroom-reset'),
	classroomToggle: document.getElementById('classroom-toggle'),
	classroomDifficulty: document.getElementById('classroom-difficulty'),
	classroomMode: document.getElementById('classroom-mode'),
	classroomWorldName: document.getElementById('classroom-world-name'),
	challengeBanner: document.getElementById('challenge-banner'),
	staffPanel: document.getElementById('staff-panel'),
	staffBoard: document.getElementById('staff-board'),
	staffLines: document.getElementById('staff-lines'),
	staffNotes: document.getElementById('staff-notes'),
	staffSong: document.getElementById('staff-song'),
	staffHint: document.getElementById('staff-hint'),
}

var hotbarSlots = getDefaultHotbar()
var hotbarEls = []
var inventoryEls = []
var inventoryElsById = {}
var selectedIndex = 0
var pickedID = hotbarSlots[0].id
var creativeMode = false
var allowFlight = false
var musicFeedbackTimer = null
var musicPulseTimer = null
var lockHintTimer = null
var audioState = { ctx: null }
var audioReady = false
var breakSoundPool = []
var breakSoundIndex = 0
var stepSoundCooldown = 0
var stepSoundSets = {}
var lastStepPosKey = null
var clefStepCooldown = 0
var lastClefStepKey = null
var webPanelUrl = '/embedded-game/EduBeatrix/index.html'
var webSignMesh = null
var musicPulseMat = null
var lastStepTime = 0
var rewardPlaced = false
var webMessageListenerAttached = false
var classroom = {
	enabled: false,
	levelIndex: -1,
	score: 0,
	sequence: [],
	inputIndex: 0,
	playing: false,
	allowInput: false,
	timeouts: [],
	challengeIndex: 0,
	mode: 'ear',
	staffStage: 'build',
}
var classroomConfig = {
	selectedDifficulty: 0,
	selectedMode: 'ear',
}
var staffLayout = {
	paddingLeft: 16,
	paddingTop: 20,
	lineGap: 12,
	noteSpacing: 22,
	noteHeight: 14,
}
var staffNoteEls = []

function getStaffLayout() {
	if (!ui.staffBoard || typeof window === 'undefined' || !window.getComputedStyle) {
		return staffLayout
	}
	var styles = window.getComputedStyle(ui.staffBoard)
	var paddingLeft = parseFloat(styles.getPropertyValue('--staff-padding-left')) || staffLayout.paddingLeft
	var paddingTop = parseFloat(styles.getPropertyValue('--staff-padding-top')) || staffLayout.paddingTop
	var lineGap = parseFloat(styles.getPropertyValue('--staff-line-gap')) || staffLayout.lineGap
	var noteSpacing = parseFloat(styles.getPropertyValue('--staff-note-spacing')) || staffLayout.noteSpacing
	var noteHeight = parseFloat(styles.getPropertyValue('--staff-note-height')) || staffLayout.noteHeight
	var noteOffset = parseFloat(styles.getPropertyValue('--staff-note-offset')) || 0
	return {
		paddingLeft: paddingLeft,
		paddingTop: paddingTop,
		lineGap: lineGap,
		noteSpacing: noteSpacing,
		noteHeight: noteHeight,
		noteOffset: noteOffset,
	}
}

var classroomLevels = [
	{ name: 'Nivel 1', lengths: [2, 2], notes: ['Do4', 'Re4', 'Mi4'], rhythms: ['Negra'], allowRest: false },
	{ name: 'Nivel 2', lengths: [3, 4], notes: ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4'], rhythms: ['Negra'], allowRest: false },
	{ name: 'Nivel 3', lengths: [5, 6], notes: ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4', 'La4', 'Si4', 'Do5', 'Re5'], rhythms: ['Blanca', 'Negra', 'Corchea'], allowRest: true },
]
var staffSongs = [
	{
		name: 'Estrellita (inicio)',
		notes: [
			{ note: 'Do4', rhythm: 'Negra' },
			{ note: 'Do4', rhythm: 'Negra' },
			{ note: 'Sol4', rhythm: 'Negra' },
			{ note: 'Sol4', rhythm: 'Negra' },
			{ note: 'La4', rhythm: 'Negra' },
			{ note: 'La4', rhythm: 'Negra' },
		],
	},
	{
		name: 'Estrellita (final)',
		notes: [
			{ note: 'Sol4', rhythm: 'Blanca' },
			{ note: 'Fa4', rhythm: 'Negra' },
			{ note: 'Fa4', rhythm: 'Negra' },
			{ note: 'Mi4', rhythm: 'Negra' },
			{ note: 'Mi4', rhythm: 'Negra' },
			{ note: 'Re4', rhythm: 'Negra' },
			{ note: 'Re4', rhythm: 'Negra' },
			{ note: 'Do4', rhythm: 'Blanca' },
		],
	},
	{
		name: 'Estrellita (completa)',
		notes: [
			{ note: 'Do4', rhythm: 'Negra' },
			{ note: 'Do4', rhythm: 'Negra' },
			{ note: 'Sol4', rhythm: 'Negra' },
			{ note: 'Sol4', rhythm: 'Negra' },
			{ note: 'La4', rhythm: 'Negra' },
			{ note: 'La4', rhythm: 'Negra' },
			{ note: 'Sol4', rhythm: 'Blanca' },
			{ note: 'Fa4', rhythm: 'Negra' },
			{ note: 'Fa4', rhythm: 'Negra' },
			{ note: 'Mi4', rhythm: 'Negra' },
			{ note: 'Mi4', rhythm: 'Negra' },
			{ note: 'Re4', rhythm: 'Negra' },
			{ note: 'Re4', rhythm: 'Negra' },
			{ note: 'Do4', rhythm: 'Blanca' },
		],
	},
]

var worldName = getWorldName()
var worldEdits = {}
var saveSettingsTimer = null
var saveWorldTimer = null
var editsApplied = false
var worldListCache = []

initLocalState()

function setupClassroom() {
	if (ui.classroomStart) ui.classroomStart.addEventListener('click', startClassroom)
	if (ui.classroomPlay) ui.classroomPlay.addEventListener('click', playSequence)
	if (ui.classroomReset) ui.classroomReset.addEventListener('click', resetClassroom)
	if (ui.classroomToggle) ui.classroomToggle.addEventListener('click', function () {
		toggleClassroom(false)
	})
	if (ui.classroomDifficulty) {
		ui.classroomDifficulty.addEventListener('change', function (event) {
			setClassroomDifficulty(parseInt(event.target.value, 10))
			updateClassroomUI()
			scheduleSaveSettings()
		})
	}
	if (ui.classroomMode) {
		ui.classroomMode.addEventListener('change', function (event) {
			setClassroomMode(event.target.value)
			updateClassroomUI()
			scheduleSaveSettings()
		})
	}
	setClassroomDifficulty(classroomConfig.selectedDifficulty)
	setClassroomMode(classroomConfig.selectedMode)
	if (ui.challengeBanner) {
		ui.challengeBanner.addEventListener('click', function () {
			hideChallengeBanner()
		})
	}
}

function setClassroomDifficulty(index) {
	if (Number.isNaN(index)) return
	var clamped = Math.max(0, Math.min(classroomLevels.length - 1, index))
	classroomConfig.selectedDifficulty = clamped
	if (ui.classroomDifficulty) ui.classroomDifficulty.value = String(clamped)
}

function setClassroomMode(mode) {
	var next = (mode === 'staff') ? 'staff' : 'ear'
	if (classroom.mode !== next) {
		classroom.mode = next
		classroomConfig.selectedMode = next
		resetClassroom()
	} else {
		classroomConfig.selectedMode = next
	}
	if (ui.classroomMode) ui.classroomMode.value = next
	if (ui.classroom) ui.classroom.classList.toggle('staff-mode', next === 'staff')
}

function toggleClassroom(force) {
	var open = (typeof force === 'boolean') ? force : !ui.classroom.classList.contains('open')
	ui.classroom.classList.toggle('open', open)
	scheduleSaveSettings()
}

function getWorldName() {
	var params = new URLSearchParams(window.location.search)
	return params.get('world') || 'default'
}

function setupWorldMenu() {
	if (!ui.worldOpen || !ui.worlds) return
	ui.worldOpen.addEventListener('click', function () {
		toggleWorldMenu(true)
	})
	if (ui.worldsClose) {
		ui.worldsClose.addEventListener('click', function () {
			toggleWorldMenu(false)
		})
	}
	ui.worlds.addEventListener('click', function (event) {
		if (event.target === ui.worlds) toggleWorldMenu(false)
	})
	if (ui.worldCreate) {
		ui.worldCreate.addEventListener('click', createWorldFromInput)
	}
	if (ui.worldNameInput) {
		ui.worldNameInput.addEventListener('keydown', function (event) {
			if (event.key === 'Enter') createWorldFromInput()
		})
	}
	noa.inputs.bind('worlds', 'L')
	noa.inputs.down.on('worlds', function () {
		toggleWorldMenu(!ui.worlds.classList.contains('open'))
	})
	updateWorldDisplay()
	refreshWorldList()
}

function toggleWorldMenu(open) {
	if (!ui.worlds) return
	ui.worlds.classList.toggle('open', open)
	if (open) refreshWorldList()
	if (!open && ui.worldsError) ui.worldsError.textContent = ''
}

function updateWorldDisplay() {
	if (ui.worldCurrentName) ui.worldCurrentName.textContent = worldName
	if (ui.classroomWorldName) ui.classroomWorldName.textContent = worldName
}

function refreshWorldList() {
	return storage.getWorldList()
		.then(function (list) {
			worldListCache = list || []
			renderWorldList(worldListCache)
		})
		.catch(function () {
			renderWorldList([])
		})
}

function renderWorldList(list) {
	if (!ui.worldsList) return
	ui.worldsList.innerHTML = ''
	if (!list || !list.length) {
		var empty = document.createElement('div')
		empty.className = 'world-meta'
		empty.textContent = 'Sin mundos guardados.'
		ui.worldsList.appendChild(empty)
		return
	}
	list.forEach(function (row) {
		var item = document.createElement('div')
		item.className = 'world-item' + (row.name === worldName ? ' active' : '')
		var nameEl = document.createElement('div')
		nameEl.textContent = row.name
		var meta = document.createElement('div')
		meta.className = 'world-meta'
		meta.textContent = formatWorldDate(row.lastplay)
		item.appendChild(nameEl)
		item.appendChild(meta)
		item.addEventListener('click', function () {
			if (row.name === worldName) {
				toggleWorldMenu(false)
				return
			}
			goToWorld(row.name)
		})
		ui.worldsList.appendChild(item)
	})
}

function createWorldFromInput() {
	if (!ui.worldNameInput) return
	var name = sanitizeWorldName(ui.worldNameInput.value)
	if (!name) {
		setWorldError('Escribe un nombre para el mundo.')
		return
	}
	storage.createWorld(name).then(function (created) {
		if (!created) {
			setWorldError('Ya existe un mundo con ese nombre.')
			return
		}
		goToWorld(name)
	})
}

function sanitizeWorldName(name) {
	if (!name) return ''
	var cleaned = name.trim().replace(/\s+/g, '')
	cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3)
	return cleaned.toUpperCase()
}

function setWorldError(msg) {
	if (ui.worldsError) ui.worldsError.textContent = msg || ''
}

function goToWorld(name) {
	var params = new URLSearchParams(window.location.search)
	params.set('world', name)
	window.location.search = params.toString()
}

function formatWorldDate(ts) {
	if (!ts) return 'Nuevo'
	var date = new Date(ts)
	return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function initLocalState() {
	storage.getWorldEdits(worldName)
		.then(function (edits) {
			if (edits) worldEdits = edits
			applyWorldUnlocks()
			applyWorldSettings(worldEdits._settings)
			buildHotbar()
			buildInventory()
			selectSlot(selectedIndex)
			setCreativeMode(creativeMode)
			setupClassroom()
			setupWorldMenu()
			setupPlayerPanel()
			setupWebOverlay()
			updateClassroomUI()
			toggleClassroom(settingsClassroomOpen())
			applySavedEdits()
			storage.touchWorld(worldName)
		})
		.catch(function () {
			worldEdits = {}
			applyWorldUnlocks()
			applyWorldSettings(null)
			buildHotbar()
			buildInventory()
			selectSlot(selectedIndex)
			setCreativeMode(creativeMode)
			setupClassroom()
			setupWorldMenu()
			setupPlayerPanel()
			setupWebOverlay()
			updateClassroomUI()
			toggleClassroom(true)
			storage.touchWorld(worldName)
		})
}

function applyWorldSettings(settings) {
	if (!settings) {
		hotbarSlots = getDefaultHotbar()
		selectedIndex = 0
		creativeMode = false
		classroom._open = true
		return
	}
	if (Array.isArray(settings.hotbar)) {
		hotbarSlots = settings.hotbar.map(function (id) {
			return getBlockById(id) || blockCatalog[0]
		})
	}
	if (typeof settings.selectedIndex === 'number') {
		selectedIndex = Math.max(0, Math.min(8, settings.selectedIndex))
	}
	if (typeof settings.creativeMode === 'boolean') {
		creativeMode = settings.creativeMode
	}
	if (typeof settings.classroomOpen === 'boolean') {
		classroom._open = settings.classroomOpen
	}
	if (typeof settings.classroomDifficulty === 'number') {
		setClassroomDifficulty(settings.classroomDifficulty)
	}
	if (typeof settings.classroomMode === 'string') {
		setClassroomMode(settings.classroomMode)
	}
}

function settingsClassroomOpen() {
	if (typeof classroom._open === 'boolean') return classroom._open
	return true
}

function collectWorldSettings() {
	return {
		hotbar: hotbarSlots.map(function (slot) { return slot.id }),
		selectedIndex: selectedIndex,
		creativeMode: creativeMode,
		classroomOpen: ui.classroom.classList.contains('open'),
		classroomDifficulty: classroomConfig.selectedDifficulty,
		classroomMode: classroomConfig.selectedMode
	}
}

function scheduleSaveSettings() {
	if (saveSettingsTimer) clearTimeout(saveSettingsTimer)
	saveSettingsTimer = setTimeout(function () {
		if (!worldEdits) worldEdits = {}
		worldEdits._settings = collectWorldSettings()
		scheduleSaveWorld()
		saveSettingsTimer = null
	}, 500)
}

function scheduleSaveWorld() {
	if (saveWorldTimer) clearTimeout(saveWorldTimer)
	saveWorldTimer = setTimeout(function () {
		storage.saveWorldEdits(worldName, worldEdits)
		saveWorldTimer = null
	}, 1000)
}

function applySavedEdits() {
	if (editsApplied) return
	editsApplied = true
	var keys = Object.keys(worldEdits)
	if (!keys.length) return
	keys.forEach(function (key) {
		var parts = key.split('|').map(Number)
		if (parts.length !== 3) return
		noa.setBlock(worldEdits[key], parts)
	})
}

function buildHotbar() {
	hotbarSlots.forEach(function (block, index) {
		var slot = document.createElement('div')
		slot.className = 'slot'
		slot.dataset.index = index
		slot.appendChild(makeIcon(block))

		var key = document.createElement('div')
		key.className = 'key'
		key.textContent = index + 1
		slot.appendChild(key)

		ui.hotbar.appendChild(slot)
		hotbarEls.push(slot)
	})
}

function buildInventory() {
	if (!ui.inventoryGrid) return
	ui.inventoryGrid.innerHTML = ''
	inventoryEls = []
	inventoryElsById = {}
	blockCatalog.forEach(function (block) {
		addInventoryItem(block)
	})
}

function createInventoryItem(block) {
	var item = document.createElement('div')
	item.className = 'inventory-item'
	item.dataset.blockId = block.id
	item.appendChild(makeIcon(block))

	var label = document.createElement('div')
	label.className = 'label'
	label.textContent = block.name
	item.appendChild(label)

	item.addEventListener('click', function () {
		if (block.locked) {
			showLockedNotice('Bloque aun no desbloqueado.')
			return
		}
		setSelectedById(block.id)
		toggleInventory(false)
	})

	return item
}

function addInventoryItem(block) {
	if (!ui.inventoryGrid) return
	var item = createInventoryItem(block)
	updateInventoryItemLock(block, item)
	ui.inventoryGrid.appendChild(item)
	inventoryEls.push(item)
	inventoryElsById[block.id] = item
}

function updateInventoryItemLock(block, item) {
	var el = item || inventoryElsById[block.id]
	if (!el) return
	el.classList.toggle('locked', !!block.locked)
}

function applyWorldUnlocks() {
	resetBlockLocks()
	if (!worldEdits || !Array.isArray(worldEdits._unlockedBlocks)) return
	for (var i = 0; i < worldEdits._unlockedBlocks.length; i++) {
		var block = getBlockByName(worldEdits._unlockedBlocks[i])
		if (block) block.locked = false
	}
}

function resetBlockLocks() {
	for (var i = 0; i < blockCatalog.length; i++) {
		blockCatalog[i].locked = !!defaultLockState[i]
	}
}

function unlockBlockByName(name) {
	for (var i = 0; i < blockCatalog.length; i++) {
		var block = blockCatalog[i]
		if (block.name === name) {
			if (!block.locked) return false
			block.locked = false
			trackWorldUnlock(name)
			updateInventoryItemLock(block)
			return true
		}
	}
	return false
}

function trackWorldUnlock(name) {
	if (!worldEdits) worldEdits = {}
	if (!Array.isArray(worldEdits._unlockedBlocks)) worldEdits._unlockedBlocks = []
	if (worldEdits._unlockedBlocks.indexOf(name) === -1) {
		worldEdits._unlockedBlocks.push(name)
		scheduleSaveWorld()
	}
}

function makeIcon(block) {
	var iconEl = document.createElement('div')
	iconEl.className = 'icon'
	if (block.icon.type === 'texture') {
		iconEl.style.backgroundImage = 'url(textures/' + block.icon.value + ')'
	} else if (block.icon.type === 'data') {
		iconEl.style.backgroundImage = 'url(' + block.icon.value + ')'
	} else {
		iconEl.style.backgroundColor = block.icon.value
	}
	if (block.music) {
		var badge = document.createElement('div')
		badge.className = 'music-badge'
		badge.textContent = block.music.isRest ? 'SIL' : block.music.note
		iconEl.appendChild(badge)

		var rhythmClass = rhythmClassFor(block.music.rhythm)
		if (block.music.isRest) {
			var rest = document.createElement('div')
			rest.className = 'rhythm-rest'
			iconEl.appendChild(rest)
		} else if (rhythmClass) {
			var rhythm = document.createElement('div')
			rhythm.className = 'rhythm-icon ' + rhythmClass
			if (rhythmClass === 'rhythm-eighth') {
				var flag = document.createElement('div')
				flag.className = 'flag'
				rhythm.appendChild(flag)
			}
			iconEl.appendChild(rhythm)
		}
	}
	return iconEl
}

function rhythmClassFor(rhythmName) {
	if (rhythmName === 'Negra') return 'rhythm-quarter'
	if (rhythmName === 'Blanca') return 'rhythm-half'
	if (rhythmName === 'Corchea') return 'rhythm-eighth'
	return ''
}

function selectSlot(index) {
	selectedIndex = (index + hotbarSlots.length) % hotbarSlots.length
	pickedID = hotbarSlots[selectedIndex].id
	hotbarEls.forEach(function (el, i) {
		if (i === selectedIndex) el.classList.add('selected')
		else el.classList.remove('selected')
	})
	updateStatus()
	scheduleSaveSettings()
}

function setSelectedById(blockId) {
	for (var i = 0; i < hotbarSlots.length; i++) {
		if (hotbarSlots[i].id === blockId) {
			selectSlot(i)
			return
		}
	}
	hotbarSlots[selectedIndex] = getBlockById(blockId)
	updateHotbarSlot(selectedIndex)
	selectSlot(selectedIndex)
	scheduleSaveSettings()
}

function updateStatus() {
	var blockName = 'Bloque: ' + (getBlockName(pickedID) || '--')
	ui.blockName.textContent = blockName
	ui.modeStatus.textContent = 'Modo: ' + (creativeMode ? 'Creativo' : 'Survival')
	ui.musicStatus.textContent = 'Musica: ' + (getMusicLabel(pickedID) || '--')
}

function getBlockName(blockId) {
	for (var i = 0; i < blockCatalog.length; i++) {
		if (blockCatalog[i].id === blockId) return blockCatalog[i].name
	}
	return null
}

function getMusicLabel(blockId) {
	var music = musicBlocks[blockId]
	if (!music) return null
	return formatMusicLabel(music)
}

function formatMusicLabel(music) {
	if (music.isRest) return music.label
	if (!music.noteName || !music.noteOctave) return music.label
	if (music.noteLetter) {
		return music.noteName + music.noteOctave + ' (' + music.noteLetter + music.noteOctave + ') ' + music.rhythm
	}
	return music.noteName + music.noteOctave + ' ' + music.rhythm
}

function getBlockById(blockId) {
	for (var i = 0; i < blockCatalog.length; i++) {
		if (blockCatalog[i].id === blockId) return blockCatalog[i]
	}
	return blockCatalog[0]
}

function getDefaultHotbar() {
	var slots = []
	for (var i = 0; i < defaultHotbarLabels.length; i++) {
		var label = defaultHotbarLabels[i]
		for (var j = 0; j < blockCatalog.length; j++) {
			if (blockCatalog[j].name === label) {
				slots.push(blockCatalog[j])
				break
			}
		}
	}
	while (slots.length < 9) {
		slots.push(blockCatalog[slots.length] || blockCatalog[0])
	}
	return slots.slice(0, 9)
}

function startClassroom() {
	if (classroom.mode === 'staff') {
		startStaffChallenge()
		return
	}
	classroom.enabled = true
	classroom.levelIndex = classroomConfig.selectedDifficulty || 0
	classroom.score = 0
	classroom.inputIndex = 0
	classroom.challengeIndex = 0
	setLevel(classroom.levelIndex)
	updateClassroomUI()
	setClassroomStatus('Escucha la secuencia y repitela.')
	playSequence()
}

function startStaffChallenge() {
	classroom.enabled = true
	classroom.levelIndex = -1
	classroom.score = 0
	classroom.inputIndex = 0
	classroom.challengeIndex = 0
	classroom.playing = false
	classroom.allowInput = false
	classroom.staffStage = 'build'
	classroom.sequence = buildStaffSequence(getActiveStaffSong())
	clearClassroomTimers()
	updateClassroomUI()
	setClassroomStatus('Construye la cancion con bloques. Luego pulsa Repetir y camina sobre las notas.')
	updateStaffProgress()
}

function resetClassroom() {
	classroom.enabled = false
	classroom.levelIndex = -1
	classroom.score = 0
	classroom.sequence = []
	classroom.inputIndex = 0
	classroom.challengeIndex = 0
	classroom.playing = false
	classroom.allowInput = false
	classroom.staffStage = 'build'
	clearClassroomTimers()
	updateClassroomUI()
	setClassroomStatus('Pulsa Empezar para iniciar el reto.')
}

function setLevel(index) {
	classroom.levelIndex = index
	classroom.sequence = buildSequence(classroomLevels[index], classroom.challengeIndex)
	classroom.inputIndex = 0
	updateClassroomUI()
}

function buildSequence(level, challengeIndex) {
	var pool = buildPool(level)
	var sequence = []
	var length = getSequenceLength(level, challengeIndex)
	for (var i = 0; i < length; i++) {
		var pick = pool[Math.floor(Math.random() * pool.length)]
		sequence.push(pick)
	}
	return sequence
}

function getSequenceLength(level, challengeIndex) {
	if (Array.isArray(level.lengths) && level.lengths.length) {
		var idx = Math.max(0, Math.min(level.lengths.length - 1, challengeIndex || 0))
		return level.lengths[idx]
	}
	return 2
}

function buildPool(level) {
	var pool = []
	for (var i = 0; i < level.notes.length; i++) {
		for (var j = 0; j < level.rhythms.length; j++) {
			var label = level.notes[i] + ' ' + level.rhythms[j]
			var block = getBlockByName(label)
			if (block) pool.push(block.id)
		}
	}
	if (level.allowRest) {
		for (var k = 0; k < level.rhythms.length; k++) {
			var restLabel = 'Silencio ' + level.rhythms[k]
			var restBlock = getBlockByName(restLabel)
			if (restBlock) pool.push(restBlock.id)
		}
	}
	return pool
}

function getBlockByName(name) {
	for (var i = 0; i < blockCatalog.length; i++) {
		if (blockCatalog[i].name === name) return blockCatalog[i]
	}
	return null
}

function getActiveStaffSong() {
	var index = classroomConfig.selectedDifficulty || 0
	if (index < 0) index = 0
	if (index >= staffSongs.length) index = staffSongs.length - 1
	return staffSongs[index] || null
}

function buildStaffSequence(song) {
	var sequence = []
	if (!song || !Array.isArray(song.notes)) return sequence
	for (var i = 0; i < song.notes.length; i++) {
		var entry = song.notes[i]
		var label = entry.note + ' ' + entry.rhythm
		var block = getBlockByName(label)
		if (block) sequence.push(block.id)
	}
	return sequence
}

function staffStep(noteLetter, noteOctave) {
	if (!noteLetter || !noteOctave) return null
	var letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
	var letterIndex = letters.indexOf(noteLetter)
	if (letterIndex < 0) return null
	var octave = parseInt(noteOctave, 10)
	if (Number.isNaN(octave)) return null
	var baseIndex = 4 * 7 + letters.indexOf('E')
	var noteIndex = octave * 7 + letterIndex
	return noteIndex - baseIndex
}

function staffRhythmClass(rhythm) {
	if (rhythm === 'Blanca') return 'half'
	if (rhythm === 'Corchea') return 'eighth'
	return ''
}

function renderStaffSequence() {
	if (!ui.staffNotes) return
	if (classroom.mode !== 'staff') {
		ui.staffNotes.innerHTML = ''
		staffNoteEls = []
		if (ui.staffSong) ui.staffSong.textContent = '--'
		return
	}

	var song = getActiveStaffSong()
	var previewSequence = classroom.sequence.length ? classroom.sequence : buildStaffSequence(song)
	ui.staffNotes.innerHTML = ''
	staffNoteEls = []
	if (ui.staffSong) ui.staffSong.textContent = song ? song.name : '--'
	if (!previewSequence.length) return

	var layout = getStaffLayout()
	var baseLineY = layout.paddingTop + layout.lineGap * 4
	var noteWidth = layout.paddingLeft * 2 + (previewSequence.length - 1) * layout.noteSpacing + 40
	var minWidth = ui.staffBoard ? ui.staffBoard.clientWidth : noteWidth
	ui.staffNotes.style.width = Math.max(minWidth, noteWidth) + 'px'

	for (var i = 0; i < previewSequence.length; i++) {
		var blockId = previewSequence[i]
		var music = musicBlocks[blockId]
		if (!music) continue

		var noteEl = document.createElement('div')
		var classes = ['staff-note']
		if (music.isRest) {
			classes.push('rest')
		} else {
			var rhythmClass = staffRhythmClass(music.rhythm)
			if (rhythmClass) classes.push(rhythmClass)
		}
		noteEl.className = classes.join(' ')
		noteEl.dataset.index = String(i)

		var x = layout.paddingLeft + i * layout.noteSpacing
		noteEl.style.left = x + 'px'

		var y = baseLineY - layout.lineGap
		if (!music.isRest) {
			var step = staffStep(music.noteLetter, music.noteOctave)
			if (typeof step === 'number') {
				y = baseLineY - step * (layout.lineGap / 2)
				if (step % 2 === 0 && (step < 0 || step > 8)) {
					var ledger = document.createElement('div')
					ledger.className = 'staff-ledger'
					noteEl.appendChild(ledger)
				}
			}
		}

		noteEl.style.top = (y - layout.noteHeight / 2 + layout.noteOffset) + 'px'
		ui.staffNotes.appendChild(noteEl)
		staffNoteEls.push(noteEl)
	}

	updateStaffProgress()
}

function updateStaffProgress(activeIndex) {
	if (classroom.mode !== 'staff' || !staffNoteEls.length) return
	for (var i = 0; i < staffNoteEls.length; i++) {
		var noteEl = staffNoteEls[i]
		var isDone = i < classroom.inputIndex
		var isCurrent = (typeof activeIndex === 'number') ? i === activeIndex : (i === classroom.inputIndex && classroom.allowInput)
		noteEl.classList.toggle('done', isDone)
		noteEl.classList.toggle('current', isCurrent)
	}
}

function playSequence() {
	if (classroom.mode === 'staff') {
		startStaffPlayback()
		return
	}
	if (!classroom.enabled || classroom.playing) return
	if (!audioReady) {
		// Try to unlock audio from a user gesture (e.g., clicking "Empezar").
		if (ensureAudio()) {
			audioReady = true
			hideAudioHint()
			updateStatus()
		} else {
		showAudioHint()
		setClassroomStatus('Activa el audio para empezar.')
		return
		}
	}
	classroom.playing = true
	classroom.allowInput = false
	classroom.inputIndex = 0
	clearClassroomTimers()
	updateClassroomUI()

	var delay = 400
	classroom.sequence.forEach(function (blockId, index) {
		var timer = setTimeout(function () {
			highlightSequenceIndex(index)
			playMusicBlock(blockId, 'sequence')
		}, delay)
		classroom.timeouts.push(timer)
		delay += getBlockDuration(blockId) * 1000 + 200
	})

	var endTimer = setTimeout(function () {
		classroom.playing = false
		classroom.allowInput = true
		clearSequenceHighlights()
		setClassroomStatus('Tu turno: repite la secuencia.')
		updateClassroomUI()
	}, delay)
	classroom.timeouts.push(endTimer)
}

function startStaffPlayback() {
	if (!classroom.enabled || classroom.playing) return
	classroom.staffStage = 'play'
	classroom.allowInput = true
	classroom.inputIndex = 0
	clearClassroomTimers()
	clearSequenceHighlights()
	updateClassroomUI()
	setClassroomStatus('Reproduce la cancion caminando sobre las notas.')
	updateStaffProgress()
}

function buildClefChordsFromWorld(startX, startY, startZ) {
	var maxBlocks = 256
	var maxHeight = 32
	var queue = [[startX, startY, startZ]]
	var visited = {}
	var musicPositions = []

	while (queue.length && musicPositions.length < maxBlocks) {
		var pos = queue.shift()
		var x = pos[0]
		var y = pos[1]
		var z = pos[2]
		var key = x + '|' + y + '|' + z
		if (visited[key]) continue
		visited[key] = true

		var blockId = noa.getBlock(x, y, z)
		if (!blockId) continue
		if (blockId !== clefID && !musicBlocks[blockId]) continue
		if (musicBlocks[blockId]) {
			musicPositions.push({ x: x, y: y, z: z, id: blockId })
		}

		queue.push([x + 1, y, z])
		queue.push([x - 1, y, z])
		queue.push([x, y + 1, z])
		queue.push([x, y - 1, z])
		queue.push([x, y, z + 1])
		queue.push([x, y, z - 1])
	}

	var columnMap = {}
	musicPositions.forEach(function (pos) {
		var colKey = pos.x + '|' + pos.z
		if (!columnMap[colKey]) columnMap[colKey] = { x: pos.x, z: pos.z, notes: [] }
		columnMap[colKey].notes.push(pos)
	})

	var columns = Object.keys(columnMap).map(function (key) {
		var entry = columnMap[key]
		entry.notes.sort(function (a, b) { return a.y - b.y })
		return entry
	})

	columns.sort(function (a, b) {
		var da = Math.abs(a.x - startX) + Math.abs(a.z - startZ)
		var db = Math.abs(b.x - startX) + Math.abs(b.z - startZ)
		if (da !== db) return da - db
		if (a.x !== b.x) return a.x - b.x
		return a.z - b.z
	})

	var chords = []
	for (var i = 0; i < columns.length; i++) {
		var chord = []
		for (var j = 0; j < columns[i].notes.length; j++) {
			var note = columns[i].notes[j]
			if (note.y >= startY && note.y < startY + maxHeight) {
				chord.push(note)
			}
		}
		if (chord.length) chords.push(chord)
	}

	return chords
}

function playClefSequence(startX, startY, startZ) {
	if (classroom.playing) return
	var chords = buildClefChordsFromWorld(startX, startY, startZ)
	if (!chords.length) return
	if (!ensureAudio()) {
		showAudioHint()
		return
	}
	classroom.playing = true
	clearClassroomTimers()
	clearSequenceHighlights()

	var delay = 200
	chords.forEach(function (chord) {
		var timer = setTimeout(function () {
			chord.forEach(function (note) {
				playMusicBlock(note.id, 'sequence', [note.x, note.y, note.z])
			})
		}, delay)
		classroom.timeouts.push(timer)
		var maxDuration = 0.3
		for (var i = 0; i < chord.length; i++) {
			maxDuration = Math.max(maxDuration, getBlockDuration(chord[i].id))
		}
		delay += maxDuration * 1000 + 200
	})

	var endTimer = setTimeout(function () {
		classroom.playing = false
		if (classroom.staffStage === 'play') {
			classroom.allowInput = true
		}
		clearSequenceHighlights()
		updateClassroomUI()
	}, delay)
	classroom.timeouts.push(endTimer)
}

function getBlockDuration(blockId) {
	var music = musicBlocks[blockId]
	return music ? music.duration : 0.3
}

function recordClassroomInput(blockId, source) {
	if (!classroom.enabled || !classroom.allowInput) return
	if (!musicBlocks[blockId]) return
	if (classroom.mode === 'staff' && source !== 'step') return
	if (classroom.mode === 'staff' && classroom.staffStage !== 'play') return

	var expected = classroom.sequence[classroom.inputIndex]
	if (blockId === expected) {
		classroom.inputIndex++
		classroom.score += 5
		updateClassroomUI()
		if (classroom.inputIndex >= classroom.sequence.length) {
			classroom.score += 10
			if (classroom.mode === 'staff') {
				completeStaffChallenge()
				return
			}
			setClassroomStatus('Bien! Siguiente reto...')
			advanceLevel()
		}
	} else {
		setClassroomStatus('Ups! Intenta de nuevo.')
		classroom.inputIndex = 0
		updateClassroomUI()
	}
}

function completeStaffChallenge() {
	classroom.allowInput = false
	classroom.enabled = false
	updateClassroomUI()
	var unlocked = unlockBlockByName('Ladrillo')
	var rewardText = unlocked ? ' Nuevo material: Ladrillo (inventario E).' : ''
	setClassroomStatus('Partitura completada. Buen trabajo!' + rewardText)
	showChallengeBanner('Partitura completada', 'Has recreado la cancion en el pentagrama.' + rewardText)
}

function advanceLevel() {
	classroom.allowInput = false
	var level = classroomLevels[classroom.levelIndex]
	var maxChallenges = (level && level.lengths) ? level.lengths.length : 1
	if (classroom.challengeIndex + 1 >= maxChallenges) {
		var unlocked = unlockBlockByName('Valla')
		if (unlocked && !rewardPlaced) {
			placeFenceRewardNearPlayer()
			rewardPlaced = true
		}
		var rewardText = unlocked ? ' Premio desbloqueado: Valla (inventario E).' : ''
		setClassroomStatus('Reto completado. Puntuacion final: ' + classroom.score + '.' + rewardText)
		showChallengeBanner('Reto superado!', 'Felicitaciones! Has completado el desafio.' + rewardText)
		classroom.enabled = false
		return
	}
	classroom.challengeIndex += 1
	setLevel(classroom.levelIndex)
	setTimeout(function () {
		playSequence()
	}, 600)
}

function updateClassroomUI() {
	if (!ui.classroomLevel) return
	var levelLabel = '--'
	if (classroom.mode === 'staff') {
		var song = getActiveStaffSong()
		levelLabel = song ? song.name : 'Partitura'
	} else if (classroom.levelIndex >= 0) {
		levelLabel = classroomLevels[classroom.levelIndex].name
	} else if (classroomLevels[classroomConfig.selectedDifficulty]) {
		levelLabel = classroomLevels[classroomConfig.selectedDifficulty].name
	}
	ui.classroomLevel.textContent = levelLabel
	ui.classroomScore.textContent = String(classroom.score)
	var seqLength = classroom.sequence.length
	if (classroom.mode === 'staff' && seqLength === 0) {
		seqLength = buildStaffSequence(getActiveStaffSong()).length
	}
	ui.classroomProgress.textContent = classroom.inputIndex + '/' + seqLength
	renderSequence()
	renderStaffSequence()
}

function placeFenceRewardNearPlayer() {
	var pos = noa.entities.getPositionData(eid).position
	var centerX = Math.floor(pos[0]) + 2
	var centerZ = Math.floor(pos[2]) + 2
	var topY = getHeight(centerX, centerZ)
	for (var dx = -1; dx <= 1; dx++) {
		for (var dz = -1; dz <= 1; dz++) {
			if (Math.abs(dx) === 1 || Math.abs(dz) === 1) {
				noa.setBlock(fenceID, [centerX + dx, topY, centerZ + dz])
			}
		}
	}
}

function renderSequence() {
	if (!ui.classroomSeq) return
	ui.classroomSeq.innerHTML = ''
	if (classroom.mode === 'staff') return
	for (var i = 0; i < classroom.sequence.length; i++) {
		var blockId = classroom.sequence[i]
		var chip = document.createElement('div')
		chip.className = 'seq-chip'
		chip.textContent = getMusicLabel(blockId) || '---'
		ui.classroomSeq.appendChild(chip)
	}
}

function highlightSequenceIndex(index) {
	if (ui.classroomSeq) {
		var chips = ui.classroomSeq.querySelectorAll('.seq-chip')
		for (var i = 0; i < chips.length; i++) {
			if (i === index) chips[i].classList.add('active')
			else chips[i].classList.remove('active')
		}
	}
	updateStaffProgress(index)
}

function clearSequenceHighlights() {
	if (ui.classroomSeq) {
		var chips = ui.classroomSeq.querySelectorAll('.seq-chip')
		for (var i = 0; i < chips.length; i++) {
			chips[i].classList.remove('active')
		}
	}
	updateStaffProgress()
}

function clearClassroomTimers() {
	while (classroom.timeouts.length) {
		clearTimeout(classroom.timeouts.pop())
	}
}

function setClassroomStatus(text) {
	if (ui.classroomStatus) ui.classroomStatus.textContent = text
}

function showChallengeBanner(title, subtitle) {
	if (!ui.challengeBanner) return
	var heading = ui.challengeBanner.querySelector('h2')
	var message = ui.challengeBanner.querySelector('p')
	if (heading) heading.textContent = title
	if (message) message.textContent = subtitle
	ui.challengeBanner.classList.add('active')
}

function hideChallengeBanner() {
	if (!ui.challengeBanner) return
	ui.challengeBanner.classList.remove('active')
}

function ensureAudio() {
	if (!audioState.ctx) {
		var AudioContext = window.AudioContext || window.webkitAudioContext
		if (!AudioContext) return false
		audioState.ctx = new AudioContext()
	}
	if (audioState.ctx.state === 'suspended') {
		try {
			audioState.ctx.resume()
		} catch (err) {
			return false
		}
	}
	return true
}

function pulseMusicBlock(position, duration) {
	if (!scene || !position) return
	if (!musicPulseMat) {
		musicPulseMat = new BABYLON.StandardMaterial('music-pulse-mat', scene)
		musicPulseMat.emissiveColor = new BABYLON.Color3(0.9, 0.9, 1.0)
		musicPulseMat.alpha = 0.45
		musicPulseMat.specularColor = new BABYLON.Color3(0, 0, 0)
		musicPulseMat.disableLighting = true
	}
	var box = BABYLON.MeshBuilder.CreateBox('music-pulse', { size: 1.08 }, scene)
	box.position = new BABYLON.Vector3(position[0] + 0.5, position[1] + 0.5, position[2] + 0.5)
	box.material = musicPulseMat
	box.isPickable = false
	setTimeout(function () {
		box.dispose()
	}, duration || 220)
}

function playMusicBlock(blockId, source, position) {
	var music = musicBlocks[blockId]
	if (!music) return
	if (!ensureAudio()) {
		showAudioHint()
		return
	}
	if (!audioReady) {
		audioReady = true
		hideAudioHint()
		updateStatus()
	}

	recordClassroomInput(blockId, source)
	if (position) {
		pulseMusicBlock(position, Math.max(180, music.duration * 800))
	}

	if (!music.isRest && music.frequency) {
		var osc = audioState.ctx.createOscillator()
		var gain = audioState.ctx.createGain()
		var now = audioState.ctx.currentTime
		var endTime = now + music.duration

		osc.type = 'square'
		osc.frequency.setValueAtTime(music.frequency, now)
		gain.gain.setValueAtTime(0.001, now)
		gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02)
		gain.gain.exponentialRampToValueAtTime(0.0001, endTime)

		osc.connect(gain)
		gain.connect(audioState.ctx.destination)
		osc.start(now)
		osc.stop(endTime)
	}

	showMusicFeedback(music)
}

function showMusicFeedback(music) {
	if (musicFeedbackTimer) clearTimeout(musicFeedbackTimer)
	if (musicPulseTimer) clearTimeout(musicPulseTimer)
	ui.musicFeedback.textContent = formatMusicLabel(music)
	ui.musicFeedback.classList.add('active')
	ui.musicPulse.classList.add('active')
	musicFeedbackTimer = setTimeout(function () {
		ui.musicFeedback.classList.remove('active')
	}, Math.max(150, music.duration * 1000))
	musicPulseTimer = setTimeout(function () {
		ui.musicPulse.classList.remove('active')
	}, Math.max(120, music.duration * 600))
}

function showAudioHint() {
	if (ui.audioHint) ui.audioHint.style.display = 'block'
}

function hideAudioHint() {
	if (ui.audioHint) ui.audioHint.style.display = 'none'
}

function showLockedNotice(message) {
	if (!ui.lockHint) return
	if (lockHintTimer) clearTimeout(lockHintTimer)
	ui.lockHint.textContent = message || 'Bloque bloqueado.'
	ui.lockHint.classList.add('active')
	lockHintTimer = setTimeout(function () {
		ui.lockHint.classList.remove('active')
	}, 1400)
}

function updateHotbarSlot(index) {
	var slot = hotbarEls[index]
	while (slot.firstChild) slot.removeChild(slot.firstChild)
	slot.appendChild(makeIcon(hotbarSlots[index]))
	var key = document.createElement('div')
	key.className = 'key'
	key.textContent = index + 1
	slot.appendChild(key)
}

function toggleInventory(force) {
	var shouldOpen = (typeof force === 'boolean') ? force : !ui.inventory.classList.contains('open')
	ui.inventory.classList.toggle('open', shouldOpen)
	inventoryOpen = shouldOpen
	updatePause()
	if (inventoryOpen && document.exitPointerLock) document.exitPointerLock()
}


// each tick, consume any scroll events and use them to cycle hotbar
var scrollCooldown = 0
var statusCooldown = 0
noa.on('tick', function (dt) {
	scrollCooldown -= dt
	statusCooldown -= dt
	lastStepTime -= dt
	clefStepCooldown -= dt
	stepSoundCooldown -= dt
	if (multiplayer) multiplayer.tick(dt)
	updateIslandAnimal(dt)

	if (statusCooldown <= 0) {
		statusCooldown = 120
		var pos = noa.entities.getPositionData(eid).position
		ui.playerPos.textContent = 'Pos: ' +
			Math.floor(pos[0]) + ' ' +
			Math.floor(pos[1]) + ' ' +
			Math.floor(pos[2])
	}

	if (multiplayer) multiplayer.updateRemotes()

	var scroll = noa.inputs.state.scrolly
	if (scroll) {
		if (noa.inputs.state['fov-adjust']) {
			cameraFov += scroll * 0.05
			cameraFov = Math.max(0.4, Math.min(1.6, cameraFov))
			if (scene && scene.activeCamera) {
				scene.activeCamera.fov = cameraFov
			}
		} else if (noa.inputs.state.ctrl) {
			highlightScale += scroll * 0.1
			highlightScale = Math.max(0.2, Math.min(3, highlightScale))
		} else if (scrollCooldown <= 0) {
			scrollCooldown = 80
			selectSlot(selectedIndex + (scroll > 0 ? -1 : 1))
		}
	}

	var pos = noa.entities.getPositionData(eid).position
	var underX = Math.floor(pos[0])
	var underY = Math.floor(pos[1] - 0.1)
	var underZ = Math.floor(pos[2])
	var blockUnder = noa.getBlock(underX, underY, underZ)

	// Impedir caminar sobre el agua (excepto en creativo con vuelo)
	if (blockUnder === waterID && !(creativeMode && allowFlight)) {
		var rescue = findNearestLand(pos[0], pos[2], 14)
		if (rescue) {
			noa.entities.setPosition(eid, rescue[0], rescue[1], rescue[2])
		} else if (typeof lastValidPos !== 'undefined' && lastValidPos) {
			noa.entities.setPosition(eid, lastValidPos[0], lastValidPos[1], lastValidPos[2])
		} else {
			noa.entities.setPosition(eid, pos[0], pos[1] + 1, pos[2])
		}
		return
	}

	// Guardar la última posición válida si no está sobre agua
	if (blockUnder !== waterID) {
		lastValidPos = [pos[0], pos[1], pos[2]]
	}

	var stepKey = underX + '|' + underY + '|' + underZ
	if (blockUnder === clefID && stepKey !== lastClefStepKey && clefStepCooldown <= 0) {
		playClefSequence(underX, underY, underZ)
		clefStepCooldown = 400
	}
	lastClefStepKey = (blockUnder === clefID) ? stepKey : null
	if (blockUnder && stepKey !== lastStepPosKey && lastStepTime <= 0) {
		if (musicBlocks[blockUnder]) {
			playMusicBlock(blockUnder, 'step', [underX, underY, underZ])
			lastStepTime = 120
		}
	}
	lastStepPosKey = blockUnder ? stepKey : null

	if (!musicBlocks[blockUnder] && blockUnder && stepSoundCooldown <= 0) {
		var vel = noa.playerBody.velocity
		var speed = Math.sqrt(vel[0] * vel[0] + vel[2] * vel[2])
		if (noa.playerBody.onGround && speed > 0.02) {
			playStepSoundFor(blockUnder)
			stepSoundCooldown = 220
		}
	}

	if (creativeMode && allowFlight) {
		var body = noa.playerBody
		var flySpeed = noa.inputs.state.sprint ? 12 : 6
		var up = noa.inputs.state.jump
		var down = noa.inputs.state.crouch
		if (up && !down) body.velocity[1] = flySpeed
		else if (down && !up) body.velocity[1] = -flySpeed
		else body.velocity[1] = 0
	}
})


// pausing + inventory
noa.inputs.bind('pause', 'P')
noa.inputs.down.on('pause', function () {
	paused = !paused
	updatePause()
})

noa.inputs.bind('inventory', 'E')
noa.inputs.bind('inventory', 'I')
noa.inputs.down.on('inventory', function () {
	toggleInventory()
})

noa.inputs.bind('toggle-creative', 'G')
noa.inputs.down.on('toggle-creative', function () {
	setCreativeMode(!creativeMode)
})

noa.inputs.bind('toggle-classroom', 'M')
noa.inputs.down.on('toggle-classroom', function () {
	toggleClassroom()
})

for (var i = 0; i < hotbarSlots.length; i++) {
	var action = 'slot-' + (i + 1)
	noa.inputs.bind(action, String(i + 1))
	bindSlotAction(action, i)
}

function bindSlotAction(action, index) {
	noa.inputs.down.on(action, function () {
		selectSlot(index)
	})
}

var paused = false
var inventoryOpen = false

function updatePause() {
	noa.setPaused(paused || inventoryOpen)
}

function setCreativeMode(enabled) {
	creativeMode = enabled
	noa.playerBody.gravityMultiplier = (creativeMode && allowFlight) ? 0 : 1
	updateStatus()
	scheduleSaveSettings()
}

registerStepSoundSet('grass', ['audio/step/grass1.ogg', 'audio/step/grass2.ogg', 'audio/step/grass3.ogg'])
registerStepSoundSet('sand', ['audio/step/sand1.ogg', 'audio/step/sand2.ogg', 'audio/step/sand3.ogg'])
registerStepSoundSet('stone', ['audio/step/stone1.ogg', 'audio/step/stone2.ogg', 'audio/step/stone3.ogg'])
registerStepSoundSet('gravel', ['audio/step/gravel1.ogg', 'audio/step/gravel2.ogg'])
registerStepSoundSet('snow', ['audio/step/snow1.ogg', 'audio/step/snow2.ogg'])
registerStepSoundSet('wood', ['audio/step/wood1.ogg', 'audio/step/wood2.ogg'])
registerStepSoundSet('leaves', ['audio/step/leaves1.ogg', 'audio/step/leaves2.ogg'])

function updateIslandAnimal(dt) {
	if (!islandAnimal) return
	islandAnimal.time += dt
	if (islandAnimal.time >= islandAnimal.nextTargetTime || islandAnimal.targetX === null) {
		var found = false
		for (var attempt = 0; attempt < 14; attempt++) {
			var angle = Math.random() * Math.PI * 2
			var minDist = islandAnimal.avoidRadius
			var maxDist = islandAnimal.roamRadius
			var dist = Math.sqrt(Math.random() * (maxDist * maxDist - minDist * minDist) + minDist * minDist)
			var tx = islandAnimal.roamCenterX + Math.cos(angle) * dist
			var tz = islandAnimal.roamCenterZ + Math.sin(angle) * dist
			if (!isWaterAt(tx, tz) && !isTooCloseToAvoid(tx, tz)) {
				islandAnimal.targetX = tx
				islandAnimal.targetZ = tz
				found = true
				break
			}
		}
		if (!found) {
			islandAnimal.targetX = islandAnimal.homeX
			islandAnimal.targetZ = islandAnimal.homeZ
		}
		islandAnimal.nextTargetTime = islandAnimal.time + 1500 + Math.random() * 2500
	}

	var pos = noa.entities.getPositionData(islandAnimal.eid).position
	var dx = islandAnimal.targetX - pos[0]
	var dz = islandAnimal.targetZ - pos[2]
	var distSq = dx * dx + dz * dz
	if (distSq < 0.05) {
		islandAnimal.nextTargetTime = islandAnimal.time
		return
	}

	var distLen = Math.sqrt(distSq)
	var step = islandAnimal.speed * dt
	var move = Math.min(step, distLen)
	var x = pos[0] + (dx / distLen) * move
	var z = pos[2] + (dz / distLen) * move
	if (isWaterAt(x, z)) {
		islandAnimal.targetX = null
		islandAnimal.targetZ = null
		islandAnimal.nextTargetTime = islandAnimal.time
		return
	}
	var y = pos[1]
	var groundY = getGroundY(x, z, y)
	if (isAnimalBlockedAt(x, z, y, groundY)) {
		islandAnimal.targetX = null
		islandAnimal.targetZ = null
		islandAnimal.nextTargetTime = islandAnimal.time
		return
	}

	if (islandAnimal.grounded) {
		if (groundY === null || groundY < y - 0.01) {
			islandAnimal.grounded = false
		} else {
			y = groundY
			islandAnimal.velY = 0
		}
	}

	if (!islandAnimal.grounded) {
		islandAnimal.velY += islandAnimal.gravity * dt
		y += islandAnimal.velY * dt
		if (groundY !== null && y <= groundY) {
			y = groundY
			islandAnimal.velY = 0
			islandAnimal.grounded = true
		}
	}

	noa.entities.setPosition(islandAnimal.eid, x, y, z)

	if (islandAnimal.root) {
		islandAnimal.root.rotation.y = Math.atan2(dx, dz)
		var gait = Math.sin(islandAnimal.time * 0.01)
		for (var i = 0; i < islandAnimal.legs.length; i++) {
			var leg = islandAnimal.legs[i]
			var phase = (i % 2 === 0) ? gait : -gait
			leg.rotation.x = phase * 0.35
		}
	}
}

function isAnimalBlockedAt(x, z, feetY, groundY) {
	var xi = Math.floor(x)
	var zi = Math.floor(z)
	var footBlock = Math.floor(feetY)
	if (isFenceBlockAt(xi, footBlock, zi) || isFenceBlockAt(xi, footBlock + 1, zi)) return true
	if (groundY !== null && isFenceBlockAt(xi, Math.floor(groundY - 1), zi)) return true
	return false
}

function isFenceBlockAt(x, y, z) {
	return noa.getBlock(x, y, z) === fenceID
}

function getGroundY(x, z, startY) {
	var xi = Math.floor(x)
	var zi = Math.floor(z)
	var y = Math.floor(startY)
	for (var yy = y; yy >= 0; yy--) {
		var id = noa.getBlock(xi, yy, zi)
		if (id && noa.registry.getBlockSolidity(id)) return yy + 1
	}
	return null
}

function findSheepSpot(centerX, centerZ, minDist, maxDist) {
	for (var attempt = 0; attempt < 30; attempt++) {
		var angle = Math.random() * Math.PI * 2
		var dist = Math.sqrt(Math.random() * (maxDist * maxDist - minDist * minDist) + minDist * minDist)
		var x = centerX + Math.cos(angle) * dist
		var z = centerZ + Math.sin(angle) * dist
		if (!isWaterAt(x, z)) return { x: x, z: z }
	}
	return { x: centerX + minDist, z: centerZ }
}

function isTooCloseToAvoid(x, z) {
	var dx = x - islandAnimal.avoidX
	var dz = z - islandAnimal.avoidZ
	return (dx * dx + dz * dz) < islandAnimal.avoidRadius * islandAnimal.avoidRadius
}

function isWaterAt(x, z) {
	var xi = Math.floor(x)
	var zi = Math.floor(z)
	var surface = getHeight(xi, zi)
	if (surface <= waterLevel + 1) return true
	return noa.getBlock(xi, waterLevel, zi) === waterID
}

function findNearestLand(x, z, maxRadius) {
	var xi = Math.floor(x)
	var zi = Math.floor(z)
	if (!isWaterAt(xi, zi)) {
		var groundY = getGroundY(xi, zi, waterLevel + 20)
		if (groundY !== null) return [xi + 0.5, groundY, zi + 0.5]
	}
	for (var r = 1; r <= maxRadius; r++) {
		for (var dx = -r; dx <= r; dx++) {
			var dz = r
			if (!isWaterAt(xi + dx, zi + dz)) {
				return [xi + dx + 0.5, getGroundY(xi + dx, zi + dz, waterLevel + 20), zi + dz + 0.5]
			}
			dz = -r
			if (!isWaterAt(xi + dx, zi + dz)) {
				return [xi + dx + 0.5, getGroundY(xi + dx, zi + dz, waterLevel + 20), zi + dz + 0.5]
			}
		}
		for (var dz2 = -r + 1; dz2 <= r - 1; dz2++) {
			var dx2 = r
			if (!isWaterAt(xi + dx2, zi + dz2)) {
				return [xi + dx2 + 0.5, getGroundY(xi + dx2, zi + dz2, waterLevel + 20), zi + dz2 + 0.5]
			}
			dx2 = -r
			if (!isWaterAt(xi + dx2, zi + dz2)) {
				return [xi + dx2 + 0.5, getGroundY(xi + dx2, zi + dz2, waterLevel + 20), zi + dz2 + 0.5]
			}
		}
	}
	return null
}
