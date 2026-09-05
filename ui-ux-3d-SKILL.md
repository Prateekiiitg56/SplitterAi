---
name: ui-ux-3d
description: Use when building professional UI/UX with real 3D and cinematic motion — WebGL hero scenes, scroll-driven camera work, post-processing, and orchestrated interface animation. Targets React + Vite + React Three Fiber for the 3D layer and Motion for the DOM layer. Use for requests like "landing page with a 3D hero", "immersive product site", "scroll-driven 3D story", or adding depth and motion to an existing React UI. Not for static layout work with no motion component, and not for game development.
---

# Professional UI/UX with 3D and cinematic motion

Approach this as the lead of a small interactive studio that ships award-shortlist product sites: someone who can hold both the aesthetic argument and the frame budget in their head at once. The client is paying for a scene that feels authored, not for a spinning model dropped onto a template.

**Read the `frontend-design` skill first and follow it.** It owns palette, typography, layout, copy, and the anti-generic critique pass. This skill owns only what it does not cover: the third dimension, the motion system, and the engineering that keeps both fast and accessible. Where the two overlap, `frontend-design` wins — in particular its rule that boldness gets spent in **one** place. A cinematic scene *is* that one place, so the DOM around it should get quieter, not louder.

## Establish the brief before opening an editor

3D is expensive to build and expensive to change. Settle these five things first, proposing concrete answers rather than asking open questions:

1. **The subject.** What is actually being shown, and why does it deserve dimension? "Depth because the product is physical / spatial / layered" is a reason. "Depth because it looks modern" is not — say so and propose the 2D alternative.
2. **The one shot.** Describe the hero scene in a single sentence, as a director would. If you cannot, the scene has no idea in it yet.
3. **The camera's job over the scroll.** Where does the viewer start, what do they discover, where do they land.
4. **Asset reality.** Is there a real model, or are you building geometry procedurally? Procedural (lathes, extrusions, instanced primitives, signed-distance shaders) is usually better than a generic downloaded asset — it is lighter, on-brief, and nobody else has it.
5. **The floor.** The device and connection this must still feel good on. This sets the budget, and the budget constrains the concept — not the reverse.

## Stack

The 3D layer and the DOM layer are separate systems with separate animation drivers. Do not try to unify them.

**3D layer** — `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`. Animate inside `useFrame`, with `maath/easing` for frame-rate-independent damping. Reach for `@react-spring/three` when you want spring physics on 3D props.

**DOM layer** — `motion` (the Motion package, formerly published as `framer-motion`; React entry point is `motion/react`). Use it for reveals, nav transitions, shared-layout moves, and anything that answers a click.

**Optional** — `leva` for a debug panel while dialling values in, `r3f-perf` for an on-screen frame budget HUD, `@react-three/rapier` only if the brief genuinely needs physics. Strip `leva` and `r3f-perf` before handing off. For scroll timelines with many precisely sequenced beats, GSAP's ScrollTrigger is more expressive than hand-rolled progress math and is worth considering.

**Do not use `framer-motion-3d`.** It is deprecated and unmaintained. Animate 3D with `useFrame` or `@react-spring/three` instead.

Version discipline: check the installed major versions and pair them deliberately — the `@react-three/fiber` major is coupled to a React major, and `drei` and `postprocessing` majors are in turn coupled to the `fiber` major. Run `npm view <pkg> version` and read the peer warnings rather than pinning from memory; a mismatched trio here produces confusing runtime errors, not clean install failures.

## Scaffold

```
src/
  main.jsx
  App.jsx                  # DOM sections; owns page structure
  lib/
    motion.js              # THE MOTION SCORE — every duration & easing lives here
    quality.js             # tier detection + per-tier settings
  scene/
    Scene.jsx              # the only <Canvas> in the app
    Stage.jsx              # lights, environment, fog
    CameraRig.jsx          # scroll- and pointer-driven camera
    Effects.jsx            # EffectComposer stack
    objects/HeroObject.jsx
    materials/             # shaderMaterial definitions + extend()
  ui/
    Reveal.jsx             # Motion wrapper that honours reduced motion
    Nav.jsx  Section.jsx
  hooks/
    useScrollProgress.js
    useQualityTier.js
  styles/
    tokens.css  global.css
public/
  models/                  # .glb, Draco or Meshopt compressed
  hdri/                    # small .hdr for lighting only, never as a backdrop
  poster/                  # static fallback stills of the hero scene
```

Two rules about this shape. There is exactly **one** `<Canvas>`, mounted once and persistent — remounting a canvas per section drops context and thrashes memory. And `lib/motion.js` is treated exactly like a color token file: a closed set of named durations and easings that the whole project imports. Ad-hoc `duration: 0.42` values scattered through components are how a motion system loses its accent.

## The motion score

Before animating anything, write the score in `lib/motion.js`: three or four durations (something like `quick` / `base` / `slow` / `cinematic`) and two or three easings, each with a named role. Then hold to it.

Cinematic timing is slower than UI timing and this is the most common calibration error. Camera moves and scene reveals live in the 800ms–2.5s range with long, asymmetric ease-outs. Anything answering a user's click stays under 300ms — a button that responds cinematically feels broken, not expensive. Keep those two vocabularies distinct and never let the scene's timing leak into the controls.

Ease-out for entrances, ease-in for exits, and custom cubic-beziers over library defaults; `easeInOut` on everything is a tell. Overlap rather than queue — a reveal sequence where each element waits for the last to finish reads as a loading spinner. Stagger in the 40–80ms range and let elements overlap by roughly half their duration.

## Building the scene

**Composition before detail.** Block the shot with untextured primitives and get the camera, framing, and silhouette right first. A well-composed scene of grey boxes already looks intentional; a badly composed one with beautiful materials does not. Respect the DOM: decide early which regions of frame the copy occupies and keep the subject out of them.

**Light for a reason.** Three-point lighting as a default is fine but obvious; take the lighting cue from the subject's own world instead — showroom, workshop, screen glow, overcast, single hard raking source. Use `<Environment>` with a modest HDRI for believable reflections, not as scenery. One committed key light plus environment fill beats five balanced lights. Shadows are expensive: prefer a baked or contact-shadow approximation, and bake them once the scene is static.

**Materials carry the personality.** This is where the brief's materials vocabulary gets expressed — glass, brushed metal, ceramic, latex, film emulsion. Push roughness/metalness away from the middle; `roughness: 0.5, metalness: 0.5` on everything is the 3D equivalent of one border-radius on every card. Transmission and refraction are gorgeous and among the most expensive things in the renderer, so treat them as the one splurge if you use them at all. Write a custom shader when the surface itself is the idea; otherwise standard materials well-tuned look better than a mediocre custom one.

**Camera work.** Drive the camera from a single scroll progress value, and damp it toward its target every frame rather than snapping to it. Push the pointer influence through the same damping at low amplitude — a few degrees of parallax reads as alive, more reads as seasick. Never move the camera and the subject simultaneously unless you specifically want disorientation. Rotating on all three axes at once is almost always worse than a considered move on one.

**Post-processing is grade, not garnish.** A restrained composer — subtle bloom on genuine highlights only, one shallow depth-of-field pass, a whisper of grain, then anti-aliasing — does more for perceived quality than any single effect turned up. Chromatic aberration and heavy vignette date fast and read as a preset. When the composer is on, disable the renderer's own MSAA and let the pass handle AA, and drop effects by quality tier rather than shipping the full stack to a phone.

## Loading is part of the design

An immersive scene has a cold start, and how you handle it is most of the perceived quality. Ship it deliberately:

The DOM must paint immediately and never wait on WebGL. Headline, nav, and first copy are real HTML rendered on first paint, with the canvas fading in behind them when it is ready. Report genuine progress rather than a fake bar, preload what the first shot needs and lazy-load the rest, and hold the reveal until the scene can actually render a clean frame — a scene that pops in half-lit undoes the whole effect. Cross-fade from a static poster still of the hero composition so the transition from placeholder to live scene is a dissolve rather than a jump. That same poster is your no-WebGL and reduced-motion fallback, so it earns its weight three times over.

## Performance budget

Set these as hard limits before building, and measure rather than assume. 60fps on the target desktop, with a 30fps floor on the weakest device in scope. Keep draw calls low and instance anything repeated — the count matters more than the triangle total on most hardware. Textures no larger than needed, compressed to KTX2/Basis, and models Draco- or Meshopt-compressed through `gltf-transform`. Budget the hero's total asset payload in single-digit megabytes and defer everything below the fold.

Then make quality adaptive: cap device pixel ratio rather than rendering at native retina, use drei's `<PerformanceMonitor>` to step quality tiers down when frames slip, render on demand instead of continuously when a scene is static, and stop the loop entirely when the tab is hidden or the canvas scrolls out of view. Profile on a mid-range phone, not a workstation — and if it cannot hit the floor, cut scene complexity rather than shipping a slideshow.

## Accessibility is not optional here

Immersive work fails accessibility in predictable ways. Close each one:

`prefers-reduced-motion` gets a real alternate art direction, not a disabled feature — hold the camera at a well-composed static framing, stop autonomous movement and parallax, keep only short opacity transitions, and let scroll-linked content appear plainly. Treat the poster fallback as a legitimate way to experience the page.

All meaning lives in the DOM. The canvas is decorative and `aria-hidden`; text rendered in 3D is invisible to assistive tech and to search, so anything that must be read exists as real HTML. Every 3D interaction has a keyboard-reachable DOM equivalent with a visible focus style, and the whole flow completes without a pointer.

Do not hijack scroll. Scroll-driven camera work should ride the native scrollbar so that position, momentum, keyboard paging, and browser find all keep working. Virtualised scroll containers break these and are rarely worth it. Maintain contrast against a moving background — either a scrim behind the copy or a region of frame kept deliberately calm; text over a shifting scene is the most common contrast failure in this genre. And nothing strobes or flashes at rates that could trigger a seizure.

## Self-critique before handing off

Run the scene and look at it, capturing screenshots or a short recording if the environment allows. Then be hostile about it:

Ask whether the depth earns its cost — if the page would be as good flat, say so out loud in the handoff. Ask whether you could name the studio behind it, or whether it reads as a template with an orbiting object. Check the first three seconds on a cold cache, the reduced-motion path, and the mid-range phone, because those are the three states most likely to have been built blind. Confirm every duration and easing traces back to `lib/motion.js`. Then take Chanel's advice as `frontend-design` frames it and remove one thing — usually a post-processing pass, a second light, or a second animated element competing with the hero.

## Failure modes that mark this work as generated

A dark scene with an emissive-wireframe or particle-field backdrop and a bright accent bloom. A gently bobbing, slowly rotating object with no relationship to the subject. Glass/transmission material used because it is impressive rather than because the subject is glass. Every DOM section fading and sliding up on scroll. The full post-processing stack at default values. A loading percentage that is not measuring anything. Text baked into the 3D scene. Autoplaying `OrbitControls` — free orbit lets viewers find the angle where the illusion breaks, so constrain the camera or drive it yourself.
