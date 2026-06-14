export type FileKind = "Markdown" | "PlainText";

export interface LoadedFile {
  path: string;
  text: string;
  encoding: string;
  kind: FileKind;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  sessionRestore: boolean;
  autoReload: boolean;
  fontFamily: string | null;
  fontSize: number;
  defaultEncoding: string;
}
