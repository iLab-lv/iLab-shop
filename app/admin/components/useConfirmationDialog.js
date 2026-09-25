'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function useConfirmationDialog() {
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  const settle = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions) => {
    resolverRef.current?.(false);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  useEffect(() => () => resolverRef.current?.(false), []);

  return {
    confirm,
    dialogProps: options ? {
      ...options,
      open: true,
      onConfirm: () => settle(true),
      onCancel: () => settle(false),
    } : { open: false },
  };
}
