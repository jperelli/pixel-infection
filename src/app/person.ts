import * as PIXI from "pixi.js";
import Barrier from "./barrier";
import Config from "./config";

type Country = "random";

interface PersonConstructorParams {
  country?: Country;
  texture: PIXI.Texture;
  bounds: PIXI.Rectangle;
}

class Person {
  // pixi
  sprite: PIXI.Sprite;
  bounds: PIXI.Rectangle;

  // position and movement
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  direction: number;
  turningSpeed: number;
  speed: number;

  // state
  infected: Date | null;
  recovered: boolean;
  dead: boolean;

  // attributes
  age: number;
  offsetMax: number; // sedentarism / auto-quarantine

  preconditions: boolean; // not used yet, could be used together with age
  health: number; // not used

  // TODO: generate initial population older or with more preconditions depending on some parameters (based on real countries)
  constructor({ country, texture, bounds }: PersonConstructorParams) {
    this.bounds = bounds;
    this.sprite = new PIXI.Sprite(texture);
    this.direction = Math.random() * Math.PI * 2;
    this.turningSpeed = Math.random() - 0.8;
    this.speed = Math.random() * Config.SPEED_FACTOR;
    this.infected = null;
    this.recovered = false;
    this.dead = false;
    this.age = Math.random() * 80;
    this.baseX = Math.random() * bounds.width;
    this.baseY = Math.random() * bounds.height;
    this.offsetX = 0;
    this.offsetY = 0;
    this.offsetMax = (Math.random() * bounds.width) / Config.OFFSET_FACTOR;

    this.sprite.x = this.baseX + this.offsetX;
    this.sprite.y = this.baseY + this.offsetY;
    this.sprite.tint = 0x4444aa;
    this.sprite.anchor.set(0.5);
    return this;
  }

  collidesWithAny(barriers: Array<Barrier>) {
    for (const b of barriers) {
      if (
        Math.abs(b.sprite.x - this.sprite.x) +
          Math.abs(b.sprite.y - this.sprite.y) <
        b.size
      ) {
        return true;
      }
    }
    return false;
  }

  moveStep(barriers: Array<Barrier>) {
    if (
      this.offsetX > this.offsetMax ||
      this.offsetX < -this.offsetMax ||
      this.offsetY > this.offsetMax ||
      this.offsetY < -this.offsetMax ||
      this.collidesWithAny(barriers)
    ) {
      this.direction += Math.PI; // effectively change to the opposite direction
    } else {
      this.direction += this.turningSpeed * 0.01;
    }
    const plusX = Math.sin(this.direction);
    const plusY = Math.cos(this.direction);
    this.offsetX = this.offsetX + plusX * this.speed;
    this.offsetY = this.offsetY + plusY * this.speed;

    this.sprite.x = this.baseX + this.offsetX;
    this.sprite.y = this.baseY + this.offsetY;

    // wrap the people by testing their bounds...
    if (this.sprite.x < this.bounds.x) {
      this.sprite.x += this.bounds.width;
    } else if (this.sprite.x > this.bounds.x + this.bounds.width) {
      this.sprite.x -= this.bounds.width;
    }

    if (this.sprite.y < this.bounds.y) {
      this.sprite.y += this.bounds.height;
    } else if (this.sprite.y > this.bounds.y + this.bounds.height) {
      this.sprite.y -= this.bounds.height;
    }
  }
}

export default Person;
