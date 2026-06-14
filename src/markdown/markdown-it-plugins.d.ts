declare module "markdown-it-task-lists" {
  import type { PluginWithOptions } from "markdown-it";
  interface TaskListsOptions {
    enabled?: boolean;
    label?: boolean;
    lineNumber?: boolean;
  }
  const plugin: PluginWithOptions<TaskListsOptions>;
  export default plugin;
}

declare module "markdown-it-footnote" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}
