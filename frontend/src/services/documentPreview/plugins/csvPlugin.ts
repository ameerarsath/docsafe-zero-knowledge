/**
 * CSV Preview Plugin
 * Provides rich table preview for CSV files with sorting, filtering, and data analysis
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface ParsedCSV {
  headers: string[];
  rows: string[][];
  totalRows: number;
  columns: number;
  hasHeaders: boolean;
}

export class CSVPreviewPlugin implements PreviewPlugin {
  name = 'CSVPreview';
  priority = 90; // High priority for CSV files

  supportedMimeTypes = [
    'text/csv',
    'application/csv',
    'text/comma-separated-values'
  ];

  supportedExtensions = ['.csv'];

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
      const text = await blob.text();
      const csvData = this.parseCSV(text);
      const previewHtml = this.generateCSVViewer(csvData, fileName, blob.size);

      return {
        type: 'success',
        format: 'html',
        content: previewHtml,
        metadata: {
          title: fileName,
          creator: 'CSV'
        }
      };
    } catch (error) {
      console.error('CSV preview error:', error);
      return {
        type: 'error',
        format: 'text',
        error: error instanceof Error ? error.message : 'Failed to preview CSV file'
      };
    }
  }

  private parseCSV(csvText: string): ParsedCSV {
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        columns: 0,
        hasHeaders: false
      };
    }

    // Parse CSV with basic comma splitting (handles quoted fields)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
    };

    const firstRow = parseCSVLine(lines[0]);
    const secondRow = lines.length > 1 ? parseCSVLine(lines[1]) : [];

    // Detect if first row is headers (heuristic: contains non-numeric values)
    const hasHeaders = this.detectHeaders(firstRow, secondRow);

    let headers: string[];
    let dataRows: string[][];

    if (hasHeaders && lines.length > 1) {
      headers = firstRow;
      dataRows = lines.slice(1).map(parseCSVLine);
    } else {
      // Generate generic column names
      headers = firstRow.map((_, index) => `Column ${index + 1}`);
      dataRows = lines.map(parseCSVLine);
    }

    // Ensure all rows have same number of columns
    const maxColumns = Math.max(headers.length, ...dataRows.map(row => row.length));
    headers = this.padArray(headers, maxColumns, '');
    dataRows = dataRows.map(row => this.padArray(row, maxColumns, ''));

    return {
      headers,
      rows: dataRows,
      totalRows: dataRows.length,
      columns: maxColumns,
      hasHeaders
    };
  }

  private detectHeaders(firstRow: string[], secondRow: string[]): boolean {
    if (secondRow.length === 0) return false;

    // If first row has mostly non-numeric values and second row has more numeric values
    const firstRowNumeric = firstRow.filter(cell => !isNaN(Number(cell)) && cell.trim() !== '').length;
    const secondRowNumeric = secondRow.filter(cell => !isNaN(Number(cell)) && cell.trim() !== '').length;

    return firstRowNumeric < secondRowNumeric || firstRowNumeric / firstRow.length < 0.5;
  }

  private padArray<T>(array: T[], length: number, fillValue: T): T[] {
    const result = [...array];
    while (result.length < length) {
      result.push(fillValue);
    }
    return result;
  }

  private generateCSVViewer(csvData: ParsedCSV, fileName: string, fileSize: number): string {
    const fileSizeFormatted = this.formatFileSize(fileSize);
    const previewRows = csvData.rows.slice(0, 50); // Show first 50 rows
    const hasMoreRows = csvData.rows.length > 50;

    // Generate table headers
    const headerCells = csvData.headers.map((header, index) =>
      `<th data-column="${index}" class="csv-header" title="${this.escapeHtml(header)}">
        <div class="header-content">
          <span class="header-text">${this.escapeHtml(header || `Column ${index + 1}`)}</span>
          <button class="sort-btn" onclick="sortCSVTable(${index})" title="Sort column">
            <span class="sort-icon">↕</span>
          </button>
        </div>
      </th>`
    ).join('');

    // Generate table rows
    const tableRows = previewRows.map((row, rowIndex) => {
      const cells = row.map((cell, colIndex) => {
        const cellValue = cell === null || cell === undefined ? '' : String(cell);
        const isNumeric = !isNaN(Number(cellValue)) && cellValue.trim() !== '';
        return `<td class="${isNumeric ? 'numeric' : 'text'}" title="${this.escapeHtml(cellValue)}">
          ${this.escapeHtml(cellValue)}
        </td>`;
      }).join('');
      return `<tr data-row="${rowIndex}">${cells}</tr>`;
    }).join('');

    // Generate summary statistics
    const stats = this.generateStats(csvData);

    return `
      <div class="csv-preview-container">
        <style>
          .csv-preview-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .csv-header-section {
            background: linear-gradient(135deg, #28a745 0%, #20912f 100%);
            color: white;
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .csv-icon {
            font-size: 2rem;
          }
          .file-info h3 {
            margin: 0;
            font-size: 1.2rem;
          }
          .file-info .details {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .csv-stats {
            background: #e9ecef;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #dee2e6;
            font-size: 0.9rem;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
          }
          .stat-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .stat-value {
            font-weight: 600;
            color: #28a745;
          }
          .csv-controls {
            background: white;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
          }
          .search-box {
            flex: 1;
            min-width: 200px;
            padding: 0.5rem;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 0.9rem;
          }
          .control-btn {
            padding: 0.5rem 1rem;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
          }
          .control-btn:hover {
            background: #218838;
          }
          .table-container {
            flex: 1;
            overflow: auto;
            background: white;
          }
          .csv-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 0.9rem;
          }
          .csv-header {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 0;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 0.5rem;
            min-height: 40px;
          }
          .header-text {
            font-weight: 600;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .sort-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px 4px;
            margin-left: 4px;
            border-radius: 3px;
            opacity: 0.6;
            font-size: 12px;
          }
          .sort-btn:hover {
            background: rgba(0,0,0,0.1);
            opacity: 1;
          }
          .csv-table td {
            border: 1px solid #dee2e6;
            padding: 0.5rem;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .csv-table td.numeric {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }
          .csv-table td.text {
            text-align: left;
          }
          .csv-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          .csv-table tr:hover {
            background: #e8f4fd;
          }
          .truncation-notice {
            background: #fff3cd;
            color: #856404;
            padding: 0.75rem;
            text-align: center;
            border-top: 1px solid #ffeaa7;
            font-size: 0.9rem;
          }
          .download-section {
            background: white;
            padding: 1rem;
            border-top: 1px solid #dee2e6;
            text-align: center;
          }
          .download-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
          }
          .download-btn:hover {
            background: #218838;
          }
          .hidden-row {
            display: none;
          }
        </style>

        <div class="csv-header-section">
          <div class="csv-icon">📊</div>
          <div class="file-info">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="details">CSV Data File • ${fileSizeFormatted}</div>
          </div>
        </div>

        <div class="csv-stats">
          <div class="stats-grid">
            <div class="stat-item">
              <span>📊 Rows:</span>
              <span class="stat-value">${csvData.totalRows.toLocaleString()}</span>
            </div>
            <div class="stat-item">
              <span>📋 Columns:</span>
              <span class="stat-value">${csvData.columns}</span>
            </div>
            <div class="stat-item">
              <span>📄 Headers:</span>
              <span class="stat-value">${csvData.hasHeaders ? 'Yes' : 'No'}</span>
            </div>
            ${stats}
          </div>
        </div>

        <div class="csv-controls">
          <input
            type="text"
            class="search-box"
            placeholder="Search data..."
            oninput="searchCSVTable(this.value)"
          />
          <button class="control-btn" onclick="resetCSVView()">Reset View</button>
          <button class="control-btn" onclick="exportVisibleCSV()">Export Visible</button>
        </div>

        <div class="table-container">
          <table class="csv-table" id="csvTable">
            <thead>
              <tr>${headerCells}</tr>
            </thead>
            <tbody id="csvTableBody">
              ${tableRows}
            </tbody>
          </table>
        </div>

        ${hasMoreRows ? `
          <div class="truncation-notice">
            📋 Showing first 50 rows of ${csvData.totalRows.toLocaleString()} total rows.
            Download the file to view all data.
          </div>
        ` : ''}

        <script>
          let sortDirection = {};
          let originalRows = [];

          function initCSVViewer() {
            const tbody = document.getElementById('csvTableBody');
            originalRows = Array.from(tbody.children);
          }

          function sortCSVTable(columnIndex) {
            const tbody = document.getElementById('csvTableBody');
            const rows = Array.from(tbody.children);

            const direction = sortDirection[columnIndex] || 'asc';
            const newDirection = direction === 'asc' ? 'desc' : 'asc';
            sortDirection[columnIndex] = newDirection;

            rows.sort((a, b) => {
              const aCell = a.children[columnIndex].textContent.trim();
              const bCell = b.children[columnIndex].textContent.trim();

              const aNum = parseFloat(aCell);
              const bNum = parseFloat(bCell);

              let comparison = 0;
              if (!isNaN(aNum) && !isNaN(bNum)) {
                comparison = aNum - bNum;
              } else {
                comparison = aCell.localeCompare(bCell);
              }

              return newDirection === 'asc' ? comparison : -comparison;
            });

            // Update sort indicators
            document.querySelectorAll('.sort-icon').forEach(icon => {
              icon.textContent = '↕';
            });

            const currentHeader = document.querySelector(\`[data-column="\${columnIndex}"] .sort-icon\`);
            if (currentHeader) {
              currentHeader.textContent = newDirection === 'asc' ? '↑' : '↓';
            }

            tbody.innerHTML = '';
            rows.forEach(row => tbody.appendChild(row));
          }

          function searchCSVTable(searchTerm) {
            const tbody = document.getElementById('csvTableBody');
            const rows = Array.from(tbody.children);

            if (!searchTerm.trim()) {
              rows.forEach(row => row.classList.remove('hidden-row'));
              return;
            }

            const term = searchTerm.toLowerCase();
            rows.forEach(row => {
              const text = row.textContent.toLowerCase();
              if (text.includes(term)) {
                row.classList.remove('hidden-row');
              } else {
                row.classList.add('hidden-row');
              }
            });
          }

          function resetCSVView() {
            const tbody = document.getElementById('csvTableBody');
            const searchBox = document.querySelector('.search-box');

            searchBox.value = '';
            sortDirection = {};

            document.querySelectorAll('.sort-icon').forEach(icon => {
              icon.textContent = '↕';
            });

            tbody.innerHTML = '';
            originalRows.forEach(row => {
              row.classList.remove('hidden-row');
              tbody.appendChild(row);
            });
          }

          function exportVisibleCSV() {
            // This would implement CSV export functionality
            alert('Export functionality would be implemented here');
          }

          // Initialize on load
          initCSVViewer();
        </script>
      </div>
    `;
  }

  private generateStats(csvData: ParsedCSV): string {
    if (csvData.rows.length === 0) return '';

    // Calculate basic statistics
    const numericColumns = [];
    for (let i = 0; i < csvData.columns; i++) {
      const columnValues = csvData.rows.map(row => row[i]).filter(val => val && !isNaN(Number(val)));
      if (columnValues.length > csvData.rows.length * 0.5) {
        numericColumns.push(i);
      }
    }

    const emptyRows = csvData.rows.filter(row => row.every(cell => !cell || cell.trim() === '')).length;

    return `
      <div class="stat-item">
        <span>🔢 Numeric Cols:</span>
        <span class="stat-value">${numericColumns.length}</span>
      </div>
      <div class="stat-item">
        <span>📭 Empty Rows:</span>
        <span class="stat-value">${emptyRows}</span>
      </div>
    `;
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