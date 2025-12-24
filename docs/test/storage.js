
const Dexie = require('dexie');

var db = new Dexie('educraft-storage')
db.version(1).stores({
	main: 'name, data',
	world: 'name, lastplay',
	worlddata: 'name, data'
})

function getSettings() {
	return db.main.where('name').equals('settings').first().then(function (row) {
		return row ? row.data : {}
	})
}

function saveSettings(data) {
	return db.main.put({ name: 'settings', data: data })
}

function getWorldEdits(name) {
	return db.worlddata.where('name').equals(name).first().then(function (row) {
		return row ? row.data : {}
	})
}

function saveWorldEdits(name, edits) {
	return Promise.all([
		db.world.put({ name: name, lastplay: Date.now() }),
		db.worlddata.put({ name: name, data: edits })
	]).then(function () { return true })
}

function touchWorld(name) {
	return db.world.put({ name: name, lastplay: Date.now() })
}

function getWorldList() {
	return db.world.orderBy('lastplay').reverse().toArray()
}

function createWorld(name) {
	return db.world.where('name').equals(name).first().then(function (row) {
		if (row) return false
		return Promise.all([
			db.world.put({ name: name, lastplay: Date.now() }),
			db.worlddata.put({ name: name, data: {} })
		]).then(function () { return true })
	})
}

module.exports = {
	getSettings,
	saveSettings,
	getWorldEdits,
	saveWorldEdits,
	touchWorld,
	getWorldList,
	createWorld
};
