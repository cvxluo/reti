export {};

declare global {
  type IgvBrowserOptions = Record<string, unknown>;

  // Global UMD export from igv/dist/igv.min.js
  const igv: {
    createBrowser(
      element: HTMLElement,
      options: IgvBrowserOptions
    ): Promise<unknown>;
  };
}

// Allow side-effect imports for the UMD build
declare module "igv/dist/igv.min.js" {
  const src: unknown;
  export default src;
}
declare module "igv/dist/igv.js" {
  const src: unknown;
  export default src;
}
declare module "igv/dist/*" {
  const src: unknown;
  export default src;
}
