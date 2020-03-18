import * as PIXI from "pixi.js";
import {
  person as personSprite,
  barrier as barrierSprite
} from "../assets/loader";
import { randn_bm, getAverageOfArray, getMedianOfArray } from "./utils";

interface SpritePlusMeta extends PIXI.Sprite {
  data: {
    direction: number;
    turningSpeed: number;
    speed: number;
    infected: null | Date;
    recovered: boolean;
    dead: boolean;
    health: number;
    age: number;
    baseX: number;
    baseY: number;
    offsetX: number;
    offsetY: number;
    offsetMax: number;
  };
}

class App {
  PEOPLE_COUNT = 1000;
  FIRST_DATE = new Date("2019-11-17");
  MINUTES_TICK = 60;
  DAYS_TO_CURE = 14;
  BEDS_PER_THOUSAND = 5;
  OFFSET_FACTOR = 10; // 10 to 20 // bigger is less movement
  SPEED_FACTOR = 2; // 1 to 5 // biger is people moving faster
  CONTAGION_PROBABILITY = 1; // 0.1 to 1
  BARRIER_RANGE = 10; // 10
  global_date = new Date("2019-11-17");

  pixiapp: PIXI.Application;
  HUD_Date: PIXI.Text;
  HUD_Fps: PIXI.Text;
  fpsAvg: Array<number> = [];
  fpsLow = 0;
  fpsHigh = 0;
  personBounds: PIXI.Rectangle;

  counts: {
    [key: string]: {
      dead: number;
      recovered: number;
      infected: number;
      not_infected: number;
    };
  } = {};

  barriers: Array<PIXI.Sprite> = [];

  // holder to store the people
  people: {
    dead: Array<SpritePlusMeta>;
    recovered: Array<SpritePlusMeta>;
    infected: Array<SpritePlusMeta>;
    not_infected: Array<SpritePlusMeta>;
  } = {
    dead: [],
    recovered: [],
    infected: [],
    not_infected: []
  };

  constructor() {
    this.pixiapp = new PIXI.Application({ backgroundColor: 0xeeeeee });

    let infected = false;
    const loader = PIXI.Loader.shared;
    loader.add("personSprite", personSprite);
    loader.load((loader, resources) => {
      const createSprite = (file: string) => {
        const person = new PIXI.Sprite(
          resources.personSprite.texture
        ) as SpritePlusMeta;
        person.data = {
          direction: Math.random() * Math.PI * 2,
          turningSpeed: Math.random() - 0.8,
          speed: Math.random() * this.SPEED_FACTOR,
          infected: infected ? null : this.FIRST_DATE,
          recovered: false,
          dead: false,
          health: 100,
          age: Math.random() * 80,
          baseX: Math.random() * this.pixiapp.screen.width,
          baseY: Math.random() * this.pixiapp.screen.height,
          offsetX: 0,
          offsetY: 0,
          offsetMax:
            (Math.random() * this.pixiapp.screen.height) / this.OFFSET_FACTOR
        };
        person.x = person.data.baseX + person.data.offsetX;
        person.y = person.data.baseY + person.data.offsetY;
        person.tint = !infected ? 0xff0000 : 0x4444aa;
        infected = true;
        return person;
      };

      for (let i = 0; i < this.PEOPLE_COUNT; i++) {
        const person = createSprite(personSprite);
        person.anchor.set(0.5);
        if (person.data.infected) {
          this.people.infected.push(person);
        } else {
          this.people.not_infected.push(person);
        }
        this.pixiapp.stage.addChild(person);
      }
    });

    /// FPS
    this.HUD_Fps = new PIXI.Text("", {
      fill: "red",
      fontSize: 15
    });
    this.HUD_Fps.y = 30;
    this.HUD_Fps.x = 0;
    this.pixiapp.stage.addChild(this.HUD_Fps);
    /// END FPS CODE

    this.HUD_Date = new PIXI.Text(this.global_date.toString(), {
      fill: "black",
      fontSize: 15
    });
    this.pixiapp.stage.addChild(this.HUD_Date);

    // create a bounding box for the little people
    const personBoundsPadding = 0;
    this.personBounds = new PIXI.Rectangle(
      -personBoundsPadding,
      -personBoundsPadding,
      this.pixiapp.screen.width + personBoundsPadding * 2,
      this.pixiapp.screen.height + personBoundsPadding * 2
    );

    this.pixiapp.renderer.plugins.interaction.on("pointerup", event => {
      const barrier = PIXI.Sprite.from(barrierSprite);
      barrier.x = event.data.global.x;
      barrier.y = event.data.global.y;
      this.barriers.push(barrier);
      barrier.anchor.set(0.5);
      this.pixiapp.stage.addChild(barrier);
    });

    this.pixiapp.ticker.add(this._ticker);
  }

  collideswithbarrier = (person: SpritePlusMeta) => {
    for (const b of this.barriers) {
      if (
        Math.abs(b.x - person.x) + Math.abs(b.y - person.y) <
        this.BARRIER_RANGE
      ) {
        return true;
      }
    }
    return false;
  }

  movePeople = (people: Array<SpritePlusMeta>) => {
    for (let i = people.length - 1; i >= 0; i--) {
      const person = people[i];
      if (
        person.data.offsetX > person.data.offsetMax ||
        person.data.offsetX < -person.data.offsetMax ||
        person.data.offsetY > person.data.offsetMax ||
        person.data.offsetY < -person.data.offsetMax ||
        this.collideswithbarrier(person)
      ) {
        person.data.direction += Math.PI; // effectively change to the opposite direction
      } else {
        person.data.direction += person.data.turningSpeed * 0.01;
      }
      const plusX = Math.sin(person.data.direction);
      const plusY = Math.cos(person.data.direction);
      person.data.offsetX = person.data.offsetX + plusX * person.data.speed;
      person.data.offsetY = person.data.offsetY + plusY * person.data.speed;

      person.x = person.data.baseX + person.data.offsetX;
      person.y = person.data.baseY + person.data.offsetY;

      // wrap the people by testing their bounds...
      if (person.x < this.personBounds.x) {
        person.x += this.personBounds.width;
      } else if (person.x > this.personBounds.x + this.personBounds.width) {
        person.x -= this.personBounds.width;
      }

      if (person.y < this.personBounds.y) {
        person.y += this.personBounds.height;
      } else if (person.y > this.personBounds.y + this.personBounds.height) {
        person.y -= this.personBounds.height;
      }
    }
  }

  _ticker = () => {
    // add one day
    this.global_date = new Date(
      +this.global_date + this.MINUTES_TICK * 60 * 1000
    );
    console.log(this.HUD_Date)
    this.HUD_Date.text = this.global_date.toString();

    this.counts[this.global_date.toISOString().split("T")[0]] = {
      dead: this.people.dead.length,
      recovered: this.people.recovered.length,
      infected: this.people.infected.length,
      not_infected: this.people.not_infected.length
    };
    const HUD_totals = document.getElementById("totals");
    if (HUD_totals) {
      HUD_totals.innerHTML = JSON.stringify(
        this.counts[this.global_date.toISOString().split("T")[0]],
        undefined,
        2
      );
    }

    for (let i = this.people.infected.length - 1; i >= 0; i--) {
      const person = this.people.infected[i];
      if (
        (this.global_date.valueOf() - person.data.infected.valueOf()) /
          1000 /
          60 /
          60 /
          24 >
        this.DAYS_TO_CURE
      ) {
        const [p] = this.people.infected.splice(i, 1);
        if (p.data.age < randn_bm(-200, 110, 0.25)) {
          p.data.recovered = true;
          p.tint = 0x00ff00;
          this.people.recovered.push(p);
        } else {
          // TODO: the rand max number changes if there is more health system capacity
          // TODO: give a second chance if there are free beds
          p.data.dead = true;
          p.tint = 0xaaaaaa;
          this.people.dead.push(p);
        }
      }
    }

    // iterate through the people and infect the person near to an infected one
    let newinfected = [];
    for (let i = this.people.not_infected.length - 1; i >= 0; i--) {
      const person = this.people.not_infected[i];
      for (let j = this.people.infected.length - 1; j >= 0; j--) {
        const other = this.people.infected[j];
        if (
          Math.abs(other.x - person.x) + Math.abs(other.y - person.y) < 10 &&
          Math.random() < this.CONTAGION_PROBABILITY
        ) {
          const [p] = this.people.not_infected.splice(i, 1);
          p.tint = 0xff0000;
          p.data.infected = this.global_date;
          newinfected.push(p);
          break;
        }
      }
    }
    this.people.infected.push(...newinfected);

    this.movePeople(this.people.not_infected);
    this.movePeople(this.people.infected);
    this.movePeople(this.people.recovered);

    // print FPS
    const avg = getAverageOfArray(this.fpsAvg).toFixed(3);
    const median = getMedianOfArray(this.fpsAvg);
    const fps = Number(this.pixiapp.ticker.FPS.toFixed(3));
    this.HUD_Fps.text = `fps: ${fps}\nlow: ${this.fpsLow}\nhigh: ${this.fpsHigh}\navg: ${avg}\nmed: ${median}`;
    if (fps < this.fpsLow) {
      this.fpsLow = fps;
    }
    if (fps > this.fpsHigh) {
      this.fpsHigh = fps;
    }
    if (this.fpsAvg.length > 10) {
      this.fpsAvg.shift();
    }
    this.fpsAvg.push(fps);
  }
}

export default App;
