

export class PauseResumeReq {
    action: 'pause' | 'resume' | 'cancel&retry';
    reason?: string;
    new_task_id?: string;
}

export class PauseResumeRes {
    success: boolean;
    message: string;
    taskId: string;
}