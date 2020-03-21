import * as PIXI from "pixi.js";
import { barrier as barrierSprite } from "../assets/loader";

interface BarrierConstructorParams {
  size: number;
  x: number;
  y: number;
}

class Barrier {
  // pixi
  sprite: PIXI.Sprite;
  size: number;

  // TODO: generate initial population older or with more preconditions depending on some parameters (based on real countries)
  constructor({ size, x, y }: BarrierConstructorParams) {
    this.size = size;
    this.sprite = PIXI.Sprite.from(barrierSprite);
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.anchor.set(0.5);
    return this;
  }
}

export default Barrier;
