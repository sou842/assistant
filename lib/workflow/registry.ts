import useSWR from 'swr';
import { WorkflowTool } from './types';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch registry');
  return res.json();
});

export const useToolRegistry = () => {
  const { data, error, isLoading } = useSWR<WorkflowTool[]>('/api/workflow/registry', fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  const getTool = (id: string): WorkflowTool | undefined => {
    return data?.find(t => t.id === id);
  };

  return {
    tools: data || [],
    isLoading,
    error,
    getTool
  };
};
