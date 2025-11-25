declare module 'xlsx-populate' {
  interface Cell {
    value(value?: any): any;
    style(style: any): Cell;
  }

  interface Column {
    width(width: number): Column;
  }

  interface Sheet {
    name(name: string): Sheet;
    cell(row: number | string, col?: number): Cell;
    column(col: number | string): Column;
    addSheet(name: string): Sheet;
    addChart(options: any): any;
  }

  interface Workbook {
    sheet(index: number | string): Sheet;
    addSheet(name: string): Sheet;
    outputAsync(): Promise<Buffer>;
  }

  interface XlsxPopulateStatic {
    fromBlankAsync(): Promise<Workbook>;
  }

  const XlsxPopulate: XlsxPopulateStatic;
  export default XlsxPopulate;
}





