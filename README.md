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
| Aim | Point the controller at a wall or table like a laser pointer. No need to turn your head. |
| Pin the sketch | Press **A** (right) or **X** (left), or pull the trigger |
| Unpin | Press **A** or **X** again |
| Short or long aim distance (when no surface is hit) | Hold grip and push the thumbstick up (closer) or down (farther) |
| Slide the pinned sketch sideways | Hold grip and push the thumbstick left or right |
| Nearer or farther (pinned) | Hold grip and push the thumbstick up (nearer) or down (farther). Or use the NEARER / FARTHER buttons on the menu |
| Move the menu | Push the thumbstick (when not pinned), or hold grip on an empty part of the menu and move the controller |
| Menu buttons | Aim at the menu and pull the trigger: opacity, size, nearer/farther, HIDE |
| Hide / show the menu | HIDE button on the menu, or press **B** (right) or **Y** (left) |

The menu stays visible before and after pinning. Once pinned, the sketch only moves while you hold grip and push the thumbstick. Hands and pens are ignored, so you can draw on the paper without the sketch moving.

## Run it locally

```sh
npm install
npm test          # headset tests (needs Google Chrome)
```

The app is a single `index.html`. Serve the folder over HTTPS, or use `localhost`, for camera and headset access.
