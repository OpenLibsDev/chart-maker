// Type definitions for Chart-Maker 1.0.0

export interface ChartMakerTheme {
  fg?: string;
  surface?: string;
  grid?: string;
  font?: string;
  palette?: string[];
}

export interface ChartMakerBackground {
  type?: "transparent" | "color" | "image";
  color?: string;
  image?: string | null;
}

export interface ChartMakerCreateOptions {
  locale?: string;
  theme?: ChartMakerTheme;
  libraries?: Record<string, boolean>;
  animation?: boolean;
  state?: any;
  urls?: ChartMakerUrls;
  onLog?: (key: string, type: string) => void;
}

export interface ChartMakerUrls {
  chartUrl?: string;
  worldUrl?: string;
  avifUrl?: string;
  modules?: Record<string, string>;
}

export interface ChartTypeInfo {
  key: string;
  label: string;
  input: string;
  ctype: string;
  combo: boolean;
}

export interface JournalEntry {
  time: string;
  key?: string;
  arg?: string;
  msg?: string;
  type: string;
}

export interface ChartMakerInstance {
  setType(type: string): ChartMakerInstance;
  getType(): string;
  setTitle(s: string): ChartMakerInstance;
  setDatasetLabel(s: string): ChartMakerInstance;
  setState(state: any): ChartMakerInstance;
  getState(): any;
  setBackground(bg: ChartMakerBackground): ChartMakerInstance;
  setTheme(theme: ChartMakerTheme): ChartMakerInstance;
  getTheme(): ChartMakerTheme;
  setAnimation(on: boolean): ChartMakerInstance;
  getAnimation(): boolean;
  setLocale(code: string): ChartMakerInstance;
  getLocale(): string;
  setLibraries(map: Record<string, boolean>): ChartMakerInstance;
  getLibraries(): Record<string, boolean>;
  getTypes(): ChartTypeInfo[];
  getCountries(): Promise<Array<{ value: string; label: string }>>;
  getDataLines(): string[];
  loadMath(): Promise<void>;
  mathReady(): boolean;
  evalNumber(v: string | number): number;
  t(key: string): string;
  render(): ChartMakerInstance;
  undo(): ChartMakerInstance;
  redo(): ChartMakerInstance;
  canUndo(): boolean;
  canRedo(): boolean;
  exportImage(o?: { format?: string; width?: number; height?: number; filename?: string; includeData?: boolean }): ChartMakerInstance;
  saveProject(o?: { filename?: string; includeHistory?: boolean }): ChartMakerInstance;
  loadProject(obj: any): ChartMakerInstance;
  log(key: string, type?: string, arg?: string): ChartMakerInstance;
  getJournal(): JournalEntry[];
  clearJournal(): ChartMakerInstance;
  journalText(e: JournalEntry): string;
  on(event: "change" | "statechange" | "message" | "locale" | "log" | "journal" | string, cb: (data: any) => void): ChartMakerInstance;
  off(event: string, cb: (data: any) => void): ChartMakerInstance;
  destroy(): void;
}

export interface ChartMakerStatic {
  version: string;
  locales: Record<string, Record<string, any>>;
  registerLocale(code: string, strings: Record<string, any>): ChartMakerStatic;
  setUrls(urls: ChartMakerUrls): void;
  loadLocaleJS(code: string, url: string): Promise<void>;
  loadLocaleJSON(code: string, url: string): Promise<void>;
  create(container: string | HTMLElement, options?: ChartMakerCreateOptions): ChartMakerInstance;
}

declare const ChartMaker: ChartMakerStatic;
export default ChartMaker;
export const create: ChartMakerStatic["create"];
export const registerLocale: ChartMakerStatic["registerLocale"];
export const loadLocaleJS: ChartMakerStatic["loadLocaleJS"];
export const loadLocaleJSON: ChartMakerStatic["loadLocaleJSON"];
export const registerCountries: ChartMakerStatic["registerCountries"];
export const loadCountriesJS: ChartMakerStatic["loadCountriesJS"];
export const loadCountriesJSON: ChartMakerStatic["loadCountriesJSON"];
export const setUrls: ChartMakerStatic["setUrls"];
export const version: string;
