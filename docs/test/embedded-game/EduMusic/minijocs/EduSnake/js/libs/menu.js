define([ 'backbone', 'Kinetic', 'settings', 'util', 'viewport', 'background' ],
    function( Backbone, Kinetic, settings, util, viewport, background ){
        var x = util.calculate.absolute.x,
            y = util.calculate.absolute.y,
            pi = util.calculate.pi,
            _s = settings.menu,
            menu = {
                name: 'menu',

                isNotStoppingOrStopped: util.module.isNotStoppingOrStopped,

                state: new Backbone.Model({ current: 'stopped' }),

                layer: new Kinetic.Layer,

                // Modo para 1 jugador: 'classic' (normal) o 'simon'
                selectedMode: 'classic',

                background: background.menu,

                title: {
                    // Portada simplificada: título estático sin animación.
                    text: new Kinetic.Text({
                        x: 0,
                        y: util.calculate.absolute.y( 3.0 ),
                        text: 'EduSnake',
                        width: viewport.dimensions.original.width,
                        align: 'center',
                        fontSize: util.calculate.absolute.x( 14 ),
                        fontFamily: settings.font.face,
                        fill: settings.font.colors.fill.enabled.hex,
                        stroke: settings.font.colors.stroke.enabled.hex,
                        strokeWidth: util.calculate.absolute.size( settings.font.stroke.width ),
                        listening: false
                    }),

                    bounce: function(){}
                },

                options: {
                    singlePlayer: {
                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 62 ),
                            y: util.calculate.absolute.y( 1.214 ),
                            width: util.calculate.absolute.x( 6.25 ),
                            height: util.calculate.absolute.y( 8.46 ),
                            opacity: 0
                        }),

                        mouseOver: function() {
                            return util.mouse.isOverNode( menu.options.singlePlayer.hitBox )
                        }
                    },

                    gear: {
                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( 2.51 ),
                            y: util.calculate.absolute.y( _s.options.y ),
                            text: '\uf013',
                            fontSize: util.calculate.absolute.x( _s.options.font.size ),
                            fontFamily: 'FontAwesome',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width ),
                            listening: false
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 2.518 ),
                            y: util.calculate.absolute.y( 1.23 ),
                            width: util.calculate.absolute.x( 12.39 ),
                            height: util.calculate.absolute.y( 6.92 ),
                            opacity: 0
                        }),

                        mouseOver: function() {
                            return util.mouse.isOverNode( menu.options.gear.hitBox )
                        }
                    },

                    highScores: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( menu.options.highScores.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( 1.97 ),
                            y: util.calculate.absolute.y( _s.options.y ),
                            text: 'High Scores',
                            fontSize: util.calculate.absolute.x( _s.options.font.size ),
                            fontFamily: settings.font.face,
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width ),
                            listening: false
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 1.97 ),
                            y: util.calculate.absolute.y( 1.235 ),
                            width: util.calculate.absolute.size( 2.125 ),
                            height: util.calculate.absolute.size( 10.3 ),
                            opacity: 0
                        })
                    },

                    mode: {
                        normal: {
                            shape: new Kinetic.Text({
                                x: util.calculate.absolute.x( 3.5 ),
                                y: util.calculate.absolute.y( 1.60 ),
                                text: 'Normal',
                                fontSize: util.calculate.absolute.x( 22 ),
                                fontFamily: settings.font.face,
                                fill: settings.font.colors.fill.enabled.hex,
                                stroke: settings.font.colors.stroke.enabled.hex,
                                strokeWidth: util.calculate.absolute.size( settings.font.stroke.width ),
                                listening: false
                            }),

                            hitBox: new Kinetic.Rect({
                                x: util.calculate.absolute.x( 2.5 ),
                                y: util.calculate.absolute.y( 1.68 ),
                                width: util.calculate.absolute.x( 6 ),
                                height: util.calculate.absolute.y( 10 ),
                                opacity: 0
                            })
                        },

                        simon: {
                            shape: new Kinetic.Text({
                                x: util.calculate.absolute.x( 1.67 ),
                                y: util.calculate.absolute.y( 1.60 ),
                                text: 'Simón',
                                fontSize: util.calculate.absolute.x( 22 ),
                                fontFamily: settings.font.face,
                                fill: settings.font.colors.fill.disabled,
                                stroke: settings.font.colors.stroke.disabled,
                                strokeWidth: util.calculate.absolute.size( settings.font.stroke.width ),
                                listening: false
                            }),

                            hitBox: new Kinetic.Rect({
                                x: util.calculate.absolute.x( 1.67 ),
                                y: util.calculate.absolute.y( 1.68 ),
                                width: util.calculate.absolute.x( 6 ),
                                height: util.calculate.absolute.y( 10 ),
                                opacity: 0
                            })
                        },

                        applySelection: function(){
                            var normalEnabled = ( menu.selectedMode !== 'simon' );

                            util.color.fillAndStroke({
                                node: menu.options.mode.normal.shape,
                                fill: { hex: normalEnabled ? settings.font.colors.fill.enabled.hex : settings.font.colors.fill.disabled },
                                stroke: { hex: normalEnabled ? settings.font.colors.stroke.enabled.hex : settings.font.colors.stroke.disabled }
                            });

                            util.color.fillAndStroke({
                                node: menu.options.mode.simon.shape,
                                fill: { hex: normalEnabled ? settings.font.colors.fill.disabled : settings.font.colors.fill.enabled.hex },
                                stroke: { hex: normalEnabled ? settings.font.colors.stroke.disabled : settings.font.colors.stroke.enabled.hex }
                            })
                        }
                    },

                    numberControllerGroup: function( number, numberX, controllerX, fill, stroke ){
                        var shapes = {
                            group: new Kinetic.Group({ listening: false }),

                            number: new Kinetic.Text({
                                x: numberX,
                                y: util.calculate.absolute.y( _s.options.y ),
                                text: number.toString(),
                                fontSize: util.calculate.absolute.size( _s.options.font.size ),
                                fontFamily: settings.font.face,
                                fill: fill,
                                stroke: stroke,
                                strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                            }),

                            controller: new Kinetic.Text({
                                x: controllerX,
                                y: util.calculate.absolute.y( 1.295 ),
                                text: '\uf11b',
                                fontSize: util.calculate.absolute.size( _s.options.controller.size ),
                                fontFamily: 'FontAwesome',
                                fill: fill,
                                stroke: stroke,
                                strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                            })
                        };

                        shapes.group.add( shapes.number );
                        shapes.group.add( shapes.controller );

                        return shapes.group
                    },

                    mouseOverCheck: function( frame ){
                        var brightnessVariance = util.calculate.brightnessVariance( frame),
                            hF = settings.font.colors.fill.enabled.h,
                            sF = settings.font.colors.fill.enabled.s,
                            lF = settings.font.colors.fill.enabled.l - brightnessVariance,
                            hS = settings.font.colors.stroke.enabled.h,
                            sS = settings.font.colors.stroke.enabled.s,
                            lS = settings.font.colors.stroke.enabled.l - brightnessVariance;

                        if ( menu.options.singlePlayer.mouseOver() )
                            menu.options.singlePlayer.shape.getChildren().each( function( node ){
                                util.color.fillAndStroke({
                                    node: node,
                                    fill: { h: hF, s: sF, l: lF },
                                    stroke: { h: hS, s: sS, l: lS }
                                })
                            });

                        else if ( menu.options.gear.mouseOver() )
                            util.color.fillAndStroke({
                                node: menu.options.gear.shape,
                                fill: { h: hF, s: sF, l: lF },
                                stroke: { h: hS, s: sS, l: lS }
                            });

                        else if ( menu.options.highScores.mouseOver() )
                            util.color.fillAndStroke({
                                node: menu.options.highScores.shape,
                                fill: { h: hF, s: sF, l: lF },
                                stroke: { h: hS, s: sS, l: lS }
                            })
                    }
                },

                settings: {
                    group: new Kinetic.Group({ opacity: 0 }),

                    volume: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( menu.settings.volume.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( 32 ),
                            y: util.calculate.absolute.y( 5.9 ),
                            text: '\uf028',
                            fontSize: util.calculate.absolute.size( _s.settings.font.size ),
                            fontFamily: 'FontAwesome',
                            fill: _s.settings.font.color.enabled.hex,
                            listening: false
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 32 ),
                            y: util.calculate.absolute.y( 4.67 ),
                            width: util.calculate.absolute.x( 4.31 ),
                            height: util.calculate.absolute.y( 2.845 ),
                            opacity: 0
                        })
                    },

                    fullScreen: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( menu.settings.fullScreen.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( 3.31 ),
                            y: util.calculate.absolute.y( 5.36 ),
                            text: '\uf0b2',
                            fontSize: util.calculate.absolute.size( _s.settings.font.size ) * 0.922,
                            fontFamily: 'FontAwesome',
                            fill: _s.settings.font.color.enabled.hex,
                            listening: false
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 3.31 ),
                            y: util.calculate.absolute.y( 4.67 ),
                            width: util.calculate.absolute.x( 5.07 ),
                            height: util.calculate.absolute.y( 2.85 ),
                            opacity: 0
                        })
                    },

                    help: {
                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( 1.86 ),
                            y: util.calculate.absolute.y( 5.35 ),
                            text: '\uf059',
                            fontSize: util.calculate.absolute.size( _s.settings.font.size ) * 0.922,
                            fontFamily: 'FontAwesome',
                            fill: _s.settings.font.color.disabled,
                            listening: false
                        })
                    },

                    credits: {
                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( 1.32 ),
                            y: util.calculate.absolute.y( 6.1 ),
                            text: '\u00A9',
                            fontSize: util.calculate.absolute.size( _s.settings.font.size ) * 1.089,
                            fontFamily: settings.font.face,
                            fill: _s.settings.font.color.disabled,
                            listening: false
                        })
                    },

                    mouseOverCheck: function( frame ){
                        var brightnessVariance = util.calculate.brightnessVariance( frame ) * 2,
                            h = _s.settings.font.color.enabled.h,
                            s = _s.settings.font.color.enabled.s,
                            l = _s.settings.font.color.enabled.l + brightnessVariance;

                        if ( menu.settings.volume.mouseOver() )
                            menu.settings.volume.shape.fill( 'hsl('+ h +', '+ s +'%, '+ l +'%)' );

                        else if ( menu.settings.fullScreen.mouseOver() )
                            menu.settings.fullScreen.shape.fill( 'hsl('+ h +', '+ s +'%, '+ l +'%)' )
                    }
                },

                animation: new Kinetic.Animation( function( frame ){
                    var state = menu.state.get( 'current' );

                    // Portada simplificada: sin animación del título.
                    menu.background.cycleCheck( frame );

                    if ( state === 'starting' )
                        util.animation.fade( menu.layer, frame, 'in', function() {
                            menu.state.set( 'current', 'running' )
                        });

                    else if ( menu.isNotStoppingOrStopped() ){
                        menu.options.mouseOverCheck( frame );

                        if ( state === 'settings' ){
                            menu.settings.mouseOverCheck( frame );

                            if ( menu.settings.group.opacity() < 1 )
                                util.animation.fade( menu.settings.group, frame, 'in' )
                        }

                        else if ( menu.settings.group.opacity() > 0 )
                            util.animation.fade( menu.settings.group, frame, 'out' )
                    }

                    else if ( state === 'stopping' )
                        util.module.stop( menu, frame )
                }),

                init: function() {
                    ( function _numberControllerGroups() {
                        menu.options.singlePlayer.shape = menu.options.numberControllerGroup(
                            1,
                            util.calculate.absolute.x( 50 ),
                            util.calculate.absolute.x( 18 ),
                            settings.font.colors.fill.enabled.hex,
                            settings.font.colors.stroke.enabled.hex
                        );

                        menu.options.multiPlayer = {
                            shape: menu.options.numberControllerGroup(
                                2,
                                util.calculate.absolute.x( 5 ),
                                util.calculate.absolute.x( 3.99 ),
                                settings.font.colors.fill.disabled,
                                settings.font.colors.stroke.disabled
                            ),
                            hitBox: new Kinetic.Rect({
                                x: util.calculate.absolute.x( 3.99 ),
                                y: util.calculate.absolute.y( 1.214 ),
                                width: util.calculate.absolute.size( 2.125 ),
                                height: util.calculate.absolute.size( 10.3 ),
                                opacity: 0
                            }),
                            mouseOver: function() {
                                return util.mouse.isOverNode( menu.options.multiPlayer.hitBox )
                            }
                        }
                    })();

                    ( function _settingsGroup() {
                        menu.settings.group.add( menu.settings.volume.shape );
                        menu.settings.group.add( menu.settings.volume.hitBox );

                        menu.settings.group.add( menu.settings.fullScreen.shape );
                        menu.settings.group.add( menu.settings.fullScreen.hitBox );

                        menu.settings.group.add( menu.settings.help.shape );

                        menu.settings.group.add( menu.settings.credits.shape )
                    })();

                    ( function _layer() {
                        menu.layer.add( menu.background.group );

                        menu.layer.add( menu.title.text );

                        menu.layer.add( menu.options.singlePlayer.shape );
                        menu.layer.add( menu.options.singlePlayer.hitBox );

                        menu.layer.add( menu.options.multiPlayer.shape );
                        menu.layer.add( menu.options.multiPlayer.hitBox );

                        menu.layer.add( menu.options.gear.shape );
                        menu.layer.add( menu.options.gear.hitBox );

                        menu.layer.add( menu.options.highScores.shape );
                        menu.layer.add( menu.options.highScores.hitBox );

                        menu.layer.add( menu.options.mode.normal.shape );
                        menu.layer.add( menu.options.mode.normal.hitBox );

                        menu.layer.add( menu.options.mode.simon.shape );
                        menu.layer.add( menu.options.mode.simon.hitBox );

                        menu.layer.add( menu.settings.group );

                        menu.animation.setLayers( menu.layer )
                    })();

                    ( function _cache() {
                        menu.options.singlePlayer.hitBox.cache();
                        menu.options.multiPlayer.hitBox.cache();
                        menu.options.gear.hitBox.cache();
                        menu.options.highScores.hitBox.cache();
                        menu.options.mode.normal.hitBox.cache();
                        menu.options.mode.simon.hitBox.cache();
                        menu.settings.volume.hitBox.cache();
                        menu.settings.fullScreen.hitBox.cache()
                    })()
                },

                cleanUp: function() {
                    menu.settings.group.opacity( 0 );

                    menu.options.singlePlayer.hitBox.fire( 'mouseout' );
                    menu.options.highScores.hitBox.fire( 'mouseout' )
                }
            };

        menu.init();

        return menu
    }
);
