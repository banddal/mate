export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function differenceInSeconds(later: Date, earlier: Date) {
  return Math.floor((later.getTime() - earlier.getTime()) / 1000);
}
