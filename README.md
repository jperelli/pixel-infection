# pixel-infection

A game about virus spread and trying to contain it.

![Imgur](https://i.imgur.com/DP0DS0X.gif)

It tries to resemble a simulation based on some characteristics of CoVid-19.

This was mostly a challenge to create a game for fun while I am isolated at home for CoVid-19. I tried to do it in less than 12 hours without much web gaming platforms knowledge. The code is pretty bad and the performance is ugly, it just works (tm). Seems like pixi.js worked well out of the box, but I still need to work a lot on performance and UI for this to be something nice.

## Run online

http://jperelli.github.io/pixel-infection

## Clone and run locally

```bash
git clone git@github.com:jperelli/pixel-infection.git
cd pixel-infection
npm install
npm run start
```
Navigate to [http://localhost:1234](http://localhost:1234)

## Variables to play with

```javascript
const PEOPLE_COUNT = 1000;
const FIRST_DATE = new Date("2019-11-17");
const MINUTES_TICK = 60;
const DAYS_TO_CURE = 14;
// TODO: const BEDS_PER_THOUSAND = 5;
const OFFSET_FACTOR = 10; // 10 to 20 // bigger is less movement
const SPEED_FACTOR = 2; // 1 to 5 // biger is people moving faster
const CONTAGION_PROBABILITY = 1; // 0.1 to 1
const BARRIER_RANGE = 10; // 10
```

## Credits

 - Initial pixi+parcel code https://github.com/llorenspujol/parcel-pixijs-quickstarter.git
 - Dependencies/libraries authors
 - The rest Julian Perelli
