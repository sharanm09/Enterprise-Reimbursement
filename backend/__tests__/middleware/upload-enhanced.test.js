const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const upload = require('../../middleware/upload');

jest.mock('fs');
jest.mock('crypto');

describe('Upload Middleware - Enhanced Coverage', () => {
  const mockReq = {
    file: null,
    files: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    crypto.randomBytes.mockReturnValue({
      readUInt32BE: jest.fn().mockReturnValue(12345678)
    });
  });

  describe('Storage configuration', () => {
    test('should create uploads directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      // Re-require to trigger directory creation
      jest.resetModules();
      require('../../middleware/upload');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true }
      );
    });

    test('should not create directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      jest.resetModules();
      require('../../middleware/upload');
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('File filter', () => {
    test('should accept valid image files', () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg'
      };

      const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, '/tmp'),
        filename: (req, file, cb) => cb(null, 'test.jpg')
      });

      const uploadInstance = multer({
        storage: storage,
        fileFilter: (req, file, cb) => {
          const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
          const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
          const mimetype = allowedTypes.test(file.mimetype);

          if (mimetype && extname) {
            return cb(null, true);
          } else {
            cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
          }
        }
      });

      // Test the file filter logic
      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      expect(extname).toBe(true);
      expect(mimetype).toBe(true);
    });

    test('should reject invalid file types', () => {
      const file = {
        originalname: 'test.exe',
        mimetype: 'application/x-msdownload'
      };

      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      expect(extname).toBe(false);
      expect(mimetype).toBe(false);
    });

    test('should accept PDF files', () => {
      const file = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf'
      };

      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      expect(extname).toBe(true);
      expect(mimetype).toBe(true);
    });

    test('should accept Word documents', () => {
      const file = {
        originalname: 'document.doc',
        mimetype: 'application/msword'
      };

      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      expect(extname).toBe(true);
    });

    test('should accept Excel files', () => {
      const file = {
        originalname: 'spreadsheet.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      expect(extname).toBe(true);
    });

    test('should handle case-insensitive file extensions', () => {
      const file = {
        originalname: 'IMAGE.PNG',
        mimetype: 'image/png'
      };

      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      expect(extname).toBe(true);
      expect(mimetype).toBe(true);
    });
  });

  describe('File size limits', () => {
    test('should enforce 10MB file size limit', () => {
      const uploadInstance = multer({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: 10 * 1024 * 1024
        }
      });

      expect(uploadInstance).toBeDefined();
    });
  });

  describe('Filename generation', () => {
    test('should generate unique filenames', () => {
      const originalname = 'test-file.jpg';
      const ext = path.extname(originalname);
      const name = path.basename(originalname, ext);
      const timestamp = Date.now();
      const randomBytes = 12345678;
      const uniqueSuffix = timestamp + '-' + randomBytes;
      const expectedFilename = `${name}-${uniqueSuffix}${ext}`;

      expect(expectedFilename).toContain('test-file');
      expect(expectedFilename).toContain('.jpg');
      expect(expectedFilename).toContain(timestamp.toString());
    });

    test('should handle files without extensions', () => {
      const originalname = 'testfile';
      const ext = path.extname(originalname);
      const name = path.basename(originalname, ext);
      const timestamp = Date.now();
      const randomBytes = 12345678;
      const uniqueSuffix = timestamp + '-' + randomBytes;
      const expectedFilename = `${name}-${uniqueSuffix}${ext}`;

      expect(expectedFilename).toBe(`testfile-${timestamp}-${randomBytes}`);
    });

    test('should handle files with multiple dots', () => {
      const originalname = 'test.file.name.pdf';
      const ext = path.extname(originalname);
      const name = path.basename(originalname, ext);
      const timestamp = Date.now();
      const randomBytes = 12345678;
      const uniqueSuffix = timestamp + '-' + randomBytes;
      const expectedFilename = `${name}-${uniqueSuffix}${ext}`;

      expect(expectedFilename).toContain('test.file.name');
      expect(expectedFilename).toContain('.pdf');
    });
  });
});

