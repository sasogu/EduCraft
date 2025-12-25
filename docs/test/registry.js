'use strict'

module.exports = function createRegistry(noa, scene) {
	var musicBlocks = {}
	var blockCatalog = []

	var textureAssets = buildClassicTextures(scene)
	var clefAsset = createClefTexture(scene)

	registerClassicMaterial('grassTop', textureAssets.grassTop)
	registerClassicMaterial('grassSide', textureAssets.grassSide)
	registerClassicMaterial('dirt', textureAssets.dirt)
	registerClassicMaterial('stone', textureAssets.stone)
	registerClassicMaterial('brick', textureAssets.brick)
	registerClassicMaterial('woodSide', textureAssets.woodSide)
	registerClassicMaterial('woodTop', textureAssets.woodTop)
	registerClassicMaterial('plank', textureAssets.plank)
	registerClassicMaterial('bridge', textureAssets.bridge)
	registerClassicMaterial('sand', textureAssets.sand)
	registerClassicMaterial('gravel', textureAssets.gravel)
	registerClassicMaterial('leaves', textureAssets.leaves, { alpha: 0.85, hasAlpha: true })
	registerClassicMaterial('glass', textureAssets.glass, { alpha: 0.35, hasAlpha: true })
	registerClassicMaterial('water', textureAssets.water, { alpha: 0.65, hasAlpha: true })
	registerClefMaterial('clef', clefAsset)

	var idCounter = 1
	var grassID = noa.registry.registerBlock(idCounter++, { material: ['grassTop', 'dirt', 'grassSide'] })
	var dirtID = noa.registry.registerBlock(idCounter++, { material: 'dirt' })
	var stoneID = noa.registry.registerBlock(idCounter++, { material: 'stone' })
	var brickID = noa.registry.registerBlock(idCounter++, { material: 'brick' })
	var woodID = noa.registry.registerBlock(idCounter++, { material: ['woodTop', 'woodTop', 'woodSide'] })
	var plankID = noa.registry.registerBlock(idCounter++, { material: 'plank' })
	var bridgeID = noa.registry.registerBlock(idCounter++, { material: 'bridge' })
	var sandID = noa.registry.registerBlock(idCounter++, { material: 'sand' })
	var gravelID = noa.registry.registerBlock(idCounter++, { material: 'gravel' })
	var leavesID = noa.registry.registerBlock(idCounter++, { material: 'leaves', opaque: false })
	var glassID = noa.registry.registerBlock(idCounter++, { material: 'glass', opaque: false })
	var waterID = noa.registry.registerBlock(idCounter++, { material: 'water', fluid: true, opaque: false })
	var clefID = noa.registry.registerBlock(idCounter++, { material: 'clef' })
	var fenceMesh = createFenceMesh('fence', textureAssets.plank.texture)
	var fenceID = noa.registry.registerBlock(idCounter++, { blockMesh: fenceMesh, solid: true, opaque: false })
	var dandelionID = registerPlantBlock('Diente de leon', textureAssets.dandelion, idCounter++)
	var poppyID = registerPlantBlock('Amapola', textureAssets.poppy, idCounter++)

	blockCatalog = [
		{ name: 'Cesped', id: grassID, icon: { type: 'texture', value: textureAssets.grassTop.iconPath }, locked: true },
		{ name: 'Tierra', id: dirtID, icon: { type: 'texture', value: textureAssets.dirt.iconPath }, locked: true },
		{ name: 'Piedra', id: stoneID, icon: { type: 'texture', value: textureAssets.stone.iconPath }, locked: true },
		{ name: 'Ladrillo', id: brickID, icon: { type: 'texture', value: textureAssets.brick.iconPath }, locked: true },
		{ name: 'Madera', id: woodID, icon: { type: 'texture', value: textureAssets.woodSide.iconPath }, locked: true },
		{ name: 'Tablon', id: plankID, icon: { type: 'texture', value: textureAssets.plank.iconPath }, locked: true },
		{ name: 'Puente', id: bridgeID, icon: { type: 'texture', value: textureAssets.bridge.iconPath }, locked: true },
		{ name: 'Arena', id: sandID, icon: { type: 'texture', value: textureAssets.sand.iconPath }, locked: true },
		{ name: 'Grava', id: gravelID, icon: { type: 'texture', value: textureAssets.gravel.iconPath }, locked: true },
		{ name: 'Hojas', id: leavesID, icon: { type: 'texture', value: textureAssets.leaves.iconPath }, locked: true },
		{ name: 'Cristal', id: glassID, icon: { type: 'texture', value: textureAssets.glass.iconPath }, locked: true },
		{ name: 'Agua', id: waterID, icon: { type: 'texture', value: textureAssets.water.iconPath }, locked: true },
		{ name: 'Clave de sol', id: clefID, icon: { type: 'data', value: clefAsset.iconPath } },
		{ name: 'Valla', id: fenceID, icon: { type: 'texture', value: textureAssets.plank.iconPath }, locked: true },
		{ name: 'Diente de leon', id: dandelionID, icon: { type: 'texture', value: textureAssets.dandelion.iconPath }, locked: true },
		{ name: 'Amapola', id: poppyID, icon: { type: 'texture', value: textureAssets.poppy.iconPath }, locked: true },
	]

	addMusicBlocks()

	return {
		blockCatalog: blockCatalog,
		musicBlocks: musicBlocks,
		ids: {
			grassID: grassID,
			dirtID: dirtID,
			stoneID: stoneID,
			brickID: brickID,
			woodID: woodID,
			plankID: plankID,
			bridgeID: bridgeID,
			sandID: sandID,
			gravelID: gravelID,
			leavesID: leavesID,
			glassID: glassID,
			waterID: waterID,
			clefID: clefID,
			fenceID: fenceID,
			dandelionID: dandelionID,
			poppyID: poppyID
		}
	}

	function registerClassicMaterial(name, asset, opts) {
		opts = opts || {}
		var mat = noa.rendering.flatMaterial.clone(name + '-mat')
		mat.diffuseTexture = asset.texture
		mat.specularColor = new BABYLON.Color3(0, 0, 0)
		if (opts.alpha) mat.alpha = opts.alpha
		if (opts.hasAlpha) mat.diffuseTexture.hasAlpha = true
		noa.registry.registerMaterial(name, [1, 1, 1], null, !!opts.hasAlpha, mat)
	}

	function registerClefMaterial(name, asset) {
		var mat = noa.rendering.flatMaterial.clone(name + '-mat')
		mat.diffuseTexture = asset.texture
		mat.specularColor = new BABYLON.Color3(0, 0, 0)
		noa.registry.registerMaterial(name, [1, 1, 1], null, false, mat)
	}

	function createClefTexture(scene) {
		var size = 64
		var texture = new BABYLON.DynamicTexture('clef-texture', { width: size, height: size }, scene, false)
		var ctx = texture.getContext()
		ctx.fillStyle = '#151821'
		ctx.fillRect(0, 0, size, size)
		ctx.strokeStyle = '#f5f5f5'
		ctx.lineWidth = 3
		ctx.strokeRect(4, 4, size - 8, size - 8)
		ctx.fillStyle = '#f5f5f5'
		ctx.font = "bold 26px 'Silkscreen'"
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText('SOL', size / 2, size / 2)
		texture.update()
		return { texture: texture, iconPath: ctx.canvas.toDataURL('image/png') }
	}

	function registerPlantBlock(label, asset, id) {
		var mesh = createPlantMesh('plant-' + label.toLowerCase().replace(/\s+/g, '-'), asset.texture)
		return noa.registry.registerBlock(id, { blockMesh: mesh, solid: false, opaque: false })
	}

	function createPlantMesh(name, texture) {
		var mat = noa.rendering.flatMaterial.clone(name + '-mat')
		mat.diffuseTexture = texture
		mat.diffuseTexture.hasAlpha = true
		mat.backFaceCulling = false
		mat.specularColor = new BABYLON.Color3(0, 0, 0)

		var planeA = BABYLON.MeshBuilder.CreatePlane(name + '-a', { size: 1 }, scene)
		var planeB = BABYLON.MeshBuilder.CreatePlane(name + '-b', { size: 1 }, scene)
		planeA.material = mat
		planeB.material = mat
		planeA.position.y = 0.5
		planeB.position.y = 0.5
		planeA.rotation.x = Math.PI
		planeB.rotation.x = Math.PI
		planeB.rotation.y = Math.PI / 2
		var merged = BABYLON.Mesh.MergeMeshes([planeA, planeB], true, true, undefined, false, true)
		merged.material = mat
		merged.isVisible = false
		return merged
	}

	function createFenceMesh(name, texture) {
		var mat = noa.rendering.flatMaterial.clone(name + '-mat')
		mat.diffuseTexture = texture
		mat.specularColor = new BABYLON.Color3(0, 0, 0)

		var postA = BABYLON.MeshBuilder.CreateBox(name + '-post-a', { width: 0.2, height: 1, depth: 0.2 }, scene)
		var postB = BABYLON.MeshBuilder.CreateBox(name + '-post-b', { width: 0.2, height: 1, depth: 0.2 }, scene)
		var railLow = BABYLON.MeshBuilder.CreateBox(name + '-rail-low', { width: 1, height: 0.15, depth: 0.2 }, scene)
		var railHigh = BABYLON.MeshBuilder.CreateBox(name + '-rail-high', { width: 1, height: 0.15, depth: 0.2 }, scene)
		var railLowZ = BABYLON.MeshBuilder.CreateBox(name + '-rail-low-z', { width: 0.2, height: 0.15, depth: 1 }, scene)
		var railHighZ = BABYLON.MeshBuilder.CreateBox(name + '-rail-high-z', { width: 0.2, height: 0.15, depth: 1 }, scene)

		postA.material = mat
		postB.material = mat
		railLow.material = mat
		railHigh.material = mat
		railLowZ.material = mat
		railHighZ.material = mat

		postA.position.x = -0.4
		postA.position.y = 0.5
		postB.position.x = 0.4
		postB.position.y = 0.5
		railLow.position.y = 0.4
		railHigh.position.y = 0.7
		railLowZ.position.y = 0.4
		railHighZ.position.y = 0.7

		var merged = BABYLON.Mesh.MergeMeshes([postA, postB, railLow, railHigh, railLowZ, railHighZ], true, true, undefined, false, true)
		merged.material = mat
		merged.isVisible = false
		return merged
	}

	function addMusicBlocks() {
		var bpm = 120
		var beat = 60 / bpm

		var baseNotes = [
			{ name: 'Do', letter: 'C', freq: 261.63 },
			{ name: 'Re', letter: 'D', freq: 293.66 },
			{ name: 'Mi', letter: 'E', freq: 329.63 },
			{ name: 'Fa', letter: 'F', freq: 349.23 },
			{ name: 'Sol', letter: 'G', freq: 392.0 },
			{ name: 'La', letter: 'A', freq: 440.0 },
			{ name: 'Si', letter: 'B', freq: 493.88 },
		]
		var palette = ['#d32f2f', '#f57c00', '#fbc02d', '#4caf50', '#29b6f6', '#1976d2', '#7b1fa2']
		var notes = []
		var octaves = [
			{ label: '4', mult: 1 },
			{ label: '5', mult: 2 },
		]
		for (var o = 0; o < octaves.length; o++) {
			for (var i = 0; i < baseNotes.length; i++) {
				var base = baseNotes[i]
				notes.push({
					name: base.name,
					letter: base.letter,
					octave: octaves[o].label,
					freq: base.freq * octaves[o].mult,
					color: palette[i]
				})
			}
		}
		var rhythms = [
			{ name: 'Blanca', beats: 2, shade: 0.25 },
			{ name: 'Negra', beats: 1, shade: 0 },
			{ name: 'Corchea', beats: 0.5, shade: -0.2 },
		]

		notes.forEach(function (note) {
			rhythms.forEach(function (rhythm) {
				var label = note.name + note.octave + ' ' + rhythm.name
				var color = shadeColor(note.color, rhythm.shade)
				var id = registerMusicBlock(label, color, note.freq, rhythm.name, rhythm.beats, false, {
					name: note.name,
					letter: note.letter,
					octave: note.octave,
				})
				blockCatalog.push({
					name: label,
					id: id,
					icon: { type: 'color', value: color },
					music: {
						note: note.name + note.octave,
						rhythm: rhythm.name,
						isRest: false
					}
				})
			})
		})

		rhythms.forEach(function (rhythm) {
			var label = 'Silencio ' + rhythm.name
			var color = shadeColor('#9aa5b1', rhythm.shade)
			var id = registerMusicBlock(label, color, null, rhythm.name, rhythm.beats, true, null)
			blockCatalog.push({
				name: label,
				id: id,
				icon: { type: 'color', value: color },
				music: {
					note: 'Rest',
					rhythm: rhythm.name,
					isRest: true
				}
			})
		})
	}

	function registerMusicBlock(label, color, freq, rhythm, beats, isRest, noteData) {
		var key = 'music-' + label.toLowerCase().replace(/\s+/g, '-')
		noa.registry.registerMaterial(key, hexToColor(color), null)
		var id = noa.registry.registerBlock(idCounter++, { material: key, opaque: true })
		musicBlocks[id] = {
			label: label,
			frequency: freq,
			rhythm: rhythm,
			duration: (60 / 120) * beats,
			isRest: isRest,
			noteName: noteData ? noteData.name : null,
			noteLetter: noteData ? noteData.letter : null,
			noteOctave: noteData ? noteData.octave : null,
		}
		return id
	}

	function buildClassicTextures(scene) {
		var basePath = 'textures/block/'
		return {
			grassTop: loadTextureAsset(scene, 'grass-top', basePath + 'grass_block_top.png', 'block/grass_block_top.png'),
			dirt: loadTextureAsset(scene, 'dirt', basePath + 'dirt.png', 'block/dirt.png'),
			grassSide: loadTextureAsset(scene, 'grass-side', basePath + 'grass_block_side.png', 'block/grass_block_side.png'),
			stone: loadTextureAsset(scene, 'stone', basePath + 'stone.png', 'block/stone.png'),
			brick: loadTextureAsset(scene, 'brick', basePath + 'bricks.png', 'block/bricks.png'),
			plank: loadTextureAsset(scene, 'plank', basePath + 'oak_planks.png', 'block/oak_planks.png'),
			bridge: loadTextureAsset(scene, 'bridge', basePath + 'dark_oak_planks.png', 'block/dark_oak_planks.png'),
			woodSide: loadTextureAsset(scene, 'wood-side', basePath + 'oak_log.png', 'block/oak_log.png'),
			woodTop: loadTextureAsset(scene, 'wood-top', basePath + 'oak_log_top.png', 'block/oak_log_top.png'),
			sand: loadTextureAsset(scene, 'sand', basePath + 'sand.png', 'block/sand.png'),
			gravel: loadTextureAsset(scene, 'gravel', basePath + 'gravel.png', 'block/gravel.png'),
			leaves: loadTextureAsset(scene, 'leaves', basePath + 'leaves.png', 'block/leaves.png', true),
			glass: loadTextureAsset(scene, 'glass', basePath + 'glass.png', 'block/glass.png', true),
			water: loadTextureAsset(scene, 'water', basePath + 'water.png', 'block/water.png', true),
			dandelion: loadTextureAsset(scene, 'dandelion', basePath + 'dandelion.png', 'block/dandelion.png', true),
			poppy: loadTextureAsset(scene, 'poppy', basePath + 'red_flower.png', 'block/red_flower.png', true),
		}
	}

	function loadTextureAsset(scene, name, url, iconPath, hasAlpha) {
		var texture = new BABYLON.Texture(url, scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE)
		texture.hasAlpha = !!hasAlpha
		texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
		texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE

		return {
			texture: texture,
			iconPath: iconPath,
		}
	}

	function hexToColor(hex) {
		var normalized = hex.replace('#', '')
		var r = parseInt(normalized.slice(0, 2), 16) / 255
		var g = parseInt(normalized.slice(2, 4), 16) / 255
		var b = parseInt(normalized.slice(4, 6), 16) / 255
		return [r, g, b]
	}

	function shadeColor(hex, amount) {
		var normalized = hex.replace('#', '')
		var r = parseInt(normalized.slice(0, 2), 16)
		var g = parseInt(normalized.slice(2, 4), 16)
		var b = parseInt(normalized.slice(4, 6), 16)
		var amt = Math.round(255 * amount)
		return '#' + toHex(clamp(r + amt)) + toHex(clamp(g + amt)) + toHex(clamp(b + amt))
	}

	function toHex(value) {
		var hex = value.toString(16)
		return hex.length === 1 ? '0' + hex : hex
	}

	function clamp(value) {
		return Math.max(0, Math.min(255, value))
	}
}
