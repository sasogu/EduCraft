define([ 'backbone', 'settings' ],
    function( Backbone, settings ){
        var database = {
            localKey: 'edusnake:scores',

            Score: Backbone.Model.extend({
                    defaults: function() {
                        return {
                            time: new Date().getTime(),
                            timeCentis: 0,
                            mode: 'classic'
                        }
                    },

                    initialize: function() {
                        if ( !this.get( 'name' ))
                            throw new Error( 'A name must be provided when ' +
                                             'initializing a database.Score' );

                        // 0 es una puntuación válida; solo fallar si no existe.
                        if ( this.get( 'score' ) === null || this.get( 'score' ) === undefined )
                            throw new Error( 'A score must be provided when ' +
                                             'initializing a database.Score' );
                    }
                }),

                _loadLocalScores: function(){
                    var raw;
                    try {
                        raw = window.localStorage && window.localStorage.getItem( database.localKey );
                    } catch ( e ) {
                        raw = null;
                    }

                    if ( !raw ) return [];

                    try {
                        var list = JSON.parse( raw );
                        return Array.isArray( list ) ? list : [];
                    } catch ( e2 ) {
                        return [];
                    }
                },

                _saveLocalScores: function(){
                    var list = database.scores.map(function(model){
                        return {
                            name: model.get( 'name' ),
                            score: model.get( 'score' ),
                            time: model.get( 'time' ),
                            timeCentis: model.get( 'timeCentis' ) || 0,
                            mode: model.get( 'mode' ) || 'classic'
                        };
                    });

                    try {
                        if ( window.localStorage )
                            window.localStorage.setItem( database.localKey, JSON.stringify( list ) );
                    } catch ( e ) {}
                },

                _ensureFallbackScore: function(){
                    if ( database.scores.length > 0 ) return;
                    database.scores.add( new database.Score({
                        name: 'AAA',
                        score: 0,
                        timeCentis: 0,
                        mode: 'classic'
                    }) );
                },

                _sortAndTrim: function(){
                    database.scores.sort();
                    var limit = settings.database.scores.limit || 100;
                    while ( database.scores.length > limit )
                        database.scores.pop();
                },

                _normalizeMode: function( mode ){
                    // El selector visible en el menú es Normal/Simón.
                    // Multijugador es una variante; para ranking lo agrupamos por modalidad.
                    var m = String( mode || 'classic' );
                    return m.indexOf( 'simon' ) !== -1 ? 'simon' : 'classic';
                },

                submitScore: function( highScores ){
                    var name = highScores.add.playerName.field.text() || 'AAA';
                    var score = highScores.add.score || 0;
                    var timeCentis = highScores.add.timeCentis || 0;
                    var mode = database._normalizeMode( window.selectedGameMode || 'classic' );

                    database.scores.add( new database.Score({
                        name: name,
                        score: score,
                        timeCentis: timeCentis,
                        mode: mode
                    }) );
                    database._sortAndTrim();
                    database._saveLocalScores();

                    // Sincronizar con el ranking global (Firebase) usando ScoreService.
                    // IMPORTANT: no usamos el formulario de ScoreService porque EduSnake ya tiene
                    // un input propio (Kinetic EditableText) y compiten por el foco.
                    try {
                        if ( window.ScoreService && typeof window.ScoreService.getBoardsByGame === 'function' ){
                            var rankKey = 'edusnake-' + mode;
                            var boards = window.ScoreService.getBoardsByGame( 'edusnake' ) || [];
                            if ( boards.length ){
                                for ( var i = 0; i < boards.length; i++ ){
                                    boards[i].options.rankKey = rankKey;
                                    if ( boards[i].root && boards[i].root.setAttribute )
                                        boards[i].root.setAttribute( 'data-rank-key', rankKey );
                                }

                                var eligible = false;
                                for ( var j = 0; j < boards.length; j++ ){
                                    if ( typeof boards[j].isEligibleScore === 'function' && boards[j].isEligibleScore( score ) ){
                                        eligible = true;
                                        break;
                                    }
                                }

                                if ( eligible && typeof window.ScoreService.addEntry === 'function' ){
                                    window.ScoreService.addEntry( boards[0], name, score )
                                        .then( function(){
                                            for ( var r = 0; r < boards.length; r++ )
                                                if ( typeof boards[r].refresh === 'function' ) boards[r].refresh();
                                        })
                                        .catch( function(){} );
                                }
                            }
                        }
                    } catch ( e ) {}

                    highScores.add.state.set( 'current', 'stopping' );
                },

                waitUntilConnected: function wait( cb ){
                    // Siempre simula conexión inmediata
                    cb();
                },

                init: function() {
                    // Local por defecto, hasta configurar online.
                    database.scores = new Backbone.Collection([], {
                        model: database.Score,
                        comparator: function( a, b ){
                            var scoreA = a.get( 'score' ) || 0;
                            var scoreB = b.get( 'score' ) || 0;
                            if ( scoreA !== scoreB ) return scoreA > scoreB ? -1 : 1;

                            var timeA = a.get( 'timeCentis' );
                            var timeB = b.get( 'timeCentis' );
                            if ( typeof timeA !== 'number' ) timeA = 99999999;
                            if ( typeof timeB !== 'number' ) timeB = 99999999;
                            if ( timeA !== timeB ) return timeA < timeB ? -1 : 1;

                            var createdA = a.get( 'time' ) || 0;
                            var createdB = b.get( 'time' ) || 0;
                            if ( createdA === createdB ) return 0;
                            return createdA < createdB ? -1 : 1;
                        }
                    });

                    var list = database._loadLocalScores();
                    list.forEach(function(item){
                        try {
                            database.scores.add( new database.Score({
                                name: item.name,
                                score: item.score,
                                time: item.time,
                                timeCentis: item.timeCentis || 0,
                                mode: item.mode || 'classic'
                            }));
                        } catch ( e ) {}
                    });

                    database._ensureFallbackScore();
                    database._sortAndTrim();
                }
            };

        database.init();

        return database
    }
);
