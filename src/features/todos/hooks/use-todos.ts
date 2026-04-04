import { useQuery } from '@tanstack/react-query';

import { createApiQueryOptions } from '@shared/services/api';

import { TODOS_USER_ID, fetchUserTodos } from '../services/todos-service';
import type { UserTodosResponse } from '../types/todos.types';

export function useTodos(userId = TODOS_USER_ID) {
  return useQuery({
    ...createApiQueryOptions<UserTodosResponse>(
      ['todos', userId],
      `https://dummyjson.com/users/${userId}/todos`
    ),
    queryFn: () => fetchUserTodos(userId),
  });
}
