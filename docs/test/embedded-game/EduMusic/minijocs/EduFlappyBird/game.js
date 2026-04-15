/*
		   =================================================================
			script: CrappyBird
			author: Varun Pant  
			date: April 6, 2014
			site: http://www.varunpant.com			 	 
		   =================================================================
		*/


        // http://paulirish.com/2011/requestanimationframe-for-smart-animating
         // shim layer with setTimeout fallback
        window.requestAnimFrame = (function () {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (callback) {
                    window.setTimeout(callback, 1000 / 60);
            };
        })();
         //sounds

        var soundJump = new Audio("assets/audio/wing.ogg");
        var soundScore = new Audio("assets/audio/point.ogg");
        var soundHit = new Audio("assets/audio/hit.ogg");
        var soundDie = new Audio("assets/audio/die.ogg");
        var soundSwoosh = new Audio("assets/audio/swooshing.ogg");
         //http://www.storiesinflight.com/html5/audio.html
        var channel_max = 10; // number of channels
        audiochannels = new Array();
        for (a = 0; a < channel_max; a++) { // prepare the channels
            audiochannels[a] = new Array();
            audiochannels[a]['channel'] = new Audio(); // create a new audio object
            audiochannels[a]['finished'] = -1; // expected end time for this channel
        }

        function play_sound(s) {
            for (a = 0; a < audiochannels.length; a++) {
                thistime = new Date();
                if (audiochannels[a]['finished'] < thistime.getTime()) { // is this channel finished?
                    audiochannels[a]['finished'] = thistime.getTime() + s.duration * 1000;
                    audiochannels[a]['channel'].src = s.src;
                    audiochannels[a]['channel'].load();
                    audiochannels[a]['channel'].play();
                    break;
                }
            }
        }
		
		function getCookie(cname)
		{
		   var name = cname + "=";
		   var ca = document.cookie.split(';');
		   for(var i=0; i<ca.length; i++) 
		   {
			  var c = ca[i].trim();
			  if (c.indexOf(name)==0) return c.substring(name.length,c.length);
		   }
		   return "";
		}

		function setCookie(cname,cvalue,exdays)
		{
		   var d = new Date();
		   d.setTime(d.getTime()+(exdays*24*60*60*1000));
		   var expires = "expires="+d.toGMTString();
		   document.cookie = cname + "=" + cvalue + "; " + expires;
		}

         // namespace our game
        var FB = {
            // set up some inital values
            WIDTH: 320,
            HEIGHT: 480,
            scale: 1,
            dpr: 1,
            // the position of the canvas
            // in relation to the screen
            offset: {
                top: 0,
                left: 0
            },
            // store all bird, touches, pipes etc
            entities: [],
            currentWidth: null,
            currentHeight: null,
            canvas: null,
            ctx: null,
            score: {
                taps: 0,
                coins: 0
            },
            distance: 0,
			digits:[],
			fonts:[],
            state: {
                mode: 'reading',
                level: 1,
                fails: 0,
                failLimit: Infinity,
                softJump: true
            },
            locale: 'es',
            locales: ['es', 'ca', 'en'],
            i18n: {
                es: {
                    mode_reading: 'Modo: Lectura',
                    language_label: 'Idioma',
                    level_label: 'Nivel: {level}',
                    tap_top_change: 'Toca arriba para cambiar nivel',
                    tap_bottom_start: 'Toca abajo para empezar',
                    controls_jump: 'Espacio o flecha arriba = salto',
                    level_complete: 'Nivel {level} completado',
                    goal_points: 'Meta: {goal} puntos',
                    next_level: 'Pasando a nivel {level}...',
                    tap_continue: 'Toca para continuar',
                    hud_level: 'Nivel {level}',
                    hud_fails: 'Fallos {fails}/{limit}',
                    hud_fails_unlimited: 'Fallos {fails}',
                    hud_points: 'Puntos {points}',
                    note_label: 'Nota: {note}'
                },
                ca: {
                    mode_reading: 'Mode: Lectura',
                    language_label: 'Idioma',
                    level_label: 'Nivell: {level}',
                    tap_top_change: 'Toca amunt per canviar de nivell',
                    tap_bottom_start: 'Toca avall per començar',
                    controls_jump: 'Espai o fletxa amunt = salt',
                    level_complete: 'Nivell {level} completat',
                    goal_points: 'Objectiu: {goal} punts',
                    next_level: 'Passant al nivell {level}...',
                    tap_continue: 'Toca per continuar',
                    hud_level: 'Nivell {level}',
                    hud_fails: 'Errors {fails}/{limit}',
                    hud_fails_unlimited: 'Errors {fails}',
                    hud_points: 'Punts {points}',
                    note_label: 'Nota: {note}'
                },
                en: {
                    mode_reading: 'Mode: Reading',
                    language_label: 'Language',
                    level_label: 'Level: {level}',
                    tap_top_change: 'Tap top to change level',
                    tap_bottom_start: 'Tap bottom to start',
                    controls_jump: 'Space or Up Arrow = jump',
                    level_complete: 'Level {level} complete',
                    goal_points: 'Goal: {goal} points',
                    next_level: 'Moving to level {level}...',
                    tap_continue: 'Tap to continue',
                    hud_level: 'Level {level}',
                    hud_fails: 'Mistakes {fails}/{limit}',
                    hud_fails_unlimited: 'Mistakes {fails}',
                    hud_points: 'Points {points}',
                    note_label: 'Note: {note}'
                }
            },
            detectLocale: function () {
                var lang = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
                lang = lang.toLowerCase();
                if (lang.indexOf('ca') === 0) {
                    return 'ca';
                }
                if (lang.indexOf('es') === 0) {
                    return 'es';
                }
                return 'en';
            },
            setLocale: function (locale) {
                if (this.locales.indexOf(locale) === -1) {
                    this.locale = 'es';
                } else {
                    this.locale = locale;
                }
            },
            t: function (key, vars) {
                var dict = this.i18n[this.locale] || this.i18n.es;
                var str = dict[key] || this.i18n.es[key] || key;
                if (!vars) {
                    return str;
                }
                return str.replace(/\{(\w+)\}/g, function (match, name) {
                    return (vars[name] !== undefined) ? vars[name] : match;
                });
            },
            // we'll set the rest of these
            // in the init function
            RATIO: null,
            bg_grad: "day",
			game:null,
            currentWidth: null,
            currentHeight: null,
            canvas: null,
            ctx: null,
            ua: null,
            android: null,
            ios: null,
            gradients: {},
            init: function () {
                var grad;
                FB.setLocale(FB.detectLocale());
                // the proportion of width to height
                FB.RATIO = FB.WIDTH / FB.HEIGHT;
                // these will change when the screen is resize
                FB.currentWidth = FB.WIDTH;
                FB.currentHeight = FB.HEIGHT;
                // this is our canvas element
                FB.canvas = document.getElementsByTagName('canvas')[0];
                // it's important to set this
                // otherwise the browser will
                // default to 320x200
                // the canvas context allows us to 
                // interact with the canvas api
                FB.ctx = FB.canvas.getContext('2d');

                // Hi-DPI rendering: keep game coordinates in 320x480,
                // but render at device pixel ratio for crisp lines.
                FB.dpr = window.devicePixelRatio || 1;
                FB.canvas.width = FB.WIDTH * FB.dpr;
                FB.canvas.height = FB.HEIGHT * FB.dpr;
                FB.ctx.setTransform(FB.dpr, 0, 0, FB.dpr, 0, 0);
                FB.ctx.lineCap = 'round';
                FB.ctx.lineJoin = 'round';
                // we need to sniff out android & ios
                // so we can hide the address bar in
                // our resize function
                FB.ua = navigator.userAgent.toLowerCase();
                FB.android = FB.ua.indexOf('android') > -1 ? true : false;
                FB.ios = (FB.ua.indexOf('iphone') > -1 || FB.ua.indexOf('ipad') > -1) ? true : false;

                // setup some gradients
                grad = FB.ctx.createLinearGradient(0, 0, 0, FB.HEIGHT);
                grad.addColorStop(0, '#036');
                grad.addColorStop(0.5, '#69a');
                grad.addColorStop(1, 'yellow');
                FB.gradients.dawn = grad;

                grad = FB.ctx.createLinearGradient(0, 0, 0, FB.HEIGHT);
                grad.addColorStop(0, '#69a');
                grad.addColorStop(0.5, '#9cd');
                grad.addColorStop(1, '#fff');
                FB.gradients.day = grad;

                grad = FB.ctx.createLinearGradient(0, 0, 0, FB.HEIGHT);
                grad.addColorStop(0, '#036');
                grad.addColorStop(0.3, '#69a');
                grad.addColorStop(1, 'pink');
                FB.gradients.dusk = grad;

                grad = FB.ctx.createLinearGradient(0, 0, 0, FB.HEIGHT);
                grad.addColorStop(0, '#036');
                grad.addColorStop(1, 'black');
                FB.gradients.night = grad;

                // listen for clicks
                window.addEventListener('click', function (e) {
                    e.preventDefault();
                    FB.Input.set(e);
                }, false);

                // listen for touches
                window.addEventListener('touchstart', function (e) {
                    e.preventDefault();
                    // the event object has an array
                    // called touches, we just want
                    // the first touch
                    FB.Input.set(e.touches[0]);
                }, false);
                window.addEventListener('keydown', function (e) {
                    if (e.key === ' ' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        FB.Input.tapped = true;
                        FB.Input.pressed = true;
                    }
                    if (e.key === 's' || e.key === 'S') {
                        FB.state.softJump = !FB.state.softJump;
                    }
                }, false);
                window.addEventListener('keyup', function (e) {
                    if (e.key === ' ' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        FB.Input.pressed = false;
                    }
                }, false);
                window.addEventListener('touchmove', function (e) {
                    // we're not interested in this
                    // but prevent default behaviour
                    // so the screen doesn't scroll
                    // or zoom
                    e.preventDefault();
                }, false);
                window.addEventListener('touchend', function (e) {
                    // as above
                    e.preventDefault();
                }, false);

                // we're ready to resize
                FB.resize();
				FB.changeState("Splash");
                
                FB.loop();

            },

            resize: function () {

                var availableWidth = window.innerWidth;
                var availableHeight = window.innerHeight;

                // Keep body height stable on mobile to prevent jumpy centering.
                if (FB.android || FB.ios) {
                    document.body.style.height = availableHeight + 'px';
                }

                // Fit canvas into viewport while preserving aspect ratio.
                var scale = Math.min(availableWidth / FB.WIDTH, availableHeight / FB.HEIGHT);
                FB.currentWidth = Math.floor(FB.WIDTH * scale);
                FB.currentHeight = Math.floor(FB.HEIGHT * scale);

                FB.canvas.style.width = FB.currentWidth + 'px';
                FB.canvas.style.height = FB.currentHeight + 'px';

                FB.scale = FB.currentWidth / FB.WIDTH;

                // Use bounding rect so touch/mouse mapping works with centering.
                var rect = FB.canvas.getBoundingClientRect();
                FB.offset.top = rect.top + window.pageYOffset;
                FB.offset.left = rect.left + window.pageXOffset;
            },
			            
            // this is where all entities will be moved
            // and checked for collisions etc
            update: function () {
                FB.game.update();
                FB.Input.tapped = false;
            },

            // this is where we draw all the entities
            render: function () {

                // Ensure transform is reset each frame (Sprite uses save/restore).
                FB.ctx.setTransform(FB.dpr, 0, 0, FB.dpr, 0, 0);

                FB.Draw.rect(0, 0, FB.WIDTH, FB.HEIGHT, FB.gradients[FB.bg_grad]);
				 
                // cycle through all entities and render to canvas
                for (i = 0; i < FB.entities.length; i += 1) {
                    FB.entities[i].render();
                }
					
				FB.game.render();
				
            },

            // the actual loop
            // requests animation frame
            // then proceeds to update
            // and render
            loop: function () {

                requestAnimFrame(FB.loop);

                FB.update();
                FB.render();
            },
			changeState: function(state) {    				 
				FB.game = new window[state]();
				FB.game.init();
			}
        };

         // abstracts various canvas operations into
         // standalone functions
        FB.Draw = {

            clear: function () {
                FB.ctx.clearRect(0, 0, FB.WIDTH, FB.HEIGHT);
            },

            rect: function (x, y, w, h, col) {
                FB.ctx.fillStyle = col;
                FB.ctx.fillRect(x, y, w, h);
            },
            circle: function (x, y, r, col) {
                FB.ctx.fillStyle = col;
                FB.ctx.beginPath();
                FB.ctx.arc(x + 5, y + 5, r, 0, Math.PI * 2, true);
                FB.ctx.closePath();
                FB.ctx.fill();
            },
			Image:function(img,x,y){				
				FB.ctx.drawImage(img,x,y);
			},
            Sprite: function (img, srcX, srcY, srcW, srcH, destX, destY, destW, destH, r) {
                FB.ctx.save();
                FB.ctx.translate(destX, destY);
                FB.ctx.rotate(r * (Math.PI / 180));
                FB.ctx.translate(-(destX + destW / 2), -(destY + destH / 2));
                FB.ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
                FB.ctx.restore();
            },
            semiCircle: function (x, y, r, col) {
                FB.ctx.fillStyle = col;
                FB.ctx.beginPath();
                FB.ctx.arc(x, y, r, 0, Math.PI, false);
                FB.ctx.closePath();
                FB.ctx.fill();
            },

            text: function (string, x, y, size, col) {
                FB.ctx.font = 'bold ' + size + 'px Monospace';
                FB.ctx.fillStyle = col;
                FB.ctx.fillText(string, x, y);
            },
            line: function (x1, y1, x2, y2, col, width) {
                FB.ctx.strokeStyle = col;
                FB.ctx.lineWidth = width || 1;
                FB.ctx.beginPath();
                FB.ctx.moveTo(x1, y1);
                FB.ctx.lineTo(x2, y2);
                FB.ctx.stroke();
            }

        };

        FB.Input = {

            x: 0,
            y: 0,
            tapped: false,
            pressed: false,

            set: function (data) {
                this.x = (data.pageX - FB.offset.left) / FB.scale;
                this.y = (data.pageY - FB.offset.top) / FB.scale;
                this.tapped = true;

            }

        };

        FB.Cloud = function (x, y) {

            this.x = x;
            this.y = y;
            this.r = 30;
            this.col = 'rgba(255,255,255,1)';
            this.type = 'cloud';
            // random values so particles do no
            // travel at the same speeds
            this.vx = -0.10;

            this.remove = false;

            this.update = function () {

                // update coordinates
                this.x += this.vx;
                if (this.x < (0 - 115)) {
                    this.respawn();
                }

            };


            this.render = function () {

                FB.Draw.circle(this.x + this.r, (this.y + this.r), this.r, this.col);
                FB.Draw.circle(this.x + 55, (this.y + this.r / 2), this.r / 0.88, this.col);
                FB.Draw.circle(this.x + 55, (this.y + this.r + 15), this.r, this.col);
                FB.Draw.circle(this.x + 85, (this.y + this.r), this.r, this.col);


            };

            this.respawn = function () {

                this.x = ~~ (Math.random() * this.r * 2) + FB.WIDTH;
                this.y = ~~ (Math.random() * FB.HEIGHT / 2)


            };

        };

        FB.Music = {
            staff: {
                bottomY: 300,
                spacing: 16
            },
            noteHeadRadius: 9,
            noteYOffset: 0,
            gapHalfTop: 48,
            gapHalfBottom: 34,
            minIndexDiff: 4,
            // Piano sample mapping
            // By default we treat key01..key24 as consecutive WHITE KEYS (diatonic).
            // Anchor chosen to match the existing folder usage: key09 ~= E4, key11 ~= G4 (SOL).
            piano: {
                mode: 'chromatic', // 'diatonic' (white keys) or 'chromatic' (semitones)
                anchorKey: 14,
                anchorNote: 'G4'
            },
            noteNames: {
                do: 'C4',
                re: 'D4',
                mi: 'E4',
                fa: 'F4',
                sol: 'G4',
                la: 'A4',
                si: 'B4',
                do_agudo: 'C5',
                re_agudo: 'D5',
                mi_agudo: 'E5',
                fa_agudo: 'F5'
            },
            notes: {
                mi: { id: 'mi', index: 0 },
                fa: { id: 'fa', index: 1 },
                sol: { id: 'sol', index: 2 },
                la: { id: 'la', index: 3 },
                si: { id: 'si', index: 4 },
                do: { id: 'do', index: -2 },
                re: { id: 're', index: -1 },
                // Continuación natural del pentagrama (E4 en línea inferior: index 0)
                // C5..F5 caen dentro/justo en la parte superior del pentagrama.
                do_agudo: { id: 'do_agudo', index: 5 },
                re_agudo: { id: 're_agudo', index: 6 },
                mi_agudo: { id: 'mi_agudo', index: 7 },
                fa_agudo: { id: 'fa_agudo', index: 8 }
            },
            labelsByLocale: {
                es: {
                    mi: 'MI',
                    fa: 'FA',
                    sol: 'SOL',
                    la: 'LA',
                    si: 'SI',
                    do: 'DO',
                    re: 'RE',
                    do_agudo: 'DO AGUDO',
                    re_agudo: 'RE AGUDO',
                    mi_agudo: 'MI AGUDO',
                    fa_agudo: 'FA AGUDO'
                },
                ca: {
                    mi: 'MI',
                    fa: 'FA',
                    sol: 'SOL',
                    la: 'LA',
                    si: 'SI',
                    do: 'DO',
                    re: 'RE',
                    do_agudo: 'DO AGUT',
                    re_agudo: 'RE AGUT',
                    mi_agudo: 'MI AGUT',
                    fa_agudo: 'FA AGUT'
                },
                en: {
                    mi: 'E',
                    fa: 'F',
                    sol: 'G',
                    la: 'A',
                    si: 'B',
                    do: 'C',
                    re: 'D',
                    do_agudo: 'HIGH C',
                    re_agudo: 'HIGH D',
                    mi_agudo: 'HIGH E',
                    fa_agudo: 'HIGH F'
                }
            },
            sounds: {},
            levels: {
                1: ['sol', 'mi', 'la'],
                2: ['do', 're', 'fa'],
                3: ['si', 'do_agudo', 're_agudo', 'mi_agudo', 'fa_agudo'],
                4: ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do_agudo', 're_agudo', 'mi_agudo', 'fa_agudo']
            },
            noteY: function (index) {
                return this.staff.bottomY - (index * this.staff.spacing);
            },
            drawStaff: function (x, width, col) {
                var color = col || 'rgba(0,0,0,0.78)';
                for (var i = 0; i < 5; i++) {
                    var lineIndex = i * 2;
                    var y = this.noteY(lineIndex);
                    // Double-stroke: light underlay + darker top line for contrast
                    FB.Draw.line(x, y, x + width, y, 'rgba(255,255,255,0.75)', 4);
                    FB.Draw.line(x, y, x + width, y, color, 2);
                }
            },
            drawNote: function (x, index, col) {
                var y = this.noteY(index) + (this.noteYOffset || 0);
                var color = col || '#111';
                var stemUp = index <= 4;
                var r = this.noteHeadRadius;

                // FB.Draw.circle draws centered at (x+5, y+5). For a note anchored
                // at (x, y) on the staff, pass (x-5, y-5).
                FB.Draw.circle(x - 5, y - 5, r, color);
                if (stemUp) {
                    FB.Draw.line(x + r, y - r, x + r, y - (r + 18), color, 2);
                } else {
                    FB.Draw.line(x - r, y + r, x - r, y + (r + 18), color, 2);
                }
                if (index >= 10) {
                    for (var i = 10; i <= index; i += 2) {
                        var ly = this.noteY(i) + (this.noteYOffset || 0);
                        FB.Draw.line(x - 10, ly, x + 10, ly, 'rgba(255,255,255,0.75)', 4);
                        FB.Draw.line(x - 10, ly, x + 10, ly, color, 2);
                    }
                }
                if (index < 0) {
                    for (var j = 0; j >= index; j -= 2) {
                        var lby = this.noteY(j) + (this.noteYOffset || 0);
                        FB.Draw.line(x - 10, lby, x + 10, lby, 'rgba(255,255,255,0.75)', 4);
                        FB.Draw.line(x - 10, lby, x + 10, lby, color, 2);
                    }
                }
            },
            randomNoteId: function () {
                var list = this.levels[FB.state.level] || this.levels[1];
                return list[~~(Math.random() * list.length)];
            },
            randomDifferentNoteId: function (excludeId, minIndexDiff) {
                var list = this.levels[FB.state.level] || this.levels[1];
                var diff = (minIndexDiff === undefined) ? this.minIndexDiff : minIndexDiff;
                var filtered = [];
                var baseIndex = this.notes[excludeId].index;
                for (var i = 0; i < list.length; i++) {
                    var candidate = list[i];
                    var candidateIndex = this.notes[candidate].index;
                    if (candidate !== excludeId && Math.abs(candidateIndex - baseIndex) >= diff) {
                        filtered.push(candidate);
                    }
                }
                if (filtered.length === 0) {
                    for (var j = 0; j < list.length; j++) {
                        if (list[j] !== excludeId) {
                            filtered.push(list[j]);
                        }
                    }
                }
                return filtered[~~(Math.random() * filtered.length)];
            },
            labelFor: function (noteId) {
                var labels = this.labelsByLocale[FB.locale] || this.labelsByLocale.es;
                return labels[noteId] || noteId;
            },
            _noteToMidi: function (noteName) {
                // Supports C4, D#4, Bb3
                var m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(noteName.trim());
                if (!m) {
                    return null;
                }
                var letter = m[1].toUpperCase();
                var accidental = m[2];
                var octave = parseInt(m[3], 10);
                var base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter];
                if (accidental === '#') base += 1;
                if (accidental === 'b') base -= 1;
                // MIDI: C-1 = 0, C4 = 60
                return (octave + 1) * 12 + base;
            },
            _diatonicShift: function (naturalNote, steps) {
                // naturalNote: e.g. 'E4' (no accidentals)
                var m = /^([A-Ga-g])(-?\d+)$/.exec(naturalNote.trim());
                if (!m) {
                    return null;
                }
                var letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                var li = letters.indexOf(m[1].toUpperCase());
                var octave = parseInt(m[2], 10);
                if (li < 0) return null;

                if (steps > 0) {
                    for (var i = 0; i < steps; i++) {
                        li = (li + 1) % 7;
                        if (li === 0) octave += 1; // B -> C
                    }
                } else if (steps < 0) {
                    for (var j = 0; j < (-steps); j++) {
                        li = (li + 6) % 7;
                        if (li === 6) octave -= 1; // C -> B
                    }
                }
                return letters[li] + octave;
            },
            _pianoFileForKey: function (keyNumber) {
                var n = Math.max(1, Math.min(24, keyNumber));
                var s = String(n).padStart(2, '0');
                return 'assets/piano/key' + s + '.ogg';
            },
            _buildPianoMaps: function () {
                var cfg = this.piano || { mode: 'diatonic', anchorKey: 9, anchorNote: 'E4' };
                var keyToMidi = {};
                var midiToKey = {};

                var anchorKey = cfg.anchorKey;
                var anchorNote = cfg.anchorNote;
                var anchorMidi = this._noteToMidi(anchorNote);
                if (anchorMidi === null) {
                    return { keyToMidi: keyToMidi, midiToKey: midiToKey };
                }

                for (var k = 1; k <= 24; k++) {
                    var delta = k - anchorKey;
                    var midi;
                    if (cfg.mode === 'chromatic') {
                        midi = anchorMidi + delta;
                    } else {
                        var natural = this._diatonicShift(anchorNote, delta);
                        midi = natural ? this._noteToMidi(natural) : null;
                    }
                    if (midi !== null) {
                        keyToMidi[k] = midi;
                        midiToKey[midi] = k;
                    }
                }
                return { keyToMidi: keyToMidi, midiToKey: midiToKey };
            },
            initSounds: function () {
                // Build sounds from noteNames => real note => best matching key sample
                var maps = this._buildPianoMaps();
                var keyToMidi = maps.keyToMidi;
                var midiToKey = maps.midiToKey;

                var cache = {};
                var ids = Object.keys(this.noteNames || {});
                for (var i = 0; i < ids.length; i++) {
                    var id = ids[i];
                    var noteName = this.noteNames[id];
                    var midi = this._noteToMidi(noteName);
                    if (midi === null) continue;

                    var key = midiToKey[midi];
                    if (!key) {
                        // pick nearest available sample
                        var bestKey = null;
                        var bestDist = Infinity;
                        for (var k in keyToMidi) {
                            var dist = Math.abs(keyToMidi[k] - midi);
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestKey = parseInt(k, 10);
                            }
                        }
                        key = bestKey;
                    }

                    if (key) {
                        cache[id] = new Audio(this._pianoFileForKey(key));
                    }
                }
                this.sounds = cache;
            },
            playNote: function (noteId) {
                if (!this.sounds || !this.sounds[noteId]) {
                    this.initSounds();
                }
                var sound = this.sounds[noteId];
                if (sound) {
                    play_sound(sound);
                }
            }
        };

        FB.BottomBar = function (x, y, r) {

            this.x = x;
            this.y = y
            this.r = r;
            this.vx = -1;
            this.name = 'BottomBar';

            this.update = function () {
                // update coordinates
                this.x += this.vx;
                if (this.x < (0 - this.r)) {
                    this.respawn();
                }
            };

            this.render = function () {
                FB.Draw.rect(this.x, this.y, this.r, 100, '#D2691E');
                for (var i = 0; i < 10; i++) {
                    FB.Draw.semiCircle(this.x + i * (this.r / 9), this.y, 20, '#050');
                }
            }

            this.respawn = function () {
                this.x = FB.WIDTH - 1;
            }

        }

        FB.Tree = function (x, y) {

            this.x = x;
            this.y = y
            this.r = 30;
            this.h = 50;
            this.w = this.r * 2;
            this.vx = -1;
            this.type = 'Tree';

            this.update = function () {
                // update coordinates
                this.x += this.vx;
                if (this.x < (0 - this.r * 2)) {
                    this.respawn();
                }
            };

            this.render = function () {

                //FB.Draw.rect(this.x, this.y, this.w, this.h, '#c20');
                FB.Draw.circle(this.x + this.r, (this.y + this.r) - 10, this.r, 'green', '#050');
                FB.Draw.circle(this.x + (this.r / 2), (this.y + this.r) - 10, this.r / 3, 'rgba(0,0,0,0.08)');
                FB.Draw.rect(this.x + this.r, this.y + this.r, 10, this.r, 'brown', '#d20');
            }

            this.respawn = function () {
                this.x = FB.WIDTH + this.r;
            }


        }

        FB.Pipe = function (x, w) {

            this.centerX = x;
            this.w = w;
            this.h = FB.HEIGHT - 150;
            this.vx = -1;
            this.type = 'pipe';
            this.correctNoteId = null;
            this.correctNoteIndex = 0;
            this.wrongNoteId = null;
            this.wrongNoteIndex = 0;
            this.correctY = 0;
            this.wrongY = 0;
            this.passed = false;
            this.correctHidden = false;
            this.correctHit = false;
            this.correctOnLeft = true;
            this.correctGapHalf = FB.Music.gapHalfBottom;
            this.wrongGapHalf = FB.Music.gapHalfBottom;

            this.setNotes = function () {
                this.correctNoteId = FB.Music.randomNoteId();
                this.wrongNoteId = FB.Music.randomDifferentNoteId(this.correctNoteId);
                // Randomize which side shows the correct note
                this.correctOnLeft = Math.random() < 0.5;
                this.correctNoteIndex = FB.Music.notes[this.correctNoteId].index;
                this.wrongNoteIndex = FB.Music.notes[this.wrongNoteId].index;
                this.correctY = FB.Music.noteY(this.correctNoteIndex);
                this.wrongY = FB.Music.noteY(this.wrongNoteIndex);
                this.passed = false;
                this.correctHidden = false;
                this.correctHit = false;
                if (this.correctY < this.wrongY) {
                    this.correctGapHalf = FB.Music.gapHalfTop;
                    this.wrongGapHalf = FB.Music.gapHalfBottom;
                } else {
                    this.correctGapHalf = FB.Music.gapHalfBottom;
                    this.wrongGapHalf = FB.Music.gapHalfTop;
                }
            };

            this.update = function () {
                // update coordinates
                this.centerX += this.vx;
                if (this.centerX == (0 - this.w)) {
                    this.respawn();
                }
            };

            this.render = function () {

                var topY = Math.min(this.correctY, this.wrongY);
                var bottomY = Math.max(this.correctY, this.wrongY);
                var topGap = (this.correctY < this.wrongY) ? this.correctGapHalf : this.wrongGapHalf;
                var bottomGap = (this.correctY < this.wrongY) ? this.wrongGapHalf : this.correctGapHalf;
                var topHeight = Math.max(0, topY - topGap);
                var middleHeight = Math.max(0, (bottomY - bottomGap) - (topY + topGap));
                var bottomHeight = Math.max(0, this.h - (bottomY + bottomGap));
                if (FB.state.level !== 1) {
                    FB.Draw.rect(this.centerX, 0, this.w, topHeight, '#8ED6FF');
                    FB.Draw.rect(this.centerX, topY + topGap, this.w, middleHeight, '#8ED6FF');
                    FB.Draw.rect(this.centerX, bottomY + bottomGap, this.w, bottomHeight, '#8ED6FF');
                }
                FB.Music.drawStaff(this.centerX, this.w, 'rgba(0,0,0,0.78)');
                var noteXLeft = this.centerX + (this.w / 2) - 20;
                var noteXRight = this.centerX + (this.w / 2) + 20;

                if (this.correctOnLeft) {
                    if (!this.correctHidden) {
                        FB.Music.drawNote(noteXLeft, this.correctNoteIndex, '#111');
                    }
                    FB.Music.drawNote(noteXRight, this.wrongNoteIndex, '#111');
                } else {
                    FB.Music.drawNote(noteXLeft, this.wrongNoteIndex, '#111');
                    if (!this.correctHidden) {
                        FB.Music.drawNote(noteXRight, this.correctNoteIndex, '#111');
                    }
                }
            }

            this.respawn = function () {
                this.centerX = 320 - this.w + 160;
                this.setNotes();
            }

            this.randomIntFromInterval = function (min, max) {
                return Math.floor(Math.random() * (max - min + 1) + min);
            }

            this.setNotes();
        }

        FB.Bird = function () {

            this.img = new Image();
            this.img.src = 'assets/images/bird.png';
            this.gravity = 0.25;
            this.baseGravity = 0.25;
            this.width = 34;
            this.height = 24;
            this.ix = 0;
            this.iy = 0;
            this.fr = 0;
            this.vy = 180;
            this.vx = 70;
            this.velocity = 0;
            this.play = false;
            this.jump = -4.6;
            this.baseJump = -4.6;
            this.rotation = 0;
            this.type = 'bird';
            this.update = function () {
                if (FB.state.softJump) {
                    this.gravity = 0.16;
                    this.jump = -3.0;
                } else {
                    this.gravity = this.baseGravity;
                    this.jump = this.baseJump;
                }
                if (this.fr++ > 5) {
                    this.fr = 0;
                    if (this.iy == this.height * 3) {
                        this.iy = 0
                    }
                    this.iy += this.height;
                }
                if (this.play) {
                    this.velocity += this.gravity;
                    this.vy += this.velocity;
                    if (this.vy <= 0) {
                        this.vy = 0;
                    }
                    if (this.vy >= 370) {
                        this.vy = 370;
                    }
                    this.rotation = Math.min((this.velocity / 10) * 90, 90);
                }
                if (FB.Input.tapped) {
                    this.play = true;
                    play_sound(soundJump);
                    this.velocity = this.jump;
                }
            };

            this.render = function () {

                FB.Draw.Sprite(this.img, this.ix, this.iy, this.width, this.height, this.vx, this.vy, this.width, this.height, this.rotation);
            }

        }

        FB.Particle = function (x, y, r, col, type) {

            this.x = x;
            this.y = y;
            this.r = r;
            this.col = col;
            this.type = type || 'circle';
            this.name = 'particle';

            // determines whether particle will
            // travel to the right of left
            // 50% chance of either happening
            this.dir = (Math.random() * 2 > 1) ? 1 : -1;

            // random values so particles do no
            // travel at the same speeds
            this.vx = ~~ (Math.random() * 4) * this.dir;
            this.vy = ~~ (Math.random() * 7);

            this.remove = false;

            this.update = function () {

                // update coordinates
                this.x += this.vx;
                this.y -= this.vy;

                // increase velocity so particle
                // accelerates off screen
                this.vx *= 0.99;
                this.vy *= 0.99;

                // adding this negative amount to the
                // y velocity exerts an upward pull on
                // the particle, as if drawn to the
                // surface
                this.vy -= 0.35;

                // offscreen
                if (this.y > FB.HEIGHT) {
                    this.remove = true;
                }

            };


            this.render = function () {
                if (this.type === 'star') {
                    FB.Draw.star(this.x, this.y, this.col);
                } else {
                    FB.Draw.circle(this.x, this.y, this.r, this.col);
                }
            };

        };

         // checks if two entities are touching
        FB.Collides = function (bird, pipe) {
		
			if(bird.vy >=370){				  
				 
				 return true;
			}
            if (FB.state.level === 1) {
                return false;
            }
            var bx1 = bird.vx - bird.width / 2;
            var by1 = bird.vy - bird.height / 2;
            var bx2 = bird.vx + bird.width / 2;
            var by2 = bird.vy + bird.height / 2;

            var px1 = pipe.centerX;
            var px2 = pipe.centerX + pipe.w;
            if (bx2 < px1 || bx1 > px2) {
                return false;
            }
            var inCorrect = (by2 >= pipe.correctY - pipe.correctGapHalf && by1 <= pipe.correctY + pipe.correctGapHalf);
            var inWrong = (by2 >= pipe.wrongY - pipe.wrongGapHalf && by1 <= pipe.wrongY + pipe.wrongGapHalf);
            if (pipe.correctHit) {
                inWrong = false;
            }
            return !(inCorrect || inWrong);

        };
		
		window.Splash = function(){
			
			this.banner = new Image();
			this.banner.src = "assets/images/splash.png";
			
			this.init = function(){
				play_sound(soundSwoosh);
				FB.distance = 0;
                FB.bg_grad = "day";
                FB.entities = [];
				FB.score.taps = FB.score.coins = 0;
                if (window.ScoreService && typeof window.ScoreService.hideSave === 'function') {
                    window.ScoreService.hideSave('eduflappybird');
                }
                //Add entities
                FB.entities.push(new FB.Cloud(30, ~~ (Math.random() * FB.HEIGHT / 2)));
                FB.entities.push(new FB.Cloud(130, ~~ (Math.random() * FB.HEIGHT / 2)));
                FB.entities.push(new FB.Cloud(230, ~~ (Math.random() * FB.HEIGHT / 2)));
                for (i = 0; i < 2; i += 1) {
                    FB.entities.push(new FB.BottomBar(FB.WIDTH * i, FB.HEIGHT - 100, FB.WIDTH));
                }
                FB.entities.push(new FB.Tree(~~(Math.random() * FB.WIDTH), FB.HEIGHT - 160));
                FB.entities.push(new FB.Tree(~~(Math.random() * FB.WIDTH + 50), FB.HEIGHT - 160));
                FB.entities.push(new FB.Tree(~~(Math.random() * FB.WIDTH + 100), FB.HEIGHT - 160));
			}
			
			this.update = function(){
				for (i = 0; i < FB.entities.length; i += 1) {
                    FB.entities[i].update();                    
                }
				if (FB.Input.tapped) {
                    if (FB.Input.x > 230 && FB.Input.y < 40) {
                        var idx = FB.locales.indexOf(FB.locale);
                        var next = FB.locales[(idx + 1) % FB.locales.length];
                        FB.setLocale(next);
                    } else if (FB.Input.y < 140) {
                        FB.state.level = (FB.state.level % 4) + 1;
                    } else {
					    FB.changeState('Play');
                    }
					FB.Input.tapped = false;
				}
			}
			
			this.render = function(){
				FB.Draw.Image(this.banner,66,180);
                FB.Draw.text(FB.t('mode_reading'), 70, 60, 16, '#111');
                FB.Draw.text(FB.t('language_label') + ': ' + FB.locale.toUpperCase(), 170, 20, 12, '#111');
                FB.Draw.text(FB.t('level_label', { level: FB.state.level }), 95, 80, 16, '#111');
                FB.Draw.text(FB.t('tap_top_change'), 25, 110, 12, '#111');
                FB.Draw.text(FB.t('tap_bottom_start'), 55, 130, 12, '#111');
                FB.Draw.text(FB.t('controls_jump'), 20, 150, 12, '#111');
			}
		
		}

        window.LevelComplete = function () {
            this.timer = 0;
            this.duration = 90; // ~1.5s a 60fps
            this.completedLevel = 1;
            this.nextLevel = 2;
            this.goal = null;

            this.init = function () {
                this.completedLevel = FB.state.level;
                this.nextLevel = Math.min(4, FB.state.level + 1);
                this.goal = (this.completedLevel === 1) ? 20 : (this.completedLevel === 2) ? 40 : (this.completedLevel === 3) ? 60 : null;
                play_sound(soundScore);
            };

            this.update = function () {
                this.timer += 1;
                if (FB.Input.tapped || this.timer >= this.duration) {
                    FB.Input.tapped = false;
                    FB.state.level = this.nextLevel;
                    FB.changeState('Play');
                }
            };

            this.render = function () {
                // Overlay simple
                FB.Draw.rect(0, 0, FB.WIDTH, FB.HEIGHT, 'rgba(0,0,0,0.25)');
                FB.Draw.text(FB.t('level_complete', { level: this.completedLevel }), 55, 140, 18, '#111');
                if (this.goal !== null) {
                    FB.Draw.text(FB.t('goal_points', { goal: this.goal }), 80, 165, 14, '#111');
                }
                FB.Draw.text(FB.t('next_level', { level: this.nextLevel }), 70, 195, 14, '#111');
                FB.Draw.text(FB.t('tap_continue'), 85, 225, 12, '#111');
            };
        };
		
		window.Play = function(){
			
            this.failCooldown = 0;


            this.registerWrongNote = function () {
                // Nivel 2: tocar/pasar por la nota incorrecta penaliza puntos
                // pero no incrementa fallos (no quita vida).
                play_sound(soundHit);
                FB.score.coins = Math.max(0, FB.score.coins - 1);
                FB.digits = FB.score.coins.toString().split('');
            };
			
			this.init = function(){			
                FB.state.fails = 0;
                FB.state.failLimit = (FB.state.level === 1) ? Infinity : 3;

                // Reiniciar escena al comenzar un nivel (manteniendo puntos)
                FB.entities = [];
                FB.entities.push(new FB.Cloud(30, ~~ (Math.random() * FB.HEIGHT / 2)));
                FB.entities.push(new FB.Cloud(130, ~~ (Math.random() * FB.HEIGHT / 2)));
                FB.entities.push(new FB.Cloud(230, ~~ (Math.random() * FB.HEIGHT / 2)));
                for (i = 0; i < 2; i += 1) {
                    FB.entities.push(new FB.BottomBar(FB.WIDTH * i, FB.HEIGHT - 100, FB.WIDTH));
                }
                FB.entities.push(new FB.Tree(~~(Math.random() * FB.WIDTH), FB.HEIGHT - 160));
                FB.entities.push(new FB.Tree(~~(Math.random() * FB.WIDTH + 50), FB.HEIGHT - 160));
                FB.entities.push(new FB.Tree(~~(Math.random() * FB.WIDTH + 100), FB.HEIGHT - 160));
                
                FB.entities.push(new FB.Pipe(FB.WIDTH * 2, 50));
                FB.entities.push(new FB.Pipe(FB.WIDTH * 2 + FB.WIDTH / 2, 50));
                FB.entities.push(new FB.Pipe(FB.WIDTH * 3, 50));

                FB.bird = new FB.Bird();
                FB.entities.push(FB.bird);
				for(var n=0;n<10;n++){
					var img = new Image();
					img.src = "assets/images/font_small_" + n +'.png';
					FB.fonts.push(img);
				}
				FB.digits = ["0"];
			}
			
			this.update = function() { 
				if (this.failCooldown > 0) {
                    this.failCooldown -= 1;
                }
				FB.distance += 1;
                var levelUp = ((FB.distance % 2048) === 0) ? true : false;
                if (levelUp) {
                    var bg = "day";
                    var gradients = ["day", "dusk", "night", "dawn"];
                    for (var i = 0; i < gradients.length; i++) {
                        if (FB.bg_grad === gradients[i]) {
                            if (i == gradients.length - 1) {
                                bg = "day";
                            } else {
                                bg = gradients[i + 1];
                            }
                        }
                    }
                    FB.bg_grad = bg;
                }


                var checkCollision = false; // we only need to check for a collision
                // if the user tapped on this game tick




                // if the user has tapped the screen
                if (FB.Input.tapped) {
                    // keep track of taps; needed to 
                    // calculate accuracy
                    FB.score.taps += 1;

                    // set tapped back to false           
                    // in the next cycle

                    checkCollision = true;
                }

                // cycle through all entities and update as necessary
                for (i = 0; i < FB.entities.length; i += 1) {
                    FB.entities[i].update();
                    if (FB.entities[i].type === 'pipe') {
                        var pipe = FB.entities[i];
                        if (!pipe.correctHit) {
                            var withinPipeX = (FB.bird.vx >= pipe.centerX && FB.bird.vx <= pipe.centerX + pipe.w);
                            if (withinPipeX) {
                                var inCorrect = Math.abs(FB.bird.vy - pipe.correctY) <= pipe.correctGapHalf;
                                if (inCorrect) {
                                    pipe.correctHit = true;
                                    pipe.correctHidden = true;
                                    FB.Music.playNote(pipe.correctNoteId);
                                }
                            }
                        }
                        if (!pipe.passed && FB.bird.vx > pipe.centerX + pipe.w / 2) {
                            var inCorrect = Math.abs(FB.bird.vy - pipe.correctY) <= pipe.correctGapHalf;
                            if (pipe.correctHit || inCorrect) {
                                pipe.correctHit = true;
                                FB.score.coins += 1;
                                FB.digits = FB.score.coins.toString().split('');
                                play_sound(soundScore);
                                pipe.correctHidden = true;

                                // Progresión automática con pantalla de nivel completado
                                if (FB.state.level === 1 && FB.score.coins >= 20) {
                                    FB.changeState('LevelComplete');
                                    pipe.passed = true;
                                    return;
                                }
                                if (FB.state.level === 2 && FB.score.coins >= 40) {
                                    FB.changeState('LevelComplete');
                                    pipe.passed = true;
                                    return;
                                }
                                if (FB.state.level === 3 && FB.score.coins >= 60) {
                                    FB.changeState('LevelComplete');
                                    pipe.passed = true;
                                    return;
                                }
                            } else {
                                // En nivel 2, equivocarse en la nota no debe quitar vida,
                                // pero sí debe restar 1 punto y sonar a error.
                                if (FB.state.level === 2) {
                                    this.registerWrongNote();
                                } else if (this.failCooldown === 0) {
                                    this.registerFail();
                                }
                            }
                            pipe.passed = true;
                            continue;
                        }
                        var hit = FB.Collides(FB.bird, pipe);
                        if (hit && this.failCooldown === 0) {
                            pipe.passed = true;
                            this.registerFail();
                            break;
                        }
                    }
                }
			}

            this.registerFail = function () {
                play_sound(soundHit);
                if (FB.state.level === 1) {
                    FB.state.fails += 1;
                    FB.score.coins = Math.max(0, FB.score.coins - 1);
                    FB.digits = FB.score.coins.toString().split('');
                    this.failCooldown = 20;
                    return;
                }
                if (FB.state.level === 2) {
                    FB.state.fails += 1;
                    FB.score.coins = Math.max(0, FB.score.coins - 1);
                    FB.digits = FB.score.coins.toString().split('');
                    this.failCooldown = 30;
                    if (FB.state.fails >= FB.state.failLimit) {
                        FB.changeState('GameOver');
                    }
                    return;
                }
                FB.state.fails += 1;
                this.failCooldown = 30;
                if (FB.state.fails >= FB.state.failLimit) {
                    FB.changeState('GameOver');
                    return;
                }
                FB.bird.vy = FB.HEIGHT / 2;
                FB.bird.velocity = 0;
                for (i = 0; i < FB.entities.length; i += 1) {
                    if (FB.entities[i].type === 'pipe') {
                        FB.entities[i].centerX += FB.WIDTH;
                        FB.entities[i].setNotes();
                    }
                }
            };
			
			this.render = function() { 
                FB.Draw.text(FB.t('hud_level', { level: FB.state.level }), 10, 20, 14, '#111');
                if (FB.state.failLimit !== Infinity) {
                    FB.Draw.text(FB.t('hud_fails', { fails: FB.state.fails, limit: FB.state.failLimit }), 10, 38, 14, '#111');
                } else {
                    FB.Draw.text(FB.t('hud_fails_unlimited', { fails: FB.state.fails }), 10, 38, 14, '#111');
                }
                FB.Draw.text(FB.t('hud_points', { points: FB.score.coins }), 10, 56, 14, '#111');
                var nextPipe = null;
                for (i = 0; i < FB.entities.length; i += 1) {
                    if (FB.entities[i].type === 'pipe' && FB.entities[i].centerX >= FB.bird.vx) {
                        if (!nextPipe || FB.entities[i].centerX < nextPipe.centerX) {
                            nextPipe = FB.entities[i];
                        }
                    }
                }
                if (nextPipe) {
                    var label = FB.Music.labelFor(nextPipe.correctNoteId);
                    FB.Draw.text(FB.t('note_label', { note: label }), 150, 38, 14, '#111');
                }
			}
		
		}
		
		window.GameOver = function(){
			
			this.getMedal = function()
			{
			   var score = FB.score.coins;
			   console.log(score)
			   if(score <= 10)
				  medal = "bronze";
			   if(score >= 20)
				  medal = "silver";
			   if(score >= 30)
				  medal = "gold";
			   if(score >= 40)
				  medal = "platinum";
			
				return medal;
			}
			this.getHighScore = function(){
				var savedscore = getCookie("highscore");
			    if(savedscore != ""){
					var hs = parseInt(savedscore) || 0;
					if(hs < FB.score.coins)
					{
					 hs = FB.score.coins
					 setCookie("highscore", hs, 999);
					}
					return hs;
				  }
				  else
				  {					 
					setCookie("highscore", FB.score.coins, 999);
					return  FB.score.coins;
				  }
			}
			this.init = function(){
                var scoreValue = Number(FB.score && FB.score.coins) || 0;
                if (window.ScoreService && typeof window.ScoreService.showSave === 'function') {
                    window.ScoreService.showSave('eduflappybird', scoreValue);
                }
			    var that = this;
				setTimeout(function() {
					play_sound(soundDie);
					that.banner = new Image();
					that.banner.src = "assets/images/scoreboard.png";
					var m = that.getMedal();
					that.medal =  new Image();
					that.medal.src = 'assets/images/medal_' + m +'.png';
					that.replay = new Image();
					that.replay.src = "assets/images/replay.png";
					that.highscore = that.getHighScore() ;
				}, 500);
				
			}
			
			this.update = function(){				
				if (FB.Input.tapped) {
					var x = FB.Input.x;
					var y = FB.Input.y;
					
					 if((x >= 102.5 && x <= 102.5+115) && (y >= 260 && y <= 260+70)){       
						FB.changeState('Splash');
					}
					FB.Input.tapped = false;
				}
				FB.bird.update();
			}
			
			this.render = function(){
				if(this.banner){
					FB.Draw.Image(this.banner,42,70);
					FB.Draw.Image(this.medal,75,183);
					FB.Draw.Image(this.replay,102.5,260);
					FB.Draw.text(FB.score.coins, 220, 185, 15, 'black');
					FB.Draw.text(this.highscore, 220, 225, 15, 'black');
				}
			}
		
		}

        window.addEventListener('load', FB.init, false);
        window.addEventListener('resize', FB.resize, false);
