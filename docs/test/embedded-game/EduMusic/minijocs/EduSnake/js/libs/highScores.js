define([ 'underscore', 'Kinetic', 'kineticEditableText', 'settings', 'util', 'database', 'viewport', 'background' ],
    function( _, Kinetic, kineticEditableText, settings, util, database, viewport, background ){
        kineticEditableText.init( Kinetic );

        var _s = settings.highScores,
            highScores = {
                add: {
                    name: 'highScores.add',

                    isNotStoppingOrStopped: util.module.isNotStoppingOrStopped,

                    state: new Backbone.Model({ current: 'stopped' }),

                    layer: new Kinetic.Layer,

                    background: background.highScores.add,

                    playerName: {
                        label: new Kinetic.Text({
                            x: util.calculate.absolute.x( _s.name.label.x ),
                            y: util.calculate.absolute.y( _s.name.y ),
                            text: 'Name:',
                            fontSize: util.calculate.absolute.size( _s.name.size ),
                            fontFamily: 'Fira Mono',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        field: new Kinetic.EditableText({
                            y: util.calculate.absolute.y( _s.name.y ),
                            fontSize: util.calculate.absolute.size( _s.name.size ),
                            fontFamily: 'Fira Mono',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        move: function() {
                            var playerName = this;

                            _.defer( function() {
                                var nameLength = playerName.field.text().length;

                                playerName.label.x(
                                    util.calculate.absolute.x( _s.name.label.x ) -
                                        ( nameLength * util.calculate.absolute.x( 40.7 ))
                                );

                                playerName.field.tempText[ 0 ].x(
                                    highScores.add.playerName.label.x() +
                                        util.calculate.absolute.x( 3.8 )
                                )
                            })
                        }
                    },

                    keyboard: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( highScores.add.keyboard.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x(_s.add.keyboard.x ),
                            y: util.calculate.absolute.y( _s.add.keyboard.y ),
                            text: '\uf11c',
                            fontSize: util.calculate.absolute.size( _s.add.keyboard.size ),
                            fontFamily: 'FontAwesome',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 3.64 ),
                            y: util.calculate.absolute.y( 1.222 ),
                            width: util.calculate.absolute.size( 7.7 ),
                            height: util.calculate.absolute.size( 12.6 ),
                            opacity: 0
                        })
                    },

                    submit: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( highScores.add.submit.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( _s.add.submit.x ),
                            y: util.calculate.absolute.y( _s.add.submit.y ),
                            text: '\uf058',
                            fontSize: util.calculate.absolute.size( _s.add.submit.size ),
                            fontFamily: 'FontAwesome',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 2.177 ),
                            y: util.calculate.absolute.y( 1.22 ),
                            width: util.calculate.absolute.size( 12.6 ),
                            height: util.calculate.absolute.size( 12.6 ),
                            opacity: 0
                        })
                    },

                    back: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( highScores.add.back.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( _s.add.back.x ),
                            y: util.calculate.absolute.y( _s.add.back.y ),
                            text: '\uf057',
                            fontSize: util.calculate.absolute.size( _s.add.back.size ),
                            fontFamily: 'FontAwesome',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 1.68 ),
                            y: util.calculate.absolute.y( 1.22 ),
                            width: util.calculate.absolute.size( 12.6 ),
                            height: util.calculate.absolute.size( 12.6 ),
                            opacity: 0
                        })
                    },

                    animation: new Kinetic.Animation( function( frame ){
                        if ( highScores.add.isNotStoppingOrStopped() ){
                            highScores.add.mouseOverCheck( frame );
                            highScores.add.background.cycleCheck( frame, highScores.add.score )

                        } else if ( highScores.add.state.get( 'current' ) === 'stopping' )
                            util.module.stop( highScores.add, frame )
                    }),

                    mouseOverCheck: function( frame ){
                        var brightnessVariance = util.calculate.brightnessVariance( frame ),
                            hF = settings.font.colors.fill.enabled.h,
                            sF = settings.font.colors.fill.enabled.s,
                            lF = settings.font.colors.fill.enabled.l - brightnessVariance,
                            hS = settings.font.colors.stroke.enabled.h,
                            sS = settings.font.colors.stroke.enabled.s,
                            lS = settings.font.colors.stroke.enabled.l - brightnessVariance;

                        if ( highScores.add.keyboard.mouseOver() )
                            util.color.fillAndStroke({
                                node: highScores.add.keyboard.shape,
                                fill: { h: hF, s: sF, l: lF },
                                stroke: { h: hS, s: sS, l: lS }
                            });

                        else if ( highScores.add.submit.mouseOver() )
                            util.color.fillAndStroke({
                                node: highScores.add.submit.shape,
                                fill: { h: hF, s: sF, l: lF },
                                stroke: { h: hS, s: sS, l: lS }
                            });

                        else if ( highScores.add.back.mouseOver() )
                            util.color.fillAndStroke({
                                node: highScores.add.back.shape,
                                fill: { h: hF, s: sF, l: lF },
                                stroke: { h: hS, s: sS, l: lS }
                            })
                    },

                    start: function( score, timeCentis ){
                        highScores.add.score = score;
                        highScores.add.timeCentis = typeof timeCentis === 'number' ? timeCentis : 0;

                        highScores.add.background.count( score );

                        util.module.start( highScores.add );

                        highScores.add.playerName.field.focus();

                        highScores.add.playerName.move()
                    },

                    init: function() {
                        highScores.add.layer.add( highScores.add.background.group );

                        highScores.add.layer.add( highScores.add.playerName.label );
                        highScores.add.layer.add( highScores.add.playerName.field );

                        highScores.add.layer.add( highScores.add.keyboard.shape );
                        highScores.add.layer.add( highScores.add.keyboard.hitBox );

                        highScores.add.layer.add( highScores.add.submit.shape );
                        highScores.add.layer.add( highScores.add.submit.hitBox );

                        highScores.add.layer.add( highScores.add.back.shape );
                        highScores.add.layer.add( highScores.add.back.hitBox );

                        highScores.add.animation.setLayers( highScores.add.layer )
                    },

                    cleanUp: function() {
                        highScores.add.score = 0;
                        highScores.add.timeCentis = 0;

                        highScores.add.playerName.field.clear();
                        highScores.add.playerName.field.unfocus();

                        highScores.add.submit.hitBox.fire( 'mouseout' );
                        highScores.add.back.hitBox.fire( 'mouseout' )
                    }
                },

                view: {
                    name: 'highScores.view',

                    isNotStoppingOrStopped: util.module.isNotStoppingOrStopped,

                    state: new Backbone.Model({ current: 'stopped' }),

                    layer: new Kinetic.Layer,

                    background: background.highScores.view,

                    playerName: {
                        headerFontSize: util.calculate.absolute.size( 35 ),
                        label: new Kinetic.Text({
                            x: util.calculate.absolute.x( _s.name.label.x ),
                            y: util.calculate.absolute.y( _s.name.y ),
                            text: 'NAME',
                            fontSize: util.calculate.absolute.size( 35 ),
                            fontFamily: 'Fira Mono',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        scoreHolder: new Kinetic.Text({
                            x: util.calculate.absolute.x( _s.name.scoreHolder.x ),
                            y: util.calculate.absolute.y( _s.name.y ),
                            text: 'SCORE',
                            fontSize: util.calculate.absolute.size( 35 ),
                            fontFamily: 'Fira Mono',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        rankLabel: new Kinetic.Text({
                            x: util.calculate.absolute.x( 6.8 ),
                            y: util.calculate.absolute.y( _s.name.y ),
                            text: 'RANK',
                            fontSize: util.calculate.absolute.size( 35 ),
                            fontFamily: 'Fira Mono',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        timeLabel: new Kinetic.Text({
                            x: util.calculate.absolute.x( 1.6 ),
                            y: util.calculate.absolute.y( _s.name.y ),
                            text: 'TIME',
                            fontSize: util.calculate.absolute.size( 35 ),
                            fontFamily: 'Fira Mono',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        move: function() {
                            this.rankLabel.x( util.calculate.absolute.x( 7.4 ) );
                            this.label.x( util.calculate.absolute.x( 4.6 ) );
                            this.scoreHolder.x( util.calculate.absolute.x( 2.9 ) );
                            this.timeLabel.x( util.calculate.absolute.x( 1.6 ) );
                        }
                    },

                    list: {
                        page: 0,
                        pageSize: 10,
                        rows: [],
                        startY: util.calculate.absolute.y( 6.5 ),
                        rowHeight: util.calculate.absolute.y( 16 ),
                        fontSize: util.calculate.absolute.size( 26 ),
                        rankX: util.calculate.absolute.x( 7.4 ),
                        nameX: util.calculate.absolute.x( 4.6 ),
                        scoreX: util.calculate.absolute.x( 2.9 ),
                        timeX: util.calculate.absolute.x( 1.6 )
                    },

                    previous: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( highScores.view.previous.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( _s.view.previous.x ),
                            y: util.calculate.absolute.y( _s.view.previous.y ),
                            text: '\uf060',
                            fontSize: util.calculate.absolute.size( _s.view.previous.size ),
                            fontFamily: 'FontAwesome',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 3.02 ),
                            y: util.calculate.absolute.y( 1.222 ),
                            width: util.calculate.absolute.size( 13.2 ),
                            height: util.calculate.absolute.size( 12.5 ),
                            opacity: 0
                        })
                    },

                    back: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( highScores.view.back.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( _s.view.back.x ),
                            y: util.calculate.absolute.y( _s.view.back.y ),
                            text: '\uf057',
                            fontSize: util.calculate.absolute.size( _s.view.back.size ),
                            fontFamily: 'FontAwesome',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 2.177 ),
                            y: util.calculate.absolute.y( 1.22 ),
                            width: util.calculate.absolute.size( 12.6 ),
                            height: util.calculate.absolute.size( 12.6 ),
                            opacity: 0
                        })
                    },

                    next: {
                        mouseOver: function() {
                            return util.mouse.isOverNode( highScores.view.next.hitBox )
                        },

                        shape: new Kinetic.Text({
                            x: util.calculate.absolute.x( _s.view.next.x ),
                            y: util.calculate.absolute.y( _s.view.next.y ),
                            text: '\uf061',
                            fontSize: util.calculate.absolute.size( _s.view.next.size ),
                            fontFamily: 'FontAwesome',
                            fill: settings.font.colors.fill.enabled.hex,
                            stroke: settings.font.colors.stroke.enabled.hex,
                            strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                        }),

                        hitBox: new Kinetic.Rect({
                            x: util.calculate.absolute.x( 1.681 ),
                            y: util.calculate.absolute.y( 1.222 ),
                            width: util.calculate.absolute.size( 13.2 ),
                            height: util.calculate.absolute.size( 12.5 ),
                            opacity: 0
                        })
                    },

                    animation: new Kinetic.Animation( function( frame ){
                        if ( highScores.view.isNotStoppingOrStopped() ){
                            highScores.view.mouseOverCheck( frame );
                            highScores.view.background.cycleCheck( frame, highScores.view._getTopScore() )
                        }

                        else if ( highScores.view.state.get( 'current' ) === 'stopping' )
                            util.module.stop( highScores.view, frame )
                    }),

                    mouseOverCheck: function( frame ){
                        var brightnessVariance = util.calculate.brightnessVariance( frame ),
                            hF = settings.font.colors.fill.enabled.h,
                            sF = settings.font.colors.fill.enabled.s,
                            lF = settings.font.colors.fill.enabled.l - brightnessVariance,
                            hS = settings.font.colors.stroke.enabled.h,
                            sS = settings.font.colors.stroke.enabled.s,
                            lS = settings.font.colors.stroke.enabled.l - brightnessVariance;

                        if ( highScores.view.previous.mouseOver() )
                            util.color.fillAndStroke({
                                node: highScores.view.previous.shape,
                                fill: { h: hF, s: sF, l: lF },
                                stroke: { h: hS, s: sS, l: lS }
                            });

                        else if ( highScores.view.next.mouseOver() )
                            util.color.fillAndStroke({
                                node: highScores.view.next.shape,
                                fill: { h: hF, s: sF, l: lF },
                                stroke: { h: hS, s: sS, l: lS }
                            });

                        else if ( highScores.view.back.mouseOver() )
                            util.color.fillAndStroke({
                                node: highScores.view.back.shape,
                                fill: { h: hF, s: sF, l: lF },
                                stroke: { h: hS, s: sS, l: lS }
                            })
                    },

                    _getMode: function(){
                        var m = String( window.selectedGameMode || 'classic' );
                        return m.indexOf( 'simon' ) !== -1 ? 'simon' : 'classic';
                    },

                    _getFilteredScores: function(){
                        var mode = highScores.view._getMode();
                        return database.scores.filter(function(model){
                            var mm = String( model.get( 'mode' ) || 'classic' );
                            var normalized = mm.indexOf( 'simon' ) !== -1 ? 'simon' : 'classic';
                            return normalized === mode;
                        });
                    },

                    _getTopScore: function(){
                        var list = highScores.view._getFilteredScores();
                        return list.length > 0 ? ( list[ 0 ].get( 'score' ) || 0 ) : 0;
                    },

                    update: function( options ){
                        var o = options || {};
                        var list = highScores.view.list;
                        var filtered = highScores.view._getFilteredScores();
                        var total = filtered.length;
                        var totalPages = Math.max( 1, Math.ceil( total / list.pageSize ));

                        if ( o.reset )
                            list.page = 0;
                        else if ( o.previous )
                            list.page = Math.max( 0, list.page - 1 );
                        else if ( o.next )
                            list.page = Math.min( totalPages - 1, list.page + 1 );

                        if ( list.page > totalPages - 1 )
                            list.page = totalPages - 1;

                        var startIndex = list.page * list.pageSize;

                        highScores.view.background.count( highScores.view._getTopScore() );

                        for ( var i = 0; i < list.pageSize; i++ ){
                            var model = filtered[ startIndex + i ];
                            var row = list.rows[ i ];

                            if ( model ){
                                var rank = startIndex + i + 1;
                                var timeCentis = model.get( 'timeCentis' ) || 0;
                                var timeSeconds = ( timeCentis / 100 ).toFixed( 2 );
                                row.rank.text( ( rank < 10 ? '0' : '' ) + rank + '.' );
                                row.name.text( model.get( 'name' ) );
                                row.score.text( String( model.get( 'score' ) || 0 ) );
                                row.time.text( timeSeconds + 's' );
                            } else {
                                row.rank.text( '' );
                                row.name.text( '' );
                                row.score.text( '' );
                                row.time.text( '' );
                            }
                        }

                        var layer = highScores.view.layer,
                            previous = highScores.view.previous,
                            next = highScores.view.next;

                        if ( list.page === 0 ){
                            previous.shape.remove();
                            previous.hitBox.remove()
                        } else if ( !previous.shape.getParent() ){
                            layer.add( previous.shape );
                            layer.add( previous.hitBox )
                        }

                        if ( list.page >= totalPages - 1 ){
                            next.shape.remove();
                            next.hitBox.remove()
                        } else if ( !next.shape.getParent() ){
                            layer.add( next.shape );
                            layer.add( next.hitBox )
                        }
                    },

                    init: function() {
                        var list = highScores.view.list;
                        highScores.view.layer.add( highScores.view.background.group );

                        highScores.view.layer.add( highScores.view.playerName.label );
                        highScores.view.layer.add( highScores.view.playerName.scoreHolder );
                        highScores.view.layer.add( highScores.view.playerName.rankLabel );
                        highScores.view.layer.add( highScores.view.playerName.timeLabel );
                        highScores.view.playerName.move();

                        for ( var i = 0; i < list.pageSize; i++ ){
                            var y = list.startY + ( list.rowHeight * i );
                            var rankText = new Kinetic.Text({
                                x: list.rankX,
                                y: y,
                                text: '',
                                fontSize: list.fontSize,
                                fontFamily: 'Fira Mono',
                                fill: settings.font.colors.fill.enabled.hex,
                                stroke: settings.font.colors.stroke.enabled.hex,
                                strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                            });

                            var nameText = new Kinetic.Text({
                                x: list.nameX,
                                y: y,
                                text: '',
                                fontSize: list.fontSize,
                                fontFamily: 'Fira Mono',
                                fill: settings.font.colors.fill.enabled.hex,
                                stroke: settings.font.colors.stroke.enabled.hex,
                                strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                            });

                            var scoreText = new Kinetic.Text({
                                x: list.scoreX,
                                y: y,
                                text: '',
                                fontSize: list.fontSize,
                                fontFamily: 'Fira Mono',
                                fill: settings.font.colors.fill.enabled.hex,
                                stroke: settings.font.colors.stroke.enabled.hex,
                                strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                            });

                            var timeText = new Kinetic.Text({
                                x: list.timeX,
                                y: y,
                                text: '',
                                fontSize: list.fontSize,
                                fontFamily: 'Fira Mono',
                                fill: settings.font.colors.fill.enabled.hex,
                                stroke: settings.font.colors.stroke.enabled.hex,
                                strokeWidth: util.calculate.absolute.size( settings.font.stroke.width )
                            });

                            list.rows.push({ rank: rankText, name: nameText, score: scoreText, time: timeText });

                            highScores.view.layer.add( rankText );
                            highScores.view.layer.add( nameText );
                            highScores.view.layer.add( scoreText );
                            highScores.view.layer.add( timeText );
                        }

                        highScores.view.layer.add( highScores.view.previous.shape );
                        highScores.view.layer.add( highScores.view.previous.hitBox );

                        highScores.view.layer.add( highScores.view.next.shape );
                        highScores.view.layer.add( highScores.view.next.hitBox );

                        highScores.view.layer.add( highScores.view.back.shape );
                        highScores.view.layer.add( highScores.view.back.hitBox );

                        highScores.view.animation.setLayers( highScores.view.layer )
                    },

                    cleanUp: function() {
                        highScores.view.back.hitBox.fire( 'mouseout' )
                    }
                },

                init: function() {
                    highScores.add.init();

                    highScores.view.init()
                }
            };

        highScores.init();

        return highScores
    }
);
