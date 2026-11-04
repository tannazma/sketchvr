# Sketch VR

Trace a sketch onto the real world. Overlay it on your camera in the browser, or pin it to a wall in a Meta Quest headset.

**Live app:** https://tannazma.github.io/sketchvr/

![Sketch VR demo](docs/demo.gif)

[Full video (WebM)](docs/demo.webm) · recorded in the headset emulator

## How it works

1. **Choose a sketch** image.
2. **Browser:** start the camera and drag the sketch over your view. Use *Fix in place* to lock it.
3. **Headset:** press **Enter headset VR** (or AR), aim at a wall, and pull the trigger to pin the sketch there. It stays on that spot as you move or walk.

## Headset controls

| Action | How |
| --- | --- |
| Pin the sketch | Aim at a wall, pull the trigger |
| Slide it along the wall | Thumbstick (while pinned) |
| Drag it | Pull the trigger on the sketch, then release |
| Opacity, size, distance | Aim at the panel buttons, pull the trigger |
| Unpin | Aim at **UNFIX**, pull the trigger |

## Run it locally

```sh
npm install
npm test          # headset tests (needs Google Chrome)
```

The app is a single `index.html`. Serve the folder over HTTPS, or use `localhost`, for camera and headset access.
