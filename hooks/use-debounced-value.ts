import {
    useEffect,
    useState,
} from 'react';

export function useDebouncedValue<T>(
  value: T,
  delayMilliseconds: number
): T {
  const [
    debouncedValue,
    setDebouncedValue,
  ] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        setDebouncedValue(value);
      },
      delayMilliseconds
    );

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    delayMilliseconds,
    value,
  ]);

  return debouncedValue;
}