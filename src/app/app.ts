import * as PIXI from "pixi.js";
import { person as personSprite, barrier as barrierSprite } from "../assets/loader";

const app = new PIXI.Application({ backgroundColor: 0xeeeeee });

const PEOPLE_COUNT = 1000;
const FIRST_DATE = new Date("2019-11-17");
const MINUTES_TICK = 60;
const DAYS_TO_CURE = 14;
const BEDS_PER_THOUSAND = 5;
const OFFSET_FACTOR = 10; // 10 to 20 // bigger is less movement
const SPEED_FACTOR = 2; // 1 to 5 // biger is people moving faster
const CONTAGION_PROBABILITY = 1; // 0.1 to 1
const BARRIER_RANGE = 10; // 10
let global_date = new Date("2019-11-17");

// randn_bm(-200,110, 0.25) algo asi anda bien creo
// from https://stackoverflow.com/a/49434653/912450
function randn_bm(min, max, skew) {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
  num = Math.pow(num, skew); // Skew
  num *= max - min; // Stretch to fill range
  num += min; // offset to min
  return num;
}

interface SpritePlusMeta extends PIXI.Sprite {
  data: {
    direction: number;
    turningSpeed: number;
    speed: number;
    infected: null | Date;
    cured: boolean;
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

// holder to store the people
const people: Array<SpritePlusMeta> = [];

let infected = false;

const loader = PIXI.Loader.shared;
loader.add("personSprite", personSprite);
loader.load((loader, resources) => {
  const createSprite = (file: string) => {
    const person = new PIXI.Sprite(resources.personSprite.texture) as SpritePlusMeta;
    person.data = {
      direction: Math.random() * Math.PI * 2,
      turningSpeed: Math.random() - 0.8,
      speed: Math.random() * SPEED_FACTOR,
      infected: infected ? null : FIRST_DATE,
      cured: false,
      dead: false,
      health: 100,
      age: Math.random() * 80,
      baseX: Math.random() * app.screen.width,
      baseY: Math.random() * app.screen.height,
      offsetX: 0,
      offsetY: 0,
      offsetMax: (Math.random() * app.screen.height) / OFFSET_FACTOR
    };
    person.x = person.data.baseX + person.data.offsetX;
    person.y = person.data.baseY + person.data.offsetY;
    person.tint = 0x4444aa;
    infected = true;
    return person;
  };

  for (let i = 0; i < PEOPLE_COUNT; i++) {
    const person = createSprite(personSprite);
    person.anchor.set(0.5);
    people.push(person);
    app.stage.addChild(person);
  }
})

const HUD_Date = new PIXI.Text(global_date.toString(), {
  fill: "black",
  fontSize: 15
});
app.stage.addChild(HUD_Date);

const HUD_Counts = new PIXI.Text("", {
  fill: "black",
  fontSize: 15
});
HUD_Counts.y = 20;
app.stage.addChild(HUD_Counts);

// create a bounding box for the little people
const personBoundsPadding = 0;
const personBounds = new PIXI.Rectangle(
  -personBoundsPadding,
  -personBoundsPadding,
  app.screen.width + personBoundsPadding * 2,
  app.screen.height + personBoundsPadding * 2
);

const counts: {
  [key: string]: {
    dead: number;
    cured: number;
    infected: number;
    not_infected: number;
  };
} = {};

const barriers: Array<PIXI.Sprite> = [];

const collideswithbarrier = (person: SpritePlusMeta) => {
  for (const b of barriers) {
    if (Math.abs(b.x - person.x) + Math.abs(b.y - person.y) < BARRIER_RANGE) {
      return true;
    }
  }
  return false;
};

app.renderer.plugins.interaction.on("pointerup", event => {
  console.log(event)
  const barrier = PIXI.Sprite.from(barrierSprite);
  barrier.x = event.data.global.x
  barrier.y = event.data.global.y;
  barriers.push(barrier);
  barrier.anchor.set(0.5);
  app.stage.addChild(barrier);
});

app.ticker.add(() => {
  // add one day
  global_date = new Date(+global_date + MINUTES_TICK * 60 * 1000);
  HUD_Date.text = global_date.toString();
  counts[global_date.toISOString().split("T")[0]] = people.reduce(
    (prev, person) => {
      if (person.data.dead) {
        return {
          ...prev,
          dead: prev.dead + 1
        };
      }
      if (person.data.cured) {
        return {
          ...prev,
          cured: prev.cured + 1
        };
      }
      if (person.data.infected) {
        return {
          ...prev,
          infected: prev.infected + 1
        };
      }
      return {
        ...prev,
        not_infected: prev.not_infected + 1
      };
    },
    {
      dead: 0,
      cured: 0,
      infected: 0,
      not_infected: 0
    }
  );
  const HUD_totals = document.getElementById("totals");
  if (HUD_totals) {
    HUD_totals.innerHTML = JSON.stringify(
      counts[global_date.toISOString().split("T")[0]],
      undefined,
      2
    );
  }

  // iterate through the people and update their position
  for (const person of people) {
    if (!person.data.infected) {
      for (const other of people) {
        if (
          Math.abs(other.x - person.x) + Math.abs(other.y - person.y) < 10 &&
          other.data.infected &&
          !other.data.cured &&
          !other.data.dead &&
          Math.random() < CONTAGION_PROBABILITY
        ) {
          person.data.infected = global_date;
        }
      }
    }

    if (person.data.dead) {
      person.tint = 0xaaaaaa;
    } else {
      if (person.data.cured) {
        person.tint = 0x00ff00;
      } else {
        if (person.data.infected) {
          person.tint = 0xff0000;
          if (
            (global_date.valueOf() - person.data.infected.valueOf()) /
              1000 /
              60 /
              60 /
              24 >
            DAYS_TO_CURE
          ) {
            if (person.data.age < randn_bm(-200, 110, 0.25)) {
              person.data.cured = true;
            } else {
              // TODO: the rand max number changes if there is more health system capacity
              // TODO: give a second chance if there are free beds
              person.data.dead = true;
            }
          }
        }
      }

      if (
        person.data.offsetX > person.data.offsetMax ||
        person.data.offsetX < -person.data.offsetMax ||
        person.data.offsetY > person.data.offsetMax ||
        person.data.offsetY < -person.data.offsetMax ||
        collideswithbarrier(person)
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
      if (person.x < personBounds.x) {
        person.x += personBounds.width;
      } else if (person.x > personBounds.x + personBounds.width) {
        person.x -= personBounds.width;
      }

      if (person.y < personBounds.y) {
        person.y += personBounds.height;
      } else if (person.y > personBounds.y + personBounds.height) {
        person.y -= personBounds.height;
      }
    }
  }
});

export default app;
