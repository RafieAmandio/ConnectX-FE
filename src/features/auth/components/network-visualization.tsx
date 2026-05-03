import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { AppText } from '@shared/components';
import { Colors } from '@shared/theme';

const PRIMARY = '#FF9A3E';
const PRIMARY_RGB = '255, 154, 62';
const CARD_RGB = '26, 26, 31';

const NODES = [
  { id: 'founders', label: 'Founders', emoji: '🚀', x: 48, y: 8, delay: 0 },
  { id: 'cofounders', label: 'Co-Founders', emoji: '🤝', x: 12, y: 32, delay: 0.1 },
  { id: 'engineers', label: 'Engineers', emoji: '⚡', x: 86, y: 24, delay: 0.2 },
  { id: 'investors', label: 'Investors', emoji: '💰', x: 16, y: 64, delay: 0.3 },
  { id: 'advisors', label: 'Advisors', emoji: '🧠', x: 80, y: 58, delay: 0.4 },
  { id: 'partners', label: 'Partners', emoji: '🔗', x: 34, y: 86, delay: 0.5 },
  { id: 'operators', label: 'Operators', emoji: '📊', x: 64, y: 80, delay: 0.6 },
] as const;

const ALL_CONNECTIONS: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [5, 6],
  [0, 4],
  [1, 5],
  [2, 6],
  [0, 6],
  [1, 2],
  [3, 4],
];

const MATCH_SEQUENCES = [
  { path: [0, 2, 6], label: 'Matching founder with engineer' },
  { path: [1, 0, 4], label: 'Connecting co-founder with advisor' },
  { path: [3, 0, 2], label: 'Investor meeting founder' },
  { path: [5, 1, 6], label: 'Forming team' },
  { path: [4, 2, 0], label: 'Building startup team' },
] as const;

type Phase = 'idle' | 'activation' | 'scanning' | 'connection' | 'formation';
type NodeState = 'idle' | 'scanning' | 'matched' | 'hovered' | 'hover-connected' | 'dimmed';
type LineState = 'default' | 'matched' | 'hover-active' | 'dimmed';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function primaryAlpha(opacity: number) {
  return `rgba(${PRIMARY_RGB}, ${opacity})`;
}

function isSameEdge(edge: [number, number], from: number, to: number) {
  return (edge[0] === from && edge[1] === to) || (edge[0] === to && edge[1] === from);
}

function getNodeVisualState(
  idx: number,
  hoveredNode: number | null,
  connectedNodes: number[],
  scanProgress: number[]
): NodeState {
  if (hoveredNode !== null) {
    if (idx === hoveredNode) {
      return 'hovered';
    }

    const isConnected = ALL_CONNECTIONS.some(
      ([a, b]) => (a === hoveredNode && b === idx) || (b === hoveredNode && a === idx)
    );
    return isConnected ? 'hover-connected' : 'dimmed';
  }

  if (connectedNodes.includes(idx)) {
    return 'matched';
  }

  if (scanProgress.includes(idx)) {
    return 'scanning';
  }

  return 'idle';
}

function getLineVisualState(
  from: number,
  to: number,
  hoveredNode: number | null,
  matchedEdges: [number, number][]
): LineState {
  if (hoveredNode !== null) {
    return from === hoveredNode || to === hoveredNode ? 'hover-active' : 'dimmed';
  }

  if (matchedEdges.some(edge => isSameEdge(edge, from, to))) {
    return 'matched';
  }

  return 'default';
}

function getLineStroke(state: LineState) {
  switch (state) {
    case 'matched':
      return { color: PRIMARY, width: 0.64 };
    case 'hover-active':
      return { color: primaryAlpha(0.6), width: 0.42 };
    case 'dimmed':
      return { color: primaryAlpha(0.05), width: 0.2 };
    default:
      return { color: primaryAlpha(0.18), width: 0.28 };
  }
}

export function NetworkVisualization() {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [currentSeq, setCurrentSeq] = React.useState(0);
  const [scanProgress, setScanProgress] = React.useState<number[]>([]);
  const [connectedNodes, setConnectedNodes] = React.useState<number[]>([]);
  const [matchedEdges, setMatchedEdges] = React.useState<[number, number][]>([]);
  const [statusText, setStatusText] = React.useState('');
  const [hoveredNode, setHoveredNode] = React.useState<number | null>(null);

  const pulseX = useSharedValue<number>(NODES[0].x);
  const pulseY = useSharedValue<number>(NODES[0].y);
  const pulseOpacity = useSharedValue<number>(0);

  React.useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('activation');
    }, 600);
    const t2 = setTimeout(() => setPhase('scanning'), 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  React.useEffect(() => {
    if (phase !== 'scanning') {
      return;
    }

    const seq = MATCH_SEQUENCES[currentSeq];
    const path = seq.path;
    let step = 0;

    setScanProgress([path[0]]);
    setStatusText(seq.label);

    const scanInterval = setInterval(() => {
      step += 1;
      if (step < path.length) {
        setScanProgress(prev => [...prev, path[step]]);
        return;
      }

      clearInterval(scanInterval);
      setPhase('connection');
    }, 700);

    return () => clearInterval(scanInterval);
  }, [currentSeq, phase]);

  React.useEffect(() => {
    if (phase !== 'connection') {
      return;
    }

    const path = MATCH_SEQUENCES[currentSeq].path;
    const edges: [number, number][] = [];

    for (let i = 0; i < path.length - 1; i += 1) {
      edges.push([path[i], path[i + 1]]);
    }

    setMatchedEdges(edges);
    setConnectedNodes([...path]);

    const timer = setTimeout(() => setPhase('formation'), 1200);
    return () => clearTimeout(timer);
  }, [currentSeq, phase]);

  React.useEffect(() => {
    if (phase !== 'formation') {
      return;
    }

    const timer = setTimeout(() => {
      setScanProgress([]);
      setConnectedNodes([]);
      setMatchedEdges([]);
      setStatusText('');
      setCurrentSeq(prev => (prev + 1) % MATCH_SEQUENCES.length);
      setPhase('scanning');
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentSeq, phase]);

  React.useEffect(() => {
    if (scanProgress.length < 2) {
      pulseOpacity.value = withTiming(0, { duration: 180 });
      return;
    }

    const from = NODES[scanProgress[scanProgress.length - 2]];
    const to = NODES[scanProgress[scanProgress.length - 1]];

    pulseX.value = from.x;
    pulseY.value = from.y;
    pulseOpacity.value = 1;
    pulseX.value = withTiming(to.x, { duration: 650 });
    pulseY.value = withTiming(to.y, { duration: 650 });
    pulseOpacity.value = withSequence(
      withTiming(1, { duration: 420 }),
      withTiming(0.6, { duration: 230 })
    );
  }, [pulseOpacity, pulseX, pulseY, scanProgress]);

  const pulseAnimatedProps = useAnimatedProps(() => ({
    cx: pulseX.value,
    cy: pulseY.value,
    opacity: pulseOpacity.value,
  }));

  const groupGlow =
    phase === 'formation' && connectedNodes.length > 0
      ? {
          x: connectedNodes.reduce((sum, idx) => sum + NODES[idx].x, 0) / connectedNodes.length,
          y: connectedNodes.reduce((sum, idx) => sum + NODES[idx].y, 0) / connectedNodes.length,
        }
      : null;

  return (
    <View
      className="relative w-full select-none"
      style={{
        aspectRatio: 4 / 3,
        maxHeight: 220,
        maxWidth: 260,
      }}>
      <Svg
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
        viewBox="0 0 100 100"
        width="100%">
        {ALL_CONNECTIONS.map(([from, to]) => {
          const a = NODES[from];
          const b = NODES[to];
          const state = getLineVisualState(from, to, hoveredNode, matchedEdges);
          const stroke = getLineStroke(state);

          return (
            <Line
              key={`line-${from}-${to}`}
              stroke={stroke.color}
              strokeLinecap="round"
              strokeWidth={stroke.width}
              x1={a.x}
              x2={b.x}
              y1={a.y}
              y2={b.y}
            />
          );
        })}

        {matchedEdges.map(([from, to]) => {
          const a = NODES[from];
          const b = NODES[to];

          return (
            <React.Fragment key={`glow-${from}-${to}`}>
              <Line
                stroke={primaryAlpha(0.18)}
                strokeLinecap="round"
                strokeWidth={2.8}
                x1={a.x}
                x2={b.x}
                y1={a.y}
                y2={b.y}
              />
              <Line
                stroke={primaryAlpha(0.72)}
                strokeLinecap="round"
                strokeWidth={1.2}
                x1={a.x}
                x2={b.x}
                y1={a.y}
                y2={b.y}
              />
            </React.Fragment>
          );
        })}

        <AnimatedCircle
          animatedProps={pulseAnimatedProps}
          fill={PRIMARY}
          r={1.2}
          stroke={primaryAlpha(0.35)}
          strokeWidth={1.4}
        />
      </Svg>

      {groupGlow ? <FormationGlow x={groupGlow.x} y={groupGlow.y} /> : null}
      {phase === 'activation' ? <ActivationRipple /> : null}

      <View
        pointerEvents="none"
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          left: '48%',
          position: 'absolute',
          top: '46%',
          transform: [{ translateX: -96 }, { translateY: -12 }],
          width: 192,
        }}>
        {statusText ? (
          <Animated.View key={statusText} entering={FadeInDown.duration(360)}>
            <AppText
              align="center"
              className="text-[12px] font-semibold leading-[16px]"
              numberOfLines={1}
              style={{ color: PRIMARY }}>
              {statusText}
            </AppText>
          </Animated.View>
        ) : null}
      </View>

      {NODES.map((node, idx) => (
        <NetworkNode
          connectedNodes={connectedNodes}
          hoveredNode={hoveredNode}
          idx={idx}
          key={node.id}
          node={node}
          phase={phase}
          scanProgress={scanProgress}
          setHoveredNode={setHoveredNode}
        />
      ))}
    </View>
  );
}

function ActivationRipple() {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(1, { duration: 1200 });
  }, [progress]);

  const rippleStyle = useAnimatedStyle(() => ({
    height: 10 + progress.value * 70,
    opacity: 0.8 * (1 - progress.value),
    transform: [
      { translateX: -0.5 * (10 + progress.value * 70) },
      { translateY: -0.5 * (10 + progress.value * 70) },
    ],
    width: 10 + progress.value * 70,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          borderColor: primaryAlpha(0.4),
          borderRadius: 999,
          borderWidth: 1,
          left: '48%',
          position: 'absolute',
          top: '46%',
        },
        rippleStyle,
      ]}
    />
  );
}

function FormationGlow({ x, y }: { x: number; y: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(1, { duration: 1200 });
  }, [progress]);

  const glowStyle = useAnimatedStyle(() => ({
    height: 20 + progress.value * 100,
    opacity: progress.value * 0.35,
    transform: [
      { translateX: -0.5 * (20 + progress.value * 100) },
      { translateY: -0.5 * (20 + progress.value * 100) },
    ],
    width: 20 + progress.value * 100,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          backgroundColor: primaryAlpha(0.12),
          borderRadius: 999,
          left: `${x}%`,
          position: 'absolute',
          top: `${y}%`,
        },
        glowStyle,
      ]}
    />
  );
}

function NetworkNode({
  connectedNodes,
  hoveredNode,
  idx,
  node,
  phase,
  scanProgress,
  setHoveredNode,
}: {
  connectedNodes: number[];
  hoveredNode: number | null;
  idx: number;
  node: (typeof NODES)[number];
  phase: Phase;
  scanProgress: number[];
  setHoveredNode: React.Dispatch<React.SetStateAction<number | null>>;
}) {
  const state = getNodeVisualState(idx, hoveredNode, connectedNodes, scanProgress);
  const isHighlighted =
    state === 'matched' || state === 'scanning' || state === 'hovered' || state === 'hover-connected';
  const isDimmed = state === 'dimmed';
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withDelay(node.delay * 1000 + 200, withTiming(1, { duration: 500 }));
    scale.value = withDelay(node.delay * 1000 + 200, withTiming(1, { duration: 500 }));
  }, [node.delay, opacity, scale]);

  React.useEffect(() => {
    opacity.value = withTiming(isDimmed ? 0.35 : 1, { duration: 300 });
  }, [isDimmed, opacity]);

  React.useEffect(() => {
    if (state === 'matched') {
      scale.value = withSequence(withTiming(1.08, { duration: 240 }), withTiming(1.04, { duration: 260 }));
      return;
    }

    if (state === 'scanning') {
      scale.value = withSequence(withTiming(1.05, { duration: 250 }), withTiming(1, { duration: 250 }));
      return;
    }

    scale.value = withTiming(1, { duration: 260 });
  }, [scale, state]);

  React.useEffect(() => {
    const isConnectedFormationNode = phase === 'formation' && connectedNodes.includes(idx);
    x.value = withTiming(isConnectedFormationNode ? (48 - node.x) * 0.08 : 0, { duration: 1200 });
    y.value = withTiming(isConnectedFormationNode ? (46 - node.y) * 0.08 : 0, { duration: 1200 });
  }, [connectedNodes, idx, node.x, node.y, phase, x, y]);

  const nodeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: -66 + x.value }, { translateY: -16 + y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          alignItems: 'center',
          left: `${node.x}%`,
          position: 'absolute',
          top: `${node.y}%`,
          width: 132,
        },
        nodeStyle,
      ]}>
      <Pressable
        accessibilityLabel={node.label}
        onHoverIn={() => setHoveredNode(idx)}
        onHoverOut={() => setHoveredNode(null)}
        onPressIn={() => setHoveredNode(idx)}
        onPressOut={() => setHoveredNode(null)}>
        <View
          className="flex-row items-center gap-2 rounded-lg border px-3 py-1.5"
          style={{
            backgroundColor:
              state === 'matched'
                ? primaryAlpha(0.15)
                : state === 'scanning'
                  ? primaryAlpha(0.1)
                  : state === 'hovered'
                    ? `rgba(${CARD_RGB}, 0.9)`
                    : state === 'hover-connected'
                      ? `rgba(${CARD_RGB}, 0.8)`
                      : `rgba(${CARD_RGB}, 0.6)`,
            borderColor:
              state === 'matched'
                ? primaryAlpha(0.5)
                : state === 'scanning'
                  ? primaryAlpha(0.3)
                  : state === 'hovered'
                    ? primaryAlpha(0.4)
                    : state === 'hover-connected'
                      ? primaryAlpha(0.3)
                      : 'rgba(38, 42, 51, 0.56)',
            borderCurve: 'continuous',
            boxShadow: isHighlighted ? `0 0 18px ${primaryAlpha(state === 'matched' ? 0.35 : 0.2)}` : undefined,
          }}>
          <AppText className="text-[14px] leading-[18px]">{node.emoji}</AppText>
          <AppText
            className="text-[12px] font-semibold leading-[16px]"
            numberOfLines={1}
            style={{ color: isHighlighted ? Colors.dark.text : Colors.dark.textMuted }}>
            {node.label}
          </AppText>
        </View>

        {state === 'matched' && phase === 'formation' ? <MatchedNodeRing /> : null}
      </Pressable>
    </Animated.View>
  );
}

function MatchedNodeRing() {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withSequence(withTiming(1, { duration: 750 }), withTiming(0.65, { duration: 750 }));
  }, [progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.6,
    transform: [{ scale: 0.9 + progress.value * 0.2 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          borderColor: primaryAlpha(0.3),
          borderRadius: 12,
          borderWidth: 1,
          bottom: -4,
          left: -4,
          position: 'absolute',
          right: -4,
          top: -4,
        },
        ringStyle,
      ]}
    />
  );
}
