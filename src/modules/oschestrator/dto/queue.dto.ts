
import { BatchJob } from "src/modules/robot-job/entities/batch_task.entity";
import { Task } from "src/modules/robot-job/entities/task.entity";

class WareHouseBatch{
    batchJob: BatchJob;
    warehouseId: string;

}

export class queueElementDto{
    batchJob: WareHouseBatch;
    tasks: Task[];
}