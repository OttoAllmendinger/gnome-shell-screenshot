const Clutter = imports.gi.Clutter;

Clutter.init(null);

let stage = new Clutter.Stage();

let texture = new Clutter.Texture({ filename: 'test.jpg',
                                    reactive: true });

texture.connect('button-press-event',
                function(o, event) {
                    log('Clicked!');
                    return true;
                });

let color = new Clutter.Color();

stage.color = color;

stage.add_actor(texture);
stage.show();

Clutter.main();
