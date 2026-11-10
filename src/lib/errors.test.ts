import { describe, it, expect, vi } from 'vitest';
import { AppError, toUserMessage, GENERIC_ERROR_MESSAGE } from './errors';

describe('AppError', () => {
  it('keeps message, name, code and is an Error', () => {
    const e = new AppError('bad', 'storage');
    expect(e.message).toBe('bad');
    expect(e.name).toBe('AppError');
    expect(e.code).toBe('storage');
    expect(e).toBeInstanceOf(Error);
  });

  it('defaults code to unknown', () => {
    expect(new AppError('x').code).toBe('unknown');
  });
});

describe('toUserMessage', () => {
  it('returns AppError message', () => {
    expect(toUserMessage(new AppError('x'))).toBe('x');
  });

  it('hides plain Error details and logs once', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const err = new Error('secret /data/path');
      expect(toUserMessage(err)).toBe('Something went wrong. Please try again.');
      expect(GENERIC_ERROR_MESSAGE).toBe('Something went wrong. Please try again.');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]).toContain(err);
    } finally {
      spy.mockRestore();
    }
  });

  it('returns generic for non-errors', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(toUserMessage('boom')).toBe('Something went wrong. Please try again.');
      expect(toUserMessage(undefined)).toBe('Something went wrong. Please try again.');
    } finally {
      spy.mockRestore();
    }
  });
});
