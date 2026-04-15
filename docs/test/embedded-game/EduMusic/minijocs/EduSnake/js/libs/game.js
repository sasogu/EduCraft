define([ 'underscore', 'backbone', 'Kinetic', 'settings', 'util', 'viewport', 'background'],
    function( _, Backbone, Kinetic, settings, util, viewport, background ){

        var _s = settings.game;

        // --- SIMÓN (estilo clásico, jugado con la serpiente) ---
        // El modo se selecciona desde el menú y se expone en window.selectedGameMode
        var simonSequence = [];
        var simonProgress = 0;
        var simonLockMovement = false; // Bloquea movimiento mientras se muestra el modal
        var simonAwaitingUser = false;
        var simonTimerToken = 0;
        var simonModalGroup = null;
        var simonModalText = null;
        var simonNoteIndex = 7; // Nota "sol" (ajustable según el set de audio)
        var simonSymbols = [
            { name: 'redonda', symbol: '𝅝' },
            { name: 'blanca', symbol: '𝅗𝅥' },
            { name: 'negra', symbol: '♩' },
            { name: 'corchea', symbol: '♪' },
            { name: 'semicorchea', symbol: '𝅘𝅥𝅯' },
            { name: 'silencio de redonda', symbol: '𝄻' },
            { name: 'silencio de blanca', symbol: '𝄼' },
            { name: 'silencio de negra', symbol: '𝄽' },
            { name: 'silencio de corchea', symbol: '𝄾' },
            { name: 'silencio de semicorchea', symbol: '𝄿' }
        ];

        function isSimonMode() {
            return String( window.selectedGameMode || '' ).indexOf( 'simon' ) !== -1;
        }

        function isMultiplayerMode() {
            return String( window.selectedGameMode || '' ).indexOf( 'multiplayer' ) !== -1;
        }

        function randomSimonSymbolIdx() {
            return Math.floor(Math.random() * simonSymbols.length);
        }

        function _simonFormatSequence() {
            return simonSequence
                .map(function(idx, i){ return ( i + 1 ) + '. ' + simonSymbols[idx].name; })
                .join('\n');
        }

        function _simonIsSilence(symbolIdx) {
            return simonSymbols[ symbolIdx ].name.indexOf( 'silencio' ) === 0;
        }

        function _simonDurationMs(symbolIdx) {
            var name = simonSymbols[ symbolIdx ].name;
            if ( name === 'redonda' ) return 2000;
            if ( name === 'blanca' ) return 1000;
            if ( name === 'negra' ) return 500;
            if ( name === 'corchea' ) return 250;
            if ( name === 'semicorchea' ) return 125;
            return 0;
        }

        function _simonPlayNote(symbolIdx) {
            if ( _simonIsSilence( symbolIdx )) return;
            if ( !window.assets || !window.assets.audio || !window.assets.audio.notes ) return;

            var duration = _simonDurationMs( symbolIdx );
            var notes = window.assets.audio.notes;
            var sound = notes[ simonNoteIndex % notes.length ];
            if ( !sound ) return;

            try {
                sound.stop();
                sound.play();
                if ( duration > 0 )
                    setTimeout(function(){ try{ sound.stop(); }catch(e){} }, duration);
            } catch ( e ) {}
        }

        function _simonShowModal(text) {
            if ( !simonModalGroup || !simonModalText ) return;
            simonModalText.text( text );
            simonModalGroup.opacity( 1 );
            simonModalGroup.moveToTop();
        }

        function _simonHideModal() {
            if ( !simonModalGroup ) return;
            simonModalGroup.opacity( 0 );
        }

        function _simonClearTargets() {
            if ( !game || !game.heart || !game.heart.list ) return;
            game.heart.list.forEach(function(t){ try{ t.destroy(); }catch(e){} });
            game.heart.list = [];
        }

        function _simonGenerateTarget(symbolIdx, orderIdx) {
            var x = util.calculate.random.int( 2, settings.background.tile.quantity.x - 1 ),
                y = util.calculate.random.int( 2, settings.background.tile.quantity.y - 1 ),
                collisionAtProposedCoordinates = game.collision({
                    coords: { x: x, y: y },
                    list: [ game.snake.segment.list, (game.snake2 && game.snake2.segment.list) || [], game.heart.list ]
                });

            if ( !collisionAtProposedCoordinates ){
                var target = new Kinetic.Group({
                    x: util.number.fromCoord( x ),
                    y: util.number.fromCoord( y )
                });

                target._simonSymbolIdx = symbolIdx;
                target._simonOrder = ( typeof orderIdx === 'number' ) ? orderIdx : null;

                // Dibuja el símbolo (figura o silencio)
                target.add(
                    new Kinetic.Text({
                        x: util.calculate.tile.size(),
                        y: util.calculate.tile.size(),
                        fontSize: util.calculate.tile.size(),
                        fontFamily: settings.font.face,
                        text: simonSymbols[ symbolIdx ].symbol,
                        fill: '#222',
                        listening: false
                    })
                );

                game.heart.list.push( target );
                game.layer.add( target );
                target.setZIndex( 2 );
            } else {
                _simonGenerateTarget( symbolIdx, orderIdx );
            }
        }

        function _simonStartRound() {
            if ( !isSimonMode() ) return;

            simonProgress = 0;
            simonLockMovement = true;
            simonAwaitingUser = true;
            _simonClearTargets();
            _simonShowModal( _simonFormatSequence() );
        }

        function _simonHandleUserAction() {
            if ( !isSimonMode() || !simonAwaitingUser ) return false;
            if ( game.state.get( 'current' ).indexOf( 'stop' ) !== -1 ) return false;

            simonAwaitingUser = false;
            _simonHideModal();
            simonLockMovement = false;

            // Genera en el tablero la secuencia completa; el jugador debe comerla en orden.
            for ( var i = 0; i < simonSequence.length; i++ )
                _simonGenerateTarget( simonSequence[ i ], i );

            return true;
        }

        function _simonResetSequence() {
            simonSequence = [ randomSimonSymbolIdx(), randomSimonSymbolIdx() ];
        }

        function _simonAdvanceSequence() {
            simonSequence.push( randomSimonSymbolIdx() );
        }

        function _simonOnEatTarget(isCorrect, currentScore) {
            if ( !isSimonMode() ) return;

            if ( isCorrect ){
                simonProgress++;
                if ( simonProgress >= simonSequence.length ){
                    // Ronda completada -> siguiente con +1
                    simonLockMovement = true;
                    _simonShowModal( '¡Bien! Siguiente ronda…' );
                    simonTimerToken++;
                    var token = simonTimerToken;
                    setTimeout(function(){
                        if ( token !== simonTimerToken ) return;
                        if ( !isSimonMode() ) return;
                        _simonAdvanceSequence();
                        _simonStartRound();
                    }, 800);
                }
            } else {
                // Fallo -> volver a 2
                simonLockMovement = true;
                _simonShowModal( 'Incorrecto. -2 puntos. Score: ' + ( currentScore || 0 ) + '. Volvemos a 2…' );
                simonTimerToken++;
                var token2 = simonTimerToken;
                setTimeout(function(){
                    if ( token2 !== simonTimerToken ) return;
                    if ( !isSimonMode() ) return;
                    _simonResetSequence();
                    _simonStartRound();
                }, 900);
            }
        }
        // Creador de serpientes para soportar modo multijugador
        function createSnake(initialCoords, initialDirection, colors){
            var snake = {
                segment: {
                    queue: [],

                    list: [],

                    queueNew: function() {
                        var segment = {};

                        if ( snake.segment.list.length > 0 ){
                            segment.x = _.last( snake.segment.list ).x();
                            segment.y = _.last( snake.segment.list ).y()
                        } else {
                            segment.x = util.number.fromCoord( initialCoords.x );
                            segment.y = util.number.fromCoord( initialCoords.y )
                        }

                        segment.shape = new Kinetic.Group({
                            x: segment.x,
                            y: segment.y,
                            listening: false
                        });

                        for ( var i = 0; i < _s.snake.amountOfInnerRectangles + 1; i++ ){
                            segment.shape.add(
                                new Kinetic.Rect({
                                    x: util.calculate.tile.size() + i *
                                        (( util.calculate.tile.size() * 0.33 ) / 2 ),
                                    y: util.calculate.tile.size() + i *
                                        (( util.calculate.tile.size() * 0.33 ) / 2 ),
                                    width: util.calculate.tile.size() - i *
                                        ( util.calculate.tile.size() * 0.33 ),
                                    height: util.calculate.tile.size() - i *
                                        ( util.calculate.tile.size() * 0.33 ),
                                    fill: colors[ i ],
                                    listening: false
                                })
                            )
                        }

                        snake.segment.queue.push( segment.shape )
                    },

                    addNewIfNecessary: function() {
                        if ( snake.segment.queue.length > 0 ){
                            var segment = snake.segment.queue.shift();

                            snake.segment.list.push( segment );

                            game.layer.add( segment )
                        }
                    }
                },

                direction: {
                    queue: [ initialDirection ],

                    current: initialDirection,

                    changeIfNecessary: function() {
                        if ( snake.direction.queue.length > 0 )
                            snake.direction.current = snake.direction.queue.shift()
                    },

                    currentOrLastQueuedIsOppositeOf: function( direction ){
                        if ( snake.segment.list.length === 1 )
                            return false;
                        else {
                            var opposite;

                            if ( direction === 'up' ) opposite = 'down';
                            else if ( direction === 'down' ) opposite = 'up';
                            else if ( direction === 'left' ) opposite = 'right';
                            else if ( direction === 'right' ) opposite = 'left';

                            return snake.direction.current === opposite ||
                                   _.last( snake.direction.queue ) === opposite
                        }
                    },

                    lastQueuedIsSameAs: function( direction ){
                        return _.last( snake.direction.queue ) === direction
                    },

                    pushOrInit: function( direction ){
                        if ( game.state.get( 'current' ) === 'running' )
                            snake.direction.queue.push( direction );

                        else snake.direction.queue[ 0 ] = direction
                    }
                },

                isReadyToMove: function( frame ){
                    return frame.time - ( snake.lastMovementTime || 0 ) >= ( settings.animation.period() -
                        ( snake.segment.list.length * _s.snake.speedIncrement )) / 2
                },

                move: function( frame ){
                    snake.direction.changeIfNecessary();

                    var firstSegment = snake.segment.list[ 0 ],
                        lastSegment = _.last( snake.segment.list ),
                        currentDirection = snake.direction.current;

                    if ( currentDirection === 'up' ){
                        lastSegment.x( firstSegment.x() );
                        lastSegment.y( firstSegment.y() - util.calculate.tile.size() )

                    } else if ( currentDirection === 'right' ){
                        lastSegment.x( firstSegment.x() + util.calculate.tile.size() );
                        lastSegment.y( firstSegment.y() )

                    } else if ( currentDirection === 'down' ){
                        lastSegment.x( firstSegment.x() );
                        lastSegment.y( firstSegment.y() + util.calculate.tile.size() )

                    } else {
                        lastSegment.x( firstSegment.x() - util.calculate.tile.size() );
                        lastSegment.y( firstSegment.y() )
                    }

                    if ( snake.segment.list.length > 1 )
                        snake.segment.list.unshift( snake.segment.list.pop() );

                    snake.lastMovementTime = frame.time;
                },

                isCollidingWith: {
                    itself: function() {
                        return game.collision({
                            shape: snake.segment.list[ 0 ],
                            list: snake.segment.list
                        })
                    },

                    boundary: function() {
                        return util.number.toCoord( snake.segment.list[ 0 ].x() ) === 1 ||
                               util.number.toCoord( snake.segment.list[ 0 ].x() ) === settings.background.tile.quantity.x ||
                               util.number.toCoord( snake.segment.list[ 0 ].y() ) === 1 ||
                               util.number.toCoord( snake.segment.list[ 0 ].y() ) === settings.background.tile.quantity.y
                    }
                },

                lastMovementTime: null,
                alive: true
            };

            return snake;
        }

            var game = {
                    name: 'game',
                    score: 0,
                    lastScore: 0,
                    startTime: null,
                    lastTimeCentis: 0,

                isNotStoppingOrStopped: util.module.isNotStoppingOrStopped,

                state: new Backbone.Model({ current: 'stopped' }),

                layer: new Kinetic.Layer,

                background: background.game,

                boundaries: {
                    top: new Kinetic.Rect({
                        x: util.calculate.tile.size() / 4,
                        y: util.calculate.tile.size() / 4,
                        width: ( util.calculate.tile.size() * settings.background.tile.quantity.x ) -
                            util.calculate.tile.size(),
                        height: util.calculate.tile.size() / 2
                    }),

                    left: new Kinetic.Rect({
                        x: util.calculate.tile.size() / 4,
                        y: util.calculate.tile.size() / 4,
                        width: util.calculate.tile.size() / 2,
                        height: ( util.calculate.tile.size() * settings.background.tile.quantity.y ) -
                            util.calculate.tile.size()
                    }),

                    bottom: new Kinetic.Rect({
                        x: util.calculate.tile.size() / 4,
                        y: util.calculate.tile.size() *
                            ( settings.background.tile.quantity.y - 0.75 ),
                        width: ( util.calculate.tile.size() * settings.background.tile.quantity.x ) -
                            util.calculate.tile.size(),
                        height: util.calculate.tile.size() / 2
                    }),

                    right: new Kinetic.Rect({
                        x: viewport.dimensions.original.width -
                            ( util.calculate.tile.size() * 0.75 ),
                        y: util.calculate.tile.size() / 4,
                        width: util.calculate.tile.size() / 2,
                        height: ( util.calculate.tile.size() *
                            ( settings.background.tile.quantity.y - 0.5 ))
                    }),

                    fill: function fill( color ){
                        if ( typeof color === 'string' ){
                            color = color.toLowerCase();

                            if ( color === 'default' )
                                fill( settings.background.colors.base[ 0 ] );
                            else if ( color === 'random' )
                                fill( game.background.tile.color.base.random() );
                            else {
                                game.boundaries.top.fill( color );
                                game.boundaries.left.fill( color );
                                game.boundaries.bottom.fill( color );
                                game.boundaries.right.fill( color );
                            }
                        }
                        else throw new Error( 'game.boundaries.fill() requires a string argument' );
                    },

                    areReadyToCycle: function( frame ){
                        return frame.time - ( game.boundaries.lastCycleTime || 0 ) >=
                            settings.animation.period() / 8
                    },

                    animation: function( frame ){
                        game.boundaries.fill( 'random' );

                        game.boundaries.lastCycleTime = frame.time
                    }
                },

                snake: createSnake({ x: _s.snake.initial.coords.x, y: _s.snake.initial.coords.y }, _s.snake.initial.direction, _s.snake.colors),
                snake2: null,

                heart: {
                    list: [],

                    generate: function() {
                        var x = util.calculate.random.int( 2, settings.background.tile.quantity.x - 1 ),
                            y = util.calculate.random.int( 2, settings.background.tile.quantity.y - 1 ),
                            collisionAtProposedCoordinates = game.collision({
                                coords: { x: x, y: y },
                                list: [ game.snake.segment.list, (game.snake2 && game.snake2.segment.list) || [], game.heart.list ]
                            });

                        if ( !collisionAtProposedCoordinates ){
                            var heart = new Kinetic.Group({
                                x: util.number.fromCoord( x ),
                                y: util.number.fromCoord( y ) }
                            );

                            // Usar símbolo de nota musical Unicode (\u266B)
                            for ( var i = 0; i < _s.heart.amountOfInnerHearts + 1; i++ ){
                                heart.add(
                                    new Kinetic.Text({
                                        x: util.calculate.tile.size() + i *
                                            (( util.calculate.tile.size() * 0.33 ) / 2 ),
                                        y: util.calculate.tile.size() + i *
                                            (( util.calculate.tile.size() * 0.33 ) / 2 ),
                                        fontSize: util.calculate.tile.size() - i *
                                            ( util.calculate.tile.size() * 0.33 ),
                                        fontFamily: 'Arial',
                                        text: '\u266B',
                                        fill: '#222',
                                        listening: false
                                    })
                                )
                            }

                            game.heart.list.push( heart );

                            game.layer.add( heart );

                            heart.setZIndex( 2 )

                        } else game.heart.generate()
                    },

                    regenerate: function() {
                        game.heart.generate();

                        for ( var i = 0; i < _s.heart.maximum - 1; i++ )
                            if ( util.calculate.random.float( 0, 100 ) <
                                 _s.heart.spawnProbability * 100 )

                                game.heart.generate()
                    },

                    destroy: function( index ){
                        game.heart.list[ index ].destroy();
                        game.heart.list.splice( index, 1 )
                    }
                },

                paused: new Kinetic.Text({
                    x: util.calculate.absolute.x( _s.paused.x ),
                    y: util.calculate.absolute.y( _s.paused.y ),
                    text: 'Paused',
                    fontSize: util.calculate.absolute.size( _s.paused.size ),
                    fontFamily: settings.font.face,
                    fill: _s.paused.font.color,
                    shadowColor: _s.paused.shadow.color,
                    shadowBlur: util.calculate.absolute.size( _s.paused.shadow.blur ),
                    opacity: 0
                }),

                animation: new Kinetic.Animation( function( frame ){
                    var state = game.state.get( 'current' );

                    if ( state === 'starting' ){
                        var isMultiplayer = isMultiplayerMode();
                        game.snake2 = isMultiplayer
                            ? createSnake({ x: 6, y: 10 }, 'left', [ '#ffab91', '#ffcc80', '#b39ddb' ])
                            : null;

                        // Inicializar las serpientes activas
                        [ game.snake, game.snake2 ].forEach(function(s){ if (s) { s.segment.queueNew(); s.segment.addNewIfNecessary(); s.alive = true; } });
                        game.score = (game.snake.segment.list.length || 0) + ((game.snake2 && game.snake2.segment.list.length) || 0);
                        game.lastScore = game.score;
                        game.startTime = Date.now();
                        game.lastTimeCentis = 0;

                        if ( isSimonMode() ){
                            _simonResetSequence();
                            _simonStartRound();
                            game.score = 0;
                            game.lastScore = 0;
                        } else {
                            game.heart.regenerate();
                        }

                        game.state.set( 'current', 'waiting' )

                    } else if ( state === 'counting down' ){

                        game.background.countDown.animation( frame );

                        if ( game.background.countDown.number === 1 )
                            game.state.set( 'current', 'running' )

                    } else if ( state === 'running' ){
                        if ( game.boundaries.areReadyToCycle( frame ))
                            game.boundaries.animation( frame );

                        // En modo Simón: bloquea el movimiento mientras el modal está visible.
                        if ( isSimonMode() && simonLockMovement )
                            return;

                        // Mover y procesar colisiones para cada serpiente viva
                        [ game.snake, game.snake2 ].forEach(function(s){
                            if (!s || !s.alive) return;

                            if ( s.isReadyToMove( frame )){
                                s.move( frame );

                                s.segment.addNewIfNecessary();

                                if ( s.isCollidingWith.itself() || s.isCollidingWith.boundary() ){
                                    var totalLenBeforeDeath = (game.snake.segment.list.length || 0) +
                                        ((game.snake2 && game.snake2.segment.list.length) || 0);

                                    // Marcar muerta y eliminar sus segmentos
                                    s.alive = false;
                                    s.segment.list.forEach(function(seg){ try{ seg.destroy(); }catch(e){} });
                                    s.segment.list = [];
                                    s.segment.queue = [];
                                    // Si ambas serpientes están muertas, terminar partida
                                    var bothDead = (!game.snake.alive) && (!game.snake2 || !game.snake2.alive);
                                    if ( bothDead ){
                                        // En modo Simón el score es independiente de la longitud.
                                        game.lastScore = isSimonMode() ? ( game.score || 0 ) : totalLenBeforeDeath;
                                        if ( game.startTime )
                                            game.lastTimeCentis = Math.round(( Date.now() - game.startTime ) / 10 );
                                        game.state.set( 'current', 'stopping' );
                                    }
                                } else {
                                    game.collision(
                                        {
                                            shape: s.segment.list[ 0 ],
                                            list: game.heart.list
                                        },
                                        function( i ){
                                            // Si estamos en modo Simón, el objetivo se valida por símbolo esperado.
                                            if ( isSimonMode() ){
                                                var target = game.heart.list[ i ];
                                                var targetIdx = target && typeof target._simonSymbolIdx === 'number'
                                                    ? target._simonSymbolIdx
                                                    : null;
                                                var expectedIdx = ( simonSequence && simonProgress < simonSequence.length )
                                                    ? simonSequence[ simonProgress ]
                                                    : null;
                                                // Regla: si la figura es la misma que la esperada, es correcto.
                                                // Esto permite repeticiones (p.ej. negra, negra) sin penalizar si se come "la otra" negra.
                                                var isCorrect = ( targetIdx !== null && expectedIdx !== null && targetIdx === expectedIdx );

                                                // Destruir el objetivo comido
                                                game.heart.destroy( i );

                                                if ( targetIdx !== null ){
                                                    // Crecer siempre en modo Simón; penaliza score si falla.
                                                    s.segment.queueNew();
                                                    _simonPlayNote( targetIdx );
                                                    if ( isCorrect )
                                                        game.score = ( game.score || 0 ) + 1;
                                                    else
                                                        game.score = Math.max( 0, ( game.score || 0 ) - 2 );

                                                    game.lastScore = game.score;
                                                    game.background.count( game.score );
                                                    _simonOnEatTarget( isCorrect, game.score );
                                                }
                                            } else {
                                            game.heart.destroy( i );

                                                // Reproducir nota musical al comer
                                                if (window && window.assets && window.assets.audio && window.assets.audio.playNextNote) {
                                                    var idx = window.assets.audio._notePlayIdx = (window.assets.audio._notePlayIdx||0);
                                                    window.assets.audio.notes[idx % window.assets.audio.notes.length].play();
                                                    window.assets.audio._lastNoteIdxPlayed = idx % window.assets.audio.notes.length;
                                                    window.assets.audio._notePlayIdx++;
                                                }

                                                // Contar longitud combinada para mostrar en background
                                                var totalLen = (game.snake.segment.list.length || 0) + (((game.snake2 && game.snake2.segment.list.length) || 0)) + 1;
                                                game.background.count( totalLen );
                                                game.score = totalLen;
                                                game.lastScore = totalLen;

                                                s.segment.queueNew();

                                                if ( game.heart.list.length === 0 ) game.heart.regenerate()
                                            }
                                        }
                                    )
                                }
                            }
                        })
                    } else if ( state === 'stopping' )
                        util.module.stop( game, frame );

                    if ( state === 'paused' ){
                        if ( game.paused.opacity() < 1 )
                            util.animation.fade( game.paused, frame, 'in' )

                    } else if ( game.paused.opacity() > 0 ){
                        game.paused.moveToTop();
                        util.animation.fade( game.paused, frame, 'out' )
                    }
                }),

                collision: function( options, cb ){
                    var collisions = [],
                        errPrefix = 'game.collision.filter() - ';

                    if ( !_.isObject( options ))
                        throw new TypeError(
                            errPrefix + 'The options argument must be an object'
                        );
                    else if ( !_.isArray( options.list ))
                        throw new TypeError(
                            errPrefix + 'options.list must be a single or nested array of KineticJS shapes'
                        );
                    else if (
                        !(
                            util.isKineticObject( options.shape ) ||
                            _.isArray( options.shape )
                        )
                        &&
                        !(
                            _.isObject( options.coords ) ||
                            _.isArray( options.coords )
                        )
                    )
                        throw new TypeError(
                            errPrefix + 'Either options.shape or options.coords must be supplied. ' +
                            'options.shape can be a KineticJS shape or an array of KineticJS shapes. ' +
                            'options.coords can be an object containing x and y integer properties or ' +
                            'an array of objects containing x and y integer properties.'
                        );
                    else {
                        if ( util.isKineticObject( options.list[ 0 ]))
                            options.list = [ options.list ];

                        if ( options.shape && !_.isArray( options.shape ))
                            options.shape = [ options.shape ];

                        if ( options.coords && !_.isArray( options.coords ))
                            options.coords = [ options.coords ];

                        _.each( options.list, function( list ){
                            _.each( list, function( shape, listIndex ){
                                if ( !util.isKineticObject( shape ))
                                    throw new TypeError(
                                        errPrefix + 'Encountered a non-Kinetic object in options.list'
                                    );

                                else {
                                    if ( _.isArray( options.shape ) && options.shape.length > 0 ){
                                        _.each( options.shape, function( _shape ){
                                            if ( !util.isKineticObject( _shape ))
                                                throw new TypeError(
                                                    errPrefix + 'Encountered a non-Kinetic object in options.shape'
                                                );

                                            if ( util.number.toCoord( shape.x() ) === util.number.toCoord( _shape.x() ) &&
                                                 util.number.toCoord( shape.y() ) === util.number.toCoord( _shape.y() ) &&
                                                 shape !== _shape ){

                                                collisions.push( listIndex );
                                            }
                                        })
                                    }
                                    if ( _.isArray( options.coords ) && options.coords.length > 0 ){
                                        _.each( options.coords, function( coords ){
                                            if ( !( _.isObject( coords ) &&
                                                    _.isNumber( coords.x ) &&
                                                    _.isNumber( coords.y ))
                                            )
                                                throw new TypeError(
                                                    errPrefix + 'Encountered non-integer coordinate(s) in options.coords'
                                                );

                                            if ( util.number.toCoord( shape.x() ) === coords.x &&
                                                 util.number.toCoord( shape.y() ) === coords.y ){

                                                collisions.push( listIndex );
                                            }
                                        })
                                    }
                                }
                            })
                        })
                    }

                    if ( _.isFunction( cb ))
                        _.each( collisions, function( listIndex ){
                            cb( listIndex );
                        });

                    return collisions.length > 0;
                },

                init: function() {
                    game.boundaries.fill( 'default' );

                    ( function _layer() {
                        game.layer.add( game.background.group );

                        game.layer.add( game.boundaries.top );
                        game.layer.add( game.boundaries.left );
                        game.layer.add( game.boundaries.bottom );
                        game.layer.add( game.boundaries.right );

                        // Modal simple para mostrar la secuencia del modo Simón.
                        simonModalGroup = new Kinetic.Group({ opacity: 0, listening: false });

                        simonModalGroup.add(
                            new Kinetic.Rect({
                                x: util.calculate.absolute.x( 3.2 ),
                                y: util.calculate.absolute.y( 4.5 ),
                                width: viewport.dimensions.original.width - util.calculate.absolute.x( 1.6 ),
                                height: util.calculate.absolute.y( 2.4 ),
                                fill: settings.background.colors.base[ 0 ],
                                opacity: 0.85,
                                cornerRadius: util.calculate.absolute.size( 50 ),
                                listening: false
                            })
                        );

                        simonModalText = new Kinetic.Text({
                            x: util.calculate.absolute.x( 3.2 ),
                            y: util.calculate.absolute.y( 4.5 ),
                            width: viewport.dimensions.original.width - util.calculate.absolute.x( 1.6 ),
                            height: util.calculate.absolute.y( 2.4 ),
                            align: 'center',
                            verticalAlign: 'top',
                            text: '',
                            fontSize: util.calculate.absolute.size( 45 ),
                            fontFamily: 'Fira Mono',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width ),
                            listening: false
                        });

                        simonModalGroup.add( simonModalText );
                        game.layer.add( simonModalGroup );

                        game.layer.add( game.paused );

                        game.animation.setLayers( game.layer )
                    })();
                },

                cleanUp: function() {
                    simonTimerToken++;
                    simonLockMovement = false;
                    simonAwaitingUser = false;
                    simonSequence = [];
                    simonProgress = 0;
                    _simonClearTargets();
                    _simonHideModal();

                    [ game.snake, game.snake2 ].forEach(function(s){
                        if (!s) return;
                        s.segment.list.forEach( function( segment ){ try{ segment.destroy() }catch(e){} });
                        s.segment.list = [];
                        s.segment.queue = [];
                        s.direction.queue = [ _s.snake.initial.direction ];
                        s.direction.current = _s.snake.initial.direction;
                        s.alive = false;
                    });

                    game.heart.list.forEach( function( heart ){ heart.destroy() });
                    game.heart.list = [];

                    game.boundaries.fill( 'default' );

                    game.background.cleanUp()
                }
            };

        game.init();

        // API informativa del modo Simón (ya no se usa entrada por teclado).
        game.simon = {
            isLocked: function(){
                return isSimonMode() && simonLockMovement;
            },
            symbols: simonSymbols,
            userAction: function(){
                return _simonHandleUserAction();
            }
        };

        return game
    }
);
