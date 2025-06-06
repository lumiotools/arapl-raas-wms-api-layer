
export class BatchCancelReq {
    warehouse_id?: string;
    batch_job_id: string;
    reason?: string;
    timestamp?: string;
}

export class BatchCancelRes {
    task_id: string;
    status: string;
    cancelled_at: string;
    message: string;
}