import * as BABYLON from "@babylonjs/core";

import EventEmitter from "./EventEmitter";

type CharacterControllerEvents = {
  onJump: () => void;
};

import Mouse from "./Mouse";
import Keyboard from "./Keyboard";

enum CharacterControllerState {
  InAir = 0,
  OnGround = 1,
  StartJump = 2,
}

type CharacterControllerOptions = {
  height?: number;
  radius?: number;
  position?: BABYLON.Vector3;
  inAirSpeed?: number;
  onGroundSpeed?: number;
  jumpHeight?: number;
  gravity?: BABYLON.Vector3;
  maxSlope?: number;
};

const defaultOptions: Required<CharacterControllerOptions> = {
  height: 1.8,
  radius: 0.25,
  position: new BABYLON.Vector3(0, 0, 0),
  inAirSpeed: 5.0,
  onGroundSpeed: 5.0,
  jumpHeight: 1,
  gravity: new BABYLON.Vector3(0, -9.81, 0),
  maxSlope: Math.PI / 6, // 30 degrees
};

export default class CharacterController extends EventEmitter<CharacterControllerEvents> {
  private scene: BABYLON.Scene;
  private mouse: Mouse;
  private keyboard: Keyboard;

  private characterController: BABYLON.PhysicsCharacterController;

  private options = defaultOptions;

  private state: CharacterControllerState = CharacterControllerState.OnGround;
  private wantJump: boolean = false;
  private inputDirection: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0);
  private forwardLocalSpace: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 1);
  private characterOrientation: BABYLON.Quaternion =
    BABYLON.Quaternion.Identity();

  constructor(
    scene: BABYLON.Scene,
    mouse: Mouse,
    keyboard: Keyboard,
    options: CharacterControllerOptions = {}
  ) {
    super();

    this.scene = scene;
    this.mouse = mouse;
    this.keyboard = keyboard;

    this.options = {
      ...defaultOptions,
      ...options,
    };

    const capsule = BABYLON.MeshBuilder.CreateCapsule(
      "capsule",
      {
        height: options.height,
        radius: options.radius,
        tessellation: 32,
      },
      scene
    );

    const characterController = (this.characterController =
      new BABYLON.PhysicsCharacterController(
        options.position ?? defaultOptions.position,
        { capsuleHeight: options.height, capsuleRadius: options.radius },
        scene
      ));

    capsule.position.copyFrom(characterController.getPosition());

    scene.onBeforeRenderObservable.add(() => {
      capsule.position.copyFrom(characterController.getPosition());
    });

    scene.onAfterPhysicsObservable.add((_) => {
      if (scene.deltaTime == undefined) return;

      let deltaTime = scene.deltaTime / 1000.0;

      if (deltaTime == 0) return;

      const down = new BABYLON.Vector3(0, -1, 0);

      const characterSurfaceInfo = characterController.checkSupport(
        deltaTime,
        down
      );

      const desiredLinearVelocity = this.getDesiredVelocity(
        deltaTime,
        characterSurfaceInfo
      );

      characterController.setVelocity(desiredLinearVelocity);

      characterController.integrate(
        deltaTime,
        characterSurfaceInfo,
        this.options.gravity
      );
    });

    keyboard.on("keydown", (event) => {
      const { key } = event;

      if (key == "w" || key == "ArrowUp") {
        this.inputDirection.z = 1;
      } else if (key == "s" || key == "ArrowDown") {
        this.inputDirection.z = -1;
      } else if (key == "a" || key == "ArrowLeft") {
        this.inputDirection.x = -1;
      } else if (key == "d" || key == "ArrowRight") {
        this.inputDirection.x = 1;
      } else if (key == " ") {
        this.wantJump = true;
      }
    });

    keyboard.on("keyup", (event) => {
      const { key } = event;

      if (key == "w" || key == "s" || key == "ArrowUp" || key == "ArrowDown") {
        this.inputDirection.z = 0;
      }
      if (
        key == "a" ||
        key == "d" ||
        key == "ArrowLeft" ||
        key == "ArrowRight"
      ) {
        this.inputDirection.x = 0;
      } else if (key == " ") {
        this.wantJump = false;
      }
    });
  }

  private getNextState(
    characterSurfaceInfo: BABYLON.CharacterSurfaceInfo
  ): CharacterControllerState {
    if (this.state === CharacterControllerState.InAir) {
      if (
        characterSurfaceInfo.supportedState ==
        BABYLON.CharacterSupportedState.SUPPORTED
      ) {
        return CharacterControllerState.OnGround;
      }

      return CharacterControllerState.InAir;
    } else if (this.state === CharacterControllerState.OnGround) {
      if (
        characterSurfaceInfo.supportedState !=
        BABYLON.CharacterSupportedState.SUPPORTED
      ) {
        return CharacterControllerState.InAir;
      }

      if (this.wantJump) {
        return CharacterControllerState.StartJump;
      }

      return CharacterControllerState.OnGround;
    } else if (this.state === CharacterControllerState.StartJump) {
      return CharacterControllerState.InAir;
    }

    return CharacterControllerState.OnGround;
  }

  getDesiredVelocity(
    deltaTime: number,
    characterSurfaceInfo: BABYLON.CharacterSurfaceInfo
  ) {
    const nextState = this.getNextState(characterSurfaceInfo);

    if (nextState !== this.state) {
      this.state = nextState;
    }

    let upWorld = this.options.gravity.normalizeToNew();

    upWorld.scaleInPlace(-1.0);

    const forwardWorld = this.forwardLocalSpace.applyRotationQuaternion(
      this.characterOrientation
    );

    const currentVelocity = this.characterController.getVelocity();

    if (this.state === CharacterControllerState.InAir) {
      const desiredVelocity = this.inputDirection
        .scale(this.options.inAirSpeed)
        .applyRotationQuaternion(this.characterOrientation);

      const outputVelocity = this.characterController.calculateMovement(
        deltaTime,
        forwardWorld,
        upWorld,
        currentVelocity,
        BABYLON.Vector3.ZeroReadOnly,
        desiredVelocity,
        upWorld
      );

      // Restore to original vertical component
      outputVelocity.addInPlace(upWorld.scale(-outputVelocity.dot(upWorld)));
      outputVelocity.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));

      // Add gravity
      outputVelocity.addInPlace(this.options.gravity.scale(deltaTime));

      return outputVelocity;
    } else if (this.state === CharacterControllerState.OnGround) {
      // Move character relative to the surface we're standing on
      // Correct input velocity to apply instantly any changes in the velocity of the standing surface and this way
      // avoid artifacts caused by filtering of the output velocity when standing on moving objects.
      const desiredVelocity = this.inputDirection
        .scale(this.options.onGroundSpeed)
        .applyRotationQuaternion(this.characterOrientation);

      let outputVelocity = this.characterController.calculateMovement(
        deltaTime,
        forwardWorld,
        characterSurfaceInfo.averageSurfaceNormal,
        currentVelocity,
        characterSurfaceInfo.averageSurfaceVelocity,
        desiredVelocity,
        upWorld
      );

      // Horizontal projection
      outputVelocity.subtractInPlace(
        characterSurfaceInfo.averageSurfaceVelocity
      );

      const inv1k = 1e-3;

      if (outputVelocity.dot(upWorld) > inv1k) {
        const velLen = outputVelocity.length();

        outputVelocity.normalizeFromLength(velLen);

        // Get the desired length in the horizontal direction
        const horizLen =
          velLen / characterSurfaceInfo.averageSurfaceNormal.dot(upWorld);

        // Re project the velocity onto the horizontal plane
        const c =
          characterSurfaceInfo.averageSurfaceNormal.cross(outputVelocity);

        outputVelocity = c.cross(upWorld);

        outputVelocity.scaleInPlace(horizLen);
      }

      outputVelocity.addInPlace(characterSurfaceInfo.averageSurfaceVelocity);

      return outputVelocity;
    } else if (this.state == CharacterControllerState.StartJump) {
      const u = Math.sqrt(
        2 * this.options.gravity.length() * this.options.jumpHeight
      );

      const curRelVel = currentVelocity.dot(upWorld);

      return currentVelocity.add(upWorld.scale(u - curRelVel));
    }

    return BABYLON.Vector3.Zero();
  }

  getPosition(): BABYLON.Vector3 {
    return this.characterController.getPosition();
  }
}
