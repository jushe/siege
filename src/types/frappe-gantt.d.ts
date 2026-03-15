declare module "frappe-gantt" {
  interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }

  interface GanttOptions {
    view_mode?: string;
    bar_height?: number;
    column_width?: number;
    padding?: number;
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void;
    on_progress_change?: (task: GanttTask, progress: number) => void;
    on_click?: (task: GanttTask) => void;
  }

  class Gantt {
    constructor(
      element: string | HTMLElement,
      tasks: GanttTask[],
      options?: GanttOptions
    );
    refresh(tasks: GanttTask[]): void;
    change_view_mode(mode: string): void;
  }

  export default Gantt;
}
