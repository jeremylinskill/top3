const TIME_ZONE = 'America/Toronto';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function torontoParts(date: Date): WallTime {
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Invalid scheduling date.');
  }

  const parts = formatter.formatToParts(date);
  const read = (type: string) => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new Error('Unable to interpret Toronto time.');
    }
    return Number(value);
  };

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

export function combineTorontoScheduleTime(
  selectedDate: Date,
  selectedTime: Date
): string {
  const day = torontoParts(selectedDate);
  const time = torontoParts(selectedTime);

  const target: WallTime = {
    ...day,
    hour: time.hour,
    minute: time.minute,
  };

  const utcBase = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute
  );

  // Discover offsets around the chosen day using
  // the IANA time-zone rules, rather than fixed offsets.
  const offsets = new Set<number>();

  for (const hours of [-24, 0, 24]) {
    const sample = new Date(utcBase + hours * 3600000);
    const wall = torontoParts(sample);
    const wallAsUTC = Date.UTC(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      wall.minute
    );

    offsets.add((wallAsUTC - sample.getTime()) / 60000);
  }

  const matches = [...offsets]
    .map((offset) => new Date(utcBase - offset * 60000))
    .filter((candidate) => {
      const wall = torontoParts(candidate);
      return (
        wall.year === target.year &&
        wall.month === target.month &&
        wall.day === target.day &&
        wall.hour === target.hour &&
        wall.minute === target.minute
      );
    });

  if (matches.length !== 1) {
    throw new Error(
      'This Toronto time is unavailable or occurs twice due to daylight saving time. Choose another time.'
    );
  }

  const scheduledAt = matches[0];

  if (scheduledAt.getTime() <= Date.now() + 60000) {
    throw new Error(
      'Choose a scheduling time more than one minute in the future.'
    );
  }

  return scheduledAt.toISOString();
}
