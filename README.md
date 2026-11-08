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
| Pin the sketch | Point the controller at a wall or table like a laser pointer, press **A** (right) or **X** (left), or pull the trigger. No need to turn your head. |
| Slide it sideways | Hold grip and push the thumbstick left or right |
| Nearer or farther | Hold grip and push the thumbstick up (nearer) or down (farther) |
| Unpin | Press **A** or **X** again (no aiming needed) |
| Opacity, size, distance | Aim at the panel buttons, pull the trigger |
| Move the panel (when not pinned) | Push the thumbstick. Hold grip and push up/down for nearer/farther. Or grip an empty part of the panel and move the controller |

Once pinned, the sketch only moves while you hold grip and push the thumbstick. Hands and pens are ignored, so you can put the controllers down and draw on paper without the sketch moving.

## Run it locally

```sh
npm install
npm test          # headset tests (needs Google Chrome)
```

The app is a single `index.html`. Serve the folder over HTTPS, or use `localhost`, for camera and headset access.
