import { WorkflowState, WorkflowEvent } from './types.js';

type StateListener = (state: WorkflowState, newEvent?: WorkflowEvent) => void;

class WorkflowStore {
  private workflows: Map<string, WorkflowState> = new Map();
  private listeners: Map<string, Set<StateListener>> = new Map();

  /**
   * Creates or updates a workflow in the store
   */
  public save(state: WorkflowState, newEvent?: WorkflowEvent): WorkflowState {
    const updatedState: WorkflowState = {
      ...state,
      updatedAt: new Date().toISOString(),
    };

    if (newEvent) {
      updatedState.events = [...(updatedState.events || []), newEvent];
    }

    this.workflows.set(updatedState.workflowId, updatedState);

    // Notify active SSE listeners
    const workflowListeners = this.listeners.get(updatedState.workflowId);
    if (workflowListeners) {
      for (const listener of workflowListeners) {
        try {
          listener(updatedState, newEvent);
        } catch (err) {
          // ignore subscriber write errors
        }
      }
    }

    return updatedState;
  }

  /**
   * Retrieves a workflow by ID
   */
  public get(workflowId: string): WorkflowState | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Lists all stored workflows
   */
  public list(): WorkflowState[] {
    return Array.from(this.workflows.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Subscribes a listener to updates for a specific workflow
   */
  public subscribe(workflowId: string, listener: StateListener): () => void {
    if (!this.listeners.has(workflowId)) {
      this.listeners.set(workflowId, new Set());
    }
    this.listeners.get(workflowId)!.add(listener);

    return () => {
      const set = this.listeners.get(workflowId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(workflowId);
        }
      }
    };
  }

  /**
   * Cancels a workflow
   */
  public cancel(workflowId: string): WorkflowState | undefined {
    const state = this.workflows.get(workflowId);
    if (!state) return undefined;

    const cancelEvent: WorkflowEvent = {
      step: 'cancellation',
      status: 'warning',
      message: 'Workflow was cancelled by user.',
      timestamp: new Date().toISOString(),
    };

    state.status = 'CANCELLED';
    return this.save(state, cancelEvent);
  }
}

export const workflowStore = new WorkflowStore();
