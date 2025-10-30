import { TaskType } from "src/modules/robot-job/dto/Task_Generation.dto";
import 'dotenv/config';

export const INTEGRATION_URL = {
    [TaskType.CrossDock]: process.env.MOVEOPS_BASE_URL,
    [TaskType.CrossDock_Internal]: process.env.FMS_BASE_URL,
    [TaskType.GoodsToPerson]: process.env.FMS_BASE_URL,
    [TaskType.Baseops]: process.env.FMS_BASE_URL,
    [TaskType.Picking]: process.env.FMS_BASE_URL,
    [TaskType.Putaway]: process.env.FMS_BASE_URL,
}