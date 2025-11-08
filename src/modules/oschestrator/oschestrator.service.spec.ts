import { OschestratorService } from './oschestrator.service';
import { Repository } from 'typeorm';
import { Task } from '../robot-job/entities/task.entity';
import { BatchJob } from '../robot-job/entities/batch_task.entity';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import { Robot } from '../robot-job/entities/robot.entity';

// Simple factory to create a mock Repository with only needed methods
function createRepoMock<T extends object>(overrides: Partial<Record<keyof Repository<T>, any>> = {}) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    manager: {
      connection: {
        createQueryRunner: jest.fn(() => ({
          connect: jest.fn(),
          startTransaction: jest.fn(),
          commitTransaction: jest.fn(),
          rollbackTransaction: jest.fn(),
          release: jest.fn(),
          manager: {
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
          query: jest.fn(),
          isTransactionActive: false,
        }))
      }
    },
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
    clear: jest.fn(),
    create: jest.fn(),
    ...overrides,
  } as unknown as Repository<T>;
}

function task(t: Partial<Task>): Task {
  return {
    id: 'id-' + (t.task_id || Math.random().toString(36).slice(2)),
    task_id: '',
    task_type: undefined as any,
    task_dependency: null as any,
    start_location: undefined as any,
    end_location: undefined as any,
    wait_time: null as any,
    cargos: [],
    robot_id: null,
    batch_job: undefined as any,
    batch_job_id: '',
    status: 'task_acknowledged',
    created_at: new Date(),
    updated_at: new Date(),
    ...t,
  } as Task;
}

describe('OschestratorService dependency chains', () => {
  let service: OschestratorService;
  let taskRepo: Repository<Task>;
  let batchRepo: Repository<BatchJob>;
  let whRepo: Repository<Warehouse>;
  let robotRepo: Repository<Robot>;

  beforeEach(() => {
    jest.spyOn(OschestratorService.prototype as any, 'initializeRobots').mockImplementation(async () => {});
    taskRepo = createRepoMock<Task>();
    batchRepo = createRepoMock<BatchJob>();
    whRepo = createRepoMock<Warehouse>();
    robotRepo = createRepoMock<Robot>();

    service = new OschestratorService(taskRepo, batchRepo, whRepo, robotRepo);
  });

  it('builds a linear chain A -> B -> C when all are acknowledged in a batch', async () => {
  const A = task({ task_id: 'A', task_dependency: undefined });
    const B = task({ task_id: 'B', task_dependency: 'A' });
    const C = task({ task_id: 'C', task_dependency: 'B' });

    // @ts-ignore private access for test
    const chains: Task[][] = await service['buildChainsForBatch']([A, B, C]);

    expect(chains.length).toBe(1);
    expect(chains[0].map(t => t.task_id)).toEqual(['A', 'B', 'C']);
  });

  it('starts from B if A is completed and not in ack set, using DB lookup', async () => {
    const B = task({ task_id: 'B', task_dependency: 'A' });
    const C = task({ task_id: 'C', task_dependency: 'B' });

    // mock parent A from DB as completed with robot
    (taskRepo.findOne as jest.Mock).mockResolvedValueOnce(task({ task_id: 'A', status: 'completed', robot_id: 'ROBOT-001' }));

    // @ts-ignore private access for test
    const chains: Task[][] = await service['buildChainsForBatch']([B, C]);

    expect(chains.length).toBe(1);
    expect(chains[0].map(t => t.task_id)).toEqual(['B', 'C']);
  });

  it('releases the robot immediately when a running task is cancelled', async () => {
    jest.useFakeTimers();
    // Arrange chain with one task assigned to a robot
    const batch: any = { id: 'batch-db-id', batch_job_id: 'BATCH-1', status: 'processing', warehouse_id: 'W1' };
    (batchRepo.findOne as jest.Mock).mockResolvedValue(batch);

    const t1 = task({ task_id: 'T1', robot_id: 'ROBOT-001', batch_job: batch });

    // Save()/update mocks
    (taskRepo.save as jest.Mock).mockResolvedValue(undefined);
    (robotRepo.update as jest.Mock).mockResolvedValue(undefined);
    // Webhook noop
    // @ts-ignore
    jest.spyOn(service as any, 'wms_webhook').mockResolvedValue({});

    // After the 40s delay, the task is observed as cancelled in DB
    (taskRepo.findOne as jest.Mock).mockResolvedValueOnce({ ...t1, status: 'cancelled' });

    const promise = service.processTaskQueueInterval([t1]);
    // Advance timer to skip the 40s wait
    jest.advanceTimersByTime(40000);
    await Promise.resolve();

    await promise.catch(() => undefined);

    // Robot should be freed
    expect(robotRepo.update).toHaveBeenCalledWith({ robot_id: 'ROBOT-001' }, { available: true });

    jest.useRealTimers();
  });
});
