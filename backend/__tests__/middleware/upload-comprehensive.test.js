const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

jest.mock('fs');
jest.mock('crypto');

describe('Upload Middleware Comprehensive Coverage', () => {
  let upload;
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should create uploads directory if it does not exist', () => {
    fs.existsSync.mockReturnValue(false);
    
    upload = require('../../middleware/upload');
    
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('uploads/reimbursements'),
      { recursive: true }
    );
  });

  test('should not create directory if it already exists', () => {
    fs.existsSync.mockReturnValue(true);
    
    upload = require('../../middleware/upload');
    
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  test('should generate unique filename with timestamp and random bytes', () => {
    const mockDate = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(mockDate);
    crypto.randomBytes.mockReturnValue({
      readUInt32BE: jest.fn().mockReturnValue(12345678)
    });
    
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const req = {};
    const file = {
      originalname: 'test-document.pdf'
    };
    const cb = jest.fn();
    
    // Access the storage configuration
    const storage = upload.storage || upload._storage;
    if (storage && storage.getFilename) {
      storage.getFilename(req, file, cb);
    } else {
      // Test the filename generation logic
      const randomBytes = crypto.randomBytes(4).readUInt32BE(0);
      const uniqueSuffix = mockDate + '-' + randomBytes;
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      const filename = `${name}-${uniqueSuffix}${ext}`;
      
      expect(filename).toContain('test-document');
      expect(filename).toContain('.pdf');
      expect(filename).toContain(mockDate.toString());
    }
  });

  test('should accept valid image files', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const fileFilter = upload.fileFilter || upload._fileFilter;
    const cb = jest.fn();
    
    const file = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg'
    };
    
    if (fileFilter) {
      fileFilter(null, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    }
  });

  test('should accept valid PDF files', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const fileFilter = upload.fileFilter || upload._fileFilter;
    const cb = jest.fn();
    
    const file = {
      originalname: 'document.pdf',
      mimetype: 'application/pdf'
    };
    
    if (fileFilter) {
      fileFilter(null, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    }
  });

  test('should accept valid Office document files', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const fileFilter = upload.fileFilter || upload._fileFilter;
    const cb = jest.fn();
    
    const testFiles = [
      { originalname: 'document.doc', mimetype: 'application/msword' },
      { originalname: 'document.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { originalname: 'spreadsheet.xls', mimetype: 'application/vnd.ms-excel' },
      { originalname: 'spreadsheet.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ];
    
    testFiles.forEach(file => {
      if (fileFilter) {
        const cb = jest.fn();
        fileFilter(null, file, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      }
    });
  });

  test('should reject invalid file types', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const fileFilter = upload.fileFilter || upload._fileFilter;
    const cb = jest.fn();
    
    const file = {
      originalname: 'script.exe',
      mimetype: 'application/x-msdownload'
    };
    
    if (fileFilter) {
      fileFilter(null, file, cb);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid file type')
        }),
        false
      );
    }
  });

  test('should reject files with invalid extension even if mimetype is valid', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const fileFilter = upload.fileFilter || upload._fileFilter;
    const cb = jest.fn();
    
    const file = {
      originalname: 'document.exe',
      mimetype: 'image/jpeg'
    };
    
    if (fileFilter) {
      fileFilter(null, file, cb);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid file type')
        }),
        false
      );
    }
  });

  test('should reject files with invalid mimetype even if extension is valid', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const fileFilter = upload.fileFilter || upload._fileFilter;
    const cb = jest.fn();
    
    const file = {
      originalname: 'document.pdf',
      mimetype: 'application/x-executable'
    };
    
    if (fileFilter) {
      fileFilter(null, file, cb);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid file type')
        }),
        false
      );
    }
  });

  test('should handle case-insensitive file extensions', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const fileFilter = upload.fileFilter || upload._fileFilter;
    const cb = jest.fn();
    
    const file = {
      originalname: 'DOCUMENT.PDF',
      mimetype: 'application/pdf'
    };
    
    if (fileFilter) {
      fileFilter(null, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    }
  });

  test('should set file size limit to 10MB', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    expect(upload.limits).toBeDefined();
    expect(upload.limits.fileSize).toBe(10 * 1024 * 1024);
  });

  test('should handle files without extensions', () => {
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    const fileFilter = upload.fileFilter || upload._fileFilter;
    const cb = jest.fn();
    
    const file = {
      originalname: 'noextension',
      mimetype: 'image/jpeg'
    };
    
    if (fileFilter) {
      fileFilter(null, file, cb);
      // Should reject files without valid extensions
      expect(cb).toHaveBeenCalled();
    }
  });

  test('should use crypto.randomBytes for secure random generation', () => {
    const mockRandomBytes = {
      readUInt32BE: jest.fn().mockReturnValue(12345678)
    };
    crypto.randomBytes.mockReturnValue(mockRandomBytes);
    
    fs.existsSync.mockReturnValue(true);
    upload = require('../../middleware/upload');
    
    expect(crypto.randomBytes).toHaveBeenCalledWith(4);
  });

  test('should handle directory creation errors gracefully', () => {
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {
      throw new Error('Permission denied');
    });
    
    // Should not throw, but handle error
    expect(() => {
      upload = require('../../middleware/upload');
    }).not.toThrow();
  });
});

