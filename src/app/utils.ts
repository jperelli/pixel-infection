// randn_bm(-200,110, 0.25) algo asi anda bien creo
// from https://stackoverflow.com/a/49434653/912450
export const randn_bm = (min, max, skew) => {
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

export const getAverageOfArray = (array: number[]): number => {
  if (array.length === 0) {
    return 0;
  }
  const sum = array.reduce((previous, current) => (current += previous));
  return sum / array.length;
};

export const getMedianOfArray = (array: number[]): number => {
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
