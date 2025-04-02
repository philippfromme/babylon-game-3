import * as BABYLON from "@babylonjs/core";
import "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";

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

camera.setPosition(new BABYLON.Vector3(20, 20, 20));
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);

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

(async () => {
  await enablePhysics();

  await loadMeshAsync("./gltf/greybox1x8.glb", scene);

  console.log(scene.meshes);

  const capsule = BABYLON.MeshBuilder.CreateCapsule(
    "capsule",
    { height: 1.8, radius: 0.25, tessellation: 32 },
    scene
  );

  const characterPosition = new BABYLON.Vector3(0, 0.5 + 1.8 / 2, 0);

  let characterController = new BABYLON.PhysicsCharacterController(
    characterPosition,
    { capsuleHeight: 1.8, capsuleRadius: 0.25 },
    scene
  );
})();

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
