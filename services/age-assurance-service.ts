import * as AgeRange from 'expo-age-range';
import {
    Platform,
} from 'react-native';

const TOP3_MINIMUM_AGE = 13;

export type AgeAssuranceResult =
  | {
      status: 'eligible';
      lowerBound: number;
      upperBound: number | null;
      ageRangeDeclaration:
        | 'selfDeclared'
        | 'guardianDeclared'
        | null;
    }
  | {
      status: 'underage';
      lowerBound: number | null;
      upperBound: number;
      ageRangeDeclaration:
        | 'selfDeclared'
        | 'guardianDeclared'
        | null;
    }
  | {
      status: 'declined';
    }
  | {
      status: 'unavailable';
    }
  | {
      status: 'unknown';
      lowerBound: number | null;
      upperBound: number | null;
      ageRangeDeclaration:
        | 'selfDeclared'
        | 'guardianDeclared'
        | null;
    }
  | {
      status: 'error';
      error: Error;
    };

type AgeRangeError = {
  code?: unknown;
  message?: unknown;
};

function getIosMajorVersion(): number | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const majorVersion =
    Number.parseInt(
      String(Platform.Version),
      10
    );

  return Number.isFinite(majorVersion)
    ? majorVersion
    : null;
}

function getErrorCode(
  error: unknown
): string | null {
  if (
    typeof error !== 'object' ||
    error === null
  ) {
    return null;
  }

  const possibleError =
    error as AgeRangeError;

  return typeof possibleError.code === 'string'
    ? possibleError.code
    : null;
}

function toError(
  error: unknown
): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null
  ) {
    const possibleError =
      error as AgeRangeError;

    if (
      typeof possibleError.message ===
      'string'
    ) {
      return new Error(
        possibleError.message
      );
    }
  }

  return new Error(
    'Unable to determine age range.'
  );
}

export async function requestTop3AgeAssurance(): Promise<
  AgeAssuranceResult
> {
  if (Platform.OS !== 'ios') {
    return {
      status: 'unavailable',
    };
  }

  const iosMajorVersion =
    getIosMajorVersion();

  if (
    iosMajorVersion === null ||
    iosMajorVersion < 26
  ) {
    return {
      status: 'unavailable',
    };
  }

  try {
    const response =
      await AgeRange.requestAgeRangeAsync({
        threshold1:
          TOP3_MINIMUM_AGE,
      });

    const {
      lowerBound,
      upperBound,
      ageRangeDeclaration = null,
    } = response;

    if (
      lowerBound !== null &&
      lowerBound >= TOP3_MINIMUM_AGE
    ) {
      return {
        status: 'eligible',
        lowerBound,
        upperBound,
        ageRangeDeclaration,
      };
    }

    if (
      upperBound !== null &&
      upperBound < TOP3_MINIMUM_AGE
    ) {
      return {
        status: 'underage',
        lowerBound,
        upperBound,
        ageRangeDeclaration,
      };
    }

    return {
      status: 'unknown',
      lowerBound,
      upperBound,
      ageRangeDeclaration,
    };
  } catch (error) {
    const code =
      getErrorCode(error);

    if (
      code ===
      'ERR_AGE_RANGE_USER_DECLINED'
    ) {
      return {
        status: 'declined',
      };
    }

    if (
      code ===
      'ERR_AGE_RANGE_NOT_AVAILABLE'
    ) {
      return {
        status: 'unavailable',
      };
    }

    return {
      status: 'error',
      error: toError(error),
    };
  }
}

export function getTop3MinimumAge() {
  return TOP3_MINIMUM_AGE;
}