
export class PauseResumeReq {
    action: 'pause' | 'resume';
}

export class PauseResumeRes {
    success: boolean;
    message: string;
    taskId: string;
}