import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line, Circle } from "react-native-svg";
import { ThemePalette } from "../styles/theme";

interface BrandLogoNativeProps {
  theme: ThemePalette;
  compact?: boolean;
}

export const BrandLogoNative: React.FC<BrandLogoNativeProps> = ({
  theme,
  compact = false,
}) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: theme.bgSubCard,
            borderColor: theme.borderCard,
          },
        ]}
      >
        <Svg width={22} height={22} viewBox="0 0 64 64">
          <Path
            d="M12 40 A20 20 0 0 1 52 40"
            stroke={theme.cyan}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="4 4"
            fill="none"
          />
          <Path
            d="M32 14 C37 14 40 20 35 26 C39 24 46 27 45 33 C44 38 37 38 33 34 C35 39 31 46 26 45 C21 44 21 37 25 33 C20 35 14 31 16 25 C17 20 24 21 28 25 C26 19 28 14 32 14 Z"
            fill={theme.accentPrimary}
          />
          <Line
            x1="32"
            y1="31"
            x2="46"
            y2="18"
            stroke={theme.amber}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Circle
            cx="32"
            cy="31"
            r="4"
            fill={theme.bgCard}
            stroke={theme.cyan}
            strokeWidth="2.5"
          />
        </Svg>
      </View>

      {!compact && (
        <View>
          <Text style={[styles.brandBold, { color: theme.textPrimary }]}>
            Smart Cooling
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Control Térmico IoT
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandBold: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 1,
  },
});
