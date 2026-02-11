export interface VadTask {
    id?: number;
    process_id: string;
    audio_file_path: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    metadata?: string;
    created_at?: string;
}
