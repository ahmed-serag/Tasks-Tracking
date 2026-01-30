import { createClient } from '@supabase/supabase-js';
import { Task } from '../types';
import { SAMPLE_TASKS } from '../constants';

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://zrktvycllzqnlifmjfmg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpya3R2eWNsbHpxbmxpZm1qZm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTg4MzEsImV4cCI6MjA4NTM3NDgzMX0.xGhAVn3s2O2-JclfRskifNIKIN4vxdmu0WM84oxYt8k';

// Initialize Client
const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Mock Helpers (Fallback)
const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const getLocal = (): Task[] => {
  const stored = localStorage.getItem('blissplan_tasks');
  return stored ? JSON.parse(stored) : null;
};
const setLocal = (tasks: Task[]) => localStorage.setItem('blissplan_tasks', JSON.stringify(tasks));

export const taskService = {
  /**
   * Fetch all tasks from Supabase
   */
  async fetchTasks(): Promise<Task[]> {
    // If client is not configured, immediately use mock
    if (!isConfigured || !supabase) {
      console.warn("Supabase not configured. Using Mock Data.");
      return this.fetchLocalOrSample();
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('endDate', { ascending: true });

      if (error) throw error;
      return data as Task[];
      
    } catch (error: any) {
      // 42P01 is Postgres code for "undefined_table"
      if (error.code === '42P01' || error.message?.includes('fetch failed')) {
        console.warn("Supabase table 'tasks' not found or connection failed. Falling back to local storage.", error);
        return this.fetchLocalOrSample();
      }
      
      console.error('Supabase fetch error:', error);
      throw new Error(error.message);
    }
  },

  async fetchLocalOrSample(): Promise<Task[]> {
    await mockDelay(800);
    const stored = getLocal();
    if (!stored) {
      setLocal(SAMPLE_TASKS);
      return SAMPLE_TASKS;
    }
    return stored;
  },

  /**
   * Create or Update a task
   */
  async saveTask(task: Task, isNew: boolean): Promise<Task> {
    if (!isConfigured || !supabase) {
      return this.saveLocal(task, isNew);
    }

    try {
      // Note: We depend on the DB columns being created with quotes (e.g. "startDate") 
      // to match these camelCase property names automatically.
      const { data, error } = await supabase
        .from('tasks')
        .upsert(task)
        .select()
        .single();

      if (error) throw error;
      return data as Task;

    } catch (error: any) {
       if (error.code === '42P01' || error.message?.includes('fetch failed')) {
        console.warn("Falling back to local save.");
        return this.saveLocal(task, isNew);
      }
      console.error('Supabase save error:', error);
      throw new Error(error.message);
    }
  },

  async saveLocal(task: Task, isNew: boolean): Promise<Task> {
    await mockDelay(600);
    const tasks = getLocal() || [];
    if (isNew) {
      tasks.push(task);
    } else {
      const index = tasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
        tasks[index] = task;
      }
    }
    setLocal(tasks);
    return task;
  },

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    if (!isConfigured || !supabase) {
      return this.deleteLocal(id);
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

    } catch (error: any) {
      if (error.code === '42P01' || error.message?.includes('fetch failed')) {
         return this.deleteLocal(id);
      }
      console.error('Supabase delete error:', error);
      throw new Error(error.message);
    }
  },

  async deleteLocal(id: string): Promise<void> {
    await mockDelay(500);
    const tasks = getLocal() || [];
    const filtered = tasks.filter(t => t.id !== id);
    setLocal(filtered);
  },

  /**
   * Bulk import/sync tasks
   */
  async syncTasks(newTasks: Task[]): Promise<Task[]> {
    if (!isConfigured || !supabase) {
      return this.syncLocal(newTasks);
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .upsert(newTasks)
        .select();

      if (error) throw error;
      return this.fetchTasks();

    } catch (error: any) {
      if (error.code === '42P01' || error.message?.includes('fetch failed')) {
        return this.syncLocal(newTasks);
      }
      console.error('Supabase sync error:', error);
      throw new Error(error.message);
    }
  },

  async syncLocal(newTasks: Task[]): Promise<Task[]> {
    await mockDelay(1000);
    const current = getLocal() || [];
    const merged = [...current, ...newTasks];
    setLocal(merged);
    return merged;
  }
};