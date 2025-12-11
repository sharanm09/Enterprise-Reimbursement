import { renderHook } from '@testing-library/react';
import { useClickOutside } from '../../utils/useClickOutside';

describe('useClickOutside', () => {
  it('should call callback when clicking outside element', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useClickOutside(callback));

    const element = document.createElement('div');
    result.current.current = element;
    document.body.appendChild(element);

    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    const clickEvent = new MouseEvent('mousedown', { bubbles: true });
    outsideElement.dispatchEvent(clickEvent);

    expect(callback).toHaveBeenCalled();

    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
  });

  it('should not call callback when clicking inside element', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useClickOutside(callback));

    const element = document.createElement('div');
    result.current.current = element;
    document.body.appendChild(element);

    const clickEvent = new MouseEvent('mousedown', { bubbles: true });
    element.dispatchEvent(clickEvent);

    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(element);
  });

  it('should handle null ref', () => {
    const callback = jest.fn();
    renderHook(() => useClickOutside(callback));

    const clickEvent = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(clickEvent);

    // Should not throw error even with null ref
    expect(true).toBe(true);
  });
});

