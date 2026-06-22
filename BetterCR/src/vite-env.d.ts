/// <reference types="vite/client" />

/**
 * `@crxjs/vite-plugin` exposes script entry points through the `?script`
 * import suffix. The default export is the runtime path to pass to
 * `chrome.runtime.getURL`.
 */
declare module '*?script' {
  const src: string;
  export default src;
}

declare module '*?script&module' {
  const src: string;
  export default src;
}
