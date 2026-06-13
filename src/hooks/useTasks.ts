import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';
export type FilterPriority = 'all' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
}

export interface TaskReminder {
  id: string;
  title: string;
  reminder_date: string;
  status: string;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { setError('Not authenticated'); setIsLoading(false); return; }

      const [{ data: taskData, error: taskErr }, { data: remData }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, user_id, title, description, due_date, priority, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('reminders')
          .select('id, title, reminder_date, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('reminder_date', { ascending: true }),
      ]);

      if (taskErr) throw new Error(taskErr.message);
      setTasks((taskData as Task[]) || []);
      setReminders((remData as TaskReminder[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchAll();
  }, [fetchAll]);

  const createTask = useCallback(async (data: {
    title: string;
    description?: string;
    due_date?: string | null;
    priority: TaskPriority;
  }) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('Not authenticated');

    const { data: inserted, error: err } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        due_date: data.due_date || null,
        priority: data.priority,
        status: 'pending',
      })
      .select()
      .single();

    if (err) throw new Error(err.message);
    setTasks(prev => [inserted as Task, ...prev]);
    return inserted as Task;
  }, []);

  const updateTask = useCallback(async (
    id: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'due_date' | 'priority' | 'status'>>,
  ) => {
    const { error: err } = await supabase.from('tasks').update(data).eq('id', id);
    if (err) throw new Error(err.message);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleComplete = useCallback(async (id: string, currentStatus: TaskStatus) => {
    const next: TaskStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateTask(id, { status: next });
  }, [updateTask]);

  const setReminder = useCallback(async (taskTitle: string, reminderDate: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('Not authenticated');

    const { data: inserted, error: err } = await supabase
      .from('reminders')
      .insert({ user_id: user.id, title: taskTitle, reminder_date: reminderDate, email_id: null, status: 'active' })
      .select()
      .single();

    if (err) throw new Error(err.message);
    setReminders(prev => [...prev, inserted as TaskReminder]);
    return inserted as TaskReminder;
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('reminders').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    // completed goes to bottom
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    // then by priority
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    // then by due date ascending (earliest first)
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length,
  };

  return {
    tasks: sorted,
    reminders,
    stats,
    isLoading,
    error,
    filterStatus,
    filterPriority,
    searchQuery,
    setFilterStatus,
    setFilterPriority,
    setSearchQuery,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    setReminder,
    deleteReminder,
    refresh: fetchAll,
  };
}
