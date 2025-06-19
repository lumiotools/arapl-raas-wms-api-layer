
import {authenticate} from "./authentication";
import fetch from 'node-fetch';
import { Task } from "src/modules/robot-job/dto/Task_Generation.dto";
import { TaskUpdateReq, TaskUpdateRes } from "src/modules/robot-job/dto/Task_Update.dto";
import { TaskCancelReq, TaskCancelRes } from "src/modules/robot-job/dto/Task_Cancel.dto";
import { CancelReq, BatchCancelRes } from "src/modules/robot-job/dto/Cancel.dto";
import { Cancel } from "axios";
let UPDATE_TASK_URL = 'https://api.araplraas.com/operator/v1/tasks/';


export async function updateTask(payload : TaskUpdateReq, id : string): Promise<TaskUpdateRes> {
    try{
        UPDATE_TASK_URL = UPDATE_TASK_URL + id;
        console.log("update task url: ",UPDATE_TASK_URL);
        const Token = await authenticate();
        const response = await fetch(UPDATE_TASK_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update task: ${response.status} ${errorText}`);
        }
        try {
            return await response.json();
        } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError);
            throw new Error('Failed to parse JSON response from update batch task status');
        }
            
    }
    catch (error) {
        console.error('Error during update task:', error);
        throw new Error('Update task failed');
    }
}



export async function updateBatchAction(payload: CancelReq, task_id : string): Promise<BatchCancelRes> {// action
    try {
        const UPDATE_TASK_ACTION_URL = `https://api.araplraas.com/operator/v1/tasks/${task_id}/action`;
        const Token = await authenticate();
        const response = await fetch(UPDATE_TASK_ACTION_URL, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify({ payload})
        });
        console.log("token: ",Token);
        console.log("respone: ", response);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update status: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error during update batch status:', error);
        throw new Error('Update batch status failed');
    }
}

export async function updateBatchTaskAction(payload: TaskCancelReq, task_id : string , subtask_id: string): Promise<TaskCancelRes> { //action
    try {
        const UPDATE_TASK_ACTION_URL = `https://api.araplraas.com/operator/v1/tasks/${task_id}/subtasks/${subtask_id}/action`;
        const Token = await authenticate();
        const response = await fetch(UPDATE_TASK_ACTION_URL, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify({ payload})
        });
        console.log("token: ",Token);
        console.log("respone: ", response);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update task status: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error during update  batch task status:', error);
        throw new Error('Update batch task status failed');
    }
}