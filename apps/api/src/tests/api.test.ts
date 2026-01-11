/**
 * Tests for Nexus API
 */

import { describe, it, expect } from 'bun:test';
import { app } from '../index.js';

describe('API', () => {
  describe('GET /', () => {
    it('should return health status', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toMatchObject({
        status: 'ok',
        service: 'nexus-api'
      });
    });
  });

  describe('GET /ping', () => {
    it('should return pong', async () => {
      const res = await app.request('/ping');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({ pong: true });
    });
  });

  describe('GET /stats', () => {
    it('should return stats', async () => {
      const res = await app.request('/stats');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('files');
      expect(json).toHaveProperty('chunks');
      expect(json).toHaveProperty('embeddings');
      expect(json).toHaveProperty('engines');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const res = await app.request('/', {
        headers: {
          Origin: 'http://localhost:3000'
        }
      });

      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    });
  });

  describe('404', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await app.request('/unknown');
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json).toMatchObject({
        error: 'Not Found'
      });
    });
  });
});
