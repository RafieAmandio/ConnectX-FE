export type TodoItem = {
  completed: boolean;
  id: number;
  todo: string;
  userId: number;
};

export type UserTodosResponse = {
  limit: number;
  skip: number;
  todos: TodoItem[];
  total: number;
};
