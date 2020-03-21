import * as dat from "dat.gui";

const Config = {
  PEOPLE_COUNT: 1000,
  FIRST_DATE: new Date("2019-11-17"),
  MINUTES_TICK: 60,
  DAYS_TO_CURE: 14,
  BEDS_PER_THOUSAND: 5,
  OFFSET_FACTOR: 10, // 10 to 20 // bigger is less movement
  SPEED_FACTOR: 2, // 1 to 5 // biger is people moving faster
  CONTAGION_PROBABILITY: 1, // 0.1 to 1
  BARRIER_RANGE: 10 // 10
};

const gui = new dat.GUI();

gui.add(Config, "CONTAGION_PROBABILITY", 0, 1);
gui.add(Config, "OFFSET_FACTOR", 0, 100);

export default Config;
