import { View } from 'react-native';

import { AppCard, AppPill, AppText } from '@shared/components';

import type { TodoItem } from '../types/todos.types';

type TodoCardProps = {
  todo: TodoItem;
};

export function TodoCard({ todo }: TodoCardProps) {
  return (
    <AppCard className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          <AppText variant="subtitle">{todo.todo}</AppText>
          <AppText tone="soft" variant="code">
            todo #{todo.id} · user {todo.userId}
          </AppText>
        </View>
        <AppPill label={todo.completed ? 'Done' : 'Open'} tone={todo.completed ? 'accent' : 'signal'} />
      </View>
    </AppCard>
  );
}
