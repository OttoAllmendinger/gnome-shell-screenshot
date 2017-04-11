const Clutter = imports.gi.Clutter;
const {dump} = imports.dump;

log(dump(Clutter));
log(dump(Clutter.ButtonEvent));

Clutter.init(null);

let stage = new Clutter.Stage();

let texture = new Clutter.Texture({ filename: 'clutter/test.png',
                                    reactive: true });

let clickAction = new Clutter.ClickAction({
  // long_press_duration: 500,
});

texture.add_action(clickAction);

clickAction.connect(
  'long-press',
  (action, actor, state) => {
    log("long press");
    // log(dump(action));
    // log(dump(actor));
    // log(dump(state));
    log(dump(state==Clutter.LongPressState.ACTIVATE));
    return true;
  }
);

clickAction.connect(
  'clicked',
  (o, event) => {
      log('clicked');
      log(dump(event));
      return true;
  }
);

let color = new Clutter.Color();

stage.color = color;

stage.add_actor(texture);
stage.show();

stage.connect("destroy", Clutter.main_quit);

Clutter.main();
