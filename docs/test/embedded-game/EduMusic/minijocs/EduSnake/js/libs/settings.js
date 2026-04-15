define([], function() {
    var settings = {
            debug: false,

            font: {
                face: 'New Rocker',
                stroke: { width: 300 },
                colors: {
                    fill: {
                        enabled: {
                            hex: '#f5f5fa', // Mucho más claro
                            h: 240,
                            s: 20,
                            l: 95
                        },
                        disabled: '#e0e0e0'
                    },
                    stroke: {
                        enabled: {
                            hex: '#b0b0d6', // Claro y suave
                            h: 240,
                            s: 20,
                            l: 80
                        },
                        disabled: '#cccccc'
                    }
                }
            },

            animation: {
                transition: { speed: 1000 },

                period: function() { return ( 60 / settings.song.bpm ) * 1000 }
            },

            mouseOver: { brightnessVariance: 8 },

            stage: { container: { name: 'game' }},

            song: {
                bpm: 140,
                path: 'audio/song.mp3'
            },

            background: {
                countDown: { coords: { x: 14, y: 6 }},
                tile: { quantity: { x: 32, y: 18 } },
                colors: {
                    base: [
                        '#e3e8f7', '#dbeafe', '#f1f5fa', '#f7fafc', '#e0f7fa', '#f0f4c3',
                        '#fffde7', '#fce4ec', '#e1f5fe', '#f3e5f5', '#f8bbd0', '#ffe0b2',
                        '#fff9c4', '#c8e6c9', '#dcedc8', '#f0f4c3', '#f5f5fa', '#e0e0e0',
                        '#f5f5f5', '#e3f2fd', '#e8f5e9', '#f9fbe7', '#f3e5f5', '#fce4ec',
                        '#e1f5fe', '#f3e5f5', '#f8bbd0', '#ffe0b2', '#fff9c4', '#c8e6c9',
                        '#dcedc8', '#f0f4c3'
                    ],
                    number: [
                        '#90caf9', '#a5d6a7', '#ffcc80', '#f48fb1', '#ce93d8', '#fff176',
                        '#b0bec5', '#b2dfdb', '#ffe082', '#ffab91', '#b39ddb', '#c5e1a5',
                        '#ffecb3', '#b3e5fc', '#d1c4e9', '#c8e6c9', '#f8bbd0', '#ffccbc',
                        '#d7ccc8', '#cfd8dc', '#e6ee9c', '#f0f4c3', '#f5f5fa', '#e0e0e0',
                        '#f5f5f5', '#e3f2fd', '#e8f5e9', '#f9fbe7', '#f3e5f5', '#fce4ec',
                        '#e1f5fe', '#f3e5f5'
                    ]
                }
            },

            loading: {
                background: { color: '#4C5F49' },

                wheel: {
                    color: '#372a50',
                    radius: 0
                },

                text: {
                    color: '#5b4686',
                    family: 'Georgia'
                }
            },

            menu: {
                title: {
                    color: '#372a50',

                    bounciness: 7,

                    stroke: { width: 35 }
                },

                options: {
                    y: 1.24,

                    controller: { size: 9 },

                    settings: { font: { size: 4 }},

                    font: { size: 11 }
                },

                settings: {
                    font: {
                        size: 4,

                        color: {
                            enabled: {
                                hex: '#5d4686',
                                h: 261,
                                s: 31,
                                l: 40
                            },

                            disabled: '#171221'
                        }
                    }
                }
            },

            game: {
                snake: {
                    colors: [ '#90caf9', '#a5d6a7', '#ffcc80' ], // Colores pastel claros

                    initial: {
                        coords: { x: 16, y: 10 },
                        direction: 'up'
                    },

                    amountOfInnerRectangles: 2,

                    speedIncrement: 4
                },

                heart: {
                    colors: [ '#680d0e', '#8d1113', '#ac1518' ],

                    amountOfInnerHearts: 2,

                    maximum: 10,

                    spawnProbability: 0.3
                },

                paused: {
                    x: 18.5,

                    y: 4,

                    size: 3.55,

                    font: { color: '#12101b' },

                    shadow: {
                        color: '#7878a7',
                        blur: 15
                    }
                }
            },

            highScores: {
                name: {
                    y: 19.5,
                    size: 13,
                    label: { x: 2.55 },
                    scoreHolder: { x: 1 }
                },

                add: {
                    keyboard: {
                        x: 3.63,
                        y: 1.285,
                        size: 8.4
                    },

                    submit: {
                        x: 2.17,
                        y: 1.233,
                        size: 11.2
                    },

                    back: {
                        x: 1.677,
                        y: 1.233,
                        size: 11.2
                    }
                },

                view: {
                    previous: {
                        x: 3.03,
                        y: 1.239,
                        size: 11.33
                    },

                    next: {
                        x: 1.677,
                        y: 1.239,
                        size: 11.33
                    },

                    back: {
                        x: 2.17,
                        y: 1.233,
                        size: 11.2
                    }
                }
            },

            database: {
                scores: {
                    address: 'https://ceros-snake.firebaseio.com/scores',

                    limit: 100
                }
            }
        };

    return settings
});