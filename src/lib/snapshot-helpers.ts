export function filterLotteryNumbersByPeriod<T extends { period: number }>(
  numbers: T[],
  period: number,
): T[] {
  return numbers.filter((number) => number.period === period);
}

export function toLotteryNumberViews<
  T extends { id: number; number: number; teamId: number },
>(numbers: T[], teamNames: Map<number, string>) {
  return numbers.map((number) => ({
    id: number.id,
    number: number.number,
    teamId: number.teamId,
    teamName: teamNames.get(number.teamId) ?? `#${number.teamId}`,
  }));
}
