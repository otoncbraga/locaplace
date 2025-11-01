import { useEffect, useState } from 'react';

export const useFirestoreCollection = <T,>(
  subscribe: (callback: (items: T[]) => void) => () => void
) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribe(data => {
      setItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [subscribe]);

  return { items, loading };
};
