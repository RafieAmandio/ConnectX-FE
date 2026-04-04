import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard, AppPill, AppText } from '@shared/components';

import { useTodos } from '../hooks/use-todos';
import { TODOS_USER_ID } from '../services/todos-service';
import { TodoCard } from './todo-card';

export function TodosScreen() {
  const { data, error, isLoading, refetch } = useTodos();

  return (
    <>
      <Stack.Screen options={{ title: 'Todos' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard className="gap-4">
          <AppPill className="self-start" label="React Query Demo" tone="accent" />
          <AppText variant="hero">Feature-based fetching with `useQuery`.</AppText>
          <AppText tone="muted">
            This tab fetches the todo list for dummy user {TODOS_USER_ID} through the shared API
            client and a feature-local hook.
          </AppText>
        </AppCard>

        {isLoading ? (
          <AppCard tone="muted" className="gap-2">
            <AppText variant="subtitle">Loading todos...</AppText>
            <AppText tone="muted">
              React Query is resolving the request and caching the response for this feature.
            </AppText>
          </AppCard>
        ) : null}

        {error ? (
          <AppCard tone="signal" className="gap-3">
            <AppText variant="subtitle">Could not load todos</AppText>
            <AppText tone="muted">
              {error instanceof Error ? error.message : 'Unknown request error'}
            </AppText>
            <AppText tone="signal" variant="code" onPress={() => void refetch()}>
              Tap here to retry
            </AppText>
          </AppCard>
        ) : null}

        {data ? (
          <>
            <View className="flex-row gap-3">
              <AppCard className="flex-1 gap-2">
                <AppText tone="accent" variant="label">
                  Total
                </AppText>
                <AppText variant="title">{data.total}</AppText>
              </AppCard>
              <AppCard className="flex-1 gap-2">
                <AppText tone="accent" variant="label">
                  Completed
                </AppText>
                <AppText variant="title">
                  {data.todos.filter((item) => item.completed).length}
                </AppText>
              </AppCard>
            </View>

            <View className="gap-3">
              {data.todos.map((todo) => (
                <TodoCard key={todo.id} todo={todo} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
