
const Dexie = require('dexie');

var WORLD_GENERATOR_VERSION = 2

var db = new Dexie('educraft-storage')
db.version(1).stores({
	main: 'name, data',
	world: 'name, lastplay',
	worlddata: 'name, data'
})

function nowTs() {
	return Date.now()
}

function generateWorldSeed() {
	return Math.floor(Math.random() * 0x7fffffff)
}

function getSettings() {
	return db.main.where('name').equals('settings').first().then(function (row) {
		return row ? row.data : {}
	})
}

function saveSettings(data) {
	return db.main.put({ name: 'settings', data: data })
}

function getWorldMeta(name) {
	return db.world.where('name').equals(name).first().then(function (row) {
		return row || null
	})
}

function getWorldEdits(name) {
	return db.worlddata.where('name').equals(name).first().then(function (row) {
		return row ? row.data : {}
	})
}

function saveWorldEdits(name, edits) {
	return db.transaction('rw', db.world, db.worlddata, function () {
		return db.world.where('name').equals(name).first().then(function (row) {
			var ts = nowTs()
			var meta = row || {
				name: name,
				createdAt: ts,
				seed: generateWorldSeed(),
				generatorVersion: WORLD_GENERATOR_VERSION
			}
			meta.lastplay = ts
			return Promise.all([
				db.world.put(meta),
				db.worlddata.put({ name: name, data: edits })
			])
		})
	}).then(function () { return true })
}

function touchWorld(name) {
	return db.world.where('name').equals(name).first().then(function (row) {
		if (!row) return false
		row.lastplay = nowTs()
		return db.world.put(row).then(function () { return true })
	})
}

function getWorldList() {
	return db.world.orderBy('lastplay').reverse().toArray()
}

function createWorld(name) {
	return db.world.where('name').equals(name).first().then(function (row) {
		if (row) return false
		var ts = nowTs()
		var meta = {
			name: name,
			createdAt: ts,
			lastplay: ts,
			seed: generateWorldSeed(),
			generatorVersion: WORLD_GENERATOR_VERSION
		}
		return Promise.all([
			db.world.put(meta),
			db.worlddata.put({ name: name, data: {} })
		]).then(function () { return true })
	})
}

module.exports = {
	getSettings,
	saveSettings,
	getWorldMeta,
	getWorldEdits,
	saveWorldEdits,
	touchWorld,
	getWorldList,
	createWorld
};
