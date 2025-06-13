
import {authenticate} from "./authentication";
import fetch from 'node-fetch';

let UPDATE_TASK_URL = 'https://api.araplraas.com/operator/v1/tasks/';


export async function updateTask(payload : any, id : string): Promise<any> {
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



export async function updateBatchAction(payload: any, task_id : string): Promise<any> {
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

export async function updateBatchTaskAction(payload: any, task_id : string , subtask_id: string): Promise<any> {
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