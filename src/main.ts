import * as BABYLON from "@babylonjs/core";
import "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";

import Mouse from "./Mouse";
import Keyboard from "./Keyboard";
import CharacterController from "./CharacterController";

import "./main.css";

const canvas = document.createElement("canvas");

document.body.appendChild(canvas);

const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

function enablePhysics() {
  return HavokPhysics().then((Havok) => {
    const havok = new BABYLON.HavokPlugin(true, Havok);

    scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), havok);
  });
}

function loadMeshAsync(path: string, scene: BABYLON.Scene) {
  return new Promise((resolve) => {
    BABYLON.SceneLoader.ImportMeshAsync("", path, "", scene).then((result) => {
      resolve(result);
    });
  });
}

scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

const camera = new BABYLON.ArcRotateCamera(
  "camera",
  0,
  0,
  5,
  BABYLON.Vector3.Zero(),
  scene
);

camera.setPosition(new BABYLON.Vector3(10, 10, 10));
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);

// deactivate moveing the camera with arrow keys
camera.keysUp = [];
camera.keysDown = [];
camera.keysLeft = [];
camera.keysRight = [];

const light = new BABYLON.DirectionalLight(
  "light",
  new BABYLON.Vector3(1, -1, 1),
  scene
);

const hemisphericLight = new BABYLON.HemisphericLight(
  "hemisphericLight",
  new BABYLON.Vector3(0, 1, 0),
  scene
);
hemisphericLight.intensity = 0.5;

async function init() {
  const mouse = new Mouse(scene);
  const keyboard = new Keyboard(scene);

  await enablePhysics();

  await loadMeshAsync("./gltf/greybox.glb", scene);

  console.log(scene.meshes);

  scene.meshes.forEach((mesh) => {
    if (
      mesh.name.startsWith("Box") ||
      mesh.name.startsWith("Plane") ||
      mesh.name.startsWith("Ramp")
    ) {
      const aggregate = new BABYLON.PhysicsAggregate(
        mesh,
        BABYLON.PhysicsShapeType.MESH,
        { mass: 0 },
        scene
      );
    }
  });

  const characterController = new CharacterController(scene, mouse, keyboard, {
    position: new BABYLON.Vector3(0, 10, 0),
  });

  scene.registerBeforeRender(() => {
    const position = characterController.getPosition();

    camera.setTarget(position);
    camera.setPosition(position.add(new BABYLON.Vector3(0, 10, -10)));
  });
}

init();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});

window.addEventListener("keydown", (ev) => {
  if (ev.key === "I" || ev.key === "i") {
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show();
    }
  }
});
