
export class TaskCancelReq {
    warehouse_id?: string;
    task_id: string;
    reason?: string;
    timestamp?: string;
}

export class TaskCancelRes {
    task_id: string;
    status: string;
    cancelled_at: string;
    message: string;
}