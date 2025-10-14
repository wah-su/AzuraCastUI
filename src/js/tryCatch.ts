type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

type TCError = {
  message: string;
  code: number;
};

export async function tryCatch<T, E = TCError>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export function generateError(message: string, code: number): TCError {
  return { message: message, code: code };
}
