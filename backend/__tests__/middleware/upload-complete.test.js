const multer = require('multer');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

jest.mock('node:crypto');
jest.mock('node:fs');

describe('Upload Middleware Complete Coverage', () => {
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

  test('should be defined', () => {
    expect(upload).toBeDefined();
    expect(upload.storage).toBeDefined();
  });

  test('should use crypto.randomBytes for filename generation', () => {
    const mockRandomBytes = {
      readUInt32BE: jest.fn().mockReturnValue(123456789)
    };
    crypto.randomBytes.mockReturnValue(mockRandomBytes);

    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    storage._filename(mockReq, mockFile, cb);

    expect(crypto.randomBytes).toHaveBeenCalledWith(4);
    expect(mockRandomBytes.readUInt32BE).toHaveBeenCalledWith(0);
    expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/test-\d{10}-\d+\.jpg/));
  });

  test('should call destination callback with correct path', () => {
    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    fs.mkdirSync.mockImplementation(() => {});
    storage._destination(mockReq, mockFile, cb);

    expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('uploads/reimbursements'));
  });

  test('should handle destination error', () => {
    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    fs.mkdirSync.mockImplementation(() => {
      throw new Error('Failed to create directory');
    });

    storage._destination(mockReq, mockFile, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  test('should generate unique filenames for different files', () => {
    const mockRandomBytes1 = { readUInt32BE: jest.fn().mockReturnValue(111111111) };
    const mockRandomBytes2 = { readUInt32BE: jest.fn().mockReturnValue(222222222) };
    crypto.randomBytes
      .mockReturnValueOnce(mockRandomBytes1)
      .mockReturnValueOnce(mockRandomBytes2);

    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    const cb1 = jest.fn();
    const cb2 = jest.fn();

    storage._filename(mockReq, mockFile, cb1);
    storage._filename(mockReq, mockFile, cb2);

    expect(cb1.mock.calls[0][1]).not.toBe(cb2.mock.calls[0][1]);
  });

  test('should handle files without extensions', () => {
    const mockRandomBytes = { readUInt32BE: jest.fn().mockReturnValue(123456789) };
    crypto.randomBytes.mockReturnValue(mockRandomBytes);

    const fileWithoutExt = {
      ...mockFile,
      originalname: 'testfile'
    };

    const storage = multer.diskStorage({
      destination: upload.storage._destination,
      filename: upload.storage._filename
    });

    storage._filename(mockReq, fileWithoutExt, cb);

    expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/testfile-\d{10}-\d+$/));
  });
});


