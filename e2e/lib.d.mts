// Types for the JavaScript helpers in lib.mjs, so the TypeScript harnesses can import them.
export function playwright(): Promise<any>
export function serve(dir: string, port?: number): Promise<{ server: { close(): void }; url: string }>
export function launch(pw: any, opts?: { dpr?: number; width?: number; height?: number }): Promise<{ browser: any; page: any }>
