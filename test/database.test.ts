import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Database, RunResult } from 'better-sqlite3';
import { VadDbService } from '../src/database.js';
import type { VadTask } from '../src/types.js';

// Mock better-sqlite3
vi.mock('better-sqlite3', () => ({
  default: vi.fn(),
}));

describe('VadDbService', () => {
  let mockDb: Database;
  let service: VadDbService;
  let mockPrepare: ReturnType<typeof vi.fn>;
  let mockStmt: {
    run: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock statement methods
    mockStmt = {
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    };

    // Create mock prepare function
    mockPrepare = vi.fn().mockReturnValue(mockStmt);

    // Create mock database
    mockDb = {
      prepare: mockPrepare,
    } as unknown as Database;

    service = new VadDbService(mockDb);
  });

  describe('enqueueVadTask', () => {
    it('should insert a task with pending status', () => {
      const mockResult: RunResult = {
        lastInsertRowid: 1,
        changes: 1,
      } as RunResult;

      mockStmt.run.mockReturnValue(mockResult);

      const result = service.enqueueVadTask('proc-123', '/path/to/audio.mp3', { key: 'value' });

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO salina_vad_queue')
      );
      expect(mockStmt.run).toHaveBeenCalledWith(
        'proc-123',
        '/path/to/audio.mp3',
        JSON.stringify({ key: 'value' })
      );
      expect(result).toBe(mockResult);
    });

    it('should handle empty metadata', () => {
      const mockResult: RunResult = {
        lastInsertRowid: 1,
        changes: 1,
      } as RunResult;

      mockStmt.run.mockReturnValue(mockResult);

      service.enqueueVadTask('proc-123', '/path/to/audio.mp3');

      expect(mockStmt.run).toHaveBeenCalledWith(
        'proc-123',
        '/path/to/audio.mp3',
        JSON.stringify({})
      );
    });
  });

  describe('getTaskStatus', () => {
    it('should return task status when found', () => {
      const mockStatus = { status: 'processing', error_message: null };
      mockStmt.get.mockReturnValue(mockStatus);

      const result = service.getTaskStatus('proc-123');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT status, error_message')
      );
      expect(mockStmt.get).toHaveBeenCalledWith('proc-123');
      expect(result).toEqual(mockStatus);
    });

    it('should return undefined when task not found', () => {
      mockStmt.get.mockReturnValue(undefined);

      const result = service.getTaskStatus('proc-123');

      expect(result).toBeUndefined();
    });
  });

  describe('getVadResults', () => {
    it('should return parsed VAD results', () => {
      const mockResult = {
        id: 1,
        vad_queue_id: 10,
        chunks_json: JSON.stringify([{ start: 0, end: 10 }]),
      };
      mockStmt.get.mockReturnValue(mockResult);

      const result = service.getVadResults('proc-123');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT r.*')
      );
      expect(mockStmt.get).toHaveBeenCalledWith('proc-123');
      expect(result).toEqual({
        ...mockResult,
        chunks: [{ start: 0, end: 10 }],
      });
    });

    it('should return result without parsing if chunks_json is missing', () => {
      const mockResult = {
        id: 1,
        vad_queue_id: 10,
      };
      mockStmt.get.mockReturnValue(mockResult);

      const result = service.getVadResults('proc-123');

      expect(result).toEqual(mockResult);
    });

    it('should return undefined when no results found', () => {
      mockStmt.get.mockReturnValue(undefined);

      const result = service.getVadResults('proc-123');

      expect(result).toBeUndefined();
    });
  });

  describe('getLanguiniResults', () => {
    it('should return parsed language results', () => {
      const mockResult = {
        id: 1,
        vad_result_id: 5,
        language_results_json: JSON.stringify({ language: 'en', confidence: 0.95 }),
      };
      mockStmt.get.mockReturnValue(mockResult);

      const result = service.getLanguiniResults(5);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM salina_languini_results')
      );
      expect(mockStmt.get).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        ...mockResult,
        results: { language: 'en', confidence: 0.95 },
      });
    });

    it('should return result without parsing if language_results_json is missing', () => {
      const mockResult = {
        id: 1,
        vad_result_id: 5,
      };
      mockStmt.get.mockReturnValue(mockResult);

      const result = service.getLanguiniResults(5);

      expect(result).toEqual(mockResult);
    });
  });

  describe('getProfiling', () => {
    it('should return profiling data ordered by timestamp', () => {
      const mockProfiling = [
        { id: 1, process_id: 'proc-123', timestamp: '2024-01-01T00:00:00Z', data: '{}' },
        { id: 2, process_id: 'proc-123', timestamp: '2024-01-01T00:01:00Z', data: '{}' },
      ];
      mockStmt.all.mockReturnValue(mockProfiling);

      const result = service.getProfiling('proc-123');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.*')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('proc-123', 'proc-123');
      expect(result).toEqual(mockProfiling);
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks ordered by created_at DESC', () => {
      const mockTasks: VadTask[] = [
        {
          id: 2,
          process_id: 'proc-456',
          audio_file_path: '/path/to/audio2.mp3',
          status: 'completed',
          created_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 1,
          process_id: 'proc-123',
          audio_file_path: '/path/to/audio1.mp3',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockStmt.all.mockReturnValue(mockTasks);

      const result = service.getAllTasks();

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM salina_vad_queue')
      );
      expect(mockStmt.all).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });
  });
});
