/**
 * Client-Side Document Processor Test
 * Comprehensive test for the new client-side document processing system
 */

import { ClientSideDocumentProcessor } from './plugins/clientSideDocumentProcessor';

interface TestFile {
  name: string;
  content: string;
  mimeType: string;
  description: string;
}

export class ClientSideDocumentTest {
  private processor: ClientSideDocumentProcessor;

  constructor() {
    this.processor = new ClientSideDocumentProcessor();
  }

  /**
   * Create test files for different document types
   */
  private createTestFiles(): TestFile[] {
    return [
      {
        name: 'test.txt',
        content: 'This is a test text file.\nWith multiple lines.\nAnd some content.',
        mimeType: 'text/plain',
        description: 'Plain text file'
      },
      {
        name: 'test.csv',
        content: 'Name,Age,City\nJohn,25,New York\nJane,30,Los Angeles\nBob,35,Chicago',
        mimeType: 'text/csv',
        description: 'CSV data file'
      },
      {
        name: 'test.json',
        content: JSON.stringify({
          "name": "Test Document",
          "version": "1.0",
          "data": {
            "items": [1, 2, 3],
            "description": "Sample JSON file"
          }
        }, null, 2),
        mimeType: 'application/json',
        description: 'JSON data file'
      },
      {
        name: 'test.md',
        content: '# Test Markdown\n\nThis is a **markdown** file with:\n\n- List items\n- *Italic text*\n- `code snippets`\n\n## Section 2\n\nMore content here.',
        mimeType: 'text/markdown',
        description: 'Markdown document'
      },
      {
        name: 'test.html',
        content: '<!DOCTYPE html>\n<html>\n<head><title>Test</title></head>\n<body>\n<h1>Test HTML</h1>\n<p>This is a test HTML file.</p>\n</body>\n</html>',
        mimeType: 'text/html',
        description: 'HTML document'
      }
    ];
  }

  /**
   * Run comprehensive tests
   */
  async runTests(): Promise<void> {
    console.log('🚀 Starting Client-Side Document Processor Tests');

    const testFiles = this.createTestFiles();
    let passedTests = 0;
    let totalTests = testFiles.length;

    for (const testFile of testFiles) {
      try {
        console.log(`\n📝 Testing: ${testFile.name} (${testFile.description})`);

        // Create blob from test content
        const blob = new Blob([testFile.content], { type: testFile.mimeType });

        // Test canPreview
        const canPreview = this.processor.canPreview(testFile.mimeType, testFile.name);
        console.log(`  ✓ canPreview: ${canPreview}`);

        if (!canPreview) {
          console.log(`  ⚠️ Skipping ${testFile.name} - not supported`);
          continue;
        }

        // Test preview generation
        const startTime = performance.now();
        const result = await this.processor.preview(blob, testFile.name, testFile.mimeType);
        const processingTime = performance.now() - startTime;

        console.log(`  ✓ Processing time: ${processingTime.toFixed(1)}ms`);
        console.log(`  ✓ Result type: ${result.type}`);
        console.log(`  ✓ Result format: ${result.format}`);
        console.log(`  ✓ Has content: ${!!result.content}`);
        console.log(`  ✓ Plugin name: ${result.metadata?.pluginName}`);
        console.log(`  ✓ Extraction method: ${result.metadata?.extractionMethod}`);

        // Validate result
        if (result.type === 'success' && result.content) {
          passedTests++;
          console.log(`  ✅ Test PASSED for ${testFile.name}`);
        } else {
          console.log(`  ❌ Test FAILED for ${testFile.name} - no content generated`);
        }

        // Show preview excerpt
        if (result.content) {
          const preview = this.extractTextFromHTML(result.content).substring(0, 100);
          console.log(`  📄 Content preview: "${preview}..."`);
        }

      } catch (error) {
        console.error(`  ❌ Test FAILED for ${testFile.name}:`, error);
      }
    }

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    console.log(passedTests === totalTests ? '✅ All tests passed!' : '⚠️ Some tests failed');
  }

  /**
   * Test specific document types with simulated content
   */
  async testDocumentTypes(): Promise<void> {
    console.log('\n🔍 Testing Document Type Recognition');

    const typeTests = [
      { name: 'document.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { name: 'spreadsheet.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: 'presentation.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { name: 'legacy.doc', mime: 'application/msword' },
      { name: 'legacy.xls', mime: 'application/vnd.ms-excel' },
      { name: 'legacy.ppt', mime: 'application/vnd.ms-powerpoint' },
      { name: 'data.csv', mime: 'text/csv' },
      { name: 'config.json', mime: 'application/json' },
      { name: 'readme.md', mime: 'text/markdown' },
      { name: 'index.html', mime: 'text/html' }
    ];

    for (const test of typeTests) {
      const canPreview = this.processor.canPreview(test.mime, test.name);
      const status = canPreview ? '✅ Supported' : '❌ Not supported';
      console.log(`  ${test.name} (${test.mime}): ${status}`);
    }
  }

  /**
   * Simulate error conditions
   */
  async testErrorHandling(): Promise<void> {
    console.log('\n🛡️ Testing Error Handling');

    const errorTests = [
      {
        name: 'empty.txt',
        content: '',
        mimeType: 'text/plain',
        description: 'Empty file'
      },
      {
        name: 'corrupt.json',
        content: '{ invalid json content }',
        mimeType: 'application/json',
        description: 'Corrupted JSON'
      },
      {
        name: 'binary.bin',
        content: '\x00\x01\x02\x03\x04\x05',
        mimeType: 'application/octet-stream',
        description: 'Binary file'
      }
    ];

    for (const test of errorTests) {
      try {
        console.log(`\n🧪 Testing error case: ${test.description}`);
        const blob = new Blob([test.content], { type: test.mimeType });
        const result = await this.processor.preview(blob, test.name, test.mimeType);

        console.log(`  ✓ Error handled gracefully`);
        console.log(`  ✓ Result type: ${result.type}`);
        console.log(`  ✓ Has fallback content: ${!!result.content}`);

      } catch (error) {
        console.log(`  ⚠️ Unexpected error: ${error.message}`);
      }
    }
  }

  /**
   * Performance test with larger content
   */
  async testPerformance(): Promise<void> {
    console.log('\n⚡ Performance Testing');

    // Generate large text content
    const largeContent = Array(1000).fill('This is a line of text for performance testing.\n').join('');
    const blob = new Blob([largeContent], { type: 'text/plain' });

    console.log(`📊 Testing with ${Math.round(blob.size / 1024)}KB text file`);

    const startTime = performance.now();
    const result = await this.processor.preview(blob, 'large.txt', 'text/plain');
    const processingTime = performance.now() - startTime;

    console.log(`  ✓ Processing time: ${processingTime.toFixed(1)}ms`);
    console.log(`  ✓ Result type: ${result.type}`);
    console.log(`  ✓ Content length: ${result.content?.length || 0} characters`);

    // Performance threshold check
    if (processingTime < 1000) {
      console.log(`  ✅ Performance GOOD (< 1s)`);
    } else if (processingTime < 3000) {
      console.log(`  ⚠️ Performance OK (< 3s)`);
    } else {
      console.log(`  ❌ Performance POOR (> 3s)`);
    }
  }

  /**
   * Extract text content from HTML for testing
   */
  private extractTextFromHTML(html: string): string {
    // Simple HTML to text conversion for testing
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🎯 Client-Side Document Processor - Comprehensive Test Suite');
    console.log('='.repeat(60));

    await this.testDocumentTypes();
    await this.runTests();
    await this.testErrorHandling();
    await this.testPerformance();

    console.log('\n✅ Test suite completed');
  }
}

// Export for use in browser console or testing
(window as any).testClientSideProcessor = async () => {
  const tester = new ClientSideDocumentTest();
  await tester.runAllTests();
};

export default ClientSideDocumentTest;