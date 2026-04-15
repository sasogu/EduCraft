BasicGame.Boot = function (game) {
};

BasicGame.Boot.prototype = {

    preload: function () {
        this.game.load.image('beat', 'images/beat.png');
    },

    create: function () {
        this.game.stage.backgroundColor = 0x666699;
        this.input.maxPointers = 1;
        if (this.game && this.game.input && this.game.input.touch) {
            this.game.input.touch.preventDefault = true;
        }
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;

        this.state.start('preload');
    }
};
