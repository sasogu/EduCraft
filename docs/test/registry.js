'use strict'

module.exports = function createRegistry(noa, scene) {
	var musicBlocks = {}
	var blockCatalog = []

	var textureAssets = buildClassicTextures(scene)

	registerClassicMaterial('grassTop', textureAssets.grassTop)
	registerClassicMaterial('grassSide', textureAssets.grassSide)
	registerClassicMaterial('dirt', textureAssets.dirt)
	registerClassicMaterial('stone', textureAssets.stone)
	registerClassicMaterial('brick', textureAssets.brick)
	registerClassicMaterial('woodSide', textureAssets.woodSide)
	registerClassicMaterial('woodTop', textureAssets.woodTop)
	registerClassicMaterial('plank', textureAssets.plank)
	registerClassicMaterial('sand', textureAssets.sand)
	registerClassicMaterial('gravel', textureAssets.gravel)
	registerClassicMaterial('leaves', textureAssets.leaves, { alpha: 0.85, hasAlpha: true })
	registerClassicMaterial('glass', textureAssets.glass, { alpha: 0.35, hasAlpha: true })
	registerClassicMaterial('water', textureAssets.water, { alpha: 0.65, hasAlpha: true })

	var idCounter = 1
	var grassID = noa.registry.registerBlock(idCounter++, { material: ['grassTop', 'dirt', 'grassSide'] })
	var dirtID = noa.registry.registerBlock(idCounter++, { material: 'dirt' })
	var stoneID = noa.registry.registerBlock(idCounter++, { material: 'stone' })
	var brickID = noa.registry.registerBlock(idCounter++, { material: 'brick' })
	var woodID = noa.registry.registerBlock(idCounter++, { material: ['woodTop', 'woodTop', 'woodSide'] })
	var plankID = noa.registry.registerBlock(idCounter++, { material: 'plank' })
	var sandID = noa.registry.registerBlock(idCounter++, { material: 'sand' })
	var gravelID = noa.registry.registerBlock(idCounter++, { material: 'gravel' })
	var leavesID = noa.registry.registerBlock(idCounter++, { material: 'leaves', opaque: false })
	var glassID = noa.registry.registerBlock(idCounter++, { material: 'glass', opaque: false })
	var waterID = noa.registry.registerBlock(idCounter++, { material: 'water', fluid: true, opaque: false })
	var fenceID = noa.registry.registerBlock(idCounter++, { material: 'plank', opaque: false })

	blockCatalog = [
		{ name: 'Cesped', id: grassID, icon: { type: 'data', value: textureAssets.grassTop.dataUrl } },
		{ name: 'Tierra', id: dirtID, icon: { type: 'data', value: textureAssets.dirt.dataUrl } },
		{ name: 'Piedra', id: stoneID, icon: { type: 'data', value: textureAssets.stone.dataUrl } },
		{ name: 'Ladrillo', id: brickID, icon: { type: 'data', value: textureAssets.brick.dataUrl } },
		{ name: 'Madera', id: woodID, icon: { type: 'data', value: textureAssets.woodSide.dataUrl } },
		{ name: 'Tablon', id: plankID, icon: { type: 'data', value: textureAssets.plank.dataUrl } },
		{ name: 'Arena', id: sandID, icon: { type: 'data', value: textureAssets.sand.dataUrl } },
		{ name: 'Grava', id: gravelID, icon: { type: 'data', value: textureAssets.gravel.dataUrl } },
		{ name: 'Hojas', id: leavesID, icon: { type: 'data', value: textureAssets.leaves.dataUrl } },
		{ name: 'Cristal', id: glassID, icon: { type: 'data', value: textureAssets.glass.dataUrl } },
		{ name: 'Agua', id: waterID, icon: { type: 'data', value: textureAssets.water.dataUrl } },
		{ name: 'Valla', id: fenceID, icon: { type: 'data', value: textureAssets.plank.dataUrl }, locked: true },
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
			sandID: sandID,
			gravelID: gravelID,
			leavesID: leavesID,
			glassID: glassID,
			waterID: waterID,
			fenceID: fenceID
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
		var palette = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac']
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
		var size = 16
		return {
			grassTop: makeTexture(scene, 'grass-top', size, function () {
				return noisePixel('#5fa644', 18)
			}),
			dirt: makeTexture(scene, 'dirt', size, function () {
				return noisePixel('#8b6b4c', 20)
			}),
			grassSide: makeTexture(scene, 'grass-side', size, function (x, y) {
				if (y < 4) return noisePixel('#5fa644', 18)
				return noisePixel('#8b6b4c', 20)
			}),
			stone: makeTexture(scene, 'stone', size, function () {
				return noisePixel('#7f7f7f', 24)
			}),
			brick: makeTexture(scene, 'brick', size, function (x, y) {
				var mortar = (y % 4 === 0) || (x % 8 === 0 && y % 8 < 4)
				if (mortar) return [90, 35, 35, 255]
				return noisePixel('#b04a3a', 16)
			}),
			plank: makeTexture(scene, 'plank', size, function (x, y) {
				var line = (y % 4 === 0)
				if (line) return [120, 86, 50, 255]
				return noisePixel('#c49b6a', 10)
			}),
			woodSide: makeTexture(scene, 'wood-side', size, function (x, y) {
				var stripe = (x % 4 === 0)
				if (stripe) return [90, 60, 35, 255]
				return noisePixel('#9b6b43', 14)
			}),
			woodTop: makeTexture(scene, 'wood-top', size, function (x, y) {
				var dx = x - 8
				var dy = y - 8
				var dist = Math.sqrt(dx * dx + dy * dy)
				var ring = (Math.floor(dist) % 3 === 0)
				if (ring) return [90, 60, 35, 255]
				return noisePixel('#c49b6a', 8)
			}),
			sand: makeTexture(scene, 'sand', size, function () {
				return noisePixel('#d9c57a', 12)
			}),
			gravel: makeTexture(scene, 'gravel', size, function () {
				return noisePixel('#8b8b8b', 28)
			}),
			leaves: makeTexture(scene, 'leaves', size, function (x, y) {
				var alpha = (Math.random() > 0.25) ? 200 : 0
				var col = noisePixel('#3f8f3b', 18)
				col[3] = alpha
				return col
			}, true),
			glass: makeTexture(scene, 'glass', size, function (x, y) {
				var border = (x === 0 || y === 0 || x === 15 || y === 15)
				if (border) return [210, 230, 255, 160]
				if (x === y || x === 15 - y) return [210, 230, 255, 90]
				return [200, 230, 255, 20]
			}, true),
			water: makeTexture(scene, 'water', size, function () {
				return noisePixel('#3b7dc4', 20, 170)
			}, true),
		}
	}

	function makeTexture(scene, name, size, pixelFn, hasAlpha) {
		var canvas = document.createElement('canvas')
		canvas.width = size
		canvas.height = size
		var ctx = canvas.getContext('2d')
		var img = ctx.createImageData(size, size)
		for (var y = 0; y < size; y++) {
			for (var x = 0; x < size; x++) {
				var idx = (y * size + x) * 4
				var rgba = pixelFn(x, y)
				img.data[idx] = rgba[0]
				img.data[idx + 1] = rgba[1]
				img.data[idx + 2] = rgba[2]
				img.data[idx + 3] = (typeof rgba[3] === 'number') ? rgba[3] : 255
			}
		}
		ctx.putImageData(img, 0, 0)

		var texture = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, false)
		var tctx = texture.getContext()
		tctx.drawImage(canvas, 0, 0)
		texture.update()
		texture.hasAlpha = !!hasAlpha
		texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
		texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE
		texture.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE)

		return {
			texture: texture,
			dataUrl: canvas.toDataURL('image/png'),
		}
	}

	function noisePixel(hex, variance, alpha) {
		var rgb = hexToRgb(hex)
		var spread = variance || 0
		return [
			clamp(rgb.r + rand(spread)),
			clamp(rgb.g + rand(spread)),
			clamp(rgb.b + rand(spread)),
			(typeof alpha === 'number') ? alpha : 255
		]
	}

	function rand(spread) {
		return Math.floor((Math.random() * 2 - 1) * spread)
	}

	function hexToRgb(hex) {
		var normalized = hex.replace('#', '')
		return {
			r: parseInt(normalized.slice(0, 2), 16),
			g: parseInt(normalized.slice(2, 4), 16),
			b: parseInt(normalized.slice(4, 6), 16),
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
