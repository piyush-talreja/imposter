import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export type CharacterLook = 'plain' | 'shades' | 'mask';

/**
 * The game's one illustration: a round little figure. The same shape is used
 * for everyone, so only the look (plain, sunglasses, mask) and colour change.
 * The app icon in assets/images is rendered from this same drawing.
 */
export function Character({
  color = colors.raised,
  look = 'plain',
  size = 64,
  initial,
}: {
  color?: string;
  look?: CharacterLook;
  size?: number;
  /** Optional letter on the belly, for player avatars. */
  initial?: string;
}) {
  const ink = colors.outline;
  return (
    // Decorative: hide from screen readers. Done on a View because react-native-svg
    // forwards accessibilityElementsHidden to the DOM on web, which React rejects.
    <View aria-hidden>
      <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
        <Ellipse cx={50} cy={114} rx={30} ry={5} fill={ink} opacity={0.35} />
        <Rect x={17} y={52} width={66} height={60} rx={30} fill={color} stroke={ink} strokeWidth={5} />
        <Circle cx={50} cy={40} r={28} fill={color} stroke={ink} strokeWidth={5} />
        {look === 'plain' ? (
          <G>
            <Ellipse cx={39} cy={40} rx={6} ry={7} fill={colors.white} />
            <Ellipse cx={61} cy={40} rx={6} ry={7} fill={colors.white} />
            <Circle cx={40.5} cy={41.5} r={3.2} fill={ink} />
            <Circle cx={62.5} cy={41.5} r={3.2} fill={ink} />
          </G>
        ) : look === 'shades' ? (
          <G>
            <Rect x={21} y={32} width={58} height={15} rx={7.5} fill={ink} />
            <Rect x={28} y={35} width={12} height={3} rx={1.5} fill={colors.white} opacity={0.55} />
          </G>
        ) : (
          <G>
            {/* Masquerade mask with narrow glowing eye slits */}
            <Path
              d="M16 38 C24 26 40 27 50 34 C60 27 76 26 84 38 C80 50 64 52 50 44 C36 52 20 50 16 38 Z"
              fill={ink}
            />
            <Path d="M30 39 C34 35 40 35 43 39 C40 42 34 42 30 39 Z" fill={colors.white} />
            <Path d="M57 39 C60 35 66 35 70 39 C66 42 60 42 57 39 Z" fill={colors.white} />
          </G>
        )}
        {initial ? (
          <SvgText x={50} y={94} fontSize={26} fontWeight="900" fill={ink} opacity={0.55} textAnchor="middle">
            {initial.slice(0, 1).toUpperCase()}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

export const LOOK_FOR_ROLE = { villager: 'plain', undercover: 'shades', imposter: 'mask' } as const;
