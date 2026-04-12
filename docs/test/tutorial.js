'use strict'

var STORAGE_KEYS = {
	completed: 'educraft-tutorial-completed',
	dismissed: 'educraft-tutorial-dismissed',
}

var STEP_DEFS = [
	{ id: 'move', label: 'Moverse (W A S D)', hint: 'Mantén pulsadas W, A, S o D para caminar.' },
	{ id: 'jump', label: 'Saltar (Espacio)', hint: 'Pulsa la barra espaciadora para saltar una vez.' },
	{ id: 'break', label: 'Romper bloque (Clic izquierdo)', hint: 'Apunta a un bloque cercano y haz clic izquierdo.' },
	{ id: 'place', label: 'Colocar bloque (Clic derecho)', hint: 'Selecciona un bloque y usa clic derecho para colocarlo.' },
	{ id: 'inventory', label: 'Abrir inventario (E)', hint: 'Pulsa E para abrir y cerrar el inventario.' },
]

function setupTutorial(noa, ui, options) {
	var state = {
		active: false,
		completed: false,
		dismissed: false,
		lastPos: null,
		jumpStartY: null,
		steps: STEP_DEFS.map(function (step) {
			return {
				id: step.id,
				label: step.label,
				hint: step.hint,
				done: false,
			}
		}),
	}

	function loadState() {
		state.completed = localStorage.getItem(STORAGE_KEYS.completed) === '1'
		state.dismissed = localStorage.getItem(STORAGE_KEYS.dismissed) === '1'
	}

	function saveCompleted() {
		localStorage.setItem(STORAGE_KEYS.completed, '1')
		localStorage.removeItem(STORAGE_KEYS.dismissed)
		state.completed = true
		state.dismissed = false
	}

	function dismissForever() {
		localStorage.setItem(STORAGE_KEYS.dismissed, '1')
		state.dismissed = true
		hideIntro()
		hidePanel()
	}

	function markDone(stepId) {
		var step = getStep(stepId)
		if (!step || step.done) return
		step.done = true
		renderSteps()
		updateCurrentHint()
		if (allDone()) completeTutorial()
	}

	function getStep(stepId) {
		for (var i = 0; i < state.steps.length; i++) {
			if (state.steps[i].id === stepId) return state.steps[i]
		}
		return null
	}

	function allDone() {
		for (var i = 0; i < state.steps.length; i++) {
			if (!state.steps[i].done) return false
		}
		return true
	}

	function getCurrentStep() {
		for (var i = 0; i < state.steps.length; i++) {
			if (!state.steps[i].done) return state.steps[i]
		}
		return null
	}

	function resetProgress() {
		for (var i = 0; i < state.steps.length; i++) {
			state.steps[i].done = false
		}
	}

	function showIntro() {
		if (!ui.tutorialIntro) return
		ui.tutorialIntro.classList.add('active')
	}

	function hideIntro() {
		if (!ui.tutorialIntro) return
		ui.tutorialIntro.classList.remove('active')
	}

	function showPanel() {
		if (!ui.tutorialPanel) return
		ui.tutorialPanel.classList.add('active')
	}

	function hidePanel() {
		if (!ui.tutorialPanel) return
		ui.tutorialPanel.classList.remove('active')
	}

	function renderSteps() {
		if (!ui.tutorialSteps) return
		ui.tutorialSteps.innerHTML = ''
		state.steps.forEach(function (step, index) {
			var item = document.createElement('div')
			item.className = 'tutorial-step' + (step.done ? ' done' : '')

			var number = document.createElement('div')
			number.className = 'tutorial-step-number'
			number.textContent = step.done ? '✓' : String(index + 1)
			item.appendChild(number)

			var text = document.createElement('div')
			text.className = 'tutorial-step-text'
			text.textContent = step.label
			item.appendChild(text)

			ui.tutorialSteps.appendChild(item)
		})
	}

	function updateCurrentHint() {
		if (!ui.tutorialHint) return
		var current = getCurrentStep()
		if (!current) {
			ui.tutorialHint.textContent = 'Tutorial completado. Ya puedes explorar por tu cuenta.'
			return
		}
		ui.tutorialHint.textContent = current.hint
	}

	function startTutorial() {
		resetProgress()
		state.active = true
		if (document.exitPointerLock) document.exitPointerLock()
		hideIntro()
		showPanel()
		renderSteps()
		updateCurrentHint()
	}

	function completeTutorial() {
		state.active = false
		saveCompleted()
		renderSteps()
		updateCurrentHint()
		if (ui.tutorialTitle) ui.tutorialTitle.textContent = 'Tutorial completado'
		if (ui.tutorialClose) ui.tutorialClose.textContent = 'Cerrar'
	}

	function maybeShowIntro() {
		if (state.completed || state.dismissed) return
		showIntro()
	}

	function onAction(action) {
		if (!state.active) return
		if (action === 'break') markDone('break')
		if (action === 'place') markDone('place')
		if (action === 'inventory') markDone('inventory')
	}

	function tick() {
		var posData = noa.entities.getPositionData(options.playerEntity)
		if (!posData || !posData.position) return
		var pos = posData.position

		if (state.lastPos) {
			var dx = pos[0] - state.lastPos[0]
			var dz = pos[2] - state.lastPos[2]
			var distanceSq = dx * dx + dz * dz
			if (distanceSq > 0.16) markDone('move')
		}
		state.lastPos = [pos[0], pos[1], pos[2]]

		if (!state.active) return

		if (noa.playerBody && noa.playerBody.onGround) {
			state.jumpStartY = pos[1]
		} else if (state.jumpStartY !== null && pos[1] - state.jumpStartY > 0.45) {
			markDone('jump')
			state.jumpStartY = null
		}
	}

	function setupEvents() {
		if (ui.tutorialStart) {
			ui.tutorialStart.addEventListener('click', function () {
				if (ui.tutorialTitle) ui.tutorialTitle.textContent = 'Tutorial rapido'
				if (ui.tutorialClose) ui.tutorialClose.textContent = 'Cerrar'
				startTutorial()
			})
		}
		if (ui.tutorialLater) {
			ui.tutorialLater.addEventListener('click', function () {
				hideIntro()
			})
		}
		if (ui.tutorialNever) {
			ui.tutorialNever.addEventListener('click', function () {
				dismissForever()
			})
		}
		if (ui.tutorialOpen) {
			ui.tutorialOpen.addEventListener('click', function () {
				if (ui.tutorialTitle) ui.tutorialTitle.textContent = 'Tutorial rapido'
				if (ui.tutorialClose) ui.tutorialClose.textContent = 'Cerrar'
				startTutorial()
			})
		}
		if (ui.tutorialClose) {
			ui.tutorialClose.addEventListener('click', function () {
				hidePanel()
				state.active = false
			})
		}
	}

	loadState()
	setupEvents()
	renderSteps()
	updateCurrentHint()
	maybeShowIntro()

	return {
		tick: tick,
		onAction: onAction,
		start: startTutorial,
	}
}

module.exports = {
	setupTutorial: setupTutorial,
}
