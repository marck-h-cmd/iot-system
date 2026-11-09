import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Activity,
  ClipboardCheck,
  Scale,
  Sliders,
} from "lucide-react-native";
import { ThemePalette } from "../styles/theme";

export type PrimaryMobileTab =
  | "monitoreo"
  | "indicadores"
  | "estadisticas"
  | "control";

interface BottomTabBarProps {
  activeTab: PrimaryMobileTab;
  onSelectTab: (tab: PrimaryMobileTab) => void;
  theme: ThemePalette;
  alertCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  theme,
  alertCount = 0,
}) => {
  const tabs: { id: PrimaryMobileTab; label: string; icon: any }[] = [
    { id: "monitoreo", label: "Monitoreo", icon: Activity },
    { id: "indicadores", label: "Indicadores", icon: ClipboardCheck },
    { id: "estadisticas", label: "Estadísticas", icon: Scale },
    { id: "control", label: "Control", icon: Sliders },
  ];

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.bgCard,
          borderTopColor: theme.borderCard,
        },
      ]}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.iconPill,
                isActive && { backgroundColor: theme.accentSoft },
              ]}
            >
              <Icon
                size={18}
                color={isActive ? theme.accentPrimary : theme.textSecondary}
              />
              {tab.id === "monitoreo" && alertCount > 0 && (
                <View
                  style={[styles.alertDot, { backgroundColor: theme.rose }]}
                />
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? theme.accentPrimary : theme.textSecondary,
                  fontWeight: isActive ? "700" : "500",
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    position: "relative",
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  alertDot: {
    position: "absolute",
    top: 2,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
