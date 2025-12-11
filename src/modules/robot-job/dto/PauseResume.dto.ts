

export class PauseResumeReq {
    action: 'pause' | 'resume';
    reason?: string;
}

export class PauseResumeRes {
    success: boolean;
    message: string;
    taskId: string;
}