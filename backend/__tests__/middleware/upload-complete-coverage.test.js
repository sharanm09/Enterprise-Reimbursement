const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

jest.mock('fs');
jest.mock('crypto');

describe('Upload Middleware Complete Coverage', () => {
  let upload;
  let originalExistsSync;
  let originalMkdirSync;

  beforeAll(() => {
    originalExistsSync = fs.existsSync;
    originalMkdirSync = fs.mkdirSync;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    
    crypto.randomBytes = jest.fn().mockReturnValue({
      readUInt32BE: jest.fn().mockReturnValue(12345678)
    });
  });

  afterEach(() => {
    fs.existsSync = originalExistsSync;
    fs.mkdirSync = originalMkdirSync;
  });

  test('should create uploads directory if it does not exist', () => {
    fs.existsSync.mockReturnValue(false);
    
    upload = require('../../middleware/upload');
    
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('uploads/reimbursements'),
      { recursive: true }
    );
  });

  test('should not create directory if it already exists', () => {
    fs.existsSync.mockReturnValue(true);
    
    upload = require('../../middleware/upload');
    
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  test('should configure multer storage', () => {
    upload = require('../../middleware/upload');
    
    expect(upload).toBeDefined();
    expect(upload.storage).toBeDefined();
  });

  test('should configure file destination', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.storage.destination(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(
      null,
      expect.stringContaining('uploads/reimbursements')
    );
  });

  test('should generate unique filename', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'test-document.pdf',
      mimetype: 'application/pdf'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    
    upload.storage.filename(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalled();
    const filename = mockCb.mock.calls[0][1];
    expect(filename).toContain('test-document');
    expect(filename).toContain('.pdf');
    expect(filename).toContain(now.toString());
  });

  test('should handle files without extension', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'testfile',
      mimetype: 'application/pdf'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.storage.filename(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalled();
    const filename = mockCb.mock.calls[0][1];
    expect(filename).toContain('testfile');
  });

  test('should accept valid image files', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.fileFilter(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(null, true);
  });

  test('should accept valid PDF files', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'document.pdf',
      mimetype: 'application/pdf'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.fileFilter(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(null, true);
  });

  test('should accept valid Word documents', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'document.doc',
      mimetype: 'application/msword'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.fileFilter(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(null, true);
  });

  test('should accept valid Excel files', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'spreadsheet.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.fileFilter(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(null, true);
  });

  test('should reject invalid file types', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'script.exe',
      mimetype: 'application/x-msdownload'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.fileFilter(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(
      expect.any(Error),
      false
    );
    expect(mockCb.mock.calls[0][0].message).toContain('Invalid file type');
  });

  test('should reject files with invalid extension', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'file.exe',
      mimetype: 'image/jpeg'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.fileFilter(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(
      expect.any(Error),
      false
    );
  });

  test('should reject files with invalid mimetype', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'file.jpg',
      mimetype: 'application/x-executable'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.fileFilter(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(
      expect.any(Error),
      false
    );
  });

  test('should handle case-insensitive file extensions', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'test.PDF',
      mimetype: 'application/pdf'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.fileFilter(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(null, true);
  });

  test('should configure file size limit', () => {
    upload = require('../../middleware/upload');
    
    expect(upload.limits).toBeDefined();
    expect(upload.limits.fileSize).toBe(10 * 1024 * 1024); // 10MB
  });

  test('should handle files with special characters in name', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'test file (1).pdf',
      mimetype: 'application/pdf'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.storage.filename(mockReq, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalled();
    const filename = mockCb.mock.calls[0][1];
    expect(filename).toContain('test file');
  });

  test('should use crypto.randomBytes for unique suffix', () => {
    upload = require('../../middleware/upload');
    
    const mockFile = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf'
    };
    
    const mockReq = {};
    const mockCb = jest.fn();
    
    upload.storage.filename(mockReq, mockFile, mockCb);
    
    expect(crypto.randomBytes).toHaveBeenCalledWith(4);
  });
});

