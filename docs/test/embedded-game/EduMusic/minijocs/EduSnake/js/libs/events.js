define([ 'jquery', 'underscore', 'bigScreen', 'settings', 'util', 'database' ],
    function( $, _, bigScreen, settings, util, database ){
        return {
            init: function( assets ){
                var audio = assets.audio,
                    viewport = assets.viewport,
                    loading = assets.loading,
                    menu = assets.menu,
                    game = assets.game,
                    highScores = assets.highScores;

                // Navegadores modernos bloquean autoplay; desbloqueamos audio con el primer gesto.
                var _audioUnlocked = false;
                var _songWantsToPlay = false;

                function _safePlayBuzz( buzzSound ){
                    try {
                        if ( !buzzSound || !buzzSound.play ) return;
                        var result = buzzSound.play();
                        if ( result && typeof result.catch === 'function' )
                            result.catch( function(){} );
                    } catch ( e ) {}
                }

                function _startSongIfAllowed(){
                    if ( !_songWantsToPlay ) return;
                    if ( !_audioUnlocked ) return;
                    if ( !assets || !assets.audio || !assets.audio.song || !assets.audio.song.mp3 ) return;

                    // Buzz permite loop() por separado.
                    try { assets.audio.song.mp3.loop(); } catch ( e ) {}
                    _safePlayBuzz( assets.audio.song.mp3 );
                }

                function _unlockAudioOnce(){
                    if ( _audioUnlocked ) return;
                    _audioUnlocked = true;
                    _startSongIfAllowed();
                }

                    function _normalizeMode( mode ){
                        var m = String( mode || 'classic' );
                        return m.indexOf( 'simon' ) !== -1 ? 'simon' : 'classic';
                    }

                    function _syncScoreServiceMode(){
                        try {
                            if ( !window || !window.ScoreService || typeof window.ScoreService.getBoardsByGame !== 'function' )
                                return;
                            var mode = _normalizeMode( window.selectedGameMode || 'classic' );
                            var rankKey = 'edusnake-' + mode;
                            var boards = window.ScoreService.getBoardsByGame( 'edusnake' ) || [];

                            // Mantener el DOM en sync por si ScoreService re-escanea.
                            var sections = document.querySelectorAll('[data-scoreboard][data-game="edusnake"]');
                            for ( var i = 0; i < sections.length; i++ )
                                sections[i].setAttribute( 'data-rank-key', rankKey );

                            for ( var b = 0; b < boards.length; b++ ){
                                boards[b].options.rankKey = rankKey;
                            }

                            for ( var r = 0; r < boards.length; r++ ){
                                if ( typeof boards[r].refresh === 'function' ) boards[r].refresh();
                            }
                        } catch ( _e ) {}
                    }
                // Capturamos cualquier gesto de usuario (click/touch/tecla) para desbloquear.
                $( document ).one( 'click touchstart keydown', _unlockAudioOnce );

                ( function _keyEvents() {
                    var keys = {
                        w: 87, a: 65, s: 83, d: 68,
                        up: 38, left: 37, down: 40, right: 39,
                        space: 32,
                        backtick: 192,
                        enter: 13
                    };

                    $( document ).keydown( function( key ){
                        function _isMultiplayerMode(){
                            return String( window.selectedGameMode || '' ).indexOf( 'multiplayer' ) !== -1;
                        }

                        if ( key.which == keys.backtick && bigScreen.enabled )
                            bigScreen.toggle();

                        else if ( game.isNotStoppingOrStopped() ){
                            if ( game.simon && game.simon.userAction && game.simon.userAction() )
                                return;

                            if ( key.which == keys.space ){
                                var gameState = game.state.get( 'current' );

                                if ( gameState === 'running' ){
                                    game.paused.moveToTop();
                                    game.state.set( 'current', 'paused' );
                                    
                                } else if ( gameState === 'paused' )
                                    game.state.set( 'current', 'running' );
                            }

                            // En modo multijugador: WASD -> jugador 1, flechas -> jugador 2
                            if ( _isMultiplayerMode() ){
                                // Player 1 (WASD)
                                handleNewDirectionFor( key.which, [ keys.w ], 'up', game.snake );
                                handleNewDirectionFor( key.which, [ keys.a ], 'left', game.snake );
                                handleNewDirectionFor( key.which, [ keys.s ], 'down', game.snake );
                                handleNewDirectionFor( key.which, [ keys.d ], 'right', game.snake );

                                // Player 2 (arrow keys)
                                handleNewDirectionFor( key.which, [ keys.up ], 'up', game.snake2 );
                                handleNewDirectionFor( key.which, [ keys.left ], 'left', game.snake2 );
                                handleNewDirectionFor( key.which, [ keys.down ], 'down', game.snake2 );
                                handleNewDirectionFor( key.which, [ keys.right ], 'right', game.snake2 );
                            } else {
                                // Modo clásico: ambos mapeos controlan la misma serpiente
                                handleNewDirectionFor( key.which, [ keys.up, keys.w ], 'up', game.snake );
                                handleNewDirectionFor( key.which, [ keys.left, keys.a ], 'left', game.snake );
                                handleNewDirectionFor( key.which, [ keys.down, keys.s ], 'down', game.snake );
                                handleNewDirectionFor( key.which, [ keys.right, keys.d ], 'right', game.snake )
                            }

                        } else if ( highScores.add.isNotStoppingOrStopped() ){
                            highScores.add.playerName.move();

                            if ( key.which == keys.enter )
                                database.submitScore( highScores )

                        } else if ( highScores.view.isNotStoppingOrStopped() ){
                            if (( key.which == keys.left || key.which == keys.a ) &&
                                  highScores.view.previous.shape.getParent() )

                                highScores.view.update({ previous: true });

                            else if (( key.which == keys.right || key.which == keys.d ) &&
                                       highScores.view.next.shape.getParent() )

                                highScores.view.update({ next: true })
                        }
                    });

                    function handleNewDirectionFor( pressedKey, expectedKeys, direction, targetSnake ){
                        if ( _.indexOf( expectedKeys, pressedKey ) != -1 ){
                            if ( targetSnake && !( targetSnake.direction.currentOrLastQueuedIsOppositeOf( direction ) ||
                                    targetSnake.direction.lastQueuedIsSameAs( direction ))){

                                targetSnake.direction.pushOrInit( direction )
                            }
                        }
                    }
                })();

                ( function _mouseAndTouchEvents() {
                    ( function _menu() {
                        ( function _singlePlayer() {
                            menu.options.singlePlayer.hitBox.on( 'mouseout', function() {
                                menu.options.singlePlayer.shape.getChildren().each( function( node ){
                                    util.color.fillAndStroke({
                                        node: node,
                                        fill: { hex: settings.font.colors.fill.enabled.hex },
                                        stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                    })
                                })
                            });

                            menu.options.singlePlayer.hitBox.on( 'click touchstart', function() {
                                if ( menu.isNotStoppingOrStopped() ){
                                    // Pasar el modo seleccionado al juego
                                    window.selectedGameMode = menu.selectedMode || 'classic';
                                        _syncScoreServiceMode();
                                    menu.state.set( 'current', 'stopping' );
                                    game.state.set( 'current', 'starting' )
                                }
                            })
                            })();

                            ( function _singlePlayerModeSelector() {
                                if ( !( menu.options && menu.options.mode &&
                                       menu.options.mode.normal && menu.options.mode.normal.hitBox &&
                                       menu.options.mode.simon && menu.options.mode.simon.hitBox &&
                                       menu.options.mode.applySelection ))
                                    return;

                                menu.options.mode.applySelection();

                                menu.options.mode.normal.hitBox.on( 'click touchstart', function(){
                                    if ( menu.isNotStoppingOrStopped() ){
                                        menu.selectedMode = 'classic';
                                        window.selectedGameMode = 'classic';
                                        menu.options.mode.applySelection();
                                            _syncScoreServiceMode();
                                    }
                                });

                                menu.options.mode.simon.hitBox.on( 'click touchstart', function(){
                                    if ( menu.isNotStoppingOrStopped() ){
                                        menu.selectedMode = 'simon';
                                        window.selectedGameMode = 'simon';
                                        menu.options.mode.applySelection();
                                            _syncScoreServiceMode();
                                    }
                                });
                            })();

                            ( function _multiPlayer() {
                                menu.options.multiPlayer.hitBox.on( 'mouseout', function() {
                                    menu.options.multiPlayer.shape.getChildren().each( function( node ){
                                        util.color.fillAndStroke({
                                            node: node,
                                            fill: { hex: settings.font.colors.fill.enabled.hex },
                                            stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                        })
                                    })
                                });

                                menu.options.multiPlayer.hitBox.on( 'click touchstart', function() {
                                    if ( menu.isNotStoppingOrStopped() ){
                                        // Si el usuario eligió Simón, permitir Simón en multijugador.
                                        window.selectedGameMode = ( menu.selectedMode === 'simon' )
                                            ? 'simon-multiplayer'
                                            : 'multiplayer';
                                            _syncScoreServiceMode();
                                        menu.state.set( 'current', 'stopping' );
                                        game.state.set( 'current', 'starting' )
                                    }
                                })
                            })();
                        })();

                        ( function _gear() {
                            menu.options.gear.hitBox.on( 'mouseout', function() {
                                if ( menu.isNotStoppingOrStopped() ){
                                    util.color.fillAndStroke({
                                        node: menu.options.gear.shape,
                                        fill: { hex: settings.font.colors.fill.enabled.hex },
                                        stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                    })
                                }
                            });

                            menu.options.gear.hitBox.on( 'click touchstart', function() {
                                if ( menu.isNotStoppingOrStopped() ){
                                    if ( menu.state.get( 'current' ) === 'running' )
                                        menu.state.set( 'current', 'settings' );

                                    else menu.state.set( 'current', 'running' )
                                }
                            })
                        })();

                        ( function _highScores() {
                            menu.options.highScores.hitBox.on( 'mouseout', function() {
                                util.color.fillAndStroke({
                                    node: menu.options.highScores.shape,
                                    fill: { hex: settings.font.colors.fill.enabled.hex },
                                    stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                })
                            });

                            menu.options.highScores.hitBox.on( 'click touchstart', function() {
                                if ( menu.isNotStoppingOrStopped() ){
                                    // High Scores se filtra por window.selectedGameMode.
                                    // En menú, usamos la modalidad seleccionada (Normal/Simón).
                                    window.selectedGameMode = menu.selectedMode || 'classic';
                                        _syncScoreServiceMode();
                                    menu.state.set( 'current', 'stopping' );
                                    highScores.view.state.set( 'current', 'starting' )
                                }
                            })
                        })();

                        ( function _volume() {
                            menu.settings.volume.hitBox.on( 'mouseout', function() {
                                if ( menu.state.get( 'current' ) === 'settings' ){
                                    menu.settings.volume.shape.fill(
                                        settings.menu.settings.font.color.enabled.hex
                                    )
                                }
                            });

                            menu.settings.volume.hitBox.on( 'click touchstart', function() {
                                if ( menu.state.get( 'current' ) === 'settings' )
                                    audio.song.mp3.toggleMute()
                            })
                        })();

                        ( function _fullScreen() {
                            menu.settings.fullScreen.hitBox.on( 'mouseout', function() {
                                if ( menu.state.get( 'current' ) === 'settings' ){
                                    menu.settings.fullScreen.shape.fill(
                                        settings.menu.settings.font.color.enabled.hex
                                    )
                                }
                            });

                            menu.settings.fullScreen.hitBox.on( 'click touchstart', function() {
                                if ( menu.state.get( 'current' ) === 'settings' )
                                    if ( bigScreen.enabled ) bigScreen.toggle()
                            })
                        })();
                    })();

                    ( function _highScores() {
                        ( function _add() {
                            ( function _keyboard() {
                                highScores.add.keyboard.hitBox.on( 'mouseout', function() {
                                    if ( highScores.add.isNotStoppingOrStopped() ){
                                        util.color.fillAndStroke({
                                            node: highScores.add.keyboard.shape,
                                            fill: { hex: settings.font.colors.fill.enabled.hex },
                                            stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                        })
                                    }
                                });

                                highScores.add.keyboard.hitBox.on( 'click touchstart', function() {
                                    if ( highScores.add.isNotStoppingOrStopped() ){
                                        var name = prompt( 'What is your name, hero?' );

                                        if ( !name )
                                            return;
                                        name = name.toUpperCase();
                                        if ( !/^[A-Z0-9]{1,3}$/.test( name ) )
                                            alert( 'Your name must be 1 to 3 letters or numbers!' );
                                        else {
                                            highScores.add.playerName.field.text( name );

                                            highScores.add.playerName.move()
                                        }
                                    }
                                })
                            })();

                            ( function _submit() {
                                highScores.add.submit.hitBox.on( 'mouseout', function() {
                                    util.color.fillAndStroke({
                                        node: highScores.add.submit.shape,
                                        fill: { hex: settings.font.colors.fill.enabled.hex },
                                        stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                    })
                                });

                                highScores.add.submit.hitBox.on( 'click touchstart', function() {
                                    if ( highScores.add.isNotStoppingOrStopped() )
                                        database.submitScore( highScores )
                                })
                            })();

                            ( function _back() {
                                highScores.add.back.hitBox.on( 'mouseout', function() {
                                    util.color.fillAndStroke({
                                        node: highScores.add.back.shape,
                                        fill: { hex: settings.font.colors.fill.enabled.hex },
                                        stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                    })
                                });

                                highScores.add.back.hitBox.on( 'click touchstart', function() {
                                    if ( highScores.add.isNotStoppingOrStopped() )
                                        highScores.add.state.set( 'current', 'stopping' );
                                })
                            })();
                        })();

                        ( function _view() {
                            ( function _previous() {
                                highScores.view.previous.hitBox.on( 'mouseout', function() {
                                    if ( highScores.view.isNotStoppingOrStopped() ){
                                        util.color.fillAndStroke({
                                            node: highScores.view.previous.shape,
                                            fill: { hex: settings.font.colors.fill.enabled.hex },
                                            stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                        })
                                    }
                                });

                                highScores.view.previous.hitBox.on( 'click touchstart', function() {
                                    if ( highScores.view.isNotStoppingOrStopped() )
                                        highScores.view.update({ previous: true })
                                })
                            })();

                            ( function _next() {
                                highScores.view.next.hitBox.on( 'mouseout', function() {
                                    if ( highScores.view.isNotStoppingOrStopped() ){
                                        util.color.fillAndStroke({
                                            node: highScores.view.next.shape,
                                            fill: { hex: settings.font.colors.fill.enabled.hex },
                                            stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                        })
                                    }
                                });

                                highScores.view.next.hitBox.on( 'click touchstart', function() {
                                    if ( highScores.view.isNotStoppingOrStopped() )
                                        highScores.view.update({ next: true })
                                })
                            })();

                            ( function _back() {
                                highScores.view.back.hitBox.on( 'mouseout', function() {
                                    util.color.fillAndStroke({
                                        node: highScores.view.back.shape,
                                        fill: { hex: settings.font.colors.fill.enabled.hex },
                                        stroke: { hex: settings.font.colors.stroke.enabled.hex }
                                    })
                                });

                                highScores.view.back.hitBox.on( 'click touchstart', function() {
                                    if ( highScores.view.isNotStoppingOrStopped() )
                                        highScores.view.state.set( 'current', 'stopping' )
                                })
                            })();
                        })();
                    })();
                ( function _transitionListener() {
                    var start = util.module.start;

                    loading.state.on( 'change:current', function( state, current ){
                        if ( current === 'stopping' ) start( menu )
                    });

                    // Reproducir canción cuando el menú inicia
                    menu.state.on( 'change:current', function( state, current ){
                        if ( current === 'starting' )
                            ( _songWantsToPlay = true, _startSongIfAllowed() );
                    });

                    game.state.on( 'change:current', function( state, current ){
                        if ( current === 'starting' ){
                            // Al iniciar el juego, detener la canción de fondo
                            if ( assets && assets.audio && assets.audio.song && assets.audio.song.mp3 )
                                assets.audio.song.mp3.stop();
                            if ( window.ScoreService && typeof window.ScoreService.hideSave === 'function' )
                                window.ScoreService.hideSave( 'edusnake' );

                            _syncScoreServiceMode();

                            start( game );

                            ( function waitForMenuOut() {
                                if ( menu.layer.opacity() === 0 )
                                    game.state.set( 'current', 'counting down' );

                                else setTimeout( waitForMenuOut, 10 )
                            })()
                        } else if ( current === 'stopping' ){
                               var finalScore = game.lastScore || game.score ||
                                   ( (game.snake.segment.list.length || 0) + ((game.snake2 && game.snake2.segment.list.length) || 0) );
                               var timeCentis = ( typeof game.lastTimeCentis === 'number' )
                                   ? game.lastTimeCentis
                                   : ( game.startTime ? Math.round(( Date.now() - game.startTime ) / 10 ) : 0 );

                               highScores.add.start( finalScore, timeCentis )
                               // EduSnake ya tiene su propio input de nombre.
                               // Evitamos el formulario/modal de ScoreService para no competir por el foco.
                               if ( window.ScoreService && typeof window.ScoreService.hideSave === 'function' )
                                   window.ScoreService.hideSave( 'edusnake' );
                        }
                    });

                    highScores.add.state.on( 'change:current', function( state, current ){
                        if ( current === 'stopping' ) start( menu )
                    });

                    highScores.view.state.on( 'change:current', function( state, current ){
                        if ( current === 'starting' ){
                            highScores.view.update({ reset: true });

                            start( highScores.view )
                        }
                        else if ( current === 'stopping' ) start( menu )
                    })
                })();

                ( function _transitionToMenu() {
                    database.waitUntilConnected( function() {
                        _songWantsToPlay = true;
                        _startSongIfAllowed();
                        loading.state.set( 'current', 'stopping' )
                    })
                })()
            }
        }
    }
);
