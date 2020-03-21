import * as PIXI from "pixi.js";
import { person as personSprite } from "../assets/loader";
import { randn_bm, getAverageOfArray, getMedianOfArray } from "./utils";
import Person from "./person";
import Barrier from "./barrier";
import Config from "./config";
import ApexCharts from "apexcharts/dist/apexcharts.common.js";

class App {
  global_date = Config.FIRST_DATE;

  pixiapp: PIXI.Application;
  HUD_Date: PIXI.Text;
  HUD_Fps: PIXI.Text;
  fpsAvg: Array<number> = [];
  fpsLow = 0;
  fpsHigh = 0;
  bounds: PIXI.Rectangle;

  counts: {
    [key: string]: {
      dead: number;
      recovered: number;
      infected: number;
      not_infected: number;
    };
  } = {};

  barriers: Array<Barrier> = [];

  // holder to store the people
  people: {
    dead: Array<Person>;
    recovered: Array<Person>;
    infected: Array<Person>;
    not_infected: Array<Person>;
  } = {
    dead: [],
    recovered: [],
    infected: [],
    not_infected: []
  };

  apexChart: ApexCharts;

  constructor() {
    this.pixiapp = new PIXI.Application({ backgroundColor: 0xeeeeee });

    const loader = PIXI.Loader.shared;
    loader.add("personSprite", personSprite);
    loader.load((loader, resources) => {
      for (let i = 0; i < Config.PEOPLE_COUNT; i++) {
        const person = new Person({
          texture: resources.personSprite.texture,
          bounds: this.bounds
        });
        this.people.not_infected.push(person);
        this.pixiapp.stage.addChild(person.sprite);
      }
      // infect one at random
      const person = this.people.not_infected.pop();
      person.infected = this.global_date;
      this.people.infected.push(person);
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
    const boundsPadding = 0;
    this.bounds = new PIXI.Rectangle(
      -boundsPadding,
      -boundsPadding,
      this.pixiapp.screen.width + boundsPadding * 2,
      this.pixiapp.screen.height + boundsPadding * 2
    );

    this.pixiapp.renderer.plugins.interaction.on("pointerup", event => {
      const barrier = new Barrier({
        x: event.data.global.x,
        y: event.data.global.y,
        size: Config.BARRIER_RANGE
      });
      this.barriers.push(barrier);
      this.pixiapp.stage.addChild(barrier.sprite);
    });

    this.pixiapp.ticker.add(this._ticker);

    const options = {
      chart: {
        // type: "line",
        height: 200,
        width: 800
      },
      dataLabels: {
        enabled: false
      },
      series: [
        {
          name: "dead",
          data: [{ x: Config.FIRST_DATE, y: 0 }]
        },
        {
          name: "recovered",
          data: [{ x: Config.FIRST_DATE, y: 0 }]
        },
        {
          name: "infected",
          data: [{ x: Config.FIRST_DATE, y: 1 }]
        },
        {
          name: "not_infected",
          data: [{ x: Config.FIRST_DATE, y: Config.PEOPLE_COUNT - 1 }]
        }
      ],
      xaxis: {
        type: "datetime"
      }
    };
    this.apexChart = new ApexCharts(document.querySelector("#chart"), options);
    this.apexChart.render();
    const getSerie = (name: string) =>
        ({name, data:Object.entries(this.counts).map(([k, v])=>({x: new Date(k), y: v[name]}))})
    const redrawChart = () => {
      const newSeries = [
        getSerie("dead"),
        getSerie("recovered"),
        getSerie("infected"),
        getSerie("not_infected")
      ];
      this.apexChart.updateSeries(newSeries);
      if (
        this.counts[this.global_date.toISOString().split("T")[0]]?.infected != 0
      ) {
        setTimeout(redrawChart, 100);
      }
    }
    setTimeout(redrawChart, 0)
  }

  _ticker = () => {
    // add one day
    this.global_date = new Date(
      +this.global_date + Config.MINUTES_TICK * 60 * 1000
    );
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
        (this.global_date.valueOf() - person.infected.valueOf()) /
          1000 /
          60 /
          60 /
          24 >
        Config.DAYS_TO_CURE
      ) {
        const [p] = this.people.infected.splice(i, 1);
        if (p.age < randn_bm(-200, 110, 0.25)) {
          p.recovered = true;
          p.sprite.tint = 0x00ff00;
          this.people.recovered.push(p);
        } else {
          // TODO: the rand max number changes if there is more health system capacity
          // TODO: give a second chance if there are free beds
          p.dead = true;
          p.sprite.tint = 0xaaaaaa;
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
          Math.abs(other.sprite.x - person.sprite.x) +
            Math.abs(other.sprite.y - person.sprite.y) <
            10 &&
          Math.random() < Config.CONTAGION_PROBABILITY
        ) {
          const [p] = this.people.not_infected.splice(i, 1);
          p.sprite.tint = 0xff0000;
          p.infected = this.global_date;
          newinfected.push(p);
          break;
        }
      }
    }
    this.people.infected.push(...newinfected);

    for (const p of this.people.not_infected) {
      p.moveStep(this.barriers);
    }
    for (const p of this.people.infected) {
      p.moveStep(this.barriers);
    }
    for (const p of this.people.recovered) {
      p.moveStep(this.barriers);
    }

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
  };
}

export default App;
