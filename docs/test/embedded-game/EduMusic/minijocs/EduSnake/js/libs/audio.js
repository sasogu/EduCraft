define([ 'buzz', 'settings' ], function( buzz, settings ){
    // Usar 24 notas de piano numeradas key01.ogg a key24.ogg
    var noteFiles = [];
    for (var i = 1; i <= 24; i++) {
        var num = i < 10 ? '0' + i : '' + i;
        noteFiles.push('audio/piano/key' + num + '.ogg');
    }
    var notes = noteFiles.map(function(path) {
        return new buzz.sound(path);
    });

    var audio = {
        song: {
            isLoaded: false,
            mp3: new buzz.sound( settings.song.path )
                .bind( 'loadeddata', function() {
                    audio.song.isLoaded = true
                })
        },
        notes: notes,
        playNextNote: (function() {
            var idx = 0;
            return function() {
                notes[idx % notes.length].play();
                idx++;
            };
        })()
    };

    return audio;
});