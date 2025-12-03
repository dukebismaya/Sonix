export type Debounced<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
};

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 420): Debounced<T> {
  let timer: number | undefined;

  const debounced = ((...args: Parameters<T>) => {
    if (timer) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => fn(...args), delay);
  }) as Debounced<T>;

  debounced.cancel = () => {
    if (timer) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };

  return debounced;
}
