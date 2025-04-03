import * as BABYLON from "@babylonjs/core";

import EventEmitter from "./EventEmitter";

type KeyboardEvents = {
  keydown: (event: { key: string; code: string }) => void;
  keyup: (event: { key: string; code: string }) => void;
};

export default class Keyboard extends EventEmitter<KeyboardEvents> {
  private scene: BABYLON.Scene;

  private keyDown: boolean = false;
  private keysPressed: Set<string> = new Set();

  constructor(scene: BABYLON.Scene) {
    super();

    this.scene = scene;

    scene.onKeyboardObservable.add((keyboardInfo) => {
      switch (keyboardInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
          this.keyDown = true;

          this.keysPressed.add(keyboardInfo.event.key);

          this.emit("keydown", {
            key: keyboardInfo.event.key,
            code: keyboardInfo.event.code,
          });
          break;
        case BABYLON.KeyboardEventTypes.KEYUP:
          this.keyDown = false;

          this.keysPressed.delete(keyboardInfo.event.key);

          this.emit("keyup", {
            key: keyboardInfo.event.key,
            code: keyboardInfo.event.code,
          });
          break;
      }
    });
  }

  isKeyPressed(key: string | undefined): boolean {
    if (key === undefined) return this.keyDown;

    return this.keysPressed.has(key);
  }

  isKeysPressed(keys: string[]): boolean {
    for (const key of keys) {
      if (!this.keysPressed.has(key)) {
        return false;
      }
    }

    return true;
  }
}
