import * as BABYLON from "@babylonjs/core";

import EventEmitter from "./EventEmitter";

type MouseEvents = {
  mousedown: (event: { position: BABYLON.Vector2; button: number }) => void;
  mouseup: (event: { position: BABYLON.Vector2; button: number }) => void;
  mousemove: (event: { position: BABYLON.Vector2; button: number }) => void;
};

export default class Mouse extends EventEmitter<MouseEvents> {
  private scene: BABYLON.Scene;

  private mouseDown: boolean = false;
  private buttonsPressed: Set<number> = new Set();

  private mousePosition: BABYLON.Vector2 = new BABYLON.Vector2(0, 0);

  constructor(scene: BABYLON.Scene) {
    super();

    this.scene = scene;

    scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
          this.mouseDown = true;

          this.emit("mousedown", {
            position: this.mousePosition,
            button: pointerInfo.event.button,
          });
          break;

        case BABYLON.PointerEventTypes.POINTERUP:
          this.mouseDown = false;

          this.emit("mouseup", {
            position: this.mousePosition,
            button: pointerInfo.event.button,
          });
          break;

        case BABYLON.PointerEventTypes.POINTERMOVE:
          this.mousePosition = new BABYLON.Vector2(
            pointerInfo.event.clientX,
            pointerInfo.event.clientY
          );

          this.emit("mousemove", {
            position: this.mousePosition,
            button: pointerInfo.event.button,
          });
          break;
      }
    });
  }

  isMousePressed(button?: number): boolean {
    if (button !== undefined) {
      return this.buttonsPressed.has(button);
    }

    return this.mouseDown;
  }

  getMousePosition(): BABYLON.Vector2 {
    return this.mousePosition;
  }
}
