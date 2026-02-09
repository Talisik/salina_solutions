import type { Database } from 'better-sqlite3';
import { VadTask } from './types.js';

export class VadDbService {
    constructor(private db: Database) { }

    enqueueVadTask(processId: string, filePath: string, metadata: any = {}) {
        const stmt = this.db.prepare(`
            INSERT INTO salina_vad_queue (process_id, audio_file_path, status, metadata)
            VALUES (?, ?, 'pending', ?)
        `);
        return stmt.run(processId, filePath, JSON.stringify(metadata));
    }

    getTaskStatus(processId: string) {
        const stmt = this.db.prepare('SELECT status, error_message FROM salina_vad_queue WHERE process_id = ?');
        return stmt.get(processId) as { status: string; error_message?: string } | undefined;
    }

    // Get VAD results
    getVadResults(processId: string) {
        // Join with salina_vad_queue to find results linked to the task's ID
        const stmt = this.db.prepare(`
            SELECT r.* 
            FROM salina_vad_results r
            JOIN salina_vad_queue q ON r.vad_queue_id = q.id
            WHERE q.process_id = ?
        `);
        const result = stmt.get(processId) as any;
        if (result && result.chunks_json) {
            result.chunks = JSON.parse(result.chunks_json);
        }
        return result;
    }

    // Get Language detection results
    getLanguiniResults(vadResultId: number) {
        const stmt = this.db.prepare('SELECT * FROM salina_languini_results WHERE vad_result_id = ?');
        const result = stmt.get(vadResultId) as any;
        if (result && result.language_results_json) {
            result.results = JSON.parse(result.language_results_json);
        }
        return result;
    }

    // Get profiling data
    getProfiling(processId: string) {
        // Fetch profiling for the task ID itself AND any linked VAD result ID
        const stmt = this.db.prepare(`
            SELECT p.* 
            FROM salina_process_profiling p
            WHERE p.process_id = ? 
            OR p.process_id IN (
                SELECT r.process_id 
                FROM salina_vad_results r
                JOIN salina_vad_queue q ON r.vad_queue_id = q.id
                WHERE q.process_id = ?
            )
            ORDER BY timestamp ASC
        `);
        return stmt.all(processId, processId);
    }

    // Get all tasks
    getAllTasks(): VadTask[] {
        const stmt = this.db.prepare('SELECT * FROM salina_vad_queue ORDER BY created_at DESC');
        return stmt.all() as VadTask[];
    }
}
