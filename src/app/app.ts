import * as PIXI from "pixi.js";
import {
  person as personSprite,
  barrier as barrierSprite
} from "../assets/loader";

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

// holder to store the people
const people: {
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
      speed: Math.random() * SPEED_FACTOR,
      infected: infected ? null : FIRST_DATE,
      recovered: false,
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
    person.tint = !infected ? 0xff0000 : 0x4444aa;
    infected = true;
    return person;
  };

  for (let i = 0; i < PEOPLE_COUNT; i++) {
    const person = createSprite(personSprite);
    person.anchor.set(0.5);
    if (person.data.infected) {
      people.infected.push(person);
    } else {
      people.not_infected.push(person);
    }
    app.stage.addChild(person);
  }
});

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
    recovered: number;
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
  const barrier = PIXI.Sprite.from(barrierSprite);
  barrier.x = event.data.global.x;
  barrier.y = event.data.global.y;
  barriers.push(barrier);
  barrier.anchor.set(0.5);
  app.stage.addChild(barrier);
});

const movePeople = (people: Array<SpritePlusMeta>) => {
  for (let i = people.length - 1; i >= 0; i--) {
    const person = people[i];
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

/// FPS CODE
const getAverageOfArray = (array: number[]): number => {
  if (array.length === 0) {
    return 0;
  }
  const sum = array.reduce((previous, current) => (current += previous));
  return sum / array.length;
};

const getMedianOfArray = (array: number[]): number => {
  if (array.length === 0) {
    return 0;
  }
  const sortedArray = array.sort((a, b) => a - b);
  return (
    (sortedArray[(sortedArray.length - 1) >> 1] +
      sortedArray[sortedArray.length >> 1]) /
    2
  );
};

const fpsAvg: Array<number> = [];
let fpsLow = 0;
let fpsHigh = 0;

const HUD_Fps = new PIXI.Text("", {
  fill: "red",
  fontSize: 15
});
HUD_Fps.y = 30;
HUD_Fps.x = 0;
app.stage.addChild(HUD_Fps);
/// END FPS CODE

app.ticker.add(() => {
  // add one day
  global_date = new Date(+global_date + MINUTES_TICK * 60 * 1000);
  HUD_Date.text = global_date.toString();

  counts[global_date.toISOString().split("T")[0]] = {
    dead: people.dead.length,
    recovered: people.recovered.length,
    infected: people.infected.length,
    not_infected: people.not_infected.length
  };
  const HUD_totals = document.getElementById("totals");
  if (HUD_totals) {
    HUD_totals.innerHTML = JSON.stringify(
      counts[global_date.toISOString().split("T")[0]],
      undefined,
      2
    );
  }

  for (let i = people.infected.length - 1; i >= 0; i--) {
    const person = people.infected[i];
    if (
      (global_date.valueOf() - person.data.infected.valueOf()) /
        1000 /
        60 /
        60 /
        24 >
      DAYS_TO_CURE
    ) {
      const [p] = people.infected.splice(i, 1);
      if (p.data.age < randn_bm(-200, 110, 0.25)) {
        p.data.recovered = true;
        p.tint = 0x00ff00;
        people.recovered.push(p);
      } else {
        // TODO: the rand max number changes if there is more health system capacity
        // TODO: give a second chance if there are free beds
        p.data.dead = true;
        p.tint = 0xaaaaaa;
        people.dead.push(p);
      }
    }
  }

  // iterate through the people and infect the person near to an infected one
  let newinfected = []
  for (let i = people.not_infected.length - 1; i >= 0; i--) {
    const person = people.not_infected[i];
    for (let j = people.infected.length - 1; j >= 0; j--) {
      const other = people.infected[j];
      if (
        Math.abs(other.x - person.x) + Math.abs(other.y - person.y) < 10 &&
        Math.random() < CONTAGION_PROBABILITY
      ) {
        const [p] = people.not_infected.splice(i, 1);
        p.tint = 0xff0000;
        p.data.infected = global_date;
        newinfected.push(p);
        break;
      }
    }
  }
  people.infected.push(...newinfected)

  movePeople(people.not_infected)
  movePeople(people.infected)
  movePeople(people.recovered)


  // print FPS
  const avg = getAverageOfArray(fpsAvg).toFixed(3);
  const median = getMedianOfArray(fpsAvg);
  const fps = Number(app.ticker.FPS.toFixed(3));
  HUD_Fps.text = `fps: ${fps}\nlow: ${fpsLow}\nhigh: ${fpsHigh}\navg: ${avg}\nmed: ${median}`;
  if (fps < fpsLow) {
    fpsLow = fps;
  }
  if (fps > fpsHigh) {
    fpsHigh = fps;
  }
  if (fpsAvg.length > 10) {
    fpsAvg.shift();
  }
  fpsAvg.push(fps);
});

export default app;
