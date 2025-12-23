/* globals BABYLON */
'use strict';


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
	blockTestDistance: 40,
	texturePath: 'textures/',
	playerStart: [0.5, 6, 0.5],
	playerHeight: 1.6,
	playerWidth: 0.6,
	playerAutoStep: true,
	useAO: false,
}


// create engine
var noa = noaEngine(opts)
var scene = noa.rendering.getScene()

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


//		World generation


// block registry
var registry = createRegistry(noa, scene)
var blockCatalog = registry.blockCatalog
var musicBlocks = registry.musicBlocks
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
var fenceID = registry.ids.fenceID

function setupMultiplayer(noa, scene) {
	var params = new URLSearchParams(window.location.search)
	var serverUrl = params.get('server')
	var playerName = params.get('name') || params.get('player')
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

	function upsertRemotePlayer(player) {
		var entry = remotePlayers[player.id]
		if (!entry) {
			var size = noa.entities.getPositionData(noa.playerEntity)
			var mesh = createRemoteMesh(player.id, scene)
			var eid = noa.entities.add([player.x, player.y, player.z], size.width, size.height, mesh, [0, size.height / 2, 0], false, false)
			entry = {
				eid: eid,
				mesh: mesh,
				last: { x: player.x, y: player.y, z: player.z },
				target: { x: player.x, y: player.y, z: player.z },
				lastUpdate: Date.now(),
			}
			remotePlayers[player.id] = entry
		}
		entry.last = { x: entry.target.x, y: entry.target.y, z: entry.target.z }
		entry.target = { x: player.x, y: player.y, z: player.z }
		entry.lastUpdate = Date.now()
	}

	function removeRemotePlayer(id) {
		var entry = remotePlayers[id]
		if (!entry) return
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

	return { tick: tick, updateRemotes: updateRemotes }
}


var defaultHotbarLabels = [
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
var treeSpacing = 6
var treeHeight = 4
var waterLevel = baseHeight - 1

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

	if (isTreeSpot(x, z, surface)) {
		var trunkBase = surface
		if (y >= trunkBase && y < trunkBase + treeHeight) return woodID
		if (y >= trunkBase + treeHeight - 1 && y <= trunkBase + treeHeight + 1) {
			var dx = Math.abs((x % treeSpacing + treeSpacing) % treeSpacing - 1)
			var dz = Math.abs((z % treeSpacing + treeSpacing) % treeSpacing - 1)
			if (dx <= 2 && dz <= 2) return leavesID
		}
	}

	return 0
}

function getHeight(x, z) {
	var h = baseHeight
	h += Math.floor(Math.sin(x / 12) * 2 + Math.cos(z / 14) * 2)
	h += Math.floor(Math.sin((x + z) / 18) * 1.5)
	return Math.max(2, h)
}

function isTreeSpot(x, z, surface) {
	if (surface <= waterLevel + 1) return false
	var hash = Math.abs((x * 73856093) ^ (z * 19349663))
	return (hash % 100) < 6 && (x % treeSpacing === 1 && z % treeSpacing === 1)
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

// a "mesh" component to the player entity
noa.entities.addComponent(eid, noa.entities.names.mesh, {
	mesh: playerMesh,
	offset: offset
})




// 		Interactivity:

function applyBlockEdit(blockId, position) {
	var key = getEditKey(position[0], position[1], position[2])
	worldEdits[key] = blockId
	scheduleSaveWorld()
	if (blockId === 0) {
		noa.setBlock(0, position)
	} else {
		noa.addBlock(blockId, position)
	}
}


// on left mouse, set targeted block to be air
noa.inputs.down.on('fire', function () {
	if (noa.targetedBlock) {
		playMusicBlock(noa.targetedBlock.blockID)
		applyBlockEdit(0, noa.targetedBlock.position)
	}
})

// place block on alt-fire (RMB)
noa.inputs.down.on('alt-fire', function () {
	if (noa.targetedBlock) {
		applyBlockEdit(pickedID, noa.targetedBlock.adjacent)
		playMusicBlock(pickedID)
	}
})

// pick block on middle fire (MMB)
noa.inputs.down.on('mid-fire', function () {
	if (noa.targetedBlock) setSelectedById(noa.targetedBlock.blockID)
})

noa.inputs.bind('play-note', 'R')
noa.inputs.down.on('play-note', function () {
	if (noa.targetedBlock) playMusicBlock(noa.targetedBlock.blockID)
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
}

var hotbarSlots = getDefaultHotbar()
var hotbarEls = []
var inventoryEls = []
var selectedIndex = 0
var pickedID = hotbarSlots[0].id
var creativeMode = true
var musicFeedbackTimer = null
var musicPulseTimer = null
var audioState = { ctx: null }
var audioReady = false
var lastStepBlockId = null
var lastStepTime = 0
var rewardPlaced = false
var classroom = {
	enabled: false,
	levelIndex: -1,
	score: 0,
	sequence: [],
	inputIndex: 0,
	playing: false,
	allowInput: false,
	timeouts: [],
}

var classroomLevels = [
	{ name: 'Eco 1', length: 3, notes: ['Do4', 'Re4', 'Mi4'], rhythms: ['Negra'], allowRest: false },
	{ name: 'Eco 2', length: 4, notes: ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4'], rhythms: ['Negra'], allowRest: false },
	{ name: 'Eco 3', length: 5, notes: ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4'], rhythms: ['Negra', 'Blanca'], allowRest: false },
	{ name: 'Eco 4', length: 6, notes: ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4', 'La4', 'Si4'], rhythms: ['Negra', 'Corchea'], allowRest: false },
	{ name: 'Eco 5', length: 7, notes: ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4', 'La4', 'Si4', 'Do5'], rhythms: ['Negra', 'Corchea'], allowRest: true },
	{ name: 'Eco 6', length: 8, notes: ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4', 'La4', 'Si4', 'Do5', 'Re5'], rhythms: ['Blanca', 'Negra', 'Corchea'], allowRest: true },
]

var worldName = getWorldName()
var worldEdits = {}
var saveSettingsTimer = null
var saveWorldTimer = null
var editsApplied = false

initLocalState()

function setupClassroom() {
	if (ui.classroomStart) ui.classroomStart.addEventListener('click', startClassroom)
	if (ui.classroomPlay) ui.classroomPlay.addEventListener('click', playSequence)
	if (ui.classroomReset) ui.classroomReset.addEventListener('click', resetClassroom)
	if (ui.classroomToggle) ui.classroomToggle.addEventListener('click', function () {
		toggleClassroom(false)
	})
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

function initLocalState() {
	storage.getSettings()
		.then(function (settings) {
			applySettings(settings)
			return storage.getWorldEdits(worldName)
		})
		.then(function (edits) {
			if (edits) worldEdits = edits
			buildHotbar()
			buildInventory()
			selectSlot(selectedIndex)
			setCreativeMode(creativeMode)
			setupClassroom()
			toggleClassroom(settingsClassroomOpen())
			applySavedEdits()
		})
		.catch(function () {
			buildHotbar()
			buildInventory()
			selectSlot(selectedIndex)
			setCreativeMode(creativeMode)
			setupClassroom()
			toggleClassroom(true)
		})
}

function applySettings(settings) {
	if (!settings) return
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
}

function settingsClassroomOpen() {
	if (typeof classroom._open === 'boolean') return classroom._open
	return true
}

function collectSettings() {
	return {
		hotbar: hotbarSlots.map(function (slot) { return slot.id }),
		selectedIndex: selectedIndex,
		creativeMode: creativeMode,
		classroomOpen: ui.classroom.classList.contains('open')
	}
}

function scheduleSaveSettings() {
	if (saveSettingsTimer) clearTimeout(saveSettingsTimer)
	saveSettingsTimer = setTimeout(function () {
		storage.saveSettings(collectSettings())
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
	blockCatalog.forEach(function (block) {
		if (block.locked) return
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
		setSelectedById(block.id)
		toggleInventory(false)
	})

	return item
}

function addInventoryItem(block) {
	if (!ui.inventoryGrid) return
	var item = createInventoryItem(block)
	ui.inventoryGrid.appendChild(item)
	inventoryEls.push(item)
}

function unlockBlockByName(name) {
	for (var i = 0; i < blockCatalog.length; i++) {
		var block = blockCatalog[i]
		if (block.name === name) {
			if (!block.locked) return false
			block.locked = false
			addInventoryItem(block)
			return true
		}
	}
	return false
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
	classroom.enabled = true
	classroom.levelIndex = 0
	classroom.score = 0
	classroom.inputIndex = 0
	setLevel(classroom.levelIndex)
	updateClassroomUI()
	setClassroomStatus('Escucha la secuencia y repitela.')
	playSequence()
}

function resetClassroom() {
	classroom.enabled = false
	classroom.levelIndex = -1
	classroom.score = 0
	classroom.sequence = []
	classroom.inputIndex = 0
	classroom.playing = false
	classroom.allowInput = false
	clearClassroomTimers()
	updateClassroomUI()
	setClassroomStatus('Pulsa Empezar para iniciar el reto.')
}

function setLevel(index) {
	classroom.levelIndex = index
	classroom.sequence = buildSequence(classroomLevels[index])
	classroom.inputIndex = 0
	updateClassroomUI()
}

function buildSequence(level) {
	var pool = buildPool(level)
	var sequence = []
	for (var i = 0; i < level.length; i++) {
		var pick = pool[Math.floor(Math.random() * pool.length)]
		sequence.push(pick)
	}
	return sequence
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

function playSequence() {
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
			playMusicBlock(blockId)
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

function getBlockDuration(blockId) {
	var music = musicBlocks[blockId]
	return music ? music.duration : 0.3
}

function recordClassroomInput(blockId) {
	if (!classroom.enabled || !classroom.allowInput) return
	if (!musicBlocks[blockId]) return

	var expected = classroom.sequence[classroom.inputIndex]
	if (blockId === expected) {
		classroom.inputIndex++
		classroom.score += 5
		updateClassroomUI()
		if (classroom.inputIndex >= classroom.sequence.length) {
			classroom.score += 10
			setClassroomStatus('Bien! Siguiente nivel...')
			advanceLevel()
		}
	} else {
		setClassroomStatus('Ups! Intenta de nuevo.')
		classroom.inputIndex = 0
		updateClassroomUI()
	}
}

function advanceLevel() {
	classroom.allowInput = false
	if (classroom.levelIndex + 1 >= classroomLevels.length) {
		var unlocked = unlockBlockByName('Valla')
		if (unlocked && !rewardPlaced) {
			placeFenceRewardNearPlayer()
			rewardPlaced = true
		}
		var rewardText = unlocked ? ' Premio desbloqueado: Valla (inventario E).' : ''
		setClassroomStatus('Reto completado. Puntuacion final: ' + classroom.score + '.' + rewardText)
		classroom.enabled = false
		return
	}
	classroom.levelIndex += 1
	setLevel(classroom.levelIndex)
	setTimeout(function () {
		playSequence()
	}, 600)
}

function updateClassroomUI() {
	if (!ui.classroomLevel) return
	var levelLabel = classroom.levelIndex >= 0 ? classroomLevels[classroom.levelIndex].name : '--'
	ui.classroomLevel.textContent = levelLabel
	ui.classroomScore.textContent = String(classroom.score)
	ui.classroomProgress.textContent = classroom.inputIndex + '/' + classroom.sequence.length
	renderSequence()
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
	for (var i = 0; i < classroom.sequence.length; i++) {
		var blockId = classroom.sequence[i]
		var chip = document.createElement('div')
		chip.className = 'seq-chip'
		chip.textContent = getMusicLabel(blockId) || '---'
		ui.classroomSeq.appendChild(chip)
	}
}

function highlightSequenceIndex(index) {
	if (!ui.classroomSeq) return
	var chips = ui.classroomSeq.querySelectorAll('.seq-chip')
	for (var i = 0; i < chips.length; i++) {
		if (i === index) chips[i].classList.add('active')
		else chips[i].classList.remove('active')
	}
}

function clearSequenceHighlights() {
	if (!ui.classroomSeq) return
	var chips = ui.classroomSeq.querySelectorAll('.seq-chip')
	for (var i = 0; i < chips.length; i++) {
		chips[i].classList.remove('active')
	}
}

function clearClassroomTimers() {
	while (classroom.timeouts.length) {
		clearTimeout(classroom.timeouts.pop())
	}
}

function setClassroomStatus(text) {
	if (ui.classroomStatus) ui.classroomStatus.textContent = text
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

function playMusicBlock(blockId) {
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

	recordClassroomInput(blockId)

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
	if (multiplayer) multiplayer.tick(dt)

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
	if (scroll && scrollCooldown <= 0) {
		scrollCooldown = 80
		selectSlot(selectedIndex + (scroll > 0 ? -1 : 1))
	}

	var pos = noa.entities.getPositionData(eid).position
	var underX = Math.floor(pos[0])
	var underY = Math.floor(pos[1] - 0.1)
	var underZ = Math.floor(pos[2])
	var blockUnder = noa.getBlock(underX, underY, underZ)
	if (blockUnder && blockUnder !== lastStepBlockId && lastStepTime <= 0) {
		if (musicBlocks[blockUnder]) {
			playMusicBlock(blockUnder)
			lastStepTime = 120
		}
	}
	lastStepBlockId = blockUnder

	if (creativeMode) {
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
	noa.playerBody.gravityMultiplier = creativeMode ? 0 : 2
	updateStatus()
	scheduleSaveSettings()
}
