import { apiFetch } from '@shared/services/api';

import type { UserTodosResponse } from '../types/todos.types';

export const TODOS_USER_ID = 5;

export async function fetchUserTodos(userId = TODOS_USER_ID) {
  return apiFetch<UserTodosResponse>(`https://dummyjson.com/users/${userId}/todos`);
}
