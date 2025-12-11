const multer = require('multer');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

jest.mock('node:crypto');
jest.mock('node:fs');
jest.mock('node:path', () => ({
  join: jest.fn((...args) => args.join('/')),
  extname: jest.fn((filename) => {
    const match = filename.match(/\.(\w+)$/);
    return match ? `.${match[1]}` : '';
  })
}));

describe('Upload Middleware Edge Cases', () => {
  let upload;
  let mockReq;
  let mockFile;
  let cb;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    upload = require('../../middleware/upload');

    mockReq = {};
    mockFile = {
      fieldname: 'attachment',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg'
    };
    cb = jest.fn();
  });

  test('should handle files with special characters in name', () => {
    const mockRandomBytes = { readUInt32BE: jest.fn().mockReturnValue(123456789) };
    crypto.randomBytes.mockReturnValue(mockRandomBytes);

    const fileWithSpecialChars = {
      ...mockFile,
      originalname: 'test file (1).jpg'
    };

    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    storage._filename(mockReq, fileWithSpecialChars, cb);

    expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/test file \(1\)-\d{10}-\d+\.jpg/));
  });

  test('should handle files with multiple dots in name', () => {
    const mockRandomBytes = { readUInt32BE: jest.fn().mockReturnValue(123456789) };
    crypto.randomBytes.mockReturnValue(mockRandomBytes);

    const fileWithMultipleDots = {
      ...mockFile,
      originalname: 'test.file.name.jpg'
    };

    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    storage._filename(mockReq, fileWithMultipleDots, cb);

    expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/test\.file\.name-\d{10}-\d+\.jpg/));
  });

  test('should handle very long filenames', () => {
    const mockRandomBytes = { readUInt32BE: jest.fn().mockReturnValue(123456789) };
    crypto.randomBytes.mockReturnValue(mockRandomBytes);

    const longFileName = 'a'.repeat(200) + '.jpg';
    const fileWithLongName = {
      ...mockFile,
      originalname: longFileName
    };

    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    storage._filename(mockReq, fileWithLongName, cb);

    expect(cb).toHaveBeenCalled();
    const generatedName = cb.mock.calls[0][1];
    expect(generatedName).toContain('.jpg');
  });

  test('should handle destination directory creation when it exists', () => {
    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    fs.mkdirSync.mockImplementation(() => {
      // Directory already exists - no error
    });

    storage._destination(mockReq, mockFile, cb);

    expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('uploads/reimbursements'));
  });

  test('should handle different file types', () => {
    const mockRandomBytes = { readUInt32BE: jest.fn().mockReturnValue(123456789) };
    crypto.randomBytes.mockReturnValue(mockRandomBytes);

    const fileTypes = ['pdf', 'docx', 'xlsx', 'png', 'txt'];
    
    fileTypes.forEach(ext => {
      const file = {
        ...mockFile,
        originalname: `test.${ext}`
      };

      const storage = multer.diskStorage({
        destination: upload.storage._destination,
        filename: upload.storage._filename
      });

      const cb2 = jest.fn();
      storage._filename(mockReq, file, cb2);

      expect(cb2).toHaveBeenCalledWith(null, expect.stringMatching(new RegExp(`test-\\d{10}-\\d+\\.${ext}`)));
    });
  });

  test('should generate unique filenames for concurrent uploads', () => {
    const mockRandomBytes1 = { readUInt32BE: jest.fn().mockReturnValue(111111111) };
    const mockRandomBytes2 = { readUInt32BE: jest.fn().mockReturnValue(222222222) };
    const mockRandomBytes3 = { readUInt32BE: jest.fn().mockReturnValue(333333333) };
    
    crypto.randomBytes
      .mockReturnValueOnce(mockRandomBytes1)
      .mockReturnValueOnce(mockRandomBytes2)
      .mockReturnValueOnce(mockRandomBytes3);

    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const cb3 = jest.fn();

    storage._filename(mockReq, mockFile, cb1);
    storage._filename(mockReq, mockFile, cb2);
    storage._filename(mockReq, mockFile, cb3);

    const name1 = cb1.mock.calls[0][1];
    const name2 = cb2.mock.calls[0][1];
    const name3 = cb3.mock.calls[0][1];

    expect(name1).not.toBe(name2);
    expect(name2).not.toBe(name3);
    expect(name1).not.toBe(name3);
  });

  test('should handle empty originalname', () => {
    const mockRandomBytes = { readUInt32BE: jest.fn().mockReturnValue(123456789) };
    crypto.randomBytes.mockReturnValue(mockRandomBytes);

    const fileWithoutName = {
      ...mockFile,
      originalname: ''
    };

    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    storage._filename(mockReq, fileWithoutName, cb);

    expect(cb).toHaveBeenCalled();
  });
});


