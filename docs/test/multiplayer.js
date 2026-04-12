/* globals BABYLON */

'use strict'

function setupMultiplayer(noa, scene, options) {
	var runtimeParams = options.runtimeParams
	var runtimeIsLocal = !!options.runtimeIsLocal
	var getPlayerName = options.getPlayerName
	var sanitizePlayerName = options.sanitizePlayerName
	var createNametag = options.createNametag
	var updateNametag = options.updateNametag

	var serverUrl = runtimeIsLocal ? runtimeParams.get('server') : null
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
		var baseDelay = 2000
		var retryJitter = Math.floor(Math.random() * 500)
		reconnectTimer = setTimeout(function () {
			reconnectTimer = null
			connect()
		}, baseDelay + retryJitter)
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
			var mesh = createRemoteMesh(player.id)
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

	function createRemoteMesh(id) {
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

function getPlayerName(runtimeParams, sanitizePlayerName) {
	var fromParams = getPlayerNameFromParams(runtimeParams, sanitizePlayerName)
	if (fromParams) {
		localStorage.setItem('educraft-player-name', fromParams)
		return fromParams
	}
	var stored = sanitizePlayerName(localStorage.getItem('educraft-player-name') || '')
	if (stored) return stored
	var fallback = 'P' + Math.floor(Math.random() * 900 + 100)
	localStorage.setItem('educraft-player-name', fallback)
	return fallback
}

function getPlayerNameFromParams(runtimeParams, sanitizePlayerName) {
	return sanitizePlayerName(runtimeParams.get('name') || runtimeParams.get('player') || '')
}

function sanitizePlayerName(name) {
	if (!name) return ''
	var cleaned = name.trim().replace(/\s+/g, '')
	cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3)
	return cleaned.toUpperCase()
}

function createNametag(noa, parent, name, height, scene) {
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

module.exports = {
	setupMultiplayer: setupMultiplayer,
	getPlayerName: getPlayerName,
	sanitizePlayerName: sanitizePlayerName,
	createNametag: createNametag,
	updateNametag: updateNametag,
}
