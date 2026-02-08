const multer = require('multer');

describe('Upload Middleware', () => {
  let upload;

  beforeAll(() => {
    upload = require('../../middleware/upload');
  });

  test('should be defined', () => {
    expect(upload).toBeDefined();
  });

  test('should be multer instance', () => {
    expect(upload).toBeDefined();
    expect(typeof upload).toBe('object');
  });

  test('should have storage configuration', () => {
    expect(upload.storage).toBeDefined();
  });

  test('should have fileFilter configuration', () => {
    expect(upload.fileFilter).toBeDefined();
  });

  test('should have limits configuration', () => {
    expect(upload.limits).toBeDefined();
    expect(upload.limits.fileSize).toBe(10 * 1024 * 1024);
  });
});

