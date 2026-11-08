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

The same guide is in the headset: press **HELP** in the top-left of your view.

| What you want to do | What to do |
| --- | --- |
| Place the sketch | Point the controller at the table or wall, like a laser pointer. You don't need to turn your head. |
| Lock it / unlock it | Press **A** (right hand) or **X** (left hand). Press again to unlock. |
| Closer or farther, before locking | Hold the side button and push the stick up (closer) or down (farther). |
| Closer or farther, after locking | Hold the side button and push the stick up or down. |
| Slide it sideways, after locking | Hold the side button and push the stick left or right. |
| Move the menu | Push the stick. Or hold the side button on an empty part of the menu and drag. |
| Hide the menu | Press **HIDE**. |
| Show the menu again | Aim at the **MENU** tab and pull the trigger, or press **B** (right) or **Y** (left). |
| Open or close the guide | Aim at the **HELP** tab and pull the trigger. |

Hands and pens never move the drawing. Once locked, the sketch only moves while you hold the side button and push the stick.

## Run it locally

```sh
npm install
npm test          # headset tests (needs Google Chrome)
```

The app is a single `index.html`. Serve the folder over HTTPS, or use `localhost`, for camera and headset access.
