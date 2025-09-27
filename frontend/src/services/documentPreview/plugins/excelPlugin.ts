/**
 * Production-Level Excel Preview Plugin
 * Comprehensive Excel/Spreadsheet file processing with robust error handling
 * Supports: XLS, XLSX, CSV, ODS with full data extraction
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface ExcelWorksheet {
  name: string;
  data: any[][];
  range: string;
  rowCount: number;
  colCount: number;
  hasHeaders: boolean;
  dataTypes: string[];
  formulas: { [cell: string]: string };
}

interface ExcelWorkbook {
  sheets: ExcelWorksheet[];
  activeSheet: number;
  fileName: string;
  fileSize: number;
  metadata: {
    creator?: string;
    lastModified?: string;
    application?: string;
    version?: string;
  };
}

export class ExcelPreviewPlugin implements PreviewPlugin {
  name = 'ProductionExcelPreview';
  priority = 93; // High priority for production use

  supportedMimeTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
    'application/csv'
  ];

  supportedExtensions = ['.xls', '.xlsx', '.ods', '.csv'];

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    return this.supportedMimeTypes.includes(mimeType) ||
           (extension && this.supportedExtensions.includes(`.${extension}`));
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    try {
      console.log(`📊 Excel Plugin: Processing ${fileName} (${mimeType})`);

      // Determine file type and processing strategy
      const extension = fileName.toLowerCase().split('.').pop();
      let workbook: ExcelWorkbook;

      try {
        if (extension === 'csv' || mimeType.includes('csv')) {
          workbook = await this.processCSVFile(blob, fileName);
        } else {
          workbook = await this.processSpreadsheetFile(blob, fileName, extension || '');
        }
      } catch (error) {
        console.warn('⚠️ Advanced processing failed, trying simple text extraction:', error);
        workbook = await this.extractSimpleSpreadsheetContent(blob, fileName, extension || '');
      }

      const previewHtml = this.generateProductionViewer(workbook);

      return {
        type: 'success',
        format: 'html',
        content: previewHtml,
        metadata: {
          title: fileName,
          creator: workbook.metadata.creator || 'Excel'
        }
      };
    } catch (error) {
      console.error('❌ Excel Plugin Error:', error);
      // Even if everything fails, provide a basic preview
      return await this.generateBasicSpreadsheetPreview(blob, fileName, error);
    }
  }

  private async processSpreadsheetFile(blob: Blob, fileName: string, extension: string): Promise<ExcelWorkbook> {
    try {
      // Import XLSX library with proper error handling
      const XLSX = await import('xlsx');

      // Configure read options for maximum compatibility
      const readOptions = {
        type: 'array' as const,
        cellDates: true,
        cellNF: false,
        cellStyles: false,
        sheetStubs: false,
        bookProps: true,
        bookSheets: true,
        bookVBA: false,
        password: undefined,
        cellText: false,
        cellFormula: true,
        cellHTML: false
      };

      const arrayBuffer = await blob.arrayBuffer();
      console.log(`✅ Excel Plugin: File loaded, size: ${arrayBuffer.byteLength} bytes`);

      // Validate file contents before processing
      if (arrayBuffer.byteLength === 0) {
        throw new Error('File appears to be empty');
      }

      // Add basic file validation based on file header
      const uint8Array = new Uint8Array(arrayBuffer);
      const fileHeader = Array.from(uint8Array.slice(0, 8)).map(byte => byte.toString(16).padStart(2, '0')).join('');

      // XLSX files typically start with PK (ZIP signature)
      if (extension === 'xlsx' && !fileHeader.startsWith('504b')) {
        throw new Error('This file does not appear to be a valid XLSX document. XLSX files are ZIP-based archives. The file may be corrupted or renamed incorrectly.');
      }

      const workbook = XLSX.read(arrayBuffer, readOptions);
      console.log(`✅ Excel Plugin: Workbook parsed, sheets: ${workbook.SheetNames.length}`);

      const sheets: ExcelWorksheet[] = [];

      // Process each worksheet with comprehensive data extraction
      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i];
        const worksheet = workbook.Sheets[sheetName];

        try {
          const sheetData = this.extractSheetData(worksheet, sheetName, XLSX);
          sheets.push(sheetData);
          console.log(`✅ Sheet "${sheetName}": ${sheetData.rowCount} rows, ${sheetData.colCount} cols`);
        } catch (sheetError) {
          console.warn(`⚠️ Failed to process sheet "${sheetName}":`, sheetError);
          // Add error sheet
          sheets.push({
            name: sheetName,
            data: [['Error processing sheet data']],
            range: 'A1',
            rowCount: 1,
            colCount: 1,
            hasHeaders: false,
            dataTypes: ['error'],
            formulas: {}
          });
        }
      }

      return {
        sheets,
        activeSheet: 0,
        fileName,
        fileSize: blob.size,
        metadata: {
          creator: (workbook.Props as any)?.Creator || undefined,
          lastModified: (workbook.Props as any)?.ModifiedDate?.toISOString() || undefined,
          application: (workbook.Props as any)?.Application || extension.toUpperCase(),
          version: (workbook.Props as any)?.AppVersion || undefined
        }
      };
    } catch (error) {
      console.error('❌ Spreadsheet processing failed:', error);
      throw new Error(`Failed to process ${extension.toUpperCase()} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractSheetData(worksheet: any, sheetName: string, XLSX: any): ExcelWorksheet {
    // Get sheet range
    const range = worksheet['!ref'] || 'A1';

    // Extract data as 2D array with proper handling of empty cells
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: true,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    // Ensure we have data
    if (!rawData || rawData.length === 0) {
      return {
        name: sheetName,
        data: [['No data available']],
        range: 'A1',
        rowCount: 1,
        colCount: 1,
        hasHeaders: false,
        dataTypes: ['empty'],
        formulas: {}
      };
    }

    // Normalize data - ensure all rows have same column count
    const maxCols = Math.max(...rawData.map((row: any) => Array.isArray(row) ? row.length : 0));
    const normalizedData = rawData.map((row: any) => {
      if (!Array.isArray(row)) return Array(maxCols).fill('');
      const normalized = [...row];
      while (normalized.length < maxCols) normalized.push('');
      return normalized;
    });

    // Detect headers (heuristic: first row has mostly text, second row has different pattern)
    const hasHeaders = this.detectHeaders(normalizedData);

    // Analyze data types for each column
    const dataTypes = this.analyzeColumnTypes(normalizedData, hasHeaders);

    // Extract formulas if available
    const formulas = this.extractFormulas(worksheet);

    // Limit data for preview (show first 100 rows max)
    const previewData = normalizedData.slice(0, 100);

    return {
      name: sheetName,
      data: previewData,
      range,
      rowCount: normalizedData.length,
      colCount: maxCols,
      hasHeaders,
      dataTypes,
      formulas
    };
  }

  private async processCSVFile(blob: Blob, fileName: string): Promise<ExcelWorkbook> {
    try {
      const text = await blob.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Detect CSV delimiter
      const delimiter = this.detectCSVDelimiter(lines[0]);

      // Parse CSV data
      const data = lines.map(line => this.parseCSVLine(line, delimiter));

      // Normalize column count
      const maxCols = Math.max(...data.map(row => row.length));
      const normalizedData = data.map(row => {
        const normalized = [...row];
        while (normalized.length < maxCols) normalized.push('');
        return normalized;
      });

      const hasHeaders = this.detectHeaders(normalizedData);
      const dataTypes = this.analyzeColumnTypes(normalizedData, hasHeaders);

      const worksheet: ExcelWorksheet = {
        name: 'CSV Data',
        data: normalizedData.slice(0, 100), // Preview limit
        range: `A1:${this.getColumnName(maxCols)}${normalizedData.length}`,
        rowCount: normalizedData.length,
        colCount: maxCols,
        hasHeaders,
        dataTypes,
        formulas: {}
      };

      return {
        sheets: [worksheet],
        activeSheet: 0,
        fileName,
        fileSize: blob.size,
        metadata: {
          application: 'CSV',
          creator: 'CSV Parser'
        }
      };
    } catch (error) {
      console.error('❌ CSV processing failed:', error);
      throw new Error(`Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectCSVDelimiter(firstLine: string): string {
    const delimiters = [',', ';', '\t', '|'];
    const counts = delimiters.map(delimiter =>
      (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length
    );
    const maxCount = Math.max(...counts);
    const bestDelimiter = delimiters[counts.indexOf(maxCount)];
    return maxCount > 0 ? bestDelimiter : ',';
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        if (nextChar === quoteChar) {
          current += char;
          i++; // Skip next quote
        } else {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (!inQuotes && char === delimiter) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result.map(cell => cell.replace(/^["']|["']$/g, ''));
  }

  private detectHeaders(data: any[][]): boolean {
    if (data.length < 2) return false;

    const firstRow = data[0];
    const secondRow = data[1];

    // Count numeric values in each row
    const firstRowNumeric = firstRow.filter(cell =>
      cell !== '' && !isNaN(Number(cell)) && isFinite(Number(cell))
    ).length;
    const secondRowNumeric = secondRow.filter(cell =>
      cell !== '' && !isNaN(Number(cell)) && isFinite(Number(cell))
    ).length;

    // If first row has significantly fewer numbers, likely headers
    return firstRowNumeric < secondRowNumeric * 0.7;
  }

  private analyzeColumnTypes(data: any[][], hasHeaders: boolean): string[] {
    if (data.length === 0) return [];

    const startRow = hasHeaders ? 1 : 0;
    const dataRows = data.slice(startRow);
    const columnCount = data[0].length;
    const types: string[] = [];

    for (let col = 0; col < columnCount; col++) {
      const columnValues = dataRows.map(row => row[col]).filter(val => val !== '');

      if (columnValues.length === 0) {
        types.push('empty');
        continue;
      }

      let numberCount = 0;
      let dateCount = 0;
      let booleanCount = 0;

      columnValues.forEach(value => {
        const str = String(value).trim();

        if (!isNaN(Number(str)) && isFinite(Number(str))) {
          numberCount++;
        } else if (this.isDateString(str)) {
          dateCount++;
        } else if (/^(true|false|yes|no|y|n)$/i.test(str)) {
          booleanCount++;
        }
      });

      const total = columnValues.length;

      if (numberCount / total > 0.8) types.push('number');
      else if (dateCount / total > 0.6) types.push('date');
      else if (booleanCount / total > 0.8) types.push('boolean');
      else types.push('text');
    }

    return types;
  }

  private isDateString(value: string): boolean {
    if (!value || value.length < 8) return false;

    const date = new Date(value);
    return !isNaN(date.getTime()) &&
           /\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(value);
  }

  private extractFormulas(worksheet: any): { [cell: string]: string } {
    const formulas: { [cell: string]: string } = {};

    Object.keys(worksheet).forEach(cellAddress => {
      const cell = worksheet[cellAddress];
      if (cell && cell.f) {
        formulas[cellAddress] = cell.f;
      }
    });

    return formulas;
  }

  private getColumnName(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  private generateProductionViewer(workbook: ExcelWorkbook): string {
    const { sheets, fileName, fileSize, metadata } = workbook;
    const fileSizeFormatted = this.formatFileSize(fileSize);

    // Generate sheet tabs
    const sheetTabs = sheets.map((sheet, index) =>
      `<button onclick="showSheet(${index})"
        class="sheet-tab ${index === 0 ? 'active' : ''}"
        data-sheet="${index}"
        title="${this.escapeHtml(sheet.name)} - ${sheet.rowCount} rows">
        <span class="sheet-name">${this.escapeHtml(sheet.name)}</span>
        <span class="sheet-info">${sheet.rowCount}×${sheet.colCount}</span>
      </button>`
    ).join('');

    // Generate sheet contents
    const sheetContents = sheets.map((sheet, index) =>
      this.generateSheetViewer(sheet, index)
    ).join('');

    // Calculate total statistics
    const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);
    const totalCells = sheets.reduce((sum, sheet) => sum + (sheet.rowCount * sheet.colCount), 0);
    const formulaCount = sheets.reduce((sum, sheet) => sum + Object.keys(sheet.formulas).length, 0);

    return `
      <div class="excel-production-viewer">
        <style>
          .excel-production-viewer {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
          }

          .excel-header {
            background: linear-gradient(135deg, #0f7b0f 0%, #0d6a0d 100%);
            color: white;
            padding: 1rem 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }

          .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            max-width: 1200px;
            margin: 0 auto;
          }

          .file-info {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .excel-icon {
            font-size: 2.5rem;
            background: rgba(255,255,255,0.2);
            padding: 0.5rem;
            border-radius: 8px;
          }

          .file-details h1 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
          }

          .file-metadata {
            font-size: 0.875rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }

          .stats-summary {
            text-align: right;
            font-size: 0.875rem;
          }

          .stats-grid {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem 1.5rem;
          }

          .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1.5rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .stat-item {
            text-align: center;
          }

          .stat-value {
            display: block;
            font-size: 1.25rem;
            font-weight: 700;
            color: #0f7b0f;
            margin-bottom: 0.25rem;
          }

          .stat-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .sheet-tabs-container {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 0 1.5rem;
            overflow-x: auto;
          }

          .sheet-tabs {
            display: flex;
            gap: 0.25rem;
            min-width: max-content;
          }

          .sheet-tab {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-bottom: none;
            padding: 0.75rem 1rem;
            cursor: pointer;
            border-radius: 6px 6px 0 0;
            transition: all 0.2s ease;
            min-width: 120px;
            text-align: left;
          }

          .sheet-tab:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
          }

          .sheet-tab.active {
            background: white;
            border-color: #0f7b0f;
            border-bottom: 1px solid white;
            margin-bottom: -1px;
          }

          .sheet-name {
            display: block;
            font-weight: 600;
            font-size: 0.875rem;
            color: #1e293b;
            margin-bottom: 0.125rem;
          }

          .sheet-info {
            font-size: 0.75rem;
            color: #64748b;
          }

          .sheet-content {
            display: none;
            flex: 1;
            overflow: hidden;
          }

          .sheet-content.active {
            display: flex;
            flex-direction: column;
          }

          .table-container {
            flex: 1;
            overflow: auto;
            background: white;
            margin: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          .excel-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 0.875rem;
          }

          .excel-table th {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 0.75rem 0.5rem;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 10;
            white-space: nowrap;
          }

          .excel-table td {
            border: 1px solid #e2e8f0;
            padding: 0.5rem;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .excel-table tr:nth-child(even) {
            background: #f8fafc;
          }

          .excel-table tr:hover {
            background: #e0f2fe;
          }

          .cell-number {
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #0369a1;
          }

          .cell-date {
            color: #7c3aed;
          }

          .cell-boolean {
            text-align: center;
            color: #059669;
            font-weight: 600;
          }

          .cell-formula {
            background: #fef3c7;
            color: #92400e;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.8rem;
          }

          .row-header {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 0.5rem;
            text-align: center;
            font-weight: 600;
            color: #64748b;
            min-width: 50px;
            position: sticky;
            left: 0;
            z-index: 5;
          }

          .truncation-notice {
            background: #fef3c7;
            color: #92400e;
            padding: 0.75rem 1.5rem;
            text-align: center;
            font-size: 0.875rem;
            border-top: 1px solid #fbbf24;
          }

          .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            color: #64748b;
          }

          .error-state {
            background: #fef2f2;
            color: #dc2626;
            padding: 1rem 1.5rem;
            margin: 1rem 1.5rem;
            border-radius: 8px;
            border: 1px solid #fecaca;
          }

          @media (max-width: 768px) {
            .excel-header { padding: 0.75rem 1rem; }
            .stats-grid { padding: 0.75rem 1rem; }
            .sheet-tabs-container { padding: 0 1rem; }
            .table-container { margin: 0.75rem 1rem; }
            .stat-value { font-size: 1rem; }
            .header-content { flex-direction: column; gap: 0.75rem; text-align: center; }
          }
        </style>

        <div class="excel-header">
          <div class="header-content">
            <div class="file-info">
              <div class="excel-icon">📊</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-metadata">
                  ${fileSizeFormatted} • ${metadata.application || 'Excel'}
                  ${metadata.creator ? `• Created by ${this.escapeHtml(metadata.creator)}` : ''}
                </div>
              </div>
            </div>
            <div class="stats-summary">
              <div><strong>${sheets.length}</strong> sheet${sheets.length !== 1 ? 's' : ''}</div>
              <div><strong>${totalRows.toLocaleString()}</strong> total rows</div>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stats-container">
            <div class="stat-item">
              <span class="stat-value">${sheets.length}</span>
              <span class="stat-label">Worksheets</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${totalRows.toLocaleString()}</span>
              <span class="stat-label">Total Rows</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${totalCells.toLocaleString()}</span>
              <span class="stat-label">Total Cells</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${formulaCount}</span>
              <span class="stat-label">Formulas</span>
            </div>
          </div>
        </div>

        <div class="sheet-tabs-container">
          <div class="sheet-tabs">
            ${sheetTabs}
          </div>
        </div>

        ${sheetContents}

        <script>
          function showSheet(sheetIndex) {
            // Hide all sheets
            document.querySelectorAll('.sheet-content').forEach(sheet => {
              sheet.classList.remove('active');
            });

            // Remove active from all tabs
            document.querySelectorAll('.sheet-tab').forEach(tab => {
              tab.classList.remove('active');
            });

            // Show selected sheet
            const targetSheet = document.querySelector('.sheet-content[data-sheet="' + sheetIndex + '"]');
            const targetTab = document.querySelector('.sheet-tab[data-sheet="' + sheetIndex + '"]');

            if (targetSheet && targetTab) {
              targetSheet.classList.add('active');
              targetTab.classList.add('active');
            }
          }

          // Initialize first sheet
          document.addEventListener('DOMContentLoaded', function() {
            showSheet(0);
          });
        </script>
      </div>
    `;
  }

  private generateSheetViewer(sheet: ExcelWorksheet, index: number): string {
    const { data, hasHeaders, dataTypes, formulas, rowCount, colCount } = sheet;

    if (data.length === 0) {
      return `
        <div class="sheet-content" data-sheet="${index}">
          <div class="loading-state">
            <div>No data available in this sheet</div>
          </div>
        </div>
      `;
    }

    // Generate column headers
    const headers = data[0].map((header, colIndex) => {
      const columnLetter = this.getColumnName(colIndex + 1);
      const dataType = dataTypes[colIndex] || 'text';
      const typeIcon = this.getTypeIcon(dataType);

      return `
        <th title="Column ${columnLetter} - ${dataType}">
          <div style="display: flex; align-items: center; gap: 0.25rem;">
            <span>${typeIcon}</span>
            <span>${this.escapeHtml(hasHeaders ? String(header) : columnLetter)}</span>
          </div>
        </th>
      `;
    }).join('');

    // Generate data rows (skip header if detected)
    const startRow = hasHeaders ? 1 : 0;
    const displayRows = data.slice(startRow, startRow + 50); // Show max 50 rows

    const tableRows = displayRows.map((row, rowIndex) => {
      const actualRowNumber = startRow + rowIndex + 1;
      const cells = row.map((cell, colIndex) => {
        const cellAddress = `${this.getColumnName(colIndex + 1)}${actualRowNumber}`;
        const dataType = dataTypes[colIndex] || 'text';
        const hasFormula = formulas[cellAddress];

        let cellClass = `cell-${dataType}`;
        if (hasFormula) cellClass += ' cell-formula';

        const cellValue = this.formatCellValue(cell, dataType);
        const title = hasFormula ? `Formula: ${formulas[cellAddress]}` : String(cell);

        return `<td class="${cellClass}" title="${this.escapeHtml(title)}">${cellValue}</td>`;
      }).join('');

      return `
        <tr>
          <td class="row-header">${actualRowNumber}</td>
          ${cells}
        </tr>
      `;
    }).join('');

    const showingRows = displayRows.length;
    const totalRows = hasHeaders ? rowCount - 1 : rowCount;

    return `
      <div class="sheet-content" data-sheet="${index}">
        <div class="table-container">
          <table class="excel-table">
            <thead>
              <tr>
                <th style="min-width: 50px;">#</th>
                ${headers}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        ${totalRows > showingRows ? `
          <div class="truncation-notice">
            📊 Showing ${showingRows} of ${totalRows.toLocaleString()} data rows
            (${hasHeaders ? 'excluding header' : 'including all rows'})
          </div>
        ` : ''}
      </div>
    `;
  }

  private formatCellValue(value: any, dataType: string): string {
    if (value === null || value === undefined || value === '') {
      return '<span style="color: #9ca3af;">—</span>';
    }

    const strValue = String(value);

    switch (dataType) {
      case 'number':
        const num = Number(strValue);
        return isNaN(num) ? this.escapeHtml(strValue) : num.toLocaleString();

      case 'date':
        try {
          const date = new Date(strValue);
          return date.toLocaleDateString();
        } catch {
          return this.escapeHtml(strValue);
        }

      case 'boolean':
        const lowerValue = strValue.toLowerCase();
        if (['true', 'yes', 'y', '1'].includes(lowerValue)) return '✅ Yes';
        if (['false', 'no', 'n', '0'].includes(lowerValue)) return '❌ No';
        return this.escapeHtml(strValue);

      default:
        return this.escapeHtml(strValue);
    }
  }

  private getTypeIcon(dataType: string): string {
    switch (dataType) {
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'boolean': return '☑️';
      case 'text': return '📝';
      case 'empty': return '⭕';
      default: return '📄';
    }
  }

  private async extractSimpleSpreadsheetContent(blob: Blob, fileName: string, extension: string): Promise<ExcelWorkbook> {
    console.log('📊 Excel Plugin: Extracting simple spreadsheet content...');

    let data: string[][] = [];
    let hasTextContent = false;

    try {
      if (extension === 'csv') {
        // CSV files are plain text
        const text = await blob.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
        hasTextContent = data.length > 0;
      } else {
        // For Excel files, try to extract any readable text
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Extract readable text from binary data
        let extractedText = '';
        let consecutiveNulls = 0;

        for (let i = 0; i < Math.min(uint8Array.length, 50000); i++) { // Limit to first 50KB
          const char = uint8Array[i];

          if (char === 0) {
            consecutiveNulls++;
            if (consecutiveNulls < 3) extractedText += ' ';
          } else {
            consecutiveNulls = 0;
            // Include printable ASCII characters
            if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
              extractedText += String.fromCharCode(char);
            } else if (char >= 160) {
              // Include extended ASCII/Unicode
              extractedText += String.fromCharCode(char);
            }
          }
        }

        // Clean and parse extracted text
        const cleanText = extractedText
          .replace(/\s+/g, ' ')
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
          .trim();

        if (cleanText.length > 20) {
          // Try to identify tabular data patterns
          const lines = cleanText.split(/[\n\r]+/);
          const potentialRows = lines
            .filter(line => line.trim().length > 0)
            .map(line => {
              // Split on common delimiters
              let cells = line.split(/\t|,|;|\|/);
              if (cells.length === 1) {
                // Try splitting on multiple spaces
                cells = line.split(/\s{2,}/);
              }
              return cells.map(cell => cell.trim()).filter(cell => cell.length > 0);
            })
            .filter(row => row.length > 0);

          if (potentialRows.length > 0) {
            data = potentialRows.slice(0, 20); // Limit to first 20 rows
            hasTextContent = true;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Simple text extraction failed:', error);
    }

    // If no meaningful data extracted, create informative content
    if (!hasTextContent || data.length === 0) {
      data = [
        ['Document Type', 'Status'],
        [extension.toUpperCase() + ' Spreadsheet', 'Content extraction limited'],
        ['File Name', fileName],
        ['Size', this.formatFileSize(blob.size)],
        ['', ''],
        ['Note:', 'This spreadsheet contains data that cannot be'],
        ['', 'fully extracted for text preview. Common reasons:'],
        ['', '• Complex formatting or formulas'],
        ['', '• Binary data or charts'],
        ['', '• Password protection'],
        ['', '• Proprietary Excel features'],
        ['', ''],
        ['Recommendation:', 'Download and open in Excel or compatible software']
      ];
    }

    // Normalize data - ensure all rows have same column count
    const maxCols = Math.max(...data.map(row => row.length));
    const normalizedData = data.map(row => {
      const normalized = [...row];
      while (normalized.length < maxCols) normalized.push('');
      return normalized;
    });

    const worksheet: ExcelWorksheet = {
      name: hasTextContent ? 'Extracted Data' : 'File Information',
      data: normalizedData,
      range: `A1:${this.getColumnName(maxCols)}${normalizedData.length}`,
      rowCount: normalizedData.length,
      colCount: maxCols,
      hasHeaders: hasTextContent && normalizedData.length > 1,
      dataTypes: Array(maxCols).fill('text'),
      formulas: {}
    };

    return {
      sheets: [worksheet],
      activeSheet: 0,
      fileName,
      fileSize: blob.size,
      metadata: {
        application: extension.toUpperCase() + (hasTextContent ? ' (Text Extracted)' : ' (Limited Preview)'),
        creator: 'Simple Text Extractor'
      }
    };
  }

  private async generateBasicSpreadsheetPreview(blob: Blob, fileName: string, error: any): Promise<PreviewResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const extension = fileName.toLowerCase().split('.').pop() || 'spreadsheet';
    const fileIcon = extension === 'csv' ? '📄' : '📊';

    const content = `
      <div style="padding: 2rem; font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${fileIcon}</div>
          <h1 style="color: #1e293b; margin: 0 0 0.5rem 0;">${this.escapeHtml(fileName)}</h1>
          <p style="color: #64748b; margin: 0;">${extension.toUpperCase()} Spreadsheet</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <h3 style="color: #374151; margin: 0 0 1rem 0;">📊 Spreadsheet Information</h3>
          <p style="color: #4b5563; margin: 0;">This spreadsheet is available for download. The data cannot be displayed in the browser preview due to the file's format or complexity.</p>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <h4 style="color: #1e40af; margin: 0 0 1rem 0;">💡 To view this spreadsheet:</h4>
          <ul style="color: #1e40af; margin: 0; padding-left: 1.5rem;">
            <li>Download the file using the download button</li>
            <li>Open with Microsoft Excel, Google Sheets, or compatible software</li>
            <li>Use Excel Online or Google Sheets for browser-based viewing</li>
            <li>Convert to CSV format for simpler text-based preview</li>
          </ul>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: center;">
          <div style="color: #64748b; font-size: 0.875rem;">File Size: ${this.formatFileSize(blob.size)}</div>
        </div>

        <div style="text-align: center;">
          <button onclick="window.parent.postMessage({type: 'download'}, '*')"
                  style="background: #059669; color: white; border: none; border-radius: 6px; padding: 0.75rem 1.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-right: 0.5rem;">
            📥 Download Spreadsheet
          </button>
          <button onclick="window.parent.postMessage({type: 'close'}, '*')"
                  style="background: #6b7280; color: white; border: none; border-radius: 6px; padding: 0.75rem 1.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer;">
            ✕ Close Preview
          </button>
        </div>
      </div>
    `;

    return {
      type: 'success',
      format: 'html',
      content,
      metadata: {
        title: fileName,
        pluginName: this.name,
        fallback: true
      }
    };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}