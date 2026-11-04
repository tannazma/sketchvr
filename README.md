# Sketch VR

Trace a sketch onto your real surroundings. Upload an image, then overlay it on your camera view in the browser, or place it in your headset in mixed reality (AR) or test it in the VR emulator.

Live app: https://tannazma.github.io/sketchvr/

## What you need

- **Web:** a modern browser (Chrome, Edge, Safari, Firefox) and a camera. The page must be opened over HTTPS, or on `localhost`.
- **Headset:** a WebXR-capable headset browser such as the Meta Quest Browser, with passthrough (AR) support for mixed reality.

## Use it in the browser

1. **Upload a sketch.** Click **Upload sketch** and choose an image (JPG, PNG, or any image format your browser supports).
2. **Start the camera.** Click **Start camera** and allow access when the browser asks. Your sketch appears over the live view.
3. **Position the sketch.**
   - Drag it with the mouse or your finger.
   - Or use the arrow keys to nudge it in small steps.
4. **Adjust it** in the panel on the right:
   - **Size** scales the sketch (100% is the default).
   - **Opacity** controls how visible it is (50% is the default).
   - Type a number or use the arrows in the field to change a value.
5. **Fix in place** locks the sketch to the screen so it stays put while you move the camera around. Click **Move sketch** to unlock it.
6. **Switch camera** swaps between the front and back cameras when your device has both.
7. **Stop camera** turns the camera off. Your sketch stays loaded.

## Use it in VR or AR on a headset

Headset mode needs a sketch uploaded first. The **Enter headset VR** button appears once an image is loaded.

1. Open the app's HTTPS address in your headset browser.
2. Upload your sketch.
3. Press **Enter headset VR** (or **Enter headset AR** on a device with passthrough). Accept the prompt.
4. **Place the sketch:** aim the ray at a surface, such as a wall or table, and press the **trigger**. The sketch locks to that spot. Press the trigger again to unlock it and place it somewhere else.
5. **Move the sketch:** after it's fixed, press and hold the trigger on the sketch and drag it. Release to drop it. You can also use the joystick to slide it.
6. **Control the sketch from the panel:** point at a button on the panel and press the trigger.
   - **+** and **−** change opacity and size.
   - **NEARER** and **FARTHER** move the sketch closer to or further from you.
   - **UNFIX** removes the placement so you can place it again.
7. Take off the headset or exit the session to return to the browser view.

> **Test mode:** if your browser has no passthrough, you'll see **Test in VR emulator** instead. The sketch appears in a virtual scene with no camera feed. Use it to check the controls, not for tracing.

## Tips

- Use a high-contrast sketch on a light background. Thin lines are easier to see at lower opacity.
- Lower the opacity when you start tracing, then raise it to check your lines.
- Use **Fix in place** on the desktop to keep the sketch still while you draw on paper.
- The app works offline after the first visit, because it caches itself. It still needs a network connection to load the headset library.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| "Camera access needs trusted HTTPS" | Open the app over HTTPS. Camera access doesn't work on plain `http://`. |
| "Camera permission was denied" | Allow camera access in your browser's site settings, then try again. |
| "No camera was found" / "The camera is in use" | Check that the device has a camera, and close other apps that might be using it. |
| "Upload a sketch to enable headset mode." | Upload an image. The headset button appears after that. |
| "Headset XR is unavailable in this browser" | Open the app in a WebXR-capable browser, such as the Meta Quest Browser. |
| "Immersive AR and VR are unavailable" | Use a supported headset browser, or enable the Immersive Web Emulator on a desktop. |
| The sketch looks too dark in headset mode | Raise the opacity in the panel. |

## Privacy

Sketch VR runs entirely in your browser. Your camera feed and uploaded image stay on your device; nothing is sent to a server.

## Development

The whole app is a single `index.html` file with inline CSS and JavaScript. Headset support loads three.js from a CDN.

Run it locally with any static server over HTTPS, for example:

```sh
npx http-server -S -C localhost.pem -K localhost-key.pem
```

Keep `.pem` files out of git. They're already listed in `.gitignore`.
