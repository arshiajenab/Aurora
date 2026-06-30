"use client";

/**
 * Returns true only after the component has mounted on the client.
 *
 * Used to gate rendering of persisted client stores (cart/wishlist) so we
 * never render stale server markup that mismatches the hydrated client
 * state — a common source of hydration warnings.
 */
import * as React from "react";

export function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}
